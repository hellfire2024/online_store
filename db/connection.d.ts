import mysql from 'mysql2/promise';
export declare const pool: mysql.Pool;
export declare function testConnection(): Promise<void>;
export declare function withTransaction<T>(callback: (connection: mysql.PoolConnection) => Promise<T>): Promise<T>;
export default pool;
//# sourceMappingURL=connection.d.ts.map