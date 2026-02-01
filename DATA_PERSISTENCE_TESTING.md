# Data Persistence Testing Guide

This document outlines how to verify that all admin-editable configuration and data persists to the database correctly.

## Recent Changes

### Backend API Implementation (Commit: dc45531)
- ✅ Implemented full CRUD routes for: pages, staff, services, reviews
- ✅ All routes now use database (pool.query) instead of placeholder responses
- ✅ Added proper error handling and validation

### API Client Cache Management (Commit: dc45531)
- ✅ Added `invalidateCache()` method to API client
- ✅ Cache is automatically invalidated on successful PUT/POST/DELETE mutations
- ✅ GET requests still use 15s TTL cache for performance
- ✅ Rate-limited responses (429/503) still fall back to cache

---

## Test Scenarios

### 1. Site Settings (Email, Payment, Tax, Shipping)

**Location:** Admin → Settings → Email/Payment/Tax

**Test Steps:**
1. Navigate to Settings → Email tab
2. Change email provider (e.g., from "none" to "SMTP")
3. Enter sample credentials
4. Click "Save Email Configuration"
5. Verify toast shows "Email configuration saved"
6. **REFRESH THE PAGE** (`F5` or `Ctrl+R`)
7. Confirm email settings are still present and unchanged

**Expected Result:** Settings persist across page refresh

**Database Check:**
```sql
SELECT JSON_EXTRACT(settings, '$.emailConfig') FROM site_settings WHERE id = 1;
```

---

### 2. Pages (Home, About, Contact, Custom)

**Location:** Admin → Pages → Edit Page

**Test Steps:**
1. Go to Admin → Pages Management
2. Select "Home" or "About" page
3. Change page title or hero background image
4. Add custom page content
5. Click "Save Page"
6. Verify toast shows "Page updated successfully"
7. **Navigate AWAY from this page** (to another admin section)
8. **Navigate BACK to Pages Management**
9. Confirm all changes are still there

**Expected Result:** Page edits persist across navigation

**Database Check:**
```sql
SELECT id, pageType, name FROM pages LIMIT 5;
SELECT JSON_EXTRACT(contentData, '$.pageTitleFont') FROM pages WHERE pageType = 'home';
```

---

### 3. Services

**Location:** Admin → Dashboard (if shown) or Admin → Manage Services

**Test Steps:**
1. Go to Admin area
2. Add a new service (title, description, icon)
3. Click "Save" or "Add Service"
4. Verify toast shows success
5. **Close browser tab completely**
6. **Open browser and navigate back to site**
7. Go to Admin → Services
8. Confirm the service you just added is still there

**Expected Result:** New services persist even after closing browser

**Database Check:**
```sql
SELECT id, title FROM services;
```

---

### 4. Staff Members

**Location:** Admin → Staff Management

**Test Steps:**
1. Go to Admin → Staff Management
2. Add new staff member (name, role, image)
3. Click "Save Staff"
4. Verify toast shows "Staff member added"
5. **Refresh page** (`F5`)
6. Confirm staff member still appears in list

**Expected Result:** Staff data persists after refresh

**Database Check:**
```sql
SELECT id, name, role FROM staff;
```

---

### 5. Product Management

**Location:** Admin → Product Management

**Test Steps:**
1. Go to Admin → Products
2. Add a new product (name, price, inventory, image)
3. Click "Add Product"
4. Verify toast shows "Product added!"
5. **Navigate to Store → Products page** (customer-facing)
6. Verify new product appears in product list
7. **Log out and back in**
8. Go to Admin → Products
9. Confirm new product is still visible

**Expected Result:** Products persist and are visible across sessions

**Database Check:**
```sql
SELECT id, name, price FROM products;
```

---

### 6. Customer Data

**Location:** Admin → Customer Management

**Test Steps:**
1. Go to Admin → Customer Management
2. Create a new customer account
3. Click "Save Customer"
4. Verify toast shows success
5. **Navigate away** to another admin section
6. **Navigate back** to Customer Management
7. Confirm new customer is in the list

**Expected Result:** Customer data persists

**Database Check:**
```sql
SELECT id, email, name FROM customers;
```

---

### 7. Orders

**Location:** Admin → Order Management

**Test Steps:**
1. Customers place orders (via Store checkout)
2. Go to Admin → Orders
3. Verify orders appear in list
4. Update order status (e.g., "Pending" → "Processing")
5. Click "Update Status"
6. **Refresh page**
7. Verify order status remains changed

**Expected Result:** Order status changes persist

**Database Check:**
```sql
SELECT orderNumber, status FROM orders LIMIT 10;
```

