import { Customer, CustomerSegmentRule } from '../types';

/**
 * Calculate which segment a customer belongs to based on segment rules
 * Rules are evaluated in priority order (lowest number = highest priority)
 * First matching rule determines the segment
 */
export function calculateCustomerSegment(
  customer: Customer,
  segmentRules: CustomerSegmentRule[]
): string | undefined {
  // Sort rules by priority (lowest first = highest priority)
  const sortedRules = [...segmentRules]
    .filter(rule => rule.enabled)
    .sort((a, b) => a.priority - b.priority);

  for (const rule of sortedRules) {
    if (matchesRule(customer, rule)) {
      return rule.id;
    }
  }

  return undefined;
}

/**
 * Check if a customer matches a segment rule
 * ALL conditions that are specified must be met (AND logic)
 * If a condition is undefined/null, it doesn't apply
 */
function matchesRule(customer: Customer, rule: CustomerSegmentRule): boolean {
  // Calculate total spent
  const totalSpent = customer.orders?.reduce((sum, order) => sum + (order.total || 0), 0) || 0;

  // Check minimum spending threshold
  if (rule.minTotalSpent !== undefined && totalSpent < rule.minTotalSpent) {
    return false;
  }

  // Check minimum order count
  if (rule.minOrderCount !== undefined && (!customer.orders || customer.orders.length < rule.minOrderCount)) {
    return false;
  }

  // Check maximum days since last order (at-risk customers)
  if (rule.maxDaysSinceOrder !== undefined) {
    const lastOrderDate = customer.orders && customer.orders.length > 0
      ? new Date(customer.orders[customer.orders.length - 1].createdAt).getTime()
      : new Date(customer.createdAt).getTime();
    
    const daysSinceLastOrder = (Date.now() - lastOrderDate) / (1000 * 60 * 60 * 24);
    
    // If maxDaysSinceOrder is set, customer must have ordered within that timeframe to NOT match
    // But this is an at-risk indicator, so we want customers who HAVE been inactive
    // Actually: if maxDaysSinceOrder = 180, we want customers with NO order in 180+ days
    // So check if they've been inactive longer than the threshold
    if (daysSinceLastOrder <= rule.maxDaysSinceOrder) {
      return false;
    }
  }

  return true;
}

/**
 * Get a human-readable name for a segment
 */
export function getSegmentName(segmentId: string | undefined, rules: CustomerSegmentRule[]): string {
  if (!segmentId) return 'Unassigned';
  const rule = rules.find(r => r.id === segmentId);
  return rule?.name || segmentId;
}

/**
 * Get color for a segment (for UI display)
 */
export function getSegmentColor(segmentId: string | undefined): string {
  switch (segmentId) {
    case 'vip':
      return '#0ea5e9'; // sky-500
    case 'atrisk':
      return '#eab308'; // yellow-400
    case 'standard':
      return '#64748b'; // slate-500
    default:
      return '#9ca3af'; // gray-400
  }
}
