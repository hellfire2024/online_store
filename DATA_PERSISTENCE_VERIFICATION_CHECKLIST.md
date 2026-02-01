# Data Persistence Verification Checklist

Use this checklist to verify that all data editing in the admin panel persists to the database.

---

## ✅ Backend Route Implementation

### Database Routes Now Implemented
- [x] Pages CRUD endpoints read/write to `pages` table
- [x] Staff CRUD endpoints read/write to `staff` table
- [x] Services CRUD endpoints read/write to `services` table
- [x] Reviews CRUD endpoints read/write to `reviews` table
- [x] Products CRUD endpoints already implemented (✓ from before)
- [x] Customers CRUD endpoints already implemented (✓ from before)
- [x] Orders CRUD endpoints already implemented (✓ from before)

**Verification:**
```bash
# In server directory
npm run build  # Should compile without errors
```

---

## ✅ Frontend Context Fixes

### Contexts Now Use API for Mutations
- [x] `PagesContext` - Uses `apiClient.pages` for add/update/delete
- [x] `ServicesContext` - Uses `apiClient.services` for add/update/delete
- [x] `StaffContext` - Uses `apiClient.staff` for add/update/delete (already correct)
- [x] `ReviewsContext` - Uses `apiClient.reviews` for add/update/delete (already correct)
- [x] `ProductContext` - Uses `apiClient.products` for add/update/delete (already correct)

**Verification:**
```bash
# In root directory
npm run build  # Should compile without errors
```

---

## ✅ Cache Management

- [x] `apiClient.invalidateCache()` method implemented
- [x] Cache invalidated on successful PUT mutations
- [x] Cache invalidated on successful POST mutations
- [x] Cache invalidated on successful DELETE mutations
- [x] GET requests still use 15-second cache for performance

**Verification (in browser DevTools Network tab):**
1. Edit a setting and save
2. Page should show success
3. Refresh browser (Ctrl+R or F5)
4. Setting should persist
5. Should NOT see old cached value

---

## 🧪 Manual Testing Checklist

### Test 1: Site Settings Persistence
- [ ] Go to Admin → Settings → General
- [ ] Change site title
- [ ] Click "Save Settings"
- [ ] See success toast
- [ ] **Refresh page (F5)**
- [ ] **Confirm title is still changed**
- [ ] ✅ If yes, Settings persistence works

### Test 2: Email Config Persistence
- [ ] Go to Admin → Settings → Email
- [ ] Change email provider
- [ ] Enter email address
- [ ] Click "Save Email Configuration"
- [ ] See success toast
- [ ] **Close this tab completely**
- [ ] **Open Admin panel in new tab**
- [ ] Go to Settings → Email
- [ ] **Confirm email provider and address are still there**
- [ ] ✅ If yes, Email settings persistence works

### Test 3: Services Persistence
- [ ] Go to Admin → Services
- [ ] Click "Add Service"
- [ ] Enter title, description, select icon
- [ ] Click "Save" or "Add Service"
- [ ] See success toast
- [ ] Service appears in list
- [ ] **Hard refresh browser (Ctrl+Shift+R to bypass cache)**
- [ ] **Confirm service is still in list**
- [ ] ✅ If yes, Services persistence works

### Test 4: Staff Persistence
- [ ] Go to Admin → Staff
- [ ] Click "Add Staff"
- [ ] Enter name, role
- [ ] Click "Save Staff"
- [ ] See success toast
- [ ] **Navigate to different admin page**
- [ ] **Navigate back to Staff**
- [ ] **Confirm staff member is still there**
- [ ] ✅ If yes, Staff persistence works

### Test 5: Pages Persistence
- [ ] Go to Admin → Pages
- [ ] Click Edit on "Home" page
- [ ] Change page title
- [ ] Click "Save Page"
- [ ] See success toast
- [ ] **Go to Store home page (customer view)**
- [ ] **Return to Admin → Pages**
- [ ] Edit same page
- [ ] **Confirm title change is still there**
- [ ] ✅ If yes, Pages persistence works

### Test 6: Products Persistence
- [ ] Go to Admin → Products
- [ ] Click "Add Product"
- [ ] Enter name, price, inventory
- [ ] Click "Add Product"
- [ ] See success toast
- [ ] **Log out of admin**
- [ ] **Log in again**
- [ ] Go to Admin → Products
- [ ] **Confirm product is still there**
- [ ] ✅ If yes, Products persistence works

