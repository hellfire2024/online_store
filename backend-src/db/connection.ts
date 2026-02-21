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
  try {
    const connection = await pool.getConnection();
    console.log("✅ Database connection established successfully");
    connection.release();
  } catch (error) {
    console.error("❌ Database connection failed:", error);
    throw error;
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
