import { CalculationResult, PlannerState, ExpenseItem, IncomeFrequency, PayoutFrequency, ViewMode } from '../types';
import {
  FED_2025,
  CA_2025,
  NY_2025,
  NYC_2025,
  CTC_PER_DEP,
  CA_DEP_EXEMPTION_CREDIT,
  ADDL_MEDICARE_RATE,
  ADDL_MEDICARE_THRESHOLDS,
  SS_WAGE_CAP,
  SS_RATE,
  MEDICARE_RATE,
  ROTH_CAP,
  CAP401K_EMPLOYEE,
  CAP401K_TOTAL_ADDITIONS,
  ANNUAL_MULTIPLIERS,
  STORAGE_KEY,
  getDefaultSampleState,
  getCleanEmptyState,
} from './taxRulesAndStarterData';

export {
  STORAGE_KEY,
  getDefaultSampleState,
  getCleanEmptyState,
};

export { safeStorage, validateAndRepairState } from './safeStorage';

/**
 * =======================================================================
 * FORMATTING HELPERS
 * =======================================================================
 */

/** Formats a numeric value into a clean US currency string (e.g. $12,500 or -$400). */
export const fmt$ = (n: number | undefined | null): string => {
  if (n === undefined || n === null || isNaN(n) || !isFinite(n)) return '$0';
  const rounded = Math.round(n);
  return (rounded < 0 ? '-' : '') + '$' + Math.abs(rounded).toLocaleString('en-US');
};

/**
 * Compact currency for the narrow year columns. Values under $100k render in
 * full ($8,273); larger values switch to k / M so they always fit the column
 * ($135k, -$329k, $1.49M). Used only inside the projection grid — precise
 * totals still use fmt$ in the wider row-label sub-lines and KPI cards.
 */
export const fmtCompact$ = (n: number | undefined | null): string => {
  if (n === undefined || n === null || isNaN(n) || !isFinite(n)) return '$0';
  const abs = Math.abs(n);
  const sign = n < 0 ? '-' : '';
  if (abs < 100_000) return fmt$(n);
  if (abs < 1_000_000) return `${sign}$${Math.round(abs / 1000).toLocaleString('en-US')}k`;
  const m = abs / 1_000_000;
  const str = m >= 100 ? Math.round(m).toString() : m.toFixed(2).replace(/\.?0+$/, '');
  return `${sign}$${str}M`;
};

/** Formats a numeric value into a percentage string (e.g. 15.0%). */
export const fmtPct = (n: number | undefined | null): string => {
  if (n === undefined || n === null || isNaN(n) || !isFinite(n)) return '0.0%';
  return n.toFixed(1) + '%';
};

/** Safely converts any input (string, null, undefined, formatted currency) to a valid number. */
export const num = (v: any): number => {
  if (v === undefined || v === null || v === '') return 0;
  if (typeof v === 'number') return isNaN(v) || !isFinite(v) ? 0 : v;
  if (typeof v === 'string') {
    // Strip dollar signs, commas, spaces, currency symbols
    const cleaned = v.replace(/[^0-9.-]/g, '');
    if (!cleaned || cleaned === '-' || cleaned === '.') return 0;
    const n = parseFloat(cleaned);
    return isNaN(n) || !isFinite(n) ? 0 : n;
  }
  return 0;
};

/**
 * Normalizes income to an Annual figure based on frequency.
 */
export function getAnnualIncome(
  frequency: IncomeFrequency | PayoutFrequency,
  rawVal: number,
  hoursPerWeek: number = 40
): number {
  const v = num(rawVal);
  if (frequency === 'Hourly') {
    return num(hoursPerWeek) * v * 52;
  }
  const mult = ANNUAL_MULTIPLIERS[frequency as keyof typeof ANNUAL_MULTIPLIERS] || 1;
  return v * mult;
}

/**
 * Converts an Annual figure into the Active View period value (Annual for 'years', / 12 for 'months').
 */
export function toPeriodValue(annualVal: number, viewMode: ViewMode): number {
  return viewMode === 'months' ? annualVal / 12 : annualVal;
}

/**
 * Calculates progressive marginal tax on taxable income across bracket thresholds.
 */
