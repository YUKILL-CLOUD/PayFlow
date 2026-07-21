export interface PlannerContext {
  plannedPayday: string; // ISO date string of the payday being planned
  salary: number;        // Total incoming salary to allocate
  profile: any;         // User profile (currency, schedule details)
  wallets: any[];       // List of active wallets
  funds: any[];         // List of active funds
  bills: any[];         // List of active bills
  overrides?: {         // Manual overrides (e.g. variable bill amounts)
    bills?: Record<string, number>; // billId -> custom amount
    funds?: Record<string, number>; // fundId -> custom amount
  };
  accumulatedAllocations?: {
    bills?: Record<string, number>; // billId -> sum of past allocations in current cycle
    funds?: Record<string, number>; // fundId -> sum of past allocations in current cycle
  };
}

export interface PlannerWarning {
  code: 'INSUFFICIENT_FUNDS' | 'OVERDUE' | 'MISSED_TARGET' | 'MISSING_SOURCE_WALLET' | 'OTHER';
  message: string;
  allocationId?: string | null;
}

export interface PlannerAllocation {
  id: string;              // unique ID generated for this planned allocation
  billId: string | null;   // set if allocation is for a bill
  fundId: string | null;   // set if allocation is for a fund
  name: string;            // snapshot name of the bill or fund
  walletId: string;        // target wallet ID
  targetAmount: number;    // default computed target amount needed for this payday
  allocatedAmount: number; // actual amount assigned after waterfall/shortage distribution
  priority: 'critical' | 'high' | 'medium' | 'optional';
  type: 'bill' | 'fund';
  recurrenceType: string;
  dueDay: number | null;
  nextDue: string;         // ISO date of next due occurrence
  paydaysRemaining: number;// count of paydays remaining before next due date
  sortOrder: number;
}

export interface PlannerResult {
  allocations: PlannerAllocation[];
  warnings: PlannerWarning[];
  totalTarget: number;     // Sum of all target amounts
  totalAllocated: number;  // Sum of all allocated amounts
  remainingBalance: number;// Salary minus totalAllocated (surplus)
  computedAt: string;      // ISO string timestamp
  planner_version: number;
}
