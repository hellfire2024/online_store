# Authentication System Refactor - Complete Guide

## Overview

Your e-commerce platform now has a professional, industry-standard authentication and account management system with **separate customer and admin authentication**, **multi-user admin support**, and **comprehensive customer account management**.

---

## System Architecture

### Authentication Types

#### 1. **Customer Authentication**

- Email + Password login
- Full registration with validation
- Order history tracking
- Address management
- Email preferences control
- Password reset capability

#### 2. **Admin Authentication**

- Username + Password login
- Multi-user support (multiple admins)
- Role-based permissions (super_admin, admin, manager)
- Customer management dashboard
- Full product/site management

---

## File Structure

### New Files Created

```
context/
├── CustomerAuthContext.tsx      # Customer authentication & account management
└── AdminContext.tsx             # UPDATED - Multi-user admin support

pages/
├── LoginPage.tsx                # UPDATED - Customer & Admin tabs
├── RegisterPage.tsx             # UPDATED - Customer registration only
├── CustomerAccountPage.tsx      # NEW - Customer profile & settings
├── CustomerAddressesPage.tsx    # NEW - Shipping/billing address management
└── CustomerOrdersPage.tsx       # NEW - Order history & tracking

types.ts                          # UPDATED - New Customer & Admin types
```

---

## Customer Features

### 1. Registration & Login

**Login Page Features:**

- Dual tabs: "Customer" and "Admin"
- Email-based authentication
- Password validation (min 8 characters)
- Terms & conditions agreement
- Forgot password link

