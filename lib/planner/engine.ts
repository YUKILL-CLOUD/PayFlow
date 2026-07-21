import type { PlannerContext, PlannerResult } from './types'
import { calculateTargets } from './allocation'
import { sortAllocations } from './waterfall'
import { distributeSalary } from './shortage'
import { generateSnapshot } from './snapshot'

/**
 * Core Planner Engine orchestrator.
 * Accepts a PlannerContext and runs it through the pure, deterministic pipeline.
 */
export function planPayday(context: PlannerContext): PlannerResult {
  // Step 1: Calculate target amounts based on recurrence due schedules
  const rawAllocations = calculateTargets(context)

  // Step 2: Apply Priority Waterfall sorting (Bills first, then Priority, then Sort Order)
  const sortedAllocations = sortAllocations(rawAllocations)

  // Step 3: Handle shortages and assign actual allocated values
  const {
    allocations,
    warnings,
    totalTarget,
    totalAllocated,
    remainingBalance,
  } = distributeSalary(sortedAllocations, context.salary)

  // Step 4: Assemble and format the final result
  return generateSnapshot(
    allocations,
    warnings,
    totalTarget,
    totalAllocated,
    remainingBalance
  )
}
export type { PlannerContext, PlannerResult }
