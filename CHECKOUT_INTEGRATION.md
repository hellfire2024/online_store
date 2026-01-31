# Checkout Page Shipping Integration

## How to Add Shipping Rate Selection to CheckoutPage

### Step 1: Add Imports
```tsx
import { useShipping } from '../hooks/useShipping';
import ShippingRateSelector from '../components/ShippingRateSelector';
import { ShippingAddress, ShippingPackage, ShippingRateRequest } from '../types';
```

### Step 2: Initialize Shipping Hook
```tsx
const { 
  rates, 
  selectedRate, 
  loading: shippingLoading, 
  error: shippingError, 
  fetchRates, 
  selectRate 
} = useShipping();
```

### Step 3: Add Shipping State
```tsx
const [shippingCost, setShippingCost] = useState(0);
```

### Step 4: Helper Function to Calculate Package Weight/Dimensions
Add this function before the component returns:
```tsx
const calculatePackageDimensions = () => {
  // For now, use average dimensions
  // In production, you might store this per product
  const totalWeight = cartItems.reduce((sum, item) => sum + (item.quantity * 0.5), 0);
  
  return {
    weight: Math.max(0.5, totalWeight), // Minimum 0.5 lbs
    length: 12,
    width: 8,
    height: 6,
  };
};
```

### Step 5: Add Function to Fetch Shipping Rates
```tsx
const handleFetchShippingRates = async () => {
  if (!shippingState || !shippingZip || !siteSettings?.fromAddress) {
    addToast('Please enter complete address information', 'warning');
    return;
  }

  const toAddress: ShippingAddress = {
    name: formData.name || 'Customer',
    street1: formData.address || '',
    city: formData.city || '',
    state: shippingState,
    zip: shippingZip,
    country: 'US',
    email: formData.email || '',
    phone: '',
  };

  const parcel: ShippingPackage = calculatePackageDimensions();

  const request: ShippingRateRequest = {
    toAddress,
    fromAddress: siteSettings.fromAddress,
    parcel,
  };

  await fetchRates(request);
};
```

### Step 6: Update Tax Calculation
Modify the tax calculation to include selected shipping rate:
```tsx
// When calculating tax, use selectedRate if available
const shippingCostToUse = selectedRate 
  ? selectedRate.rate / 100 // Convert cents to dollars
  : (siteSettings?.shippingFlatRate || 5);

setShippingCost(shippingCostToUse);
```

### Step 7: Add Shipping Rate Selection UI
Add this after the address form in the checkout form:
```tsx
<div className="mt-6 p-4 bg-slate-700 rounded-lg border border-slate-600">
  <h3 className="text-lg font-semibold text-white mb-4">Shipping Method</h3>
  
  <button
    type="button"
    onClick={handleFetchShippingRates}
    disabled={shippingLoading || !shippingState || !shippingZip}
    className="mb-4 px-4 py-2 bg-sky-500 text-white rounded hover:bg-sky-600 disabled:bg-gray-500"
  >
    {shippingLoading ? 'Calculating Rates...' : 'Calculate Shipping Rates'}
  </button>

  {shippingError && (
    <div className="text-red-400 p-3 bg-red-900 rounded mb-4">
      {shippingError}
    </div>
  )}

  {rates.length > 0 && (
    <ShippingRateSelector
      rates={rates}
      selectedRate={selectedRate}
      onSelectRate={selectRate}
      loading={shippingLoading}
      error={shippingError}
    />
  )}
</div>
```

### Step 8: Update Order Placement
Update the order object to include shipping information:
```tsx
const orderDetails = {
  // ... existing order fields
  shippingMethod: selectedRate ? {
    carrier: selectedRate.carrier,
    service: selectedRate.serviceName,
    rate: selectedRate.rate,
    estimatedDays: selectedRate.estimatedDays,
    rateId: selectedRate.id,
  } : null,
  shippingCost: shippingCost,
};
```

### Step 9: Update Order Summary Display
In the order summary, display the shipping cost:
```tsx
<div className="mt-4 pt-4 border-t border-slate-600">
  <div className="flex justify-between mb-2">
    <span>Subtotal:</span>
    <span>${subtotal.toFixed(2)}</span>
  </div>
  <div className="flex justify-between mb-2">
    <span>Shipping:</span>
    <span>${shippingCost.toFixed(2)}</span>
  </div>
  <div className="flex justify-between mb-2">
    <span>Tax:</span>
    <span>${(taxCalculation.taxAmount || 0).toFixed(2)}</span>
  </div>
  <div className="flex justify-between text-lg font-bold">
    <span>Total:</span>
    <span>${((subtotal + shippingCost + (taxCalculation.taxAmount || 0))).toFixed(2)}</span>
  </div>
</div>
```

## Integration Points Summary

1. **Address Entry**: When user enters/confirms address → Calculate shipping rates
2. **Rate Selection**: When user selects a rate → Update shipping cost
3. **Tax Calculation**: Include shipping cost in tax calculations
4. **Order Creation**: Store selected shipping method in order
5. **Order Confirmation**: Display shipping method and tracking info
6. **Order Status**: Later, display tracking updates

## Error Handling

The shipping service handles:
- Missing API credentials → User-friendly error
- Invalid address → Carrier-specific error
- Multiple carrier failures → Show which ones failed
- Network errors → Retry option

## Performance Considerations

- Rates are calculated once per address entry
- Cached in component state
- Easy to clear and recalculate if address changes
- Each carrier requests are parallel (not sequential)

## Testing Checklist

- [ ] Verify rates display after address entry
- [ ] Verify rate selection updates total
- [ ] Verify tax is recalculated with shipping
- [ ] Verify order includes shipping info
- [ ] Verify fallback to flat rate if no rates
- [ ] Verify error messages display properly
- [ ] Verify shipping cost is added to order confirmation
