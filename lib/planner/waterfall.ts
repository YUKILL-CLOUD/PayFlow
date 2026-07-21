import type { PlannerAllocation } from './types'

const PRIORITY_MAP: Record<string, number> = {
  critical: 1,
  high: 2,
  medium: 3,
  optional: 4,
}

/**
 * Step 2: Waterfall Sort.
 * Sorts allocations: Bills first, then priority levels, then user-defined sortOrder.
 */
export function sortAllocations(allocations: PlannerAllocation[]): PlannerAllocation[] {
  return [...allocations].sort((a, b) => {
    // 1. Group check: Bills always precede Funds
    if (a.type !== b.type) {
      return a.type === 'bill' ? -1 : 1
    }

    // 2. Priority check: Critical -> High -> Medium -> Optional
    const aPriority = PRIORITY_MAP[a.priority] ?? 3
    const bPriority = PRIORITY_MAP[b.priority] ?? 3
    if (aPriority !== bPriority) {
      return aPriority - bPriority
    }

    // 3. User sort order check
    if (a.sortOrder !== b.sortOrder) {
      return a.sortOrder - b.sortOrder
    }

    // Fallback alphabetic
    return a.name.localeCompare(b.name)
  })
}