export function marginalTax(taxable: number, brackets: [number, number][]): number {
  if (taxable <= 0) return 0;
  let tax = 0;
  for (let i = 0; i < brackets.length; i++) {
    const start = brackets[i][0];
    const rate = brackets[i][1];
    const next = i + 1 < brackets.length ? brackets[i + 1][0] : Infinity;
    if (taxable > start) {
      tax += (Math.min(taxable, next) - start) * rate;
    } else {
      break;
    }
  }
  return tax;
}

/**
 * Main planner calculation engine.
 * Computes Gross Income, Taxes, Cost of Living, Retirement Waterfall, Custom Savings,
 * Cumulative Savings, and Remaining Unallocated Balance.
 */
export function computePlanner(state: PlannerState): CalculationResult {
  const years = Math.max(1, state.years || 1);
  const viewMode: ViewMode = state.viewMode || 'years';
  const periodScale = viewMode === 'months' ? 1 / 12 : 1;

  const g: number[] = [];
  const grossAnnual: number[] = [];
  const fed: number[] = [];
  const stTax: number[] = [];
  const fica: number[] = [];
  const net: number[] = [];
  const colOnly: number[] = [];
  const retireActual: number[] = [];
  const employeeRetireContrib: number[] = [];
  const employerMatchAmount: number[] = [];
  const rothArr: number[] = [];
  const k401Arr: number[] = [];
  const retireTarget: number[] = [];
  const customSavingsTotal: number[] = [];
  const savings: number[] = [];
  const savingsOT: number[] = [];
  const retireOT: number[] = [];
  const unallocatedBalance: number[] = [];
  const fundValues: Record<string, number[]> = {};

  const retirementAlerts: CalculationResult['retirementAlerts'] = [];

  // Initialize fund values map
  Object.keys(state.customSavings || {}).forEach(fundId => {
    fundValues[fundId] = [];
  });

  let sOT = 0;
  let rOT = 0;

  const statusKey = state.taxStatus || 'Married';
  // Household is modeled as two contributors only when Married Filing Jointly.
  const contributorMultiplier = (statusKey === 'Married') ? 2 : 1;
  const maxRothAnnual = ROTH_CAP * contributorMultiplier;
  const max401kEmployeeAnnual = CAP401K_EMPLOYEE * contributorMultiplier;
  const max401kTotalAnnual = CAP401K_TOTAL_ADDITIONS * contributorMultiplier;
  // Additional Medicare surtax threshold (household combined wages) by filing status.
  const addlMedThresh = ADDL_MEDICARE_THRESHOLDS[statusKey as keyof typeof ADDL_MEDICARE_THRESHOLDS]
    ?? ADDL_MEDICARE_THRESHOLDS.Single;
  // Child Tax Credit phase-out: credit reduced $50 per $1,000 of gross over the threshold.
  const ctcPhaseoutStart = statusKey === 'Married' ? 400000 : 200000;

  for (let i = 0; i < years; i++) {
    const deps = num(state.deps?.[i]);
    const addlDeduction = num(state.additionalDeductions?.[i]);

    // 1. Calculate Earned Wages from Income Earners (Annualized)
    let earnedAnnual = 0;
    (state.workers || []).forEach(w => {
      const wageVal = num(w.wage?.[i]);
      const hrs = num(w.hours?.[i] ?? 40);
      const freq = w.frequency || 'Hourly';
      earnedAnnual += getAnnualIncome(freq, wageVal, hrs);
    });

    // 2. Calculate Other / Non-Wage Income Streams (Annualized)
    let otherAnnual = 0;
    if (state.showOtherIncome !== false) {
      (state.other || []).forEach(o => {
        const amt = num(o.amount?.[i]);
        const freq = o.frequency || 'Monthly';
        otherAnnual += getAnnualIncome(freq, amt);
      });
    }

    const annualGross = earnedAnnual + otherAnnual;
    grossAnnual.push(annualGross);
    const periodGross = annualGross * periodScale;
    g.push(periodGross);

    // 3. Retirement waterfall — computed before taxes because the traditional
    //    401(k) employee deferral is pre-tax for federal and CA/NY income tax.
    const targetAnnual = annualGross * (num(state.retireRate?.[i]) / 100);
    const employerMatchPct = num(state.employerMatchRate?.[i]);

    // Waterfall allocation: Roth IRA first up to maxRoth, then 401(k) up to employee limit
    const rothContribAnnual = Math.min(targetAnnual, maxRothAnnual);
    const remainingFor401k = Math.max(0, targetAnnual - maxRothAnnual);
    const k401EmployeeAnnual = Math.min(remainingFor401k, max401kEmployeeAnnual);
    const employeeTotalAnnual = rothContribAnnual + k401EmployeeAnnual;

    // Employer match: a "% of gross" match is only paid against what the employee
    // actually defers, so it can never exceed the employee 401(k) contribution.
    const empMatchAnnual = Math.min(annualGross * (employerMatchPct / 100), k401EmployeeAnnual);

    // Combined 401(k) employee + employer match (capped at total-additions limit)
    const total401kAnnual = Math.min(k401EmployeeAnnual + empMatchAnnual, max401kTotalAnnual);
    const actualEmployerMatchAnnual = Math.max(0, total401kAnnual - k401EmployeeAnnual);
    const retireTotalAnnual = rothContribAnnual + total401kAnnual;

    // Validation Guardrails: Check if target exceeds individual contribution caps
    const totalIndividualCap = maxRothAnnual + max401kEmployeeAnnual;
    const rothExceeded = targetAnnual > maxRothAnnual && maxRothAnnual > 0;
    const k401Exceeded = remainingFor401k > max401kEmployeeAnnual;
    const employeeExceeded = targetAnnual > totalIndividualCap;

    // Pre-tax deduction that reduces income-taxable wages (traditional 401k only; Roth IRA is post-tax).
    const preTaxRetirement = k401EmployeeAnnual;

    // 4. Federal Income Tax Calculation (Annual -> scaled to period)
    const fedConfig = FED_2025[statusKey as keyof typeof FED_2025] || FED_2025.Married;
    const fedTaxable = Math.max(0, annualGross - preTaxRetirement - fedConfig.stdDed - addlDeduction);
    // Child Tax Credit with phase-out ($50 lost per $1,000 of gross over the threshold).
    const ctcRaw = CTC_PER_DEP * deps;
    const ctcPhaseout = annualGross > ctcPhaseoutStart
      ? Math.ceil((annualGross - ctcPhaseoutStart) / 1000) * 50
      : 0;
    const ctcApplied = Math.max(0, ctcRaw - ctcPhaseout);
    let ftAnnual = marginalTax(fedTaxable, fedConfig.brackets) - ctcApplied;
    ftAnnual = Math.max(0, ftAnnual);
    fed.push(ftAnnual * periodScale);

    // 5. State & Local Income Tax Calculation
    const regionKey = (state.st?.[i] || 'CA').toUpperCase();
    let stxAnnual = 0;

    if (regionKey === 'CA') {
      const cfg = CA_2025[statusKey as keyof typeof CA_2025] || CA_2025.Married;
      const taxable = Math.max(0, annualGross - preTaxRetirement - cfg.stdDed - addlDeduction);
      stxAnnual = marginalTax(taxable, cfg.brackets);
      stxAnnual -= (cfg.ex + (CA_DEP_EXEMPTION_CREDIT * deps));
      stxAnnual = Math.max(0, stxAnnual);
      // Mental Health Services Tax for taxable income > $1M
      if (taxable > 1000000) stxAnnual += (taxable - 1000000) * 0.01;
    } else if (regionKey === 'NY' || regionKey === 'NYC' || regionKey === 'YONKERS') {
      const cfg = NY_2025[statusKey as keyof typeof NY_2025] || NY_2025.Married;
      const taxable = Math.max(0, annualGross - preTaxRetirement - cfg.stdDed - addlDeduction - (1000 * deps));
      stxAnnual = marginalTax(taxable, cfg.brackets);
      stxAnnual = Math.max(0, stxAnnual);
      if (regionKey === 'NYC') {
        stxAnnual += marginalTax(taxable, (NYC_2025[statusKey as keyof typeof NYC_2025] || NYC_2025.Married).brackets);
      } else if (regionKey === 'YONKERS') {
        stxAnnual += stxAnnual * 0.1675; // 16.75% resident surcharge on NY State tax
      }
    }
    // Any other jurisdiction (incl. 'NONE' and the no-income-tax states) = $0 state tax.
    stTax.push(stxAnnual * periodScale);

    // 6. FICA Taxes (Social Security 6.2% + Medicare 1.45% + Add'l Medicare 0.9%).
    //    Traditional 401(k) deferrals do NOT reduce the FICA wage base.
    let fcAnnual = 0;
    if (state.fica) {
      let combinedWage = 0;
      (state.workers || []).forEach(w => {
        const wageVal = num(w.wage?.[i]);
        const hrs = num(w.hours?.[i] ?? 40);
        const freq = w.frequency || 'Hourly';
        const earnerAnnual = getAnnualIncome(freq, wageVal, hrs);
        combinedWage += earnerAnnual;
        fcAnnual += Math.min(earnerAnnual, SS_WAGE_CAP) * SS_RATE;
        fcAnnual += earnerAnnual * MEDICARE_RATE;
      });
      if (combinedWage > addlMedThresh) {
        fcAnnual += (combinedWage - addlMedThresh) * ADDL_MEDICARE_RATE;
      }
    }
    fica.push(fcAnnual * periodScale);

    // 7. Net Take-Home Pay
    const periodTaxes = (ftAnnual + stxAnnual + fcAnnual) * periodScale;
    const periodNet = periodGross - periodTaxes;
    net.push(periodNet);

    let alertMsg: string | undefined = undefined;
    if (employeeExceeded) {
      alertMsg = `Target exceeds legal annual limit ($${totalIndividualCap.toLocaleString()}/yr). Individual contributions are capped.`;
    }

    retirementAlerts.push({
      column: i,
      hasError: employeeExceeded,
      rothExceeded,
      k401Exceeded,
      combinedExceeded: employeeExceeded,
      message: alertMsg,
    });

    retireTarget.push(targetAnnual * periodScale);
    rothArr.push(rothContribAnnual * periodScale);
    k401Arr.push(k401EmployeeAnnual * periodScale);
    employerMatchAmount.push(actualEmployerMatchAnnual * periodScale);
    employeeRetireContrib.push(employeeTotalAnnual * periodScale);

    const periodRetireTotal = retireTotalAnnual * periodScale;
    retireActual.push(periodRetireTotal);
    rOT += periodRetireTotal;
    retireOT.push(rOT);

    // 8. Custom Savings Accounts (from flat key-value map)
    let periodCustomSavings = 0;
    Object.keys(state.customSavings || {}).forEach(fundId => {
      const fund = state.customSavings[fundId];
      const mVal = num(fund?.monthly?.[i]);
      const pVal = viewMode === 'years' ? mVal * 12 : mVal;
      fundValues[fundId].push(pVal);
      periodCustomSavings += pVal;
    });
    customSavingsTotal.push(periodCustomSavings);

    // 9. Cost-of-Living Overhead Expenses (excluding retirement & savings goals)
    const periodCol = (state.col || [])
      .filter(r => r.cat !== 'Retirement' && r.cat !== 'Savings Goals')
      .reduce((s, r) => {
        const m = num(r.monthly?.[i]);
        return s + (viewMode === 'years' ? m * 12 : m);
      }, 0);

    colOnly.push(periodCol);

    // 10. Savings Accumulator & Remaining Unallocated Balance
    // Net Income minus overhead living expenses = Net Savings generated
    const periodSavings = periodNet - periodCol;
    savings.push(periodSavings);
    sOT += periodSavings;
    savingsOT.push(sOT);

    // Unallocated Balance = Net Take-Home minus Living Expenses minus Employee Retirement minus Custom Savings Goals
    const periodUnallocated = periodNet - periodCol - (employeeTotalAnnual * periodScale) - periodCustomSavings;
    unallocatedBalance.push(periodUnallocated);
  }

  // Peak period cost for heat map normalization
  let maxGlobalCost = 1;
  colOnly.forEach(v => {
    if (v > maxGlobalCost) maxGlobalCost = v;
  });

  return {
    viewMode,
    periodScale,
    g,
    grossAnnual,
    fed,
    stTax,
    fica,
    net,
    colOnly,
    retireActual,
    employeeRetireContrib,
    employerMatchAmount,
    rothArr,
    k401Arr,
    retireTarget,
    customSavingsTotal,
    savings,
    savingsOT,
    retireOT,
    unallocatedBalance,
    maxGlobalCost,
    fundValues,
    retirementAlerts,
  };
}

export * from './taxRulesAndStarterData';
