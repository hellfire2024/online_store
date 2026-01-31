# Customer Segmentation Implementation

## Overview
A fully configurable customer segmentation system has been implemented, replacing hardcoded segment values with admin-configurable rules.

## Files Modified/Created

### 1. **services/segmentationService.ts** (NEW)
- `calculateCustomerSegment(customer, rules)` - Determines segment based on priority-ordered rules
- `getSegmentName(segmentId, rules)` - Returns human-readable segment name
- `getSegmentColor(segmentId)` - Returns UI color for visualization
- Rule matching: ALL conditions must be met (AND logic)
- Priority-based: lowest number = highest priority

### 2. **types.ts** (MODIFIED)
- Added `CustomerSegmentRule` interface with:
  - `id: string` - Unique identifier
  - `name: string` - Display name
  - `minTotalSpent?: number` - Minimum customer spending
  - `minOrderCount?: number` - Minimum number of orders
  - `maxDaysSinceOrder?: number` - Days since last order (for at-risk detection)
  - `priority: number` - Evaluation order (1 = highest)
  - `enabled: boolean` - Whether segment is active
- Updated `Customer` interface: added `segment?: string` field
- Updated `SiteSettings`: added `segmentRules: CustomerSegmentRule[]`

### 3. **context/SiteSettingsContext.tsx** (MODIFIED)
- Initialized with 3 default segments:
  - VIP: priority 1, minTotalSpent $1000
  - At-Risk: priority 2, maxDaysSinceOrder 180
  - Standard: priority 3, fallback segment
- Default values ready for admin customization

### 4. **pages/admin/SettingsManagement.tsx** (MODIFIED)
- Added "segmentation" to SettingsTab type
- Added "Segmentation" tab button in tab navigation
- Added complete segmentation settings section with:
  - Form controls for each segment rule
  - Field editors: name, priority, minTotalSpent, minOrderCount, maxDaysSinceOrder
  - Enable/disable toggle for each segment
  - Delete button for each segment
  - "+ Add Segment" button to create new segments
  - Help text explaining how segmentation works
  - Save button to persist changes

### 5. **pages/admin/CustomerAnalytics.tsx** (MODIFIED)
- Updated to use stored segment values instead of hardcoded logic
- Changed `filterSegment` from union type to dynamic `string`
- Updated mock customer data to include segment field
- Added integration with `useSiteSettings()` hook
- Updated segment pie chart to use configured rules
- Updated segment dropdown filter to show dynamic rules
- Updated customer table to display segments with color coding
- Imports: `getSegmentName()` and `getSegmentColor()` from segmentationService

## How to Use

### For Admins
1. Go to Admin Panel → Settings → Segmentation tab
2. View default segments (VIP, At-Risk, Standard)
3. Edit segment properties:
   - Change names
   - Adjust priority (lower number = evaluated first)
   - Set spending/order thresholds
   - Toggle segments on/off
4. Click "+ Add Segment" to create new segment types
5. Click "Save Segmentation Settings" to persist

### For Analytics
1. Go to Customer Analytics page
2. Segments are auto-calculated from configured rules
3. Use "Segment" dropdown to filter customers
4. Pie chart shows segment distribution
5. Customer table displays each customer's assigned segment

## Technical Details

### Rule Matching Logic
- Rules evaluated by priority (lowest number first)
- First matching rule wins (customer is assigned that segment)
- All conditions in a rule must be met (AND logic)
- Blank conditions are skipped (not required)
- Example: VIP rule matches if totalSpent >= $1000

### State Management
- Segment rules stored in `SiteSettings` context
- Admin changes tracked via `settings` state in SettingsManagement
- Changes persist via `updateSiteSettings()` API call
- Segments calculated and stored on Customer objects when loaded

### Default Segments Included
1. **VIP** (priority 1): minTotalSpent $1,000
2. **At-Risk** (priority 2): maxDaysSinceOrder 180 days  
3. **Standard** (priority 3): fallback, no conditions

## Testing Checklist

- [ ] Segmentation tab appears in admin settings
- [ ] All form fields are visible and editable
- [ ] Add Segment button creates new segment
- [ ] Delete button removes segment
- [ ] Save button persists changes
- [ ] Segments appear in analytics dropdown
- [ ] Customers are assigned correct segments
- [ ] Pie chart updates with segment distribution

## Known Limitations
- Segment recalculation happens when customers are loaded in analytics
- No real-time segment reassignment (happens on data load)
- Segments stored on Customer objects, not recalculated on read

## Future Enhancements
- Real-time segment calculation on customer actions
- Segment-based email campaigns
- Segment reporting and insights
- Segment-based pricing/promotions
- Bulk segment reassignment tool
