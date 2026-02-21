import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
dotenv.config();
// Database connection pool configuration
const poolConfig = {
    host: process.env.DB_HOST,
    port: parseInt(process.env.DB_PORT || '3306'),
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_DATABASE || process.env.DB_NAME,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
    enableKeepAlive: true,
    keepAliveInitialDelay: 0,
};
// Create connection pool
export const pool = mysql.createPool(poolConfig);
// Test connection function
export async function testConnection() {
    try {
        const connection = await pool.getConnection();
        console.log('✅ Database connection established successfully');
        connection.release();
    }
    catch (error) {
        console.error('❌ Database connection failed:', error);
        throw error;
    }
}
// Helper function for transactions
export async function withTransaction(callback) {
    const connection = await pool.getConnection();
    await connection.beginTransaction();
    try {
        const result = await callback(connection);
        await connection.commit();
        return result;
    }
    catch (error) {
        await connection.rollback();
        throw error;
    }
    finally {
        connection.release();
    }
}
export default pool;
//# sourceMappingURL=connection.js.map