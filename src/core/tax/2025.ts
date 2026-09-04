/**
 * ============================================================================
 *  TAX TABLES — 2025 TAX YEAR
 * ============================================================================
 *
 *  To add a future year: copy this file to `<year>.ts`, update every figure
 *  against the primary sources below, then point `tax/index.ts` at it.
 *
 *  Every table here is data only — no logic. The rules that consume it live
 *  in `core/planner.ts`.
 *
 *  ── Sources ────────────────────────────────────────────────────────────────
 *  Federal brackets / standard deduction ....... IRS Rev. Proc. 2024-40
 *  Child Tax Credit, phase-outs ................ IRC §24; IRS Pub. 972 guidance
 *  Social Security wage base .................... SSA Fact Sheet, 2025 COLA
 *  FICA / Additional Medicare rates & limits ... IRS Topic No. 751 / Pub. 15
 *  401(k) / IRA contribution limits ............ IRS Notice 2024-80
 *  California brackets / deductions / credits .. Tax Foundation, "State
 *      Individual Income Tax Rates and Brackets, 2025" (single & MFJ);
 *      MFS treated as Single and MFJ as 2× Single per CA statute.
 *      ⚠ VERIFY against the FTB 2025 Form 540 tax-rate schedules before
 *      relying on exact CA dollar figures — indexing finalises late each year.
 *  New York State / NYC brackets .............. NY DTF IT-201 instructions, 2025
 *  Yonkers resident surcharge ................. NY DTF — 16.75% of NY State tax
 *
 *  Last reviewed: 2025-09 (session refactor).
 * ============================================================================
 */

export const TAX_YEAR = 2025 as const;

type Bracket = [threshold: number, marginalRate: number];

// ── Federal ────────────────────────────────────────────────────────────────
export const FED_2025 = {
  Single: {
    stdDed: 15000,
    brackets: [
      [0, 0.1],
      [11925, 0.12],
      [48475, 0.22],
      [103350, 0.24],
      [197300, 0.32],
      [250525, 0.35],
      [626350, 0.37],
    ] as Bracket[],
  },
  Married: {
    stdDed: 30000,
    brackets: [
      [0, 0.1],
      [23850, 0.12],
      [96950, 0.22],
      [206700, 0.24],
      [394600, 0.32],
      [501050, 0.35],
      [751600, 0.37],
    ] as Bracket[],
  },
  HeadOfHousehold: {
    stdDed: 22500,
    brackets: [
      [0, 0.1],
      [17000, 0.12],
      [64850, 0.22],
      [103350, 0.24],
      [197300, 0.32],
      [250500, 0.35],
      [626350, 0.37],
    ] as Bracket[],
  },
  MarriedSeparate: {
    stdDed: 15000,
    brackets: [
      [0, 0.1],
      [11925, 0.12],
      [48475, 0.22],
      [103350, 0.24],
      [197300, 0.32],
      [250525, 0.35],
      [375800, 0.37],
    ] as Bracket[],
  },
};

// ── Federal credits & payroll taxes ────────────────────────────────────────
// CTC is a simplification: applied per dependent regardless of the dependent's
// age (the real Child Tax Credit requires a qualifying child under 17; other
// dependents get the $500 Credit for Other Dependents). Phase-out is modelled
// in the planner ($50 lost per $1,000 of income over $400k MFJ / $200k other).
export const CTC_PER_DEP = 2000;

export const SS_WAGE_CAP = 176100; // Social Security maximum taxable wage base
export const SS_RATE = 0.062; // Social Security tax rate (6.2%)
export const MEDICARE_RATE = 0.0145; // Medicare base tax rate (1.45%)
export const ADDL_MEDICARE_RATE = 0.009; // Additional Medicare Tax (0.9%) over threshold

/** Additional Medicare Tax thresholds by filing status (combined household wages). */
export const ADDL_MEDICARE_THRESHOLDS = {
  Single: 200000,
  Married: 250000,
  HeadOfHousehold: 200000,
  MarriedSeparate: 125000,
} as const;

// ── Retirement contribution limits (per individual) ────────────────────────
export const ROTH_CAP = 7000; // Roth IRA annual contribution
export const CAP401K_EMPLOYEE = 23500; // 401(k) elective deferral
export const CAP401K_TOTAL_ADDITIONS = 70000; // 401(k) employee + employer additions

