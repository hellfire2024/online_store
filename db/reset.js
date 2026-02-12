import { pool } from './connection.js';
export async function resetDatabase() {
    console.log('🔄 Resetting database...');
    const tables = [
        'order_items',
        'orders',
        'customer_addresses',
        'customers',
        'admins',
        'product_options',
        'product_option_lists',
        'products',
        'gallery_images',
        'galleries',
        'menu_items',
        'menus',
        'pages',
        'reviews',
        'staff',
        'services',
        'site_settings',
    ];
    try {
        // Disable foreign key checks
        await pool.query('SET FOREIGN_KEY_CHECKS = 0');
        // Drop all tables
        for (const table of tables) {
            await pool.query(`DROP TABLE IF EXISTS ${table}`);
            console.log(`  Dropped table: ${table}`);
        }
        // Re-enable foreign key checks
        await pool.query('SET FOREIGN_KEY_CHECKS = 1');
        console.log('✅ Database reset complete');
        console.log('🔄 Now run migrations: npm run db:migrate');
        console.log('🌱 Then seed data: npm run db:seed');
    }
    catch (error) {
        console.error('❌ Reset failed:', error);
        throw error;
    }
}
if (import.meta.url === `file://${process.argv[1]}`) {
    resetDatabase()
        .then(() => {
        console.log('Reset complete');
        process.exit(0);
    })
        .catch((error) => {
        console.error('Reset failed:', error);
        process.exit(1);
    });
}
//# sourceMappingURL=reset.js.map