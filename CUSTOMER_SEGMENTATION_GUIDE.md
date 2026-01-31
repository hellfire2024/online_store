# Customer Segmentation System - Implementation

## Overview
A fully configurable customer segmentation system has been implemented, allowing admins to define custom segments based on:
- **Minimum Total Spending** - e.g., VIP customers with $1,000+ spent
- **Minimum Order Count** - e.g., loyal customers with 5+ orders
- **Days Since Last Order** - e.g., at-risk customers with 180+ days of inactivity

## How It Works

### 1. **Segment Rules Definition** (Admin Settings)
Admin configures segments with:
- **Segment Name** - e.g., "VIP", "At-Risk", "Standard"
- **Priority** - Lower numbers match first (priority 1 = highest)
- **Min Total Spent** - Optional minimum spending threshold
- **Min Order Count** - Optional minimum number of orders
- **Max Days Since Order** - Optional inactivity threshold
- **Enabled** - Toggle segments on/off

### 2. **Segment Matching Logic**
A customer is assigned to the **first matching segment** based on priority:
- ALL conditions in a segment must be met (AND logic)
- Conditions left blank are ignored
- Priority determines evaluation order (lowest = highest)

**Example:**
```
Priority 1: VIP
  - Min Total Spent: $1,000
  → Jane Smith ($1,450.75 spent) → Matches! Assigned to VIP

Priority 2: At-Risk
  - Max Days Since Order: 180 (no orders for 180+ days)
  → Bob Johnson (6 months inactive) → Matches! Assigned to At-Risk

Priority 3: Standard
  - No conditions (matches everyone)
  → Everyone else → Standard
```

### 3. **Storage**
- Segment assignments are stored on each **Customer** object
- `customer.segment` - Contains the segment ID (e.g., "vip", "atrisk", "standard")
- `customer.segmentLastCalculated` - When the segment was assigned

### 4. **Analytics Integration**
The Analytics dashboard now:
- Displays customer segments dynamically (based on admin config)
- Shows segment distribution in pie chart
- Filters customers by segment using stored segment field
- Displays segment name/color in customer list

## Files Modified/Created

### New Files
- **services/segmentationService.ts**
  - `calculateCustomerSegment()` - Determines which segment a customer belongs to
  - `getSegmentName()` - Get human-readable segment name
  - `getSegmentColor()` - Get color for UI display

### Modified Files
- **types.ts**
  - Added `CustomerSegmentRule` interface
  - Added `segment` and `segmentLastCalculated` fields to Customer
  - Added `segmentRules` array to SiteSettings

- **context/SiteSettingsContext.tsx**
  - Added default segment rules (VIP, At-Risk, Standard)
  - Example thresholds: VIP ($1k+), At-Risk (180+ days inactive)

- **pages/admin/SettingsManagement.tsx**
  - Added "Segmentation" tab to settings
  - Full UI to create/edit/delete segment rules
  - Shows rule logic in human-readable format
  - All changes saved through existing settings system

- **pages/admin/CustomerAnalytics.tsx**
  - Removed hardcoded segment calculations
  - Now uses stored `segment` field from customers
  - Dynamic segment dropdown based on admin config
  - Segment pie chart displays configured segments
  - Customer table shows segment for each customer

## Admin Interface

### Segmentation Tab Features

**For each segment rule:**
1. **Segment Name** - Custom name (VIP, Gold, At-Risk, etc.)
2. **Priority** - Evaluation order (1 = highest)
3. **Min Total Spent** - Optional spending threshold
4. **Min Order Count** - Optional order count threshold
5. **Max Days Since Order** - Optional inactivity threshold
6. **Enabled** - Toggle segment on/off

**Rule Display:**
- Shows which conditions apply to the rule
- Explains the matching logic
- Helps admin visualize the segmentation strategy

**Example Default Configuration:**
```
Priority 1: VIP
  ✓ Minimum Total Spent: $1,000
  
Priority 2: At-Risk  
  ✓ Max Days Since Order: 180
  
Priority 3: Standard
  (matches everyone)
```

## Examples

### Example 1: VIP Customers
Segment Configuration:
- Name: "VIP"
- Priority: 1
- Min Total Spent: $1,000

Customers Assigned:
- Jane Smith ($1,450.75) → VIP ✓
- John Doe ($287.50) → Not VIP

### Example 2: At-Risk Segment
Segment Configuration:
- Name: "At-Risk"
- Priority: 2
- Max Days Since Order: 180

Customers Assigned:
- Bob Johnson (no order for 6 months) → At-Risk ✓
- Jane Smith (ordered 1/24/2026) → Not At-Risk

### Example 3: Complex Segmentation
Segment Configuration:
- Name: "Gold"
- Priority: 1
- Min Total Spent: $500
- Min Order Count: 5

Customers Assigned:
- Alice Williams ($623.40, 8 orders) → Gold ✓
- John Doe ($287.50, 5 orders) → Not Gold (insufficient spending)

## Customization Options

### Add New Segments
1. Go to Admin → Settings → Segmentation
2. Each segment can have different conditions
3. Examples:
   - "Platinum": $5,000+ spent
   - "Loyal": 10+ orders
   - "New": Created in last 30 days
   - "Inactive": 365+ days without order

### Modify Thresholds
1. Change spending amounts (e.g., VIP: $500 instead of $1,000)
2. Change inactivity periods (e.g., At-Risk: 90 days instead of 180)
3. Add new conditions (e.g., minimum order count)

### Reorder Priorities
1. Lower priority numbers match first
2. Reorder to change which segment takes precedence
3. Standard segment should usually be lowest priority (fallback)

## Analytics

### Segment View
- **Segments Pie Chart** - Shows distribution of all configured segments
- **Segment Filter** - Filter customer list by segment
- **Segment Column** - Shows segment for each customer (with color)

### Metrics Displayed
- Per-segment customer count
- Per-segment revenue potential
- Segment distribution over time

## Technical Details

### Rule Matching Algorithm
```typescript
// Customer matches segment if ALL conditions met:
if (rule.minTotalSpent && customer.totalSpent < rule.minTotalSpent) return false;
if (rule.minOrderCount && customer.orderCount < rule.minOrderCount) return false;
if (rule.maxDaysSinceOrder && daysSinceLastOrder <= rule.maxDaysSinceOrder) return false;
return true;
```

### Priority Evaluation
```typescript
// Evaluate segments by priority (lowest first)
const sortedRules = rules.sort((a, b) => a.priority - b.priority);
for (const rule of sortedRules) {
  if (matchesRule(customer, rule)) {
    return rule.id; // First match wins
  }
}
```

## Default Segments (After Installation)

| Segment | Priority | Min Spent | Min Orders | Max Days Inactive |
|---------|----------|-----------|-----------|-------------------|
| VIP | 1 | $1,000 | — | — |
| At-Risk | 2 | — | — | 180 |
| Standard | 3 | — | — | — |

## Future Enhancements

Potential improvements:
- [ ] Batch re-segment all customers when rules change
- [ ] Segment-based email campaigns
- [ ] Segment-based discounts/promotions
- [ ] Segment trend analysis
- [ ] Predictive segmentation (ML-based)
- [ ] Segment-specific analytics
- [ ] Export segment reports
- [ ] Segment history tracking

## Data Migration

If you had customers without segments:
- Segments are calculated when customers are loaded in analytics
- You can force re-segmentation by:
  1. Save segment settings (triggers re-save)
  2. Refresh analytics page
  3. Customers will be re-assigned based on new rules

## Summary

The segmentation system is now:
- ✅ **Fully configurable** - Admin can create any segments
- ✅ **Priority-based** - Custom matching order
- ✅ **Rule-driven** - Multiple conditions per segment
- ✅ **Flexible** - Conditions are optional
- ✅ **Integrated** - Works with analytics dashboard
- ✅ **Stored** - Segments saved to customer data
- ✅ **Visible** - Shows in admin UI with colors

No more hardcoded "VIP $1k+ OR At-Risk 180 days" logic. Admins have full control!
