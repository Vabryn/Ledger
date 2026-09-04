import { PlannerState, CustomSavingsFund } from './types';

/**
 * App-local state: starter data, storage key, frequency multipliers.
 * Tax tables live in `core/tax/`.
 */

// Storage Key for Local Browser Persistence
export const STORAGE_KEY = 'household_ledger_state_v3';

/**
 * Multiplier factors to normalize a frequency to Annual Gross.
 * Canonical keys match the IncomeFrequency / PayoutFrequency unions; the extra
 * spelling aliases are accepted for imported/legacy state and are all
 * unambiguous (`Biweekly` = every 2 weeks = 26/yr; `Bi-Monthly` here is used in
 * the semi-monthly sense = twice a month = 24/yr, per the app's own labels).
 */
export const ANNUAL_MULTIPLIERS: Record<string, number> = {
  Hourly: 52, // hours * wage * 52
  Daily: 260, // 5 days/wk * 52 wks
  Weekly: 52,
  Biweekly: 26,
  'Bi-weekly': 26,
  'Bi-Monthly': 24,
  'Bi-monthly': 24,
  'Semi-monthly': 24,
  'Semi-Monthly': 24,
  Monthly: 12,
  Quarterly: 4,
  'Semi-annually': 2,
  'Semi-Annually': 2,
  Annually: 1,
};

/**
 * Default sample starter state for new users or when clicking "Sample".
 * Prefilled with a realistic 6-year career & cost-of-living projection.
 */
export function getDefaultSampleState(): PlannerState {
  const YEARS = 6;

  const defaultCustomSavings: Record<string, CustomSavingsFund> = {
    'sav-emergency': {
      id: 'sav-emergency',
      name: 'Emergency Fund',
      color: '#3B82F6',
      enabledInChart: true,
      monthly: [500, 500, 500, 500, 500, 500],
      targetAmount: 30000,
    },
    'sav-vacation': {
      id: 'sav-vacation',
      name: 'Vacation Fund',
      color: '#EC4899',
      enabledInChart: true,
      monthly: [200, 200, 200, 400, 400, 400],
      targetAmount: 10000,
    },
    'sav-college': {
      id: 'sav-college',
      name: 'College Fund',
      color: '#8B5CF6',
      enabledInChart: false,
      monthly: [150, 150, 200, 250, 300, 300],
      targetAmount: 50000,
    },
  };

  return {
    viewMode: 'years',
    years: YEARS,
    startYear: 2025,
    sectionOrder: ['sec-income', 'sec-taxes', 'sec-expenses', 'sec-retire', 'sec-summary'],
    collapsedCats: {},
    showOtherIncome: true,
    darkMode: false,
    isEditMode: false,
    graphType: 'area',
    graphToggles: {
      gross: true,
      colOnly: true,
      save: true,
      retire: true,
      'sav-emergency': true,
      'sav-vacation': true,
    },
    barColors: {
      gross: '#8A978A',
      colOnly: '#8C3B33',
      save: '#3E5279',
      retire: '#2E7D4F',
      'sav-emergency': '#3B82F6',
      'sav-vacation': '#EC4899',
      'sav-college': '#8B5CF6',
    },
    taxStatus: 'Married',
    st: Array(YEARS).fill('CA'),
    deps: Array(YEARS).fill(0),
    additionalDeductions: Array(YEARS).fill(0),
    fica: true,
    colIntensity: 75,
    colContrast: 50,
    colHue: '#8C3B33',
    eyebrowText: 'Financial Planner',
    titleText: 'Household Ledger',
    subText: 'A multi-period income, cost-of-living, and tax projection — fully editable, all figures recalculate live.',
    catOrder: [
      'Housing',
      'Food',
      'Transportation',
      'Utilities',
      'Subscriptions',
      'Health & Wellness',
      'Additional Payments',
      'Business Expenses',
      'Entertainment',
      'Lifestyle',
    ],
    workers: [
      {
        id: 'w-1',
        name: 'Lead Consultant',
        frequency: 'Hourly',
        hours: [40, 40, 40, 45, 45, 50],
        wage: [65, 65, 65, 70, 70, 75],
      },
    ],
    other: [
      {
        id: 'o-1',
        name: 'Side Hustle',
        frequency: 'Monthly',
        amount: [100, 100, 125, 125, 150, 166.67], // $1,200 - $2,000 / yr
      },
      {
        id: 'o-2',
        name: 'Stock Dividends',
        frequency: 'Annually',
        amount: [150, 150, 150, 150, 150, 150],
      },
      {
        id: 'o-3',
        name: 'Consulting Bonus',
        frequency: 'Annually',
        amount: [0, 0, 5000, 0, 0, 2500],
      },
    ],
    col: [
      { id: 'c-1', name: 'Mortgage', cat: 'Housing', monthly: [2400, 2400, 2400, 2400, 2400, 2400] },
      { id: 'c-2', name: 'Groceries (est.)', cat: 'Food', monthly: [450, 450, 450, 450, 450, 450] },
      { id: 'c-3', name: 'Dining Out', cat: 'Food', monthly: [300, 350, 400, 320, 450, 380] },
      { id: 'c-4', name: 'Car Payment', cat: 'Transportation', monthly: [410, 410, 410, 410, 410, 410] },
      { id: 'c-5', name: 'Car Insurance', cat: 'Transportation', monthly: [145, 145, 145, 145, 145, 145] },
      { id: 'c-6', name: 'Car Maintenance', cat: 'Transportation', monthly: [100, 100, 100, 100, 100, 100] },
      { id: 'c-7', name: 'Gas / Fuel', cat: 'Transportation', monthly: [130, 140, 125, 150, 160, 145] },
      { id: 'c-8', name: 'Electricity (est.)', cat: 'Utilities', monthly: [180, 195, 210, 240, 220, 190] },
      { id: 'c-9', name: 'Water / Sewer', cat: 'Utilities', monthly: [65, 65, 65, 70, 70, 70] },
      { id: 'c-10', name: 'Trash Pickup', cat: 'Utilities', monthly: [30, 30, 30, 30, 30, 30] },
      { id: 'c-11', name: 'Mobile Plan', cat: 'Utilities', monthly: [85, 85, 85, 85, 85, 85] },
      { id: 'c-12', name: 'Internet Fibre', cat: 'Utilities', monthly: [79, 79, 79, 79, 79, 79] },
      { id: 'c-sub-1', name: 'Streaming Pack', cat: 'Subscriptions', monthly: [45, 45, 45, 45, 45, 45] },
      { id: 'c-sub-2', name: 'Software Licenses', cat: 'Subscriptions', monthly: [65, 65, 65, 120, 120, 120] },
      { id: 'c-13', name: 'Health Insurance', cat: 'Health & Wellness', monthly: [310, 310, 310, 310, 310, 310] },
      { id: 'c-14', name: 'Gym Membership', cat: 'Health & Wellness', monthly: [80, 80, 80, 80, 80, 80] },
      { id: 'c-15', name: 'Credit Card A', cat: 'Additional Payments', monthly: [200, 200, 200, 200, 0, 0] },
      { id: 'c-16', name: 'Credit Card B', cat: 'Additional Payments', monthly: [150, 150, 150, 0, 0, 0] },
      { id: 'c-17', name: 'Laptop Loan', cat: 'Additional Payments', monthly: [85, 85, 85, 85, 85, 0] },
      { id: 'c-20', name: 'Server Hosting', cat: 'Business Expenses', monthly: [40, 40, 40, 40, 40, 40] },
      { id: 'c-22', name: 'Pet Care', cat: 'Lifestyle', monthly: [120, 150, 120, 120, 220, 120] },
      { id: 'c-24', name: 'Concerts / Events', cat: 'Entertainment', monthly: [0, 120, 250, 0, 85, 150] },
    ],
    retireRate: [0, 0, 5, 5, 6, 6],
    employerMatchRate: [3, 3, 3, 4, 4, 4],
    customSavings: defaultCustomSavings,
  };
}

