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
        console.error('  Error:', error);
        if (error.address) console.error('  Address:', error.address);
        if (error.port) console.error('  Port:', error.port);
        if (error.code) console.error('  Code:', error.code);
        if (error.errno) console.error('  Errno:', error.errno);
        if (error.syscall) console.error('  Syscall:', error.syscall);
        if (error.fatal) console.error('  Fatal:', error.fatal);
      }
      // Log resolved DB config (never log password)
      console.error('  DB Host:', poolConfig.host);
      console.error('  DB Port:', poolConfig.port);
      console.error('  DB User:', poolConfig.user);
      console.error('  DB Name:', poolConfig.database);
      console.error('  Environment DB_HOST:', process.env.DB_HOST);
      console.error('  Environment DB_PORT:', process.env.DB_PORT);
      console.error('  Environment DB_USER:', process.env.DB_USER);
      console.error('  Environment DB_NAME:', process.env.DB_NAME);
      // Never log password or sensitive info
      if (attempt >= maxRetries) {
        throw error;
      }
      await new Promise((resolve) => setTimeout(resolve, retryDelay));
    }
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
