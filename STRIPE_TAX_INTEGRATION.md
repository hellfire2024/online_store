# Stripe Tax Integration

## Overview

The online store now supports automatic sales tax calculation using Stripe Tax API as the primary method, with manual tax rules as a fallback.

## Features

### Tax Provider Options

1. **Stripe Tax (Recommended)** - Automatic tax calculation via Stripe API
   - Accurate sales tax by state and ZIP code
   - Handles nexus and compliance automatically
   - No manual state-by-state configuration needed
   - Requires Stripe account with Tax enabled

2. **Manual Rules** - Fallback rule-based system
   - Configure tax rates by state manually
   - Used when Stripe API is unavailable
   - Available as backup option

## Setup

### 1. Environment Configuration

Add your Stripe secret key to the server environment:

```bash
# server/.env
STRIPE_SECRET_KEY=sk_live_...
```

### 2. Admin Configuration

1. Navigate to **Admin → Settings → Tax Rules** tab
2. Select **Tax Provider**: Choose "Stripe Tax (Recommended)" or "Manual Rules"
3. If using Stripe Tax:
   - Enter your Stripe API Key
   - Get your key from: https://dashboard.stripe.com/apikeys
4. Save settings

### 3. Demo Mode

For testing without a Stripe account, the app uses a demo tax calculation endpoint that simulates Stripe Tax with hardcoded state rates:

- California: 8.625%
- New York: 8.875%
- Texas: 8.25%
- Florida: 7.0%
- Washington: 10.4%
- Oregon: 0%

## Implementation Details

### Backend

**Endpoint**: `POST /api/tax/calculate`

**Request**:
```json
{
  "cartItems": [...],
  "shippingCost": 10.00,
  "shippingState": "CA",
  "shippingZip": "90210"
}
```

**Response**:
```json
{
  "subtotal": 100.00,
  "taxableAmount": 100.00,
  "taxRate": 8.625,
  "taxAmount": 8.63,
  "total": 118.63,
  "stripeTaxTransactionId": "taxcalc_..."
}
```

**Files**:
- `server/src/routes/tax.ts` - Stripe Tax API integration
- `server/src/demoRoutes.ts` - Demo tax calculation

### Frontend

**Checkout Page**:
- Real-time tax calculation when state/ZIP changes
- Shows "💳 Stripe Tax" indicator when using Stripe API
- Falls back to manual calculation on API errors
- Loading state during calculation

**Settings Page**:
- Tax provider selector
- Stripe API key input (password field)
- Conditional UI - manual rules hidden when using Stripe Tax
- Save settings with validation

**Files**:
- `pages/CheckoutPage.tsx` - Async tax calculation
- `pages/admin/SettingsManagement.tsx` - Tax provider configuration
- `services/stripeTaxService.ts` - API wrapper
- `types.ts` - TaxConfig interface

## Type Definitions

```typescript
interface TaxConfig {
  provider: "manual" | "stripe"; // Which tax provider to use
  enableTaxCollection: boolean;
  defaultTaxRate: number; // Fallback rate
  taxIncludedInPrice: boolean;
  stripeApiKey?: string; // For Stripe Tax integration
  rules?: TaxRule[]; // Manual rules (optional)
}
```

## Fallback Behavior

The system gracefully handles failures:

1. **Stripe API Unavailable**: Falls back to manual calculation
2. **No Stripe Key**: Uses manual rules
3. **Demo Mode**: Simulates Stripe Tax with state rates
4. **Network Errors**: Shows toast notification and uses fallback

## Testing

1. **With Stripe Account**:
   - Add items to cart
   - Go to checkout
   - Select state and enter ZIP code
   - Verify tax calculation displays "💳 Stripe Tax"
   - Check browser console for API calls

2. **Demo Mode** (without Stripe):
   - Tax calculations work with hardcoded rates
   - No "💳 Stripe Tax" indicator
   - Uses `/demo/tax/calculate` endpoint

3. **Manual Rules**:
   - Switch provider to "Manual Rules" in settings
   - Configure state-specific rates
   - Test checkout with configured states

## Benefits

### Before (Manual Only)
- Site owner must configure all 50 US states manually
- Burdensome data entry process
- Manual rate updates required
- No ZIP code precision

### After (Stripe Tax)
- Zero configuration for tax rates
- Automatic state and ZIP code accuracy
- Stripe handles nexus and compliance
- Manual rules available as fallback
- Simplified admin UX

## API Documentation

- [Stripe Tax API](https://stripe.com/docs/tax)
- [Tax Calculations](https://stripe.com/docs/api/tax/calculations)
- [Stripe Dashboard](https://dashboard.stripe.com/tax)
