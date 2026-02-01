# Data Persistence Fixes - Summary

**Date:** February 1, 2026  
**Commits:** `dc45531`, `d103f85`

## Problem Identified

Services, pages, staff, reviews, and other site configuration were only persisting during the active session. Upon page refresh or reopening the browser, all changes were lost.

**Root Causes:**
1. Backend API routes for pages, staff, services, reviews were returning placeholder messages instead of querying/updating the database
2. Frontend `PagesContext` and `ServicesContext` were only using mock API for mutations, never calling the real API
3. API client cache was not being invalidated after mutations (PUT/POST/DELETE)

---

## Changes Made

### 1. Backend API Routes Now Read/Write Database (Commit: dc45531)

**Files Modified:**
- `server/src/routes/pages.ts` - Fully implemented CRUD operations
- `server/src/routes/staff.ts` - Fully implemented CRUD operations  
- `server/src/routes/services.ts` - Fully implemented CRUD operations
- `server/src/routes/reviews.ts` - Fully implemented CRUD operations

**What Changed:**
- Replaced `createSimpleRoutes('table_name')` placeholders with real implementations
- Each route now uses `pool.query()` to read/write the MySQL database
- Proper error handling with meaningful error messages
- JSON field handling for complex data structures

**Example (before → after):**
```typescript
// BEFORE: Placeholder returning dummy message
router.get('/', async (_req: Request, res: Response) => {
  res.json({ message: `${tableName} route - implement as needed` });
});

// AFTER: Real database query
router.get('/', async (_req: Request, res: Response) => {
  try {
    const [rows] = await pool.query<RowDataPacket[]>(
      'SELECT * FROM pages ORDER BY created_at DESC'
    );
    return res.json(rows || []);
  } catch (error) {
    console.error('Error fetching pages:', error);
    return res.status(500).json({ error: 'Failed to fetch pages' });
  }
});
```

---

### 2. API Client Now Invalidates Cache on Mutations (Commit: dc45531)

**File Modified:**
- `services/apiClient.ts`

**What Changed:**
- Added `invalidateCache()` method that clears cache entries matching a resource path
- Automatically invalidates cache on successful PUT/POST/DELETE mutations
- GET requests still use 15-second TTL cache for performance
- Subsequent GET requests fetch fresh data from API after mutations

**Why This Matters:**
Without cache invalidation, after saving settings via `PUT /settings`, the old cached data would be returned on the next GET request.

---

### 3. Frontend Contexts Now Use API for Mutations (Commit: d103f85)

**Files Modified:**
- `context/PagesContext.tsx` - Now calls `apiClient.pages` for all mutations
- `context/ServicesContext.tsx` - Now calls `apiClient.services` for all mutations

**What Changed:**
- `PagesContext.addPage()` → calls `apiClient.pages.create()` first, falls back to mock on error
- `PagesContext.updatePage()` → calls `apiClient.pages.update()` first, falls back to mock on error
- `PagesContext.deletePage()` → calls `apiClient.pages.delete()` first, falls back to mock on error
- `ServicesContext` methods → same pattern as `StaffContext` and `ReviewsContext` (which were already correct)

**Pattern (Consistent Across All Contexts):**
```typescript
const addService = async (service: Omit<Service, "id">) => {
  try {
    const newService = await apiClient.services.create(service);
    setServices((prev) => [...prev, newService]);
  } catch (error) {
    console.error("Failed to add service via API, using mock", error);
    const newService = await mockApi.addService(service);
    setServices((prev) => [...prev, newService]);
  }
};
```

---

## Testing Data Persistence

A comprehensive testing guide has been created: `DATA_PERSISTENCE_TESTING.md`

### Quick Test Scenarios:

1. **Site Settings:**
   - Admin → Settings → Email/Payment/Tax tabs
   - Change configuration
   - Save
   - **Refresh page** → settings should persist

2. **Services:**
   - Admin → Services
   - Add a service
   - Save
   - **Close browser and reopen** → service should still exist

3. **Pages:**
   - Admin → Pages
   - Edit page content
   - Save
   - **Navigate away and back** → changes should persist

4. **Staff:**
   - Admin → Staff
   - Add/Edit staff member
   - Save
   - **Refresh page** → staff member should remain

---

## Database Verification Commands

Verify data is in the database (not just in memory):

```sql
-- Check if settings were saved
SELECT JSON_EXTRACT(settings, '$.emailConfig') FROM site_settings WHERE id = 1;

-- Check if pages exist
SELECT id, pageType, name FROM pages;

-- Check if services exist
SELECT id, title FROM services;

-- Check if staff exist
SELECT id, name, role FROM staff;

-- Check if reviews exist
SELECT id FROM reviews;
```

---

## How It Works Now

```
User Action:     Save Service
       ↓
[Frontend]       ServicesManagement calls updateService()
       ↓
[Context]        ServicesContext.updateService() tries API first
       ↓
[API Client]     apiClient.services.update(id, data)
                 - Method: PUT /api/services/{id}
       ↓
[Backend]        services.ts PUT handler
                 - pool.query("UPDATE services SET...")
       ↓
[Database]       MySQL writes to services table
       ↓
[Backend]        Returns updated service object
       ↓
[API Client]     Cache invalidation triggers
                 - Removes cached entry for /services
       ↓
[Context]        setServices() updates local state
       ↓
[UI]             Service appears in list with new data
       ↓
[User Refresh]   
       ↓
[API GET]        Fetches fresh data from database
                 - Cache miss, so fresh API call
       ↓
[Database]       Returns persisted data
       ↓
[UI]             Shows same service (persistence verified ✓)
```

---

## Fallback Behavior

All contexts implement a **try-API-first, fallback-to-mock pattern**:

1. **API Success** → Use API response, update local state, cache is invalidated
2. **API Failure** → Log error, try mock API as fallback, still update local state
3. **Mock Fallback** → User sees data in UI, but not persisted to database

This ensures:
- ✅ Production deployments work (API available)
- ✅ Development works with mock data (API unavailable)
- ✅ Graceful degradation if API is temporarily down

---

## Files Modified Summary

```
Backend Routes (Database Persistence):
  server/src/routes/pages.ts      (+87 lines, -3 lines)
  server/src/routes/staff.ts      (+84 lines, -3 lines)
  server/src/routes/services.ts   (+82 lines, -3 lines)
  server/src/routes/reviews.ts    (+83 lines, -3 lines)

Frontend Contexts (API Calls):
  context/PagesContext.tsx        (+24 lines, -20 lines)
  context/ServicesContext.tsx     (+32 lines, -12 lines)

API Client (Cache Management):
  services/apiClient.ts           (+30 lines, added invalidateCache method)

Documentation:
  DATA_PERSISTENCE_TESTING.md     (NEW - comprehensive testing guide)
```

---

## Performance Impact

- **Positiv**: GET requests still cached (15s TTL) → fast repeated loads
- **Neutral**: Mutations now go to database (minimal latency on Render)
- **Benefit**: Cache auto-invalidates on mutations → no stale data surprises

---

## Next Steps (If Issues Occur)

1. **Check server logs:** Look for "Error updating/creating/deleting" messages
2. **Verify database:** Use SQL queries in section above
3. **Check browser console:** Look for API errors in DevTools
4. **Monitor Render dashboard:** Check backend health/logs
5. **Test specific flow:** Use scenarios in `DATA_PERSISTENCE_TESTING.md`

---

## Git History

```
d103f85 Fix context data persistence: use API for pages and services mutations
dc45531 Implement database persistence for pages, staff, services, reviews; add API cache invalidation on mutations
```

Both commits include all necessary changes to ensure data persists to database.