---

### 8. Reviews

**Location:** Admin → Reviews Management

**Test Steps:**
1. Customers submit product reviews (via product detail page)
2. Go to Admin → Reviews Management
3. Approve/reject a review
4. **Refresh page**
5. Verify approval status persists
6. Delete a review
7. **Refresh page**
8. Confirm deleted review doesn't reappear

**Expected Result:** Review approvals and deletions persist

**Database Check:**
```sql
SELECT id, productId, approved FROM reviews;
```

---

### 9. Menu Items

**Location:** Admin → Settings → Menus tab

**Test Steps:**
1. Go to Admin → Settings → Menus
2. Select a menu (e.g., "Main Menu")
3. Add a new menu item (text, URL)
4. Click "Save Menu"
5. Verify toast shows "Menu updated"
6. **Refresh page**
7. Confirm new menu item appears

**Expected Result:** Menu changes persist across refresh

---

## Cache Validation Tests

### Test: Cache Invalidation on Settings Update

**Purpose:** Verify that API cache is cleared when settings are mutated

**Test Steps:**
1. Open browser DevTools (F12)
2. Go to Network tab
3. Visit Admin → Settings → General
4. Make a change (e.g., change site title)
5. Click "Save Settings"
6. Look at network tab
7. You should see:
   - First request: `PUT /api/settings` (save)
   - Subsequent page loads should fetch fresh data (no stale cache)

**Expected Result:** Each save followed by refresh should fetch latest data from server

---

### Test: Cache Hit for GET Requests (No Mutations)

**Purpose:** Verify GET caching still works for performance

**Test Steps:**
1. Open browser DevTools → Network tab
2. Go to Admin → Products
3. Note first load fetches `/api/products`
4. Navigate to another section
5. Navigate back to Products
6. Check network tab
7. You should see NO new `/api/products` request (using cache from <15s ago)

**Expected Result:** GET requests use cache to avoid redundant API calls

---

## Database Direct Verification

Use these SQL queries to verify all data is in the database:

```sql
-- Check all site settings
SELECT JSON_PRETTY(settings) FROM site_settings WHERE id = 1;

-- Check all pages
SELECT * FROM pages;

-- Check all services
SELECT * FROM services;

-- Check all staff
SELECT * FROM staff;

-- Check all products
SELECT * FROM products;

-- Check all customers
SELECT * FROM customers;

-- Check all orders
SELECT * FROM orders;

-- Check all reviews
SELECT * FROM reviews;

-- Check table sizes
SELECT TABLE_NAME, TABLE_ROWS FROM information_schema.TABLES 
WHERE TABLE_SCHEMA = 'custom_threads_db';
```

---

## Troubleshooting

### Scenario: "Data disappears after refresh"

**Likely Cause:** Backend route is still returning mock data instead of querying database

**Fix:** Check that:
1. Route is NOT using `createSimpleRoutes()` helper
2. Route uses `pool.query()` to read/write database
3. Table exists in database schema (run migrations)

**Verify:**
```bash
npm run migrate  # In server directory
```

### Scenario: "Settings show in UI but don't save"

**Likely Cause:** API save endpoint is failing silently

**Fix:** 
1. Check browser console for errors
2. Check server logs for 500 errors
3. Verify request is `PUT` not `POST` for settings

### Scenario: "Data persists but takes too long to load"

**Likely Cause:** Too many API requests or server is slow

**Fix:**
1. Check API client cache is working (15s TTL)
2. Verify Render backend has sufficient resources
3. Consider implementing request debouncing in UI

---

## Performance Expectations

- **Page Load:** <2 seconds (after initial cache population)
- **Save Operation:** <1 second
- **Cache Hit:** <10ms (served from memory)
- **Cache Miss:** <500ms (fresh API fetch)

---

## Deployment Verification Checklist

- [ ] All backend routes implemented (no more `createSimpleRoutes` placeholders)
- [ ] All database tables created and accessible
- [ ] API client cache invalidation working (mutations clear cache)
- [ ] Settings persist across page refresh
- [ ] Products/Services/Staff/Pages persist across navigation
- [ ] Customer and order data persists across sessions
- [ ] No "only in session" data losses after browser close
- [ ] Error handling shows user-friendly messages
- [ ] Server logs show successful database writes

---

## Related Documentation

- [HOSTINGER_DEPLOYMENT_GUIDE.md](HOSTINGER_DEPLOYMENT_GUIDE.md) - Deployment instructions
- [DATABASE_SETUP.md](DATABASE_SETUP.md) - Database schema details
- [server/README.md](server/README.md) - Backend API documentation
