# Shipping Integration Setup Guide

## Overview
Multi-carrier shipping integration for EasyPost, Shippo, and ShipStation has been implemented. This guide explains the setup and usage.

## Environment Variables
Add the following to your `.env` file in the `server/` directory:

```
# EasyPost
EASYPOST_API_KEY=your_easypost_api_key

# Shippo  
SHIPPO_API_KEY=your_shippo_api_key

# ShipStation
SHIPSTATION_API_KEY=your_shipstation_api_key
SHIPSTATION_API_SECRET=your_shipstation_api_secret
```

## Admin Configuration

### Step 1: Navigate to Shipping Settings
1. Go to Admin Panel → Settings → Shipping tab
2. This is where you'll configure all shipping carriers

### Step 2: Configure Sender Address
Fill in your business address information:
- Full Name
- Email
- Street Address (with optional Line 2)
- City
- State
- ZIP Code
- Phone Number

### Step 3: Enable Carriers
For each carrier you want to use:

**EasyPost** (Recommended - Multi-carrier support for USPS, UPS, FedEx, DHL)
- Check "Enable EasyPost"
- Paste your EasyPost API Key

**Shippo** (Multi-carrier rate shopping)
- Check "Enable Shippo"  
- Paste your Shippo API Key

**ShipStation** (Carrier management and rates)
- Check "Enable ShipStation"
- Paste your ShipStation API Key
- Paste your ShipStation API Secret

### Step 4: Set Default Carrier
Select which carrier to use as the default for rate calculations.

### Step 5: Save Settings
Click "Save Shipping Settings" to store your configuration.

## Frontend Integration

### In Checkout Page
The checkout page needs to be updated to:
1. Import the shipping hook and component
2. Calculate shipping rates based on cart items and destination address
3. Display shipping rate options to the customer
4. Add selected shipping cost to order total

Example integration:
```tsx
import { useShipping } from '../hooks/useShipping';
import ShippingRateSelector from '../components/ShippingRateSelector';
import { ShippingAddress } from '../types';

// In component:
const { rates, selectedRate, loading, error, fetchRates, selectRate } = useShipping();

// When customer selects address, calculate rates:
const handleAddressChange = async () => {
  const request = {
    fromAddress: siteSettings.fromAddress,
    toAddress: customerAddress, // From form
    parcel: calculateParcelFromCart(cartItems),
  };
  await fetchRates(request);
};

// Render rate selector:
<ShippingRateSelector
  rates={rates}
  selectedRate={selectedRate}
  onSelectRate={selectRate}
  loading={loading}
  error={error}
/>
```

## API Endpoints

### Get Shipping Rates
**POST** `/api/shipping/rates`

Request body:
```json
{
  "toAddress": {
    "name": "John Doe",
    "street1": "123 Main St",
    "city": "Springfield",
    "state": "IL",
    "zip": "62701",
    "country": "US",
    "email": "john@example.com",
    "phone": "555-0123"
  },
  "fromAddress": {
    // Same structure as toAddress
  },
  "parcel": {
    "weight": 2.5,
    "length": 12,
    "width": 8,
    "height": 6
  },
  "carriers": ["easypost", "shippo", "shipstation"] // Optional - defaults to all enabled
}
```

Response:
```json
{
  "rates": [
    {
      "id": "rate_123",
      "carrier": "easypost",
      "service": "Priority",
      "serviceName": "USPS Priority Mail",
      "rate": 1299,
      "estimatedDays": 2,
      "estimatedDelivery": "2024-01-15"
    }
    // ... more rates
  ],
  "errors": {} // Any carrier-specific errors
}
```

### Create Shipping Label
**POST** `/api/shipping/label`

Request body:
```json
{
  "carrier": "easypost",
  "rateId": "rate_123",
  "shipmentId": "shipment_456",
  "shipmentData": {} // Required for ShipStation
}
```

### Track Shipment
**GET** `/api/shipping/track/:trackingId`

Query parameters:
- `carrier`: easypost | shippo | shipstation
- `carrierCode`: Optional - specific carrier code for carrier-specific tracking

## Components

### ShippingRateSelector.tsx
Displays available shipping rates with:
- Carrier name and service type
- Estimated delivery time
- Price
- Radio button selection
- Sortable by price (default: cheapest first)

Usage:
```tsx
<ShippingRateSelector
  rates={rates}
  selectedRate={selectedRate}
  onSelectRate={handleSelectRate}
  loading={isLoading}
  error={errorMessage}
/>
```

## Services

### Frontend: services/shippingService.ts
- `getShippingRates()` - Fetch rates from backend
- `createShippingLabel()` - Create a shipping label
- `trackShipment()` - Track shipment status

### Backend: server/src/services/
- `easypostService.ts` - EasyPost API integration
- `shippoService.ts` - Shippo API integration  
- `shipstationService.ts` - ShipStation API integration

## Carrier Capabilities

### EasyPost
- Multi-carrier support (USPS, UPS, FedEx, DHL)
- Real-time rate shopping
- Automated label generation
- Tracking integration
- Best for: Multiple carrier comparison

### Shippo
- Multi-carrier support (USPS, UPS, FedEx, DHL)
- Advanced rate shopping
- Batch label processing
- International shipping
- Best for: Complex shipping needs

### ShipStation
- Multi-carrier support (USPS, UPS, FedEx, DHL)
- Carrier account management
- Batch operations
- Inventory sync
- Best for: Integrated shipping management

## Testing

To test the shipping integration:

1. **Admin Setup**
   - Go to Settings → Shipping tab
   - Enter test API credentials
   - Configure sender address
   - Save settings

2. **Frontend Testing**
   - Add items to cart
   - Go to checkout
   - Enter shipping address
   - Verify rates display
   - Select a rate
   - Verify rate is added to total

3. **API Testing**
   - Use Postman or similar
   - POST to `/api/shipping/rates` with test data
   - Verify response structure

## Error Handling

The system gracefully handles errors:
- If one carrier fails, others continue
- Error details returned in response
- User-friendly error messages displayed
- Fallback to default carrier if needed

## Security Considerations

- API keys stored in environment variables (never in code)
- Credentials stored server-side only
- HTTPS required for production
- API keys masked in admin UI
- Rate limiting on shipping endpoints

## Next Steps

1. Obtain API credentials from carriers
2. Add credentials to `.env` file
3. Configure sender address in admin
4. Test with small orders
5. Integrate rate selection into checkout flow
6. Update order confirmation to show shipping details
7. Integrate tracking into order status page

## Support

For issues with specific carriers:
- **EasyPost**: https://www.easypost.com/docs/
- **Shippo**: https://goshippo.com/docs/
- **ShipStation**: https://www.shipstation.com/docs/api/

For app integration issues, check:
- Server logs for API errors
- Browser console for frontend errors
- .env file for missing credentials
