import type { PlannerAllocation, PlannerWarning, PlannerResult } from './types'

/**
 * Step 4: Snapshot Generation.
 * Formats the raw distribution stats into the final planner result including planner versioning.
 */
export function generateSnapshot(
  allocations: PlannerAllocation[],
  warnings: PlannerWarning[],
  totalTarget: number,
  totalAllocated: number,
  remainingBalance: number
): PlannerResult {
  return {
    allocations,
    warnings,
    totalTarget,
    totalAllocated,
    remainingBalance,
    computedAt: new Date().toISOString(),
    planner_version: 1, // Locks the engine execution output details version
  }
}
