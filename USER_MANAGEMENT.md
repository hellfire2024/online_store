# User Management System Documentation

## Overview

The user management system implements separate, industry-standard management interfaces for two distinct user types:
1. **Admin Users** - Internal staff who access the admin panel
2. **Customers** - External users who shop on the store

These systems are completely independent with different data models, validation rules, and UI components.

## Architecture

### Frontend Components

#### 1. **UserManagement.tsx** (`/admin/users`)
Admin-only interface for managing internal staff accounts.

**Features:**
- Create, read, update, delete (CRUD) admin users
- Role management: `super_admin`, `admin`, `manager`
- Search by username or email
- Status toggle (Active/Inactive)
- Last login tracking
- Pagination (10 items/page default)
- Separate modal for admin user creation/editing

**Data Model:**
```typescript
interface AdminUser {
  id: string;
  username: string;        // Unique identifier for admin panel login
  email: string;          // Unique email address
  role: 'super_admin' | 'admin' | 'manager';  // Role-based access
  isActive: boolean;      // Account status
  createdAt: string;      // ISO date
  lastLogin?: string;     // Tracks admin usage
}
```

**Modal Fields:**
- Username (required, unique)
- Email (required, unique)
- Password (required for new users, optional for updates)
- Role selector (super_admin, admin, manager)

#### 2. **CustomerManagement.tsx** (`/admin/customers`)
Admin interface for managing customer accounts and viewing customer metrics.

**Features:**
- Create, read, update, delete (CRUD) customer accounts
- Advanced search by name or email
- Sorting options: by name, email, total spent, date joined
- Status toggle (Active/Inactive)
- Order count tracking
- Total spending display (revenue metrics)
- Member since date
- Pagination (10 items/page default)
- Separate modal for customer creation/editing

**Data Model:**
```typescript
interface Customer {
  id: string;
  name: string;           // Customer's full name
  email: string;          // Unique email address
  phone?: string;         // Optional contact number
  isActive: boolean;      // Account status
  orderCount: number;     // Total orders placed
  totalSpent: number;     // Lifetime revenue
  createdAt: string;      // ISO date
  lastLogin?: string;     // Last time customer logged in
}
```

**Modal Fields:**
- Customer Name (required)
- Email (required, unique)
- Phone (optional)
- No password field (customers set their own during registration)

### Backend Routes

#### 1. **Admin Users Endpoints** (`/api/admin-users`)

```
GET    /api/admin-users              List all admin users
GET    /api/admin-users/:id          Get single admin user
POST   /api/admin-users              Create new admin user
PUT    /api/admin-users/:id          Update admin user
DELETE /api/admin-users/:id          Delete admin user
PATCH  /api/admin-users/:id/toggle-active  Toggle active status
```

**Input Validation:**
- Username: minimum 3 characters
- Email: valid email format (normalized)
- Password: minimum 6 characters
- Role: must be one of `['super_admin', 'admin', 'manager']`

**Security:**
- Passwords hashed with bcryptjs (10 rounds)
- Prevents deletion of the last super admin user
- Parameterized SQL queries (SQL injection protection)
- Input validation via express-validator

#### 2. **Customers Endpoints** (`/api/customers`)

```
GET    /api/customers                List all customers with order aggregation
GET    /api/customers/:id            Get single customer with addresses
POST   /api/customers                Create new customer
PUT    /api/customers/:id            Update customer info
DELETE /api/customers/:id            Delete customer account
PATCH  /api/customers/:id/toggle-active  Toggle active status
```

**Input Validation:**
- Name: required, non-empty
- Email: valid email format (normalized, unique)
- Phone: optional

**Data Aggregation:**
- Order count: `COUNT(DISTINCT orders.id)`
- Total spent: `SUM(orders.total)`
- Addresses: Related customer_addresses records

### Database Schema

#### admins Table
```sql
CREATE TABLE admins (
  id VARCHAR(36) PRIMARY KEY,
  username VARCHAR(255) UNIQUE NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  role ENUM('super_admin', 'admin', 'manager') DEFAULT 'manager',
  permissions JSON,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  last_login TIMESTAMP NULL,
  INDEX idx_username (username),
  INDEX idx_email (email)
);
```

#### customers Table
```sql
CREATE TABLE customers (
  id VARCHAR(36) PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255),
  phone VARCHAR(20),
  email_preferences JSON,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  last_login TIMESTAMP NULL,
  INDEX idx_email (email),
  INDEX idx_created_at (created_at)
);
```

### API Client Integration

**Frontend API calls** via `/services/apiClient.ts`:

```typescript
// Admin Users
apiClient.adminUsers.getAll()
apiClient.adminUsers.getById(id)
apiClient.adminUsers.create(data)
apiClient.adminUsers.update(id, data)
apiClient.adminUsers.delete(id)
apiClient.adminUsers.toggleActive(id)

// Customers
apiClient.customers.getAll()
apiClient.customers.getById(id)
apiClient.customers.create(data)
apiClient.customers.update(id, data)
apiClient.customers.delete(id)
apiClient.customers.toggleActive(id)
```

## UI Components

### Pagination
- Reusable component across both management pages
- Configurable items per page (10, 25, 50, 100, 250, All)
- Smart page numbering with ellipsis
- Total items counter

