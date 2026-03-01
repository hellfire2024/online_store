# Database Persistence Guide

## Issue

Your database data (orders, products, settings, etc.) is being reset on every deployment.

## Root Cause

The backend was running in `DEMO_MODE=1` which stores all data in memory. When the server restarts, all data is lost.

## Solution Applied

### 1. Disabled Demo Mode in Production

**File: `docker-compose.yml`**

- Changed `DEMO_MODE=1` to `DEMO_MODE=0`
- This tells the backend to use the real MySQL database instead of in-memory storage

### 2. Fixed Order Format in Demo Routes

**File: `backend-src/demoRoutes.ts`**

- Updated order storage to match production database format
- Orders now stored with `order_data`, `created_at`, `customer_email`, etc.
- Admin panel can now properly read orders from both demo and production modes

## Deployment Instructions

### If Using Coolify (Recommended)

1. **Verify Database Connection**
   - Ensure MySQL service is running and accessible
   - Check that these environment variables are set in Coolify:
     ```
     DB_HOST=<your-mysql-host>
     DB_PORT=3306
     DB_USER=<your-db-user>
     DB_PASSWORD=<your-db-password>
     DB_NAME=<your-db-name>
     ```

2. **Deploy Updated Code**

   ```bash
   git pull origin dev
   # Coolify will automatically rebuild with the new docker-compose.yml settings
   ```

3. **Verify Database Persistence**
   - After deployment, check that `DEMO_MODE=0` (or not set)
   - Create a test order or product
   - Restart the backend service
   - Verify the data is still there

### If Using Docker Compose Manually

1. **Pull Latest Changes**

   ```bash
   git pull origin dev
   ```

2. **Rebuild and Restart Services**

   ```bash
   docker-compose down
   docker-compose up -d --build
   ```

3. **Check Backend Logs**
   ```bash
   docker-compose logs -f backend
   ```

   - Look for: `🔌 Testing database connection...`
   - Should NOT see: `⚠️  Skipping database check (DEMO_MODE enabled)`

## Database Migration Behavior

The backend automatically handles database setup:

1. **On First Startup** (empty database):
   - Creates all tables (admins, customers, orders, products, etc.)
   - Seeds with default admin user and sample galleries
   - **This is normal and only happens once**

2. **On Subsequent Startups** (existing data):
   - Checks if tables exist
   - Only creates missing tables (safe)
   - Does NOT drop or truncate existing data
   - Does NOT re-seed if data already exists

## Verification Checklist

After deployment, verify:

- [ ] Backend logs show database connection successful
- [ ] Backend logs show "Database already seeded" (not "Seeding database")
- [ ] Orders submitted by customers appear in Admin → Order Management
- [ ] Products, settings, and galleries persist after backend restart
- [ ] No "Using demo orders - backend not connected" toast in admin panel

## Troubleshooting

### Orders Still Not Showing in Admin Panel

1. Check backend logs: `docker-compose logs backend | grep -i order`
2. Verify orders are in database:
   ```sql
   SELECT * FROM orders ORDER BY created_at DESC LIMIT 10;
   ```
3. Check browser console for API errors

### Database Connection Failed

1. Verify MySQL is running: `docker ps | grep mysql` (if using Docker)
2. Test connection from backend container:
   ```bash
   docker exec -it <backend-container> sh
   mysql -h $DB_HOST -u $DB_USER -p$DB_PASSWORD $DB_NAME
   ```
3. Ensure firewall allows connection between backend and database

### Data Lost After Deployment

- If data is still being lost, check if Coolify/hosting provider is:
  - Recreating database on each deploy (should use persistent volume)
  - Running migrations that drop tables (shouldn't happen with our code)
  - Check for custom deployment scripts that might reset database

## Environment Variables Reference

**Required for Production (DEMO_MODE=0):**

```env
NODE_ENV=production
DEMO_MODE=0
DB_HOST=<mysql-host>
DB_PORT=3306
DB_USER=<db-user>
DB_PASSWORD=<db-password>
DB_NAME=<db-name>
```

**For Testing/Development Only:**

```env
DEMO_MODE=1  # Uses in-memory data, NOT persistent
```

## Contact

If issues persist after following this guide, check:

1. Server logs for database connection errors
2. MySQL service status and logs
3. Network connectivity between services