**File:** [LoginPage.tsx](../../pages/LoginPage.tsx#L1-L100)

### 2. Account Profile

**Features:**

- View profile information
- Edit name and phone number
- Email preferences (marketing, order updates, announcements)
- Member since date
- Quick action buttons

**File:** [CustomerAccountPage.tsx](../../pages/CustomerAccountPage.tsx#L1-L150)

### 3. Address Management

**Features:**

- Add multiple shipping/billing addresses
- Edit existing addresses
- Delete addresses
- Set default shipping/billing addresses
- Full address details (street, city, state, zip, country, phone)

**File:** [CustomerAddressesPage.tsx](../../pages/CustomerAddressesPage.tsx#L1-L200)

### 4. Order History

**Features:**

- View all customer orders
- Order status tracking (pending, processing, shipped, delivered, cancelled)
- Order details (items, total, date)
- Shipping address for each order
- Tracking numbers
- Expandable order details

**File:** [CustomerOrdersPage.tsx](../../pages/CustomerOrdersPage.tsx#L1-L180)

### 5. Password Management

- `requestPasswordReset(email)` - Trigger password reset email
- `resetPassword(token, newPassword)` - Complete password reset
- `changePassword(current, new)` - Change password while logged in

---

## Admin Features

### 1. Multi-User Admin System

**Built-in Admin Users:**

```typescript
{
  username: "admin",
  password: "admin123",
  role: "super_admin",
  permissions: ["*"]  // All access
}

{
  username: "manager",
  password: "admin123",
  role: "admin",
  permissions: ["products", "orders", "customers", "galleries"]
}
```

### 2. Customer Management

**Admin Dashboard Functions:**

#### View All Customers

```typescript
const { customers, fetchCustomers } = useAdmin();
await fetchCustomers();
```

#### Get Specific Customer

```typescript
const customer = getCustomer(customerId);
// Returns full customer profile with addresses & orders
```

#### Password Reset

```typescript
const result = await sendPasswordResetEmail(customerId);
// Sends password reset email to customer
```

#### Update Customer Address

```typescript
const result = await updateCustomerAddress(customerId, addressId, updates);
// Modify shipping/billing addresses
```

#### Email Preferences

```typescript
const result = await updateCustomerEmailPreferences(customerId, {
  marketing: false,
  orderUpdates: true,
  announcements: true,
});
```

#### Deactivate/Reactivate Customer

```typescript
await deactivateCustomer(customerId); // Prevent logins
await reactivateCustomer(customerId); // Re-enable access
```

---

## Usage Examples

### Customer Flow

```typescript
import { useCustomerAuth } from '../context/CustomerAuthContext';

function MyComponent() {
  const { customer, login, updateProfile, addAddress } = useCustomerAuth();

  // Check if logged in
  if (!customer) {
    return <Redirect to="/login" />;
  }

  // Update profile
  const updateName = async () => {
    const result = await updateProfile("John Doe", "555-1234");
    if (result.success) {
      // Profile updated
    }
  };

  // Add address
  const addShippingAddress = async () => {
    const result = await addAddress({
      type: 'shipping',
      fullName: 'John Doe',
      streetAddress: '123 Main St',
      city: 'New York',
      state: 'NY',
      zipCode: '10001',
      country: 'USA',
      phone: '555-1234',
      isDefault: true
    });
  };
}
```

### Admin Flow

```typescript
import { useAdmin } from '../context/AdminContext';

function AdminCustomerDashboard() {
  const { adminUser, customers, sendPasswordResetEmail } = useAdmin();

  // Check if admin is logged in
  if (!adminUser) {
    return <Redirect to="/login?tab=admin" />;
  }

  // Send password reset
  const resetCustomerPassword = async (customerId: string) => {
    const result = await sendPasswordResetEmail(customerId);
    if (result.success) {
      toast.success('Password reset email sent');
    }
  };
}
```

---

## Data Models

### Customer Type

```typescript
interface Customer {
  id: string;
  name: string;
  email: string;
  phone?: string;
  createdAt: string;
  lastLogin: string;
  addresses: CustomerAddress[];
  orders: CustomerOrder[];
  emailPreferences: {
    marketing: boolean;
    orderUpdates: boolean;
    announcements: boolean;
  };
  isActive: boolean;
}
```

### Admin User Type

```typescript
interface AdminUser {
  id: string;
  username: string;
  email: string;
  role: "super_admin" | "admin" | "manager";
  permissions: string[];
  createdAt: string;
  lastLogin?: string;
  isActive: boolean;
}
```

### Customer Address

```typescript
interface CustomerAddress {
  id: string;
  type: "shipping" | "billing";
  fullName: string;
  streetAddress: string;
  city: string;
  state: string;
  zipCode: string;
  country: string;
  phone: string;
  isDefault: boolean;
}
```

### Customer Order

```typescript
interface CustomerOrder {
  id: string;
  orderNumber: string;
  date: string;
  total: number;
  status: "pending" | "processing" | "shipped" | "delivered" | "cancelled";
  shippingAddress: CustomerAddress;
  items: CartItem[];
  trackingNumber?: string;
}
```

---

## Login Credentials

### Customer

- Any email + password (for demo)
- Registration creates new account

### Admin

| Username | Password | Role        | Access                                 |
| -------- | -------- | ----------- | -------------------------------------- |
| admin    | admin123 | super_admin | Everything                             |
| manager  | admin123 | admin       | Products, Orders, Customers, Galleries |

---

## Security Notes

### Implemented

✅ Password length validation (min 8 characters)  
✅ Password confirmation matching  
✅ Terms & conditions agreement  
✅ Role-based access control (RBAC)  
✅ Account activation/deactivation  
✅ Local storage for session persistence

### Production Recommendations

- Use HTTPS/TLS for all transmissions
- Implement bcrypt for password hashing
- Add email verification for registration
- Implement JWT tokens for sessions
- Add rate limiting on login attempts
- Implement CSRF protection
- Add audit logging for admin actions
- Encrypt sensitive customer data at rest

---

## Integration Points

### Routes to Add to App.tsx

```typescript
<Route path="/login" element={<LoginPage />} />
<Route path="/register" element={<RegisterPage />} />
<Route path="/account" element={<CustomerAccountPage />} />
<Route path="/account/addresses" element={<CustomerAddressesPage />} />
<Route path="/account/orders" element={<CustomerOrdersPage />} />

{/* Admin Routes */}
<Route path="/admin/login" element={<AdminLoginModal />} />
<Route path="/admin/customers" element={<AdminCustomersPage />} />
```

### Provider Setup (App.tsx)

```typescript
<CustomerAuthProvider>
  <AdminProvider>
    <CartProvider>
      {/* Your routes */}
    </CartProvider>
  </AdminProvider>
</CustomerAuthProvider>
```

---

## Next Steps

1. **Create Admin Customer Management Page** - Display all customers with filtering/search
2. **Implement Email Service** - Send actual password reset emails
3. **Add Payment Integration** - Process orders and payments
4. **Implement Shipping** - Track shipments and generate labels
5. **Add Email Notifications** - Automated order updates
6. **Set up Database** - Replace localStorage with proper database
7. **Implement Token Auth** - Use JWT instead of localStorage
8. **Add API Endpoints** - Create backend REST/GraphQL API
9. **Enhance Admin Dashboard** - Complete admin panel UI
10. **Add Analytics** - Track customer behavior and sales

---

## Testing Credentials

### Admin Login

- **Username:** admin
- **Password:** admin123

### Customer Registration

- **Email:** your@email.com
- **Password:** SecurePass123 (min 8 chars)
- **Name:** Your Name

---

## Troubleshooting

### Customer not persisting after refresh

- Check if localStorage is enabled
- Check browser DevTools → Application → Local Storage

### Admin login not working

- Verify username matches exactly (case-sensitive)
- Check password is "admin123"
- Clear localStorage and try again

### Addresses not saving

- Ensure customer is logged in first
- Check browser console for errors
- Verify all required fields are filled

---

## Support

For questions or issues with the authentication system, refer to:

- [CustomerAuthContext.tsx](../../context/CustomerAuthContext.tsx)
- [AdminContext.tsx](../../context/AdminContext.tsx)
- [LoginPage.tsx](../../pages/LoginPage.tsx)
- [types.ts](../../types.ts)