### Modals

**Admin User Modal:**
```
┌─────────────────────────────┐
│ Add New Admin User / Edit   │
├─────────────────────────────┤
│ Username:      [__________] │
│ Email:         [__________] │
│ Password:      [__________] │
│ Role:          [dropdown  ] │
│ [Cancel] [Create/Update]    │
└─────────────────────────────┘
```

**Customer Modal:**
```
┌─────────────────────────────┐
│ Add New Customer / Edit     │
├─────────────────────────────┤
│ Customer Name: [__________] │
│ Email:         [__________] │
│ Phone:         [__________] │
│ [Cancel] [Create/Update]    │
└─────────────────────────────┘
```

## Key Features

### Separation of Concerns
- ✅ Admin users and customers have completely separate modals
- ✅ Separate database tables with different schemas
- ✅ Different API endpoints (`/api/admin-users` vs `/api/customers`)
- ✅ Independent frontend components with no shared logic

### Security
- ✅ Password hashing with bcryptjs
- ✅ Parameterized SQL queries prevent injection
- ✅ Input validation on backend
- ✅ Role-based access control (RBAC) ready
- ✅ Email uniqueness constraints

### User Experience
- ✅ Real-time search/filter
- ✅ Advanced sorting (customers)
- ✅ Pagination for large datasets
- ✅ Status toggle with visual feedback
- ✅ Delete confirmation dialogs
- ✅ Toast notifications for actions
- ✅ Loading states

### Performance
- ✅ Pagination reduces data transfer
- ✅ Database indexes on search fields
- ✅ SQL aggregation (order counts, total spent)
- ✅ Connection pooling (10 concurrent)

## Navigation

### Admin Sidebar Updates
New menu items under "Management" section:
```
Management
├── Admin Users    → /admin/users
├── Customers      → /admin/customers
└── Staff          → /admin/staff
```

## Future Enhancements

### Planned Features
1. **Order Management Page** - View/edit orders per customer
2. **Bulk Operations** - Export to CSV, bulk delete
3. **Advanced Permissions** - Per-endpoint permissions for admin users
4. **Audit Logging** - Track all admin actions
5. **Two-Factor Authentication** - Enhanced security for super_admin
6. **Email Notifications** - Send account creation emails to new admin users
7. **Password Reset Flow** - Secure password recovery for customers
8. **Admin Activity Dashboard** - Log of who did what and when

### API Enhancements
- Filtering by role for admin users
- Filtering by status (active/inactive)
- Bulk status updates
- Export endpoints (CSV, JSON)

## Error Handling

### Common Errors

**Admin User Creation:**
- `400 Bad Request` - Missing required fields or invalid values
- `400 Conflict` - Username or email already exists
- `500 Server Error` - Database error

**Customer Management:**
- `400 Bad Request` - Missing name/email
- `400 Conflict` - Email already in use
- `404 Not Found` - Customer doesn't exist
- `500 Server Error` - Database error

## Testing Checklist

- [ ] Create admin user with all roles
- [ ] Create customer account
- [ ] Edit admin user (update username, email, role)
- [ ] Edit customer (update name, email, phone)
- [ ] Delete admin user (verify last super_admin prevention)
- [ ] Delete customer
- [ ] Toggle user status
- [ ] Search by username/email
- [ ] Sort customers by different criteria
- [ ] Verify pagination works
- [ ] Test invalid inputs (email format, required fields)
- [ ] Verify password hashing on admin creation
- [ ] Verify role badges display correctly
- [ ] Test with large datasets (performance)

## Code Statistics

- **Frontend Files:** 2 new management pages (~400 lines each)
- **Backend Files:** 2 route files (~250 lines each)
- **API Endpoints:** 12 total (6 per user type)
- **Database Tables:** 2 (admins, customers)
- **Frontend Components:** Reuses Pagination, Icon components
- **Type Definitions:** Fully typed interfaces for both models

## Dependencies

### Frontend
- React 18.3.1
- React Router DOM 6.23.1
- TypeScript
- Tailwind CSS

### Backend
- Express.js
- MySQL 8.0+
- bcryptjs (password hashing)
- express-validator (input validation)
- jsonwebtoken (JWT authentication)
- mysql2/promise (database driver)

## Files Modified/Created

### Created
- `pages/admin/UserManagement.tsx`
- `pages/admin/CustomerManagement.tsx`
- `server/src/routes/admin-users.ts`

### Modified
- `pages/admin/AdminPage.tsx` - Added routes for new pages
- `components/admin/AdminSidebar.tsx` - Added navigation links
- `server/src/routes/customers.ts` - Replaced stub with full CRUD
- `server/src/server.ts` - Registered admin-users route
- `services/apiClient.ts` - Added adminUsers and customers endpoints

## Deployment Notes

1. Ensure MySQL database is running and migrated
2. Backend must be started: `cd server && npm run dev`
3. Frontend environment variables configured (VITE_API_URL)
4. JWT_SECRET environment variable set on backend
5. Database credentials configured via .env files

## Support

For issues or questions about the user management system:
1. Check DATABASE_SETUP.md for backend configuration
2. Review AUTHENTICATION_GUIDE.md for auth flows
3. Test with curl or Postman for API endpoints
4. Check browser console for frontend errors