// ── California ─────────────────────────────────────────────────────────────
// `ex` values are dollars of tax CREDIT (personal exemption credit), not a
// deduction from taxable income.
const CA_SINGLE_BRACKETS: Bracket[] = [
  [0, 0.01],
  [10756, 0.02],
  [25499, 0.04],
  [40245, 0.06],
  [55866, 0.08],
  [70606, 0.093],
  [360659, 0.103],
  [432787, 0.113],
  [721314, 0.123],
];

export const CA_2025 = {
  Single: { stdDed: 5540, ex: 149, brackets: CA_SINGLE_BRACKETS },
  Married: {
    stdDed: 11080,
    ex: 298,
    brackets: [
      [0, 0.01],
      [21512, 0.02],
      [50998, 0.04],
      [80490, 0.06],
      [111732, 0.08],
      [141212, 0.093],
      [721318, 0.103],
      [865574, 0.113],
      [1442628, 0.123],
    ] as Bracket[],
  },
  HeadOfHousehold: {
    stdDed: 11080,
    ex: 298,
    brackets: [
      [0, 0.01],
      [21527, 0.02],
      [51000, 0.04],
      [65744, 0.06],
      [81364, 0.08],
      [96107, 0.093],
      [490493, 0.103],
      [588593, 0.113],
      [980987, 0.123],
    ] as Bracket[],
  },
  MarriedSeparate: { stdDed: 5540, ex: 149, brackets: CA_SINGLE_BRACKETS },
};

export const CA_DEP_EXEMPTION_CREDIT = 461; // dollars of credit per dependent
export const CA_MENTAL_HEALTH_TAX_THRESHOLD = 1_000_000; // 1% surtax over this taxable income
export const CA_MENTAL_HEALTH_TAX_RATE = 0.01;

// ── New York State ─────────────────────────────────────────────────────────
const NY_SINGLE_BRACKETS: Bracket[] = [
  [0, 0.04],
  [8500, 0.045],
  [11700, 0.0525],
  [13900, 0.055],
  [80650, 0.06],
  [215400, 0.0685],
  [1077550, 0.0965],
  [5000000, 0.103],
  [25000000, 0.109],
];

export const NY_2025 = {
  Single: { stdDed: 8000, brackets: NY_SINGLE_BRACKETS },
  Married: {
    stdDed: 16050,
    brackets: [
      [0, 0.04],
      [17150, 0.045],
      [23600, 0.0525],
      [27900, 0.055],
      [161550, 0.06],
      [323200, 0.0685],
      [2155350, 0.0965],
      [5000000, 0.103],
      [25000000, 0.109],
    ] as Bracket[],
  },
  HeadOfHousehold: {
    stdDed: 11200,
    brackets: [
      [0, 0.04],
      [12800, 0.045],
      [17650, 0.0525],
      [20900, 0.055],
      [107750, 0.06],
      [269300, 0.0685],
      [1616450, 0.0965],
      [5000000, 0.103],
      [25000000, 0.109],
    ] as Bracket[],
  },
  MarriedSeparate: { stdDed: 8000, brackets: NY_SINGLE_BRACKETS },
};

export const NY_DEP_EXEMPTION = 1000; // per-dependent deduction from NY taxable income
export const YONKERS_RESIDENT_SURCHARGE = 0.1675; // 16.75% of NY State tax

// ── New York City resident tax ─────────────────────────────────────────────
const NYC_SINGLE_BRACKETS: Bracket[] = [
  [0, 0.03078],
  [12000, 0.03762],
  [25000, 0.03819],
  [50000, 0.03876],
];

export const NYC_2025 = {
  Single: { brackets: NYC_SINGLE_BRACKETS },
  Married: {
    brackets: [
      [0, 0.03078],
      [21600, 0.03762],
      [45000, 0.03819],
      [90000, 0.03876],
    ] as Bracket[],
  },
  HeadOfHousehold: {
    brackets: [
      [0, 0.03078],
      [14400, 0.03762],
      [30000, 0.03819],
      [60000, 0.03876],
    ] as Bracket[],
  },
  MarriedSeparate: { brackets: NYC_SINGLE_BRACKETS },
};
