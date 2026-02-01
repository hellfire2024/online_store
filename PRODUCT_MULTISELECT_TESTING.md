# Product Multi-Select Testing Guide

## Changes Made

### 1. ProductDetailPage.tsx
- **Line 42**: Changed `selectedOptions` state from `{ [listId: string]: string }` to `{ [listId: string]: string[] }`
- **Lines 58-68**: Updated initialization to use empty arrays instead of selecting first option
- **Lines 232-269**: Converted dropdown `<select>` to checkbox inputs for multi-select support
- **Lines 93-120**: Updated `handleAddToCart` to iterate through multiple selected options per list

### 2. CartPage.tsx
- **Lines 15-36**: Updated option price calculation to handle both new (array) and old (string) formats for backwards compatibility
- Now iterates through `selectedOptionIds` array for each option list

### 3. CheckoutPage.tsx
- **Lines 47-67**: Updated subtotal calculation for multi-select options
- **Lines 190-208**: Updated order details option processing for multi-select options
- Both locations include fallback support for old single-select format

## Testing Procedures

### Test 1: Multi-Select Options Display
1. Navigate to a product page with option lists
2. **Expected**: Option lists should display as checkboxes (not dropdown)
3. **Verify**: Each option is labeled with its price delta format "(+$X.XX)"

### Test 2: Multiple Selection
1. In a product with multiple options per list, select 2+ options
2. **Expected**: Multiple checkboxes can be checked simultaneously
3. **Verify**: Each selected option updates the `selectedOptions` state

### Test 3: Price Calculation
1. Select multiple options with various price deltas
2. **Expected**: Price display should show: base price + sum of all selected option deltas + custom text cost
3. **Verify**: Price updates correctly as options are toggled

### Test 4: Add to Cart
1. Select multiple options and click "Add to Cart"
2. **Expected**: Cart item should include all selected options
3. **Verify**: Cart displays all selected options with proper formatting

### Test 5: Cart Display
1. Add a product with multiple selected options to cart
2. Navigate to Cart page
3. **Expected**: All selected options should be displayed with their list names
4. **Verify**: Price includes all option deltas

### Test 6: Checkout Processing
1. Add a product with multiple selected options to cart
2. Proceed to checkout
3. **Expected**: Order summary shows all selected options
4. **Verify**: Final total includes all option price deltas

### Test 7: Required Options Validation
1. Create an option list with `required: true`
2. Try to add product to cart without selecting any options
3. **Expected**: Alert: "Please select at least one option for [ListName]"
4. **Verify**: Product not added to cart until validation passes

### Test 8: Optional Options
1. Create an option list with `required: false`
2. Try to add product without selecting any options from this list
3. **Expected**: Product added successfully without this option
4. **Verify**: Cart item shows empty selection for optional list

## Known Issues & Debugging

### Issue: Spurious "0" Display
- **Possible Cause**: Could be from old code still rendering first selected option index
- **Fix Applied**: Initialization changed to empty arrays instead of default selections
- **Testing**: Verify no "0" appears in option list rendering

### Issue: Image Preview Not Showing After Save
- **Root Cause**: Likely imageUrl not being properly persisted or displayed
- **Check Points**:
  1. Verify ProductModel.update() saves imageUrl to database
  2. Confirm ProductDetailPage receives updated product with imageUrl
  3. Check if `<img src={product.imageUrl}>` resolves correctly
- **Solution**: Ensure API properly returns imageUrl in updated product object

### Issue: Broken Link
- **Context**: Red arrow in screenshot indicates a link issue
- **Likely Locations**:
  1. Product list item links to detail page
  2. Navigation links in Product Options section
  3. Gallery image links
- **Debugging**: Inspect element to find which href is broken

## Backwards Compatibility

The CartPage and CheckoutPage have fallback logic:
```typescript
if (Array.isArray(selectedOptionIds)) {
  // Handle new multi-select format (array)
} else {
  // Fallback for old single-select format (string)
}
```

This allows existing cart data with old format to continue working.

## Performance Notes

- Multi-select operations are O(n) where n = number of options per list
- Checkbox toggling uses array operations (push/filter) - efficient for small arrays
- Price calculation now iterates multiple times per list (one per selected option) - still O(n) overall

## Related Files Modified
- pages/ProductDetailPage.tsx
- pages/CartPage.tsx
- pages/CheckoutPage.tsx
- context/ProductContext.tsx (already uses API)
- services/apiClient.ts (already has product methods)