/**
 * Creates a clean zeroed state for when the user clicks "Clear".
 */
export function getCleanEmptyState(years: number = 3, viewMode: 'years' | 'months' = 'years'): PlannerState {
  return {
    viewMode,
    years,
    startYear: 2025,
    sectionOrder: ['sec-income', 'sec-taxes', 'sec-expenses', 'sec-retire', 'sec-summary'],
    collapsedCats: {},
    showOtherIncome: true,
    darkMode: false,
    isEditMode: false,
    graphType: 'area',
    graphToggles: { gross: true, colOnly: true, save: true, retire: true },
    barColors: { gross: '#8A978A', colOnly: '#8C3B33', save: '#3E5279', retire: '#2E7D4F' },
    taxStatus: 'Single',
    st: Array(years).fill('CA'),
    deps: Array(years).fill(0),
    additionalDeductions: Array(years).fill(0),
    fica: true,
    colIntensity: 75,
    colContrast: 50,
    colHue: '#8C3B33',
    eyebrowText: 'Financial Planner',
    titleText: 'Household Ledger',
    subText: 'A multi-period income, cost-of-living, and tax projection — fully editable, all figures recalculate live.',
    catOrder: ['Housing', 'Food', 'Transportation', 'Utilities', 'Subscriptions', 'Additional Payments'],
    workers: [
      { id: 'w-1', name: 'Income Earner 1', frequency: 'Hourly', hours: Array(years).fill(0), wage: Array(years).fill(0) },
    ],
    other: [],
    col: [
      { id: 'c-1', name: 'Rent / Mortgage', cat: 'Housing', monthly: Array(years).fill(0) },
    ],
    retireRate: Array(years).fill(0),
    employerMatchRate: Array(years).fill(0),
    customSavings: {},
  };
}
