/**
 * ============================================================================
 *  core — the framework-free calculation engine.
 *
 *  Everything the React app needs from the engine is re-exported here, so UI
 *  code imports from `@/core` and never reaches into individual files. Nothing
 *  in this folder imports React or touches the DOM (except `persistence.ts`,
 *  which guards every `window` access).
 * ============================================================================
 */

// Data shapes
export type {
  PlannerState,
  CalculationResult,
  WorkerItem,
  IncomeItem,
  ExpenseItem,
  CustomSavingsFund,
  FilingStatus,
  IncomeFrequency,
  PayoutFrequency,
  ViewMode,
} from './types';

// Calculation engine + number/currency helpers
export {
  computePlanner,
  marginalTax,
  getAnnualIncome,
  toPeriodValue,
  fmt$,
  fmtCompact$,
  fmtPct,
  num,
} from './planner';

// Starter state + local persistence
export { getDefaultSampleState, getCleanEmptyState, STORAGE_KEY, ANNUAL_MULTIPLIERS } from './starter-data';
export { safeStorage, validateAndRepairState } from './persistence';

// Active tax-year tables (consumed by the test suite; the app rarely needs these directly)
export * from './tax';
