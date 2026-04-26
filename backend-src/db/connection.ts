import mysql from "mysql2/promise";
import fs from "fs";
import path from "path";

const isProduction = process.env.NODE_ENV === "production";

// Load DB config from site_settings table (runtime config)
function getDbConfigFromSettings(): any {
  try {
    const settingsPath = path.join(process.cwd(), "db", "site_settings.json");
    if (!fs.existsSync(settingsPath)) {
      throw new Error("site_settings.json not found");
    }
    const settingsRaw = fs.readFileSync(settingsPath, "utf8");
    const settings = JSON.parse(settingsRaw);
    return settings.dbConfig || {};
  } catch (e) {
    console.error("❌ Failed to load DB config from site_settings.json:", e);
    return {};
  }
}

function resolveConfigValue(
  envKey: string,
  settingsValue: any,
  fallback: string,
  allowSettingsFallback = true,
): string {
  const envValue = process.env[envKey];
  if (typeof envValue === "string" && envValue.trim().length > 0) {
    return envValue.trim();
  }
  if (
    allowSettingsFallback &&
    typeof settingsValue === "string" &&
    settingsValue.trim().length > 0
  ) {
    return settingsValue.trim();
  }
  return fallback;
}

// Database connection pool configuration
const dbConfig = isProduction ? {} : getDbConfigFromSettings();
const resolvedHost = resolveConfigValue("DB_HOST", dbConfig.host, "localhost");
const resolvedPort = resolveConfigValue("DB_PORT", dbConfig.port, "3306");

const resolvedUser =
  (process.env.DB_USER && process.env.DB_USER.trim()) ||
  (process.env.MYSQL_USER && process.env.MYSQL_USER.trim()) ||
  resolveConfigValue("DB_USER", dbConfig.user, "root", !isProduction);

const resolvedPassword =
  (process.env.DB_PASSWORD && process.env.DB_PASSWORD.trim()) ||
  (process.env.MYSQL_PASSWORD && process.env.MYSQL_PASSWORD.trim()) ||
  resolveConfigValue("DB_PASSWORD", dbConfig.password, "", !isProduction);

const resolvedDatabase =
  (process.env.DB_DATABASE && process.env.DB_DATABASE.trim()) ||
  (process.env.DB_NAME && process.env.DB_NAME.trim()) ||
  (process.env.MYSQL_DATABASE && process.env.MYSQL_DATABASE.trim()) ||
  (typeof dbConfig.database === "string" && dbConfig.database.trim()) ||
  "online_store";

if (isProduction) {
  const missingEnv: string[] = [];
  if (!resolvedUser) missingEnv.push("DB_USER or MYSQL_USER");
  if (!resolvedPassword) missingEnv.push("DB_PASSWORD or MYSQL_PASSWORD");
  if (!resolvedDatabase) missingEnv.push("DB_NAME/DB_DATABASE or MYSQL_DATABASE");

  if (missingEnv.length > 0) {
    throw new Error(
      `Missing required DB environment variables in production: ${missingEnv.join(", ")}`,
    );
  }
}

const poolConfig = {
  host: resolvedHost,
  port: parseInt(resolvedPort, 10),
  user: resolvedUser,
  password: resolvedPassword,
  database: resolvedDatabase,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  enableKeepAlive: true,
  keepAliveInitialDelay: 0,
};

// Create connection pool
export const pool = mysql.createPool(poolConfig);

// Test connection function
export async function testConnection(): Promise<void> {
  const maxRetries = 10;
  const retryDelay = 3000; // ms
  let attempt = 0;
  while (attempt < maxRetries) {
    try {
      const connection = await pool.getConnection();
      console.log("✅ Database connection established successfully");
      connection.release();
      return;
    } catch (error) {
      attempt++;
      // Detailed log for connection failure
      console.error(`❌ Database connection failed (attempt ${attempt}):`);
      if (error && typeof error === "object") {
        const err = error as Record<string, any>;
        console.error("  Error:", err);
        if ("address" in err) console.error("  Address:", err.address);
        if ("port" in err) console.error("  Port:", err.port);
        if ("code" in err) console.error("  Code:", err.code);
        if ("errno" in err) console.error("  Errno:", err.errno);
        if ("syscall" in err) console.error("  Syscall:", err.syscall);
        if ("fatal" in err) console.error("  Fatal:", err.fatal);
        // Log resolved DB config (never log password)
        console.error("DB connection failed:", {
          host: resolvedHost,
          dbPort: resolvedPort,
          user: resolvedUser,
          envHost: process.env.DB_HOST,
          envPort: process.env.DB_PORT,
          envUser: process.env.DB_USER,
          error: err,
          address: "address" in err ? err.address : undefined,
          port: "port" in err ? err.port : undefined,
          code: "code" in err ? err.code : undefined,
          errno: "errno" in err ? err.errno : undefined,
          syscall: "syscall" in err ? err.syscall : undefined,
          fatal: "fatal" in err ? err.fatal : undefined,
        });
      }
      await new Promise((resolve) => setTimeout(resolve, retryDelay));
    }
  }

  throw new Error(
    `❌ Could not establish database connection after ${maxRetries} attempts.`,
  );
}

// Helper function for transactions
export async function withTransaction<T>(
  callback: (connection: mysql.PoolConnection) => Promise<T>,
): Promise<T> {
  const connection = await pool.getConnection();
  await connection.beginTransaction();

  try {
    const result = await callback(connection);
    await connection.commit();
    return result;
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

export default pool;
