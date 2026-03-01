# Deployment & Debugging Guide

## Critical Issues Fixed

### 1. Database Persistence (FIXED ✅)
**Problem**: Database was being wiped out on every redeploy  
**Root Causes**:
- `DEMO_MODE: "1"` in docker-compose.yaml caused in-memory storage instead of real MySQL
- MySQL had no volume persistence - data was lost on container restart
- Local dev docker-compose.yml had no MySQL service at all

**Solutions Applied**:
- ✅ Changed `DEMO_MODE: "0"` in docker-compose.yaml (production)
- ✅ Added `volumes: mysql_data:/var/lib/mysql` for persistent storage
- ✅ Added complete MySQL 8.0 service to docker-compose.yml (local dev)
- ✅ Backend waits for MySQL `service_healthy` before starting

### 2. API 404 Errors (PUT /api/products/:id)
**Problem**: `404 Not Found` on PUT https://dev.adaptivegis.com/api/products/p-1  
**Root Cause**: Old docker-compose.yaml with DEMO_MODE=1 is still deployed on Coolify

**Solution**: You must **REDEPLOY on Coolify** after pulling latest code

### 3. Browser Extension Error (Chrome/Firefox)
**Problem**: "A listener indicated an asynchronous response by returning true, but the message channel closed"  
**Cause**: This is NOT from your application - it's from a browser extension (likely a password manager, ad blocker, or developer tool)  
**Solution**: This is harmless and only appears in console. It doesn't affect functionality.

---

## How to Redeploy on Coolify (IMPORTANT!)

### Step 1: Pull Latest Code
```bash
git pull origin dev
```

This brings in the fixed docker-compose.yaml and docker-compose.yml with:
- DEMO_MODE=0 (real database)
- MySQL persistent volumes
- Proper service dependencies

### Step 2: Redeploy on Coolify Dashboard
1. Go to https://coolify.dev.adaptivegis.com (or your Coolify dashboard)
2. Select **online_store** application
3. Click **Deploy**
4. Wait for all services to start:
   - ✅ MySQL service (healthcheck)
   - ✅ Backend service (wait for database ready)
   - ✅ Frontend service (depends on backend)

### Step 3: Verify Deployment

#### Check Backend Health
```bash
curl https://devapi.adaptivegis.com/health
```

Should return:
```json
{
  "status": "ok",
  "demo_mode": false,
  "db_connected": true,
  "port": 3001
}
```

#### Check Product Endpoints Work
```bash
curl https://devapi.adaptivegis.com/api/products
```

Should return JSON array of products (not a 404)

#### Check Frontend
```bash
curl https://dev.adaptivegis.com
```

Should load homepage without API errors

---

## Database Initialization Sequence (Automatic)

When backend starts, it will:

1. **Test Connection**: `🔌 Testing database connection...`
2. **Run Migrations**: Creates tables if missing (IF NOT EXISTS)
3. **Seed Data**: Adds default admin + sample products (only if empty)
4. **Ready**: `✅ SERVER LISTENING`

This happens automatically - no manual setup needed!

---

## Why API Returns 404

### Scenario A: DEMO_MODE=1 (Old Code)
- Backend uses in-memory mock routes
- `PUT /api/products/:id` exists in demoRoutes
- But data is lost on restart
- ❌ **SOLUTIONS**: Redeploy with new code (DEMO_MODE=0)

### Scenario B: DEMO_MODE=0 (New Code) - Database Not Connected
- Backend tries to use real database routes
- If MySQL not running or not accessible: 500 error
- If database query fails: 500 error
- ❌ **SOLUTION**: Check `docker ps` and MySQL logs

### Scenario C: DEMO_MODE=0 - Routes Not Registered
- Backend started but routes weren't mounted
- Returns 404 for all API endpoints
- ❌ **SOLUTION**: Check backend logs for startup errors

---

## Checking Backend Logs After Redeploy

### On Coolify
1. Dashboard → online_store → Backend Service
2. View Logs tab
3. Look for:
   - ✅ `DEMO_MODE: false` (or "0")
   - ✅ `🔌 Testing database connection...`
   - ✅ `✅ Database connected successfully`
   - ✅ `📋 Using production routes (real database)`
   - ✅ `🚀 SERVER LISTENING - port 3001`

### Troubleshooting Messages
- **`Cannot connect to mysql`**: MySQL service not healthy, check MySQL logs
- **`database error`**: Table creation failed, check MySQL storage
- **`EADDRINUSE`**: Port 3001 already in use, restart services
- **`Route not found`**: Backend not mounted, restart application

---

## Data Persistence Verification

### Before & After Redeploy

1. **Add a Product** via `/admin/products`
   - Fill in name, price, etc.
   - Click Save

2. **Refresh Page**: Product should still be there

3. **Restart Containers** (via Coolify)
   - Stop all services
   - Start all services
   - Wait for healthchecks to pass

4. **Check Product Still Exists**:
   - Product should be in database ✅
   - Data is NOT lost
   - Previous behavior (data loss) is fixed

---

## Common Issues After Redeploy

| Issue | Cause | Fix |
|-------|-------|-----|
| 404 on /api/products | DEMO_MODE=1 still running | Redeploy again, check logs |
| Database connection error | MySQL not healthy | Check MySQL logs, allow 30s startup |
| Admin page shows errors | Old frontend still cached | Hard refresh (Ctrl+Shift+R) |
| Data still disappears | Volume not persistent | Check docker volume persists (docker volume ls) |
| 500 error on every API call | Database schema missing | Check backend logs for migration errors |

---

## Environment Variables (Production)

**Key settings in docker-compose.yaml**:

```yaml
environment:
  DEMO_MODE: "0"              # Using real database ✅
  DB_HOST: mysql              # Connected to MySQL service
  DB_PORT: 3306
  DB_USER: adaptivegis-dev
  DB_PASSWORD: we1r9dveIPTzjJ84HMD6
  DB_NAME: agis_dev_db
  NODE_ENV: production
```

These are hardcoded in docker-compose.yaml for Coolify visibility.

---

## Git Commits Ready to Deploy

Latest commits (in order):
1. **f1b59d7** - Fix review cards responsive sizing
2. **343390c** - Enable real database persistence + add MySQL service
3. **e1b2d37** - Remove invalid MySQL migrations volume

All are pushed to `origin/dev` and ready for production deployment.

---

## Next Steps

1. ✅ Pull latest code: `git pull origin dev`
2. ✅ Redeploy on Coolify
3. ✅ Wait 60+ seconds for MySQL to start
4. ✅ Verify health endpoint: `curl https://devapi.adaptivegis.com/health`
5. ✅ Test API: `curl https://devapi.adaptivegis.com/api/products`
6. ✅ Check frontend: `https://dev.adaptivegis.com`
7. ✅ Verify data persists after container restart

---

## Support

If you still see 404 errors after redeploy:
- Check that `DEMO_MODE: "0"` is set in docker-compose.yaml on Coolify
- Verify MySQL service is healthy (green checkmark in Coolify)
- Check backend logs for database connection errors
- Check that old version of docker-compose.yml wasn't left in the codebase