### Test 7: Cross-Session Persistence
- [ ] Add a new service (or any item)
- [ ] Save successfully
- [ ] **Close browser completely**
- [ ] **Reopen browser**
- [ ] **Navigate to Admin panel**
- [ ] **Verify new service/item is still there**
- [ ] ✅ If yes, Cross-session persistence works (ultimate test!)

---

## 🔍 Database Verification

If UI tests pass, verify database directly (on your server):

```sql
-- Connect to MySQL
mysql -u ct_user -p custom_threads_db

-- Check if all data exists
SELECT COUNT(*) as page_count FROM pages;
SELECT COUNT(*) as service_count FROM services;
SELECT COUNT(*) as staff_count FROM staff;
SELECT COUNT(*) as product_count FROM products;
SELECT COUNT(*) as review_count FROM reviews;

-- Check specific recent additions
SELECT id, title FROM services ORDER BY created_at DESC LIMIT 5;
SELECT id, name FROM staff ORDER BY created_at DESC LIMIT 5;
SELECT id, pageType FROM pages;

-- Check settings are saved
SELECT JSON_EXTRACT(settings, '$.emailConfig.provider') FROM site_settings WHERE id = 1;
```

**Expected Results:**
- All COUNT queries should return > 0 if you've added items
- Recent additions should show up in ORDER BY DESC queries
- Settings JSON should show configured values

---

## 🚨 Troubleshooting

### Issue: "Data saves but disappears after refresh"

**Solution Steps:**
1. Check browser console (F12) for error messages
2. Check server logs for API errors
3. Run database query above to verify data was written
4. If data IS in database but not showing in UI:
   - Clear browser cache (Ctrl+Shift+Delete)
   - Hard refresh (Ctrl+Shift+R)
   - Check DevTools Network tab - should see fresh API requests

### Issue: "Data doesn't save at all"

**Solution Steps:**
1. Check browser Network tab (F12 → Network)
2. Look for failed requests (red X or error status codes)
3. Check server logs:
   ```bash
   # On Render backend:
   # View "Logs" section in Render dashboard
   # Look for "Error updating" or "Error inserting" messages
   ```
4. Verify environment variables are correct
5. Verify database connection is working

### Issue: "Very slow to save or refresh"

**Solution Steps:**
1. Check network latency in DevTools
2. Check server CPU/memory usage in Render dashboard
3. Verify database is responding quickly:
   ```bash
   # Monitor slow queries
   mysql -u root -p
   mysql> SET GLOBAL log_queries_not_using_indexes=1;
   ```
4. Consider upgrading Render plan if metrics are high

---

## ✅ Deployment Verification

After deploying to production (Hostinger + Render):

- [ ] Backend builds successfully (`npm run build` in server/)
- [ ] Frontend builds successfully (`npm run build` in root)
- [ ] Admin can log in
- [ ] Can edit site settings
- [ ] Settings persist after page refresh
- [ ] Can add new products/services/pages
- [ ] New items visible after browser reload
- [ ] Data persists across login sessions
- [ ] No errors in Render backend logs
- [ ] No CORS errors in browser console

---

## 📊 Performance Expectations

If everything is working correctly:

| Operation | Expected Time | Status |
|-----------|---|---|
| Add item | <1 second | [ ] OK |
| Save settings | <1 second | [ ] OK |
| Refresh after edit | <2 seconds | [ ] OK |
| Cross-session load | <3 seconds | [ ] OK |
| Browser cache hit | <100ms | [ ] OK |

---

## 🔗 Related Documentation

- [DATA_PERSISTENCE_FIX_SUMMARY.md](DATA_PERSISTENCE_FIX_SUMMARY.md) - Technical details of fixes
- [DATA_PERSISTENCE_TESTING.md](DATA_PERSISTENCE_TESTING.md) - Detailed test scenarios
- [HOSTINGER_DEPLOYMENT_GUIDE.md](HOSTINGER_DEPLOYMENT_GUIDE.md) - Production deployment
- [DATABASE_SETUP.md](DATABASE_SETUP.md) - Database schema

---

## 📝 Notes

- All contexts now follow the same pattern: try API → fallback to mock
- Cache is automatically invalidated on successful mutations
- Stale data cannot be returned after an edit is saved
- Rate-limiting (429/503) gracefully falls back to cache instead of blocking

**Last Updated:** February 1, 2026  
**Fixed by:** AI Assistant  
**Commits:** dc45531, d103f85, 739d84d
