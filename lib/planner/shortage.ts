import type { PlannerAllocation, PlannerWarning } from './types'

/**
 * Step 3: Shortage & Allocation Distribution.
 * Distributes salary sequentially across sorted allocations and gathers structured warning logs.
 */
export function distributeSalary(
  sortedAllocations: PlannerAllocation[],
  salary: number
): {
  allocations: PlannerAllocation[];
  warnings: PlannerWarning[];
  totalTarget: number;
  totalAllocated: number;
  remainingBalance: number;
} {
  let remainingSalary = salary
  let totalTarget = 0
  let totalAllocated = 0
  const warnings: PlannerWarning[] = []

  const resultAllocations = sortedAllocations.map((alloc) => {
    totalTarget += alloc.targetAmount

    // Check for validation warning: Missing wallet
    if (!alloc.walletId) {
      warnings.push({
        code: 'MISSING_SOURCE_WALLET',
        message: `${alloc.type === 'bill' ? 'Bill' : 'Fund'} "${alloc.name}" is missing a destination/source wallet.`,
        allocationId: alloc.id,
      })
    }

    let assignedAmount = 0

    if (remainingSalary > 0) {
      if (remainingSalary >= alloc.targetAmount) {
        assignedAmount = alloc.targetAmount
        remainingSalary -= alloc.targetAmount
      } else {
        // Partial allocation due to shortage
        assignedAmount = remainingSalary
        remainingSalary = 0

        warnings.push({
          code: 'INSUFFICIENT_FUNDS',
          message: `${alloc.type === 'bill' ? 'Bill' : 'Fund'} "${alloc.name}" could only be partially funded (allocated ${assignedAmount} of ${alloc.targetAmount}).`,
          allocationId: alloc.id,
        })
      }
    } else if (alloc.targetAmount > 0) {
      // Zero allocation due to shortage
      warnings.push({
        code: 'INSUFFICIENT_FUNDS',
        message: `${alloc.type === 'bill' ? 'Bill' : 'Fund'} "${alloc.name}" was not funded.`,
        allocationId: alloc.id,
      })
    }

    totalAllocated += assignedAmount

    return {
      ...alloc,
      allocatedAmount: Math.round(assignedAmount * 100) / 100, // round to 2 decimal places
    }
  })

  return {
    allocations: resultAllocations,
    warnings,
    totalTarget: Math.round(totalTarget * 100) / 100,
    totalAllocated: Math.round(totalAllocated * 100) / 100,
    remainingBalance: Math.round(remainingSalary * 100) / 100,
  }
}
