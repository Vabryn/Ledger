/**
 * =======================================================================
 * DATA TYPES & INTERFACES FOR HOUSEHOLD LEDGER
 * =======================================================================
 * This file defines the core TypeScript structures used across the app.
 */

export type ViewMode = 'years' | 'months';


export type IncomeFrequency = 'Hourly' | 'Daily' | 'Weekly' | 'Biweekly' | 'Bi-Monthly' | 'Monthly' | 'Annually';

export type PayoutFrequency = 'Daily' | 'Weekly' | 'Biweekly' | 'Monthly' | 'Annually';

export type FilingStatus = 'Married' | 'Single' | 'HeadOfHousehold' | 'MarriedSeparate';

/**
 * Represents an Income Earner in the Income section.
 * - `frequency`: Frequency of salary/wage: 'Hourly', 'Daily', 'Weekly', 'Biweekly', 'Monthly', 'Annually'
 * - `hours`: Array of hours worked per week (used when frequency === 'Hourly')
 * - `wage`: Wage/salary rate per frequency period for each column (raw value)
 */
export interface WorkerItem {
  id: string;
  name: string;
  frequency: IncomeFrequency;
  hours: number[];
  wage: number[];
}

/**
 * Represents an additional or non-wage income stream.
 * - `frequency`: Independent payout frequency (Weekly, Biweekly, Monthly, Annually, etc.)
 * - `amount`: Raw amount per frequency period for each column
 */
export interface IncomeItem {
  id: string;
  name: string;
  frequency: PayoutFrequency;
  amount: number[];
}

/**
 * Represents an expense item.
 * - `cat`: The category group (e.g. 'Housing', 'Food', 'Transportation', 'Utilities', 'Subscriptions', 'Additional Payments', 'Health & Wellness', 'Lifestyle', 'Business Expenses', 'Entertainment')
 * - `monthly`: Base monthly amount for each column
 */
export interface ExpenseItem {
  id: string;
  name: string;
  cat: string;
  monthly: number[];
}

/**
 * Custom Savings Fund representation stored in a flat key-value lookup map.
 * Guaranteed instant O(1) dictionary lookups.
 */
export interface CustomSavingsFund {
  id: string;
  name: string;
  color: string;
  enabledInChart: boolean;
  monthly: number[]; // monthly contribution per column
  targetAmount?: number;
}

/**
 * Complete state tree for the application.
 */
export interface PlannerState {

  /** Column view toggle: 'years' or 'months' */
  viewMode: ViewMode;

  /** Number of projection columns (typically 1 to 10) */
  years: number;

  /** Starting calendar year for projections (e.g. 2025). Defaults to 2025 if omitted. */
  startYear?: number;

  /** Order of the section cards on the page */
  sectionOrder: string[];

  /** Collapsed/expanded state of expense categories */
  collapsedCats: Record<string, boolean>;

  /** Toggle whether the "Other Income" table is visible */
  showOtherIncome: boolean;

  /** Light / Dark mode toggle */
  darkMode: boolean;

  /** Edit mode toggle (enables drag-and-drop reordering and structural table edits) */
  isEditMode: boolean;

  /** SVG chart type: 'area' (trend curves) or 'grouped' (side-by-side bars) */
  graphType: 'area' | 'grouped';

  /** Series visibility toggles in the chart */
  graphToggles: {
    gross: boolean;
    colOnly: boolean;
    save: boolean;
    retire: boolean;
    [customFundId: string]: boolean;
  };

  /** Hex color palette for each chart series */
  barColors: {
    gross: string;
    colOnly: string;
    save: string;
    retire: string;
    [customFundId: string]: string;
  };

  /** Tax filing status */
  taxStatus: FilingStatus;

  /** State/local tax jurisdiction for each column ('CA', 'NY', 'NYC', 'YONKERS', 'NONE') */
  st: string[];

  /** Number of tax dependents for each column */
  deps: number[];

  /** Additional tax deductions (per column) */
  additionalDeductions: number[];

  /** Toggle FICA taxes (Social Security & Medicare) */
  fica: boolean;

  /** Heat map styling properties for expenses */
  colIntensity: number;
  colContrast: number;
  colHue: string;

  /** Income Earner rows */
  workers: WorkerItem[];

  /** Other income stream rows */
  other: IncomeItem[];

  /** Cost-of-living expense rows */
  col: ExpenseItem[];

  /** Target retirement savings rate (% of Gross) per column */
  retireRate: number[];

  /** Employer Match % inside retirement calculation per column */
  employerMatchRate: number[];

  /**
   * Flat Key-Value Lookup Map for Custom Savings Accounts
   * Indexed by unique string ID (e.g., customSavings[fundId])
   */
  customSavings: Record<string, CustomSavingsFund>;

  /** Category order in the expense section */
  catOrder: string[];

  /** Editable header text strings */
  eyebrowText: string;
  titleText: string;
  subText: string;
}

/**
 * Calculated financial results produced by `computePlanner(state)`.
 */
export interface CalculationResult {
  /** View mode used for calculation ('years' | 'months') */
  viewMode: ViewMode;

  /** Multiplier used to normalize annual to period (1 for years, 1/12 for months) */
  periodScale: number;

  /** Gross Income per period */
  g: number[];

  /** Annualized Gross Income */
  grossAnnual: number[];

  /** Federal Income Tax per period */
  fed: number[];

  /** State & Local Income Tax per period */
  stTax: number[];

  /** FICA Taxes (Social Security + Medicare) per period */
  fica: number[];

  /** Net Take-Home Pay per period (gross - taxes) */
  net: number[];

  /** Overhead Living Expenses per period (excluding retirement & savings goals) */
  colOnly: number[];

  /** Total Retirement contributions (Employee + Employer Match) per period */
  retireActual: number[];

  /** Employee-only Retirement contributions per period */
  employeeRetireContrib: number[];

  /** Employer match contributions per period */
  employerMatchAmount: number[];

  /** Roth IRA portion contributed per period */
  rothArr: number[];

  /** 401(k) employee portion contributed per period */
  k401Arr: number[];

  /** Target retirement dollar amount per period */
  retireTarget: number[];

  /** Custom Savings Total per period across all custom savings funds */
  customSavingsTotal: number[];

  /** Total Savings per period (Net Income - Living Expenses) */
  savings: number[];

  /** Cumulative / Over-Time Net Savings (running sum) */
  savingsOT: number[];

  /** Cumulative retirement contributions over time (running sum) */
  retireOT: number[];

  /**
   * Remaining Unallocated Balance:
   * Net Take-Home - Overhead Living Expenses - Retirement Contributions - Custom Savings Goals
   */
  unallocatedBalance: number[];

  /** Peak period cost-of-living (used for relative heat map scaling) */
  maxGlobalCost: number;

  /** Per-fund period values indexed by fund ID */
  fundValues: Record<string, number[]>;

  /** Validation alerts per column for employee contribution caps */
  retirementAlerts: {
    column: number;
    hasError: boolean;
    rothExceeded: boolean;
    k401Exceeded: boolean;
    combinedExceeded: boolean;
    message?: string;
  }[];
}
