import mysql from "mysql2/promise";
import fs from "fs";
import path from "path";

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

// Database connection pool configuration
const dbConfig = getDbConfigFromSettings();
const poolConfig = {
  host: dbConfig.host,
  port: parseInt(dbConfig.port || "3306"),
  user: dbConfig.user || "root",
  password: dbConfig.password || "",
  database: dbConfig.database || "online_store",
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
          if (error && typeof error === 'object') {
            const err = error as Record<string, any>;
            console.error('  Error:', err);
            if ('address' in err) console.error('  Address:', err.address);
            if ('port' in err) console.error('  Port:', err.port);
            if ('code' in err) console.error('  Code:', err.code);
            if ('errno' in err) console.error('  Errno:', err.errno);
            if ('syscall' in err) console.error('  Syscall:', err.syscall);
            if ('fatal' in err) console.error('  Fatal:', err.fatal);
            // Log resolved DB config (never log password)
            console.error('DB connection failed:', {
              host: dbConfig.host,
              dbPort: dbConfig.port,
              user: dbConfig.user,
              envHost: process.env.DB_HOST,
              envPort: process.env.DB_PORT,
              envUser: process.env.DB_USER,
              error: err,
              address: 'address' in err ? err.address : undefined,
              port: 'port' in err ? err.port : undefined,
              code: 'code' in err ? err.code : undefined,
              errno: 'errno' in err ? err.errno : undefined,
              syscall: 'syscall' in err ? err.syscall : undefined,
              fatal: 'fatal' in err ? err.fatal : undefined,
            });
        }
        await new Promise((resolve) => setTimeout(resolve, retryDelay));
      }
      throw new Error(`❌ Could not establish database connection after ${maxRetries} attempts.`);
  }
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
