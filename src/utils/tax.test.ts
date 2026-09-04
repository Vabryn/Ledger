import { computePlanner, marginalTax, fmt$, fmtPct, num } from './taxAndCalculations';
import {
  FED_2025,
  CA_2025,
  NY_2025,
  NYC_2025,
  ROTH_CAP,
  CAP401K_EMPLOYEE,
  CAP401K_TOTAL_ADDITIONS,
  SS_WAGE_CAP,
  SS_RATE,
  MEDICARE_RATE,
  CTC_PER_DEP,
  ANNUAL_MULTIPLIERS,
  getDefaultSampleState,
  getCleanEmptyState,
} from './taxRulesAndStarterData';
import { safeStorage, validateAndRepairState } from './safeStorage';
import { PlannerState, PAGE_WIDTH_CLASSES, PAGE_WIDTH_CONFIG } from '../types';

/**
 * =======================================================================
 * COMPREHENSIVE HOUSEHOLD LEDGER TEST SUITE
 * =======================================================================
 * Validates:
 * 1. Number parsing & formatting edge cases (fmt$, fmtPct, num)
 * 2. Income frequencies & multi-earner calculations
 * 3. Federal tax brackets & standard deductions across all filing statuses
 * 4. Child Tax Credit & Itemized/Additional Deductions
 * 5. State & local tax systems (CA + Millionaire Tax, NY + NYC, Yonkers, Zero-tax states)
 * 6. FICA calculations (Social Security cap, Medicare, Additional Medicare surtax, toggle)
 * 7. Retirement waterfall (Roth first, 401k employee, Employer match, 2025 IRS caps & alerts)
 * 8. Cost of living & custom savings funds & unallocated balance
 * 9. Cumulative running sums (savingsOT, retireOT)
 * 10. View mode scaling (years vs months 1/12 parity)
 * 11. Safe storage persistence & memory fallback
 * 12. Schema validation & state repair (corrupted payloads, array padding, bounds)
 * 13. State lifecycle generators (getDefaultSampleState, getCleanEmptyState)
 * 14. Year expansion & contraction boundary invariants (1 to 10 years, preserving data)
 * 15. Extreme boundaries ($0, $100M income, negative cashflows, 100% match)
 * 16. Heat map mathematical curves (exponent, contrast, intensity, color interpolation)
 */

export function runAllTests() {
  console.log('🧪 Starting Comprehensive Household Ledger Test Suite...\n');
  let testCount = 0;
  let passedCount = 0;

  function assert(condition: boolean, message: string) {
    testCount++;
    if (!condition) {
      throw new Error(`Assertion failed: ${message}`);
    }
    passedCount++;
  }

  function assertClose(a: number, b: number, epsilon: number, message: string) {
    testCount++;
    if (Math.abs(a - b) > epsilon) {
      throw new Error(`Assertion failed: ${message} (expected ~${b}, got ${a}, diff=${Math.abs(a - b)})`);
    }
    passedCount++;
  }

  // =====================================================================
  // SUITE 1: NUMERIC PARSING & FORMATTING HELPERS
  // =====================================================================
  console.log('--- Suite 1: Numeric Parsing & Formatting Helpers ---');

  // num()
  assert(num(1234) === 1234, 'num with number');
  assert(num('5678') === 5678, 'num with string integer');
  assert(num('$12,500.50') === 12500.5, 'num with formatted currency string');
  assert(num(' -$450.25 ') === -450.25, 'num with negative formatted currency');
  assert(num(null) === 0, 'num with null');
  assert(num(undefined) === 0, 'num with undefined');
  assert(num('') === 0, 'num with empty string');
  assert(num('invalid') === 0, 'num with garbage string');
  assert(num(NaN) === 0, 'num with NaN');
  assert(num(Infinity) === 0, 'num with Infinity');

  // fmt$()
  assert(fmt$(0) === '$0', 'fmt$(0)');
  assert(fmt$(12500) === '$12,500', 'fmt$(12500)');
  assert(fmt$(-450) === '-$450', 'fmt$(-450)');
  assert(fmt$(null) === '$0', 'fmt$(null)');
  assert(fmt$(undefined) === '$0', 'fmt$(undefined)');
  assert(fmt$(NaN) === '$0', 'fmt$(NaN)');
  assert(fmt$(Infinity) === '$0', 'fmt$(Infinity)');

  // fmtPct()
  assert(fmtPct(15.5) === '15.5%', 'fmtPct(15.5)');
  assert(fmtPct(0) === '0.0%', 'fmtPct(0)');
  assert(fmtPct(null) === '0.0%', 'fmtPct(null)');
  assert(fmtPct(undefined) === '0.0%', 'fmtPct(undefined)');
  assert(fmtPct(NaN) === '0.0%', 'fmtPct(NaN)');

  console.log('✅ Suite 1 Passed: All numeric parsing and formatting tests passed.\n');

  // =====================================================================
  // SUITE 2: INCOME FREQUENCIES & MULTIPLE EARNERS
  // =====================================================================
  console.log('--- Suite 2: Income Frequencies & Multi-Earner Calculations ---');

  const baseState: PlannerState = {
    years: 1,
    viewMode: 'years',
    sectionOrder: ['sec-income', 'sec-taxes', 'sec-expenses', 'sec-retire', 'sec-summary'],
    collapsedCats: {},
    showOtherIncome: true,
    darkMode: false,
    isEditMode: false,
    graphHeight: 280,
    graphType: 'area',
    graphToggles: { gross: true, colOnly: true, save: true, retire: true },
    barColors: { gross: '#8A978A', colOnly: '#8C3B33', save: '#3E5279', retire: '#2E7D4F' },
    taxStatus: 'Single',
    st: ['CA'],
    deps: [0],
    additionalDeductions: [0],
    fica: true,
    colIntensity: 75,
    colContrast: 50,
    colHue: '#8C3B33',
    eyebrowText: 'Test',
    titleText: 'Test',
    subText: 'Test',
    catOrder: ['Housing', 'Food', 'Retirement'],
    workers: [
      { id: 'w-1', name: 'Hourly Earner', frequency: 'Hourly', hours: [40], wage: [50] }, // 40 * 50 * 52 = $104,000
      { id: 'w-2', name: 'Bi-Weekly Earner', frequency: 'Biweekly', hours: [40], wage: [2000] }, // 2,000 * 26 = $52,000
    ],
    other: [
      { id: 'o-1', name: 'Monthly Rental', frequency: 'Monthly', amount: [1500] }, // 1,500 * 12 = $18,000
      { id: 'o-2', name: 'Annual Bonus', frequency: 'Annually', amount: [10000] }, // $10,000
    ],
    col: [
      { id: 'c-1', name: 'Living Expenses', cat: 'Housing', monthly: [3000] }, // $36,000/yr
    ],
    customSavings: {},
    retireRate: [0],
    employerMatchRate: [0],
  };

  const freqRes = computePlanner(baseState);
  // Expected Gross = 104,000 + 52,000 + 18,000 + 10,000 = $184,000
  assert(freqRes.g[0] === 184000, `Multi-earner gross expected 184000, got ${freqRes.g[0]}`);

  // Test toggling other income off
  const noOtherRes = computePlanner({ ...baseState, showOtherIncome: false });
  // Expected Gross = 104,000 + 52,000 = $156,000
  assert(noOtherRes.g[0] === 156000, `Gross without other income expected 156000, got ${noOtherRes.g[0]}`);

  // Test all income frequency multipliers
  const allFreqs = [
    { freq: 'Daily', wage: 200, expected: 200 * 260 },
    { freq: 'Weekly', wage: 1000, expected: 1000 * 52 },
    { freq: 'Biweekly', wage: 2500, expected: 2500 * 26 },
    { freq: 'Bi-weekly', wage: 2500, expected: 2500 * 26 },
    { freq: 'Bi-Monthly', wage: 3000, expected: 3000 * 24 },
    { freq: 'Semi-monthly', wage: 3000, expected: 3000 * 24 },
    { freq: 'Monthly', wage: 6000, expected: 6000 * 12 },
    { freq: 'Quarterly', wage: 15000, expected: 15000 * 4 },
    { freq: 'Semi-annually', wage: 30000, expected: 30000 * 2 },
    { freq: 'Annually', wage: 80000, expected: 80000 },
  ];

  allFreqs.forEach(({ freq, wage, expected }) => {
    const singleFreqState: PlannerState = {
      ...baseState,
      workers: [{ id: 'w-t', name: freq, frequency: freq as any, hours: [40], wage: [wage] }],
      other: [],
    };
    const r = computePlanner(singleFreqState);
    assert(r.g[0] === expected, `Frequency ${freq} expected ${expected}, got ${r.g[0]}`);
  });

  console.log('✅ Suite 2 Passed: All income frequencies and multi-earner models verified.\n');

  // =====================================================================
  // SUITE 3: FEDERAL TAX BRACKETS & FILING STATUSES (2025 TAX YEAR)
  // =====================================================================
  console.log('--- Suite 3: Federal Tax & Deductions Across All Statuses ---');

  const grossIncome = 120000;

  // Single Filer
  const singleState: PlannerState = {
    ...baseState,
    taxStatus: 'Single',
    workers: [{ id: 'w-1', name: 'Earner', frequency: 'Annually', hours: [40], wage: [grossIncome] }],
    other: [],
    st: ['None'],
    fica: false,
  };
  const singleRes = computePlanner(singleState);
  const expectedSingleFed = marginalTax(120000 - FED_2025.Single.stdDed, FED_2025.Single.brackets);
  assertClose(singleRes.fed[0], expectedSingleFed, 0.01, 'Single Federal Tax');

  // Married Filer
  const marriedRes = computePlanner({ ...singleState, taxStatus: 'Married' });
  const expectedMarriedFed = marginalTax(120000 - FED_2025.Married.stdDed, FED_2025.Married.brackets);
  assertClose(marriedRes.fed[0], expectedMarriedFed, 0.01, 'Married Federal Tax');

  // Head of Household
  const hohRes = computePlanner({ ...singleState, taxStatus: 'HeadOfHousehold' });
  const expectedHohFed = marginalTax(120000 - FED_2025.HeadOfHousehold.stdDed, FED_2025.HeadOfHousehold.brackets);
  assertClose(hohRes.fed[0], expectedHohFed, 0.01, 'Head of Household Federal Tax');

  // Married Separate
  const msepRes = computePlanner({ ...singleState, taxStatus: 'MarriedSeparate' });
  const expectedMsepFed = marginalTax(120000 - FED_2025.MarriedSeparate.stdDed, FED_2025.MarriedSeparate.brackets);
  assertClose(msepRes.fed[0], expectedMsepFed, 0.01, 'Married Separate Federal Tax');

  // Child Tax Credit (2 dependents = $4,000 credit)
  const depsRes = computePlanner({ ...singleState, deps: [2] });
  assertClose(depsRes.fed[0], Math.max(0, expectedSingleFed - (2 * CTC_PER_DEP)), 0.01, 'Child Tax Credit subtraction');

  // Additional Deductions ($10,000 above-the-line deduction)
  const addlDedRes = computePlanner({ ...singleState, additionalDeductions: [10000] });
  const expectedWithAddl = marginalTax(120000 - FED_2025.Single.stdDed - 10000, FED_2025.Single.brackets);
  assertClose(addlDedRes.fed[0], expectedWithAddl, 0.01, 'Additional Deductions applied');

  console.log('✅ Suite 3 Passed: Federal taxes, deductions, and credits accurate for all filing statuses.\n');

  // =====================================================================
  // SUITE 4: STATE & LOCAL TAXES (CA, NY, NYC, YONKERS, ZERO-TAX STATES)
  // =====================================================================
  console.log('--- Suite 4: State & Local Tax Systems ---');

  // California State Tax
  const caState: PlannerState = {
    ...singleState,
    taxStatus: 'Single',
    st: ['CA'],
  };
  const caRes = computePlanner(caState);
  const caTaxable = Math.max(0, 120000 - CA_2025.Single.stdDed);
  const rawCaTax = marginalTax(caTaxable, CA_2025.Single.brackets) - CA_2025.Single.ex;
  assertClose(caRes.stTax[0], Math.max(0, rawCaTax), 0.01, 'California Standard Tax');

  // California Mental Health Services 1% Surtax on Taxable Income > $1,000,000
  const highEarnCaState: PlannerState = {
    ...singleState,
    workers: [{ id: 'w-1', name: 'Exec', frequency: 'Annually', hours: [40], wage: [1500000] }],
    st: ['CA'],
  };
  const highCaRes = computePlanner(highEarnCaState);
  const highCaTaxable = 1500000 - CA_2025.Single.stdDed;
  const standardHighCaTax = marginalTax(highCaTaxable, CA_2025.Single.brackets) - CA_2025.Single.ex;
  const expectedMentalHealthTax = (highCaTaxable - 1000000) * 0.01;
  assertClose(highCaRes.stTax[0], standardHighCaTax + expectedMentalHealthTax, 0.01, 'CA 1% Mental Health Tax');

  // New York State Tax (Single)
  const nyState: PlannerState = {
    ...singleState,
    st: ['NY'],
  };
  const nyRes = computePlanner(nyState);
  const nyTaxable = Math.max(0, 120000 - NY_2025.Single.stdDed);
  const expectedNyTax = marginalTax(nyTaxable, NY_2025.Single.brackets);
  assertClose(nyRes.stTax[0], expectedNyTax, 0.01, 'New York State Tax');

  // New York City Local Tax (jurisdiction 'NYC' = NY State + NYC resident tax)
  const nycState: PlannerState = {
    ...singleState,
    st: ['NYC'],
  };
  const nycRes = computePlanner(nycState);
  const expectedNycTax = marginalTax(nyTaxable, NYC_2025.Single.brackets);
  assertClose(nycRes.stTax[0], expectedNyTax + expectedNycTax, 0.01, 'New York City Local Tax Added');

  // Yonkers 16.75% Surcharge (jurisdiction 'YONKERS' = NY State + Yonkers surcharge)
  const yonkersState: PlannerState = {
    ...singleState,
    st: ['YONKERS'],
  };
  const yonkersRes = computePlanner(yonkersState);
  assertClose(yonkersRes.stTax[0], expectedNyTax * 1.1675, 0.01, 'Yonkers 16.75% Surcharge');

  // Zero-Tax States (TX, FL, WA, NV, WY, AK, SD, TN)
  ['TX', 'FL', 'WA', 'NV', 'WY', 'AK', 'SD', 'TN'].forEach(stCode => {
    const zeroState: PlannerState = {
      ...singleState,
      st: [stCode],
    };
    const zRes = computePlanner(zeroState);
    assert(zRes.stTax[0] === 0, `Zero tax state ${stCode} expected $0 tax, got ${zRes.stTax[0]}`);
  });

  console.log('✅ Suite 4 Passed: All state, local, and zero-tax systems verified.\n');

  // =====================================================================
  // SUITE 5: FICA (SOCIAL SECURITY, MEDICARE, ADDITIONAL MEDICARE SURTAX)
  // =====================================================================
  console.log('--- Suite 5: FICA Tax Calculations & Wage Base Ceilings ---');

  // Under SS wage cap ($100,000 wage)
  const ficaUnderCapState: PlannerState = {
    ...singleState,
    workers: [{ id: 'w-1', name: 'Earner', frequency: 'Annually', hours: [40], wage: [100000] }],
    fica: true,
  };
  const ficaUnderRes = computePlanner(ficaUnderCapState);
  const expectedFicaUnder = (100000 * SS_RATE) + (100000 * MEDICARE_RATE);
  assertClose(ficaUnderRes.fica[0], expectedFicaUnder, 0.01, 'FICA under wage cap');

  // Over SS wage cap ($250,000 wage for Single filer)
  const ficaOverCapSingle: PlannerState = {
    ...singleState,
    workers: [{ id: 'w-1', name: 'High Earner', frequency: 'Annually', hours: [40], wage: [250000] }],
    fica: true,
  };
  const ficaOverRes = computePlanner(ficaOverCapSingle);
  const expectedFicaOver = (SS_WAGE_CAP * SS_RATE) + (250000 * MEDICARE_RATE) + ((250000 - 200000) * 0.009);
  assertClose(ficaOverRes.fica[0], expectedFicaOver, 0.01, 'FICA over wage cap with Single Additional Medicare');

  // FICA Disabled Toggle
  const ficaDisabledState: PlannerState = {
    ...ficaOverCapSingle,
    fica: false,
  };
  const ficaDisabledRes = computePlanner(ficaDisabledState);
  assert(ficaDisabledRes.fica[0] === 0, 'FICA disabled toggle produces $0');

  console.log('✅ Suite 5 Passed: FICA ceiling, Medicare, and Additional Medicare surtax verified.\n');

  // =====================================================================
  // SUITE 6: RETIREMENT WATERFALL & 2025 LEGAL LIMITS
  // =====================================================================
  console.log('--- Suite 6: Retirement Waterfall & 2025 Contribution Limits ---');

  // Scenario A: Single Filer, Target within bounds ($15,600 target)
  const retAState: PlannerState = {
    ...singleState,
    workers: [{ id: 'w-1', name: 'Earner', frequency: 'Annually', hours: [40], wage: [100000] }],
    retireRate: [15.6],
    employerMatchRate: [0],
  };
  const retARes = computePlanner(retAState);
  assert(retARes.rothArr[0] === 7000, `Single Roth cap filled ($7,000), got ${retARes.rothArr[0]}`);
  assert(retARes.k401Arr[0] === 8600, `Single 401(k) remaining ($8,600), got ${retARes.k401Arr[0]}`);
  assert(retARes.retireActual[0] === 15600, `Total actual retirement matches target ($15,600)`);
  assert(retARes.retirementAlerts[0].hasError === false, 'No alert for valid retirement target');

  // Scenario B: Single Filer Exceeding Individual Limit ($35,000 target on $100k gross)
  const retBState: PlannerState = {
    ...singleState,
    workers: [{ id: 'w-1', name: 'Earner', frequency: 'Annually', hours: [40], wage: [100000] }],
    retireRate: [35],
    employerMatchRate: [0],
  };
  const retBRes = computePlanner(retBState);
  assert(retBRes.rothArr[0] === 7000, `Roth capped at $7,000`);
  assert(retBRes.k401Arr[0] === 23500, `401(k) employee contribution capped at $23,500`);
  assert(retBRes.employeeRetireContrib[0] === 30500, `Combined employee contribution capped at $30,500`);
  assert(retBRes.retirementAlerts[0].hasError === true, 'Alert triggered when target exceeds limit');
  assert(retBRes.retirementAlerts[0].combinedExceeded === true, 'combinedExceeded is true');
  assert(typeof retBRes.retirementAlerts[0].message === 'string', 'Warning message generated');

  // Scenario C: Married Filer Double Limits ($14,000 Roth, $47,000 401k)
  const retCState: PlannerState = {
    ...singleState,
    taxStatus: 'Married',
    workers: [{ id: 'w-1', name: 'Earner', frequency: 'Annually', hours: [40], wage: [200000] }],
    retireRate: [30],
    employerMatchRate: [0],
  };
  const retCRes = computePlanner(retCState);
  assert(retCRes.rothArr[0] === 14000, `Married Roth cap filled ($14,000)`);
  assert(retCRes.k401Arr[0] === 46000, `Married 401(k) remaining ($46,000)`);
  assert(retCRes.retirementAlerts[0].hasError === false, 'Within married limits ($61,000 total)');

  // Scenario D: Employer Match & Total 401(k) Additions Cap ($70,000 / $140,000)
  const retDState: PlannerState = {
    ...singleState,
    taxStatus: 'Single',
    workers: [{ id: 'w-1', name: 'Earner', frequency: 'Annually', hours: [40], wage: [200000] }],
    retireRate: [15],
    employerMatchRate: [25],
  };
  const retDRes = computePlanner(retDState);
  assert(retDRes.k401Arr[0] === 23000, `Employee 401k contribution is $23,000`);
  // Employer match cannot exceed the employee's own 401(k) deferral ($23,000).
  assert(retDRes.employerMatchAmount[0] === 23000, `Employer match capped at employee deferral ($23,000)`);
  assert(retDRes.retireActual[0] === 7000 + 46000, `Total retirement is Roth ($7k) + 401k ($23k employee + $23k match) = $53,000`);

  console.log('✅ Suite 6 Passed: Retirement waterfall, Roth prioritization, and IRS caps verified.\n');

  // =====================================================================
  // SUITE 7: COST OF LIVING, CUSTOM SAVINGS, AND UNALLOCATED BALANCE
  // =====================================================================
  console.log('--- Suite 7: Cost of Living, Custom Savings & Balances ---');

  const budgetState: PlannerState = {
    ...singleState,
    workers: [{ id: 'w-1', name: 'Earner', frequency: 'Annually', hours: [40], wage: [100000] }],
    col: [
      { id: 'c-rent', name: 'Rent', cat: 'Housing', monthly: [2000] },
      { id: 'c-groceries', name: 'Groceries', cat: 'Food', monthly: [600] },
    ],
    customSavings: {
      'fund-vacation': {
        id: 'fund-vacation',
        name: 'Vacation Fund',
        color: '#10B981',
        monthly: [400],
        enabledInChart: true,
      },
    },
    retireRate: [10],
    employerMatchRate: [0],
  };

  const budgetRes = computePlanner(budgetState);
  assert(budgetRes.colOnly[0] === 31200, `Living expenses expected $31,200, got ${budgetRes.colOnly[0]}`);
  assert(budgetRes.customSavingsTotal[0] === 4800, `Custom savings expected $4,800`);
  assert(budgetRes.fundValues['fund-vacation'][0] === 4800, `Vacation fund array expected $4,800`);

  const expectedSavings = budgetRes.net[0] - budgetRes.colOnly[0];
  assertClose(budgetRes.savings[0], expectedSavings, 0.01, 'Net savings calculation');

  const expectedUnallocated = budgetRes.net[0] - 31200 - 10000 - 4800;
  assertClose(budgetRes.unallocatedBalance[0], expectedUnallocated, 0.01, 'Unallocated balance calculation');

  console.log('✅ Suite 7 Passed: Cost of living, custom savings, and remaining unallocated balance verified.\n');

  // =====================================================================
  // SUITE 8: VIEW MODE SCALING ('years' vs 'months' PARITY)
  // =====================================================================
  console.log('--- Suite 8: View Mode Scaling (Annual vs Monthly Parity) ---');

  const annualRes = computePlanner({ ...budgetState, viewMode: 'years' });
  const monthlyRes = computePlanner({ ...budgetState, viewMode: 'months' });

  assertClose(monthlyRes.g[0], annualRes.g[0] / 12, 0.01, 'Gross monthly is exactly 1/12 of annual');
  assertClose(monthlyRes.fed[0], annualRes.fed[0] / 12, 0.01, 'Federal tax monthly is 1/12 of annual');
  assertClose(monthlyRes.net[0], annualRes.net[0] / 12, 0.01, 'Net income monthly is 1/12 of annual');
  assertClose(monthlyRes.colOnly[0], annualRes.colOnly[0] / 12, 0.01, 'Living expenses monthly is 1/12 of annual');
  assertClose(monthlyRes.customSavingsTotal[0], annualRes.customSavingsTotal[0] / 12, 0.01, 'Custom savings monthly is 1/12 of annual');
  assertClose(monthlyRes.retireActual[0], annualRes.retireActual[0] / 12, 0.01, 'Retirement monthly is 1/12 of annual');
  assertClose(monthlyRes.unallocatedBalance[0], annualRes.unallocatedBalance[0] / 12, 0.01, 'Unallocated balance monthly is 1/12 of annual');

  console.log('✅ Suite 8 Passed: Exact 1/12 parity confirmed between annual and monthly view modes.\n');

  // =====================================================================
  // SUITE 9: MULTI-YEAR ACCUMULATION & DEFICIT HANDLING
  // =====================================================================
  console.log('--- Suite 9: Multi-Year Accumulation & Deficit Handling ---');

  const multiYearState: PlannerState = {
    ...budgetState,
    years: 3,
    workers: [
      { id: 'w-1', name: 'Earner', frequency: 'Annually', hours: [40, 40, 40], wage: [100000, 100000, 120000] },
    ],
    col: [
      { id: 'c-rent', name: 'Rent', cat: 'Housing', monthly: [2000, 8000, 2000] },
    ],
    retireRate: [10, 10, 10],
    employerMatchRate: [0, 0, 0],
    customSavings: {},
    deps: [0, 0, 0],
    additionalDeductions: [0, 0, 0],
    st: ['CA', 'CA', 'CA'],
  };

  const multiRes = computePlanner(multiYearState);
  assert(multiRes.g.length === 3, 'Outputs 3 projection columns');
  assert(multiRes.savings[0] > 0, 'Year 1 has positive savings');
  assert(multiRes.savings[1] < 0, 'Year 2 has negative savings due to deficit');
  assert(multiRes.savings[2] > 0, 'Year 3 recovers to positive savings');

  assertClose(multiRes.savingsOT[0], multiRes.savings[0], 0.01, 'Cumulative savings Yr 1');
  assertClose(multiRes.savingsOT[1], multiRes.savings[0] + multiRes.savings[1], 0.01, 'Cumulative savings Yr 2 reflects deficit');
  assertClose(multiRes.savingsOT[2], multiRes.savings[0] + multiRes.savings[1] + multiRes.savings[2], 0.01, 'Cumulative savings Yr 3');

  assertClose(multiRes.retireOT[0], multiRes.retireActual[0], 0.01, 'Cumulative retirement Yr 1');
  assertClose(multiRes.retireOT[1], multiRes.retireActual[0] + multiRes.retireActual[1], 0.01, 'Cumulative retirement Yr 2');
  assertClose(multiRes.retireOT[2], multiRes.retireActual[0] + multiRes.retireActual[1] + multiRes.retireActual[2], 0.01, 'Cumulative retirement Yr 3');

  console.log('✅ Suite 9 Passed: Multi-year cumulative progression and deficit calculations verified.\n');

  // =====================================================================
  // SUITE 10: SAFE STORAGE PERSISTENCE & MEMORY FALLBACK
  // =====================================================================
  console.log('--- Suite 10: Safe Storage & Memory Fallback ---');

  const testStorageKey = '__test_ledger_storage_key__';
  safeStorage.setItem(testStorageKey, 'test_value_123');
  assert(safeStorage.getItem(testStorageKey) === 'test_value_123', 'safeStorage set and get string');

  safeStorage.setJson(testStorageKey, { hello: 'world', count: 42 });
  const retrievedJson = safeStorage.getJson<any>(testStorageKey, null);
  assert(retrievedJson !== null && retrievedJson.hello === 'world' && retrievedJson.count === 42, 'safeStorage JSON serialization');

  safeStorage.removeItem(testStorageKey);
  assert(safeStorage.getItem(testStorageKey) === null, 'safeStorage remove item');
  assert(safeStorage.getJson(testStorageKey, 'fallback') === 'fallback', 'safeStorage getJson fallback on empty');

  console.log('✅ Suite 10 Passed: Safe storage read, write, remove, and JSON fallback verified.\n');

  // =====================================================================
  // SUITE 11: SCHEMA VALIDATION & STATE REPAIR
  // =====================================================================
  console.log('--- Suite 11: Schema Validation & State Repair ---');

  const repairedNull = validateAndRepairState(null);
  assert(repairedNull && typeof repairedNull.years === 'number' && repairedNull.years >= 1, 'Repairs null to safe default state');

  const repairedEmpty = validateAndRepairState({});
  assert(repairedEmpty.workers.length > 0, 'Repairs empty object with default workers');

  const corruptedYearsState = {
    years: 5,
    workers: [
      { id: 'w-1', name: 'Tester', frequency: 'Annually', hours: [40], wage: [60000] },
    ],
    st: ['CA'],
    deps: [0],
    additionalDeductions: [0],
    retireRate: [10],
    employerMatchRate: [0],
    col: [
      { id: 'c-1', name: 'Rent', cat: 'Housing', monthly: [2000] },
    ],
  };

  const repairedYears = validateAndRepairState(corruptedYearsState);
  assert(repairedYears.years === 5, 'Maintains 5 years');
  assert(repairedYears.workers[0].wage.length === 5, 'Pads worker wages to 5 years');
  assert(repairedYears.workers[0].hours.length === 5, 'Pads worker hours to 5 years');
  assert(repairedYears.st.length === 5, 'Pads state tax selections to 5 years');
  assert(repairedYears.deps.length === 5, 'Pads dependents to 5 years');
  assert(repairedYears.col[0].monthly.length === 5, 'Pads expense monthly amounts to 5 years');
  assert(repairedYears.col.length >= 1, 'Maintains expense items safely');

  const repairedResult = computePlanner(repairedYears);
  assert(repairedResult.g.length === 5, 'Repaired state computes 5 years without error');

  // Page width validation tests
  assert(validateAndRepairState({ pageWidth: 'invalid' as any }).pageWidth === 'standard', 'Repairs invalid pageWidth to standard');
  assert(validateAndRepairState({ pageWidth: 'compact' }).pageWidth === 'compact', 'Preserves valid compact pageWidth');
  assert(validateAndRepairState({ pageWidth: 'slim' }).pageWidth === 'slim', 'Preserves valid slim pageWidth');
  assert(PAGE_WIDTH_CLASSES.slim.includes('max-w-[960px]'), 'Slim width class has max-w-[960px]');
  assert(PAGE_WIDTH_CLASSES.compact.includes('max-w-[1140px]'), 'Compact width class has max-w-[1140px]');
  assert(PAGE_WIDTH_CLASSES.standard.includes('max-w-[1360px]'), 'Standard width class has max-w-[1360px]');
  assert(PAGE_WIDTH_CLASSES.wide.includes('max-w-[1580px]'), 'Wide width class has max-w-[1580px]');
  assert(PAGE_WIDTH_CLASSES.full.includes('max-w-[1850px]'), 'Full width class has max-w-[1850px]');

  console.log('✅ Suite 11 Passed: Schema validation and state repair robustly guard against corrupted data.\n');

  // =====================================================================
  // SUITE 12: STATE LIFECYCLE GENERATORS
  // =====================================================================
  console.log('--- Suite 12: State Lifecycle Generators ---');

  // getDefaultSampleState()
  const sample = getDefaultSampleState();
  assert(sample.pageWidth === 'standard', 'Sample state defaults to standard width');
  assert(sample.years === 6, 'Sample state has 6 projection years');
  assert(sample.workers.length >= 1, 'Sample state contains primary income earner');
  assert(sample.other.length >= 2, 'Sample state contains additional income streams');
  assert(sample.col.length >= 15, 'Sample state contains realistic expense rows');
  assert(sample.catOrder.length >= 5, 'Sample state has rich category taxonomy');
  assert(Object.keys(sample.customSavings).length >= 1, 'Sample state includes savings goals');
  sample.workers.forEach(w => {
    assert(w.wage.length === sample.years, `Worker ${w.name} wage length matches years`);
    assert(w.hours.length === sample.years, `Worker ${w.name} hours length matches years`);
  });
  sample.col.forEach(c => {
    assert(c.monthly.length === sample.years, `Expense ${c.name} monthly length matches years`);
  });

  // getCleanEmptyState()
  const empty = getCleanEmptyState(4, 'months');
  assert(empty.pageWidth === 'standard', 'Empty state defaults to standard width');
  assert(empty.years === 4, 'Empty state creates specified 4 years');
  assert(empty.viewMode === 'months', 'Empty state respects months viewMode');
  assert(empty.workers.length === 1, 'Empty state provides 1 clean starter earner');
  assert(empty.workers[0].wage.every(w => w === 0), 'Empty state worker wages are 0');
  assert(empty.col[0].monthly.every(m => m === 0), 'Empty state expenses are 0');
  assert(Object.keys(empty.customSavings).length === 0, 'Empty state has empty custom savings');

  console.log('✅ Suite 12 Passed: Starter generators produce strictly typed, non-null structures.\n');

  // =====================================================================
  // SUITE 13: YEAR EXPANSION & CONTRACTION INVARIANTS
  // =====================================================================
  console.log('--- Suite 13: Year Expansion & Contraction Invariants ---');

  // Test expanding from 3 to 6 years with copy-forward logic
  let state3 = getCleanEmptyState(3);
  state3.workers[0].wage = [50000, 55000, 60000];
  state3.col[0].monthly = [1000, 1100, 1200];

  // Simulating year add (copying last index forward)
  const addYear = (s: PlannerState): PlannerState => {
    const nextY = s.years + 1;
    return {
      ...s,
      years: nextY,
      workers: s.workers.map(w => ({
        ...w,
        wage: [...w.wage, w.wage[w.wage.length - 1] ?? 0],
        hours: [...w.hours, w.hours[w.hours.length - 1] ?? 40],
      })),
      col: s.col.map(c => ({
        ...c,
        monthly: [...c.monthly, c.monthly[c.monthly.length - 1] ?? 0],
      })),
      st: [...s.st, s.st[s.st.length - 1] ?? 'CA'],
      deps: [...s.deps, s.deps[s.deps.length - 1] ?? 0],
      additionalDeductions: [...s.additionalDeductions, s.additionalDeductions[s.additionalDeductions.length - 1] ?? 0],
      retireRate: [...s.retireRate, s.retireRate[s.retireRate.length - 1] ?? 0],
      employerMatchRate: [...s.employerMatchRate, s.employerMatchRate[s.employerMatchRate.length - 1] ?? 0],
    };
  };

  const state4 = addYear(state3);
  assert(state4.years === 4, 'Years incremented to 4');
  assert(state4.workers[0].wage[3] === 60000, 'Worker wage copied last year forward ($60,000)');
  assert(state4.col[0].monthly[3] === 1200, 'Expense monthly copied last year forward ($1,200)');

  // Simulating year remove (popping last index)
  const removeYear = (s: PlannerState): PlannerState => {
    const nextY = Math.max(1, s.years - 1);
    return {
      ...s,
      years: nextY,
      workers: s.workers.map(w => ({
        ...w,
        wage: w.wage.slice(0, nextY),
        hours: w.hours.slice(0, nextY),
      })),
      col: s.col.map(c => ({
        ...c,
        monthly: c.monthly.slice(0, nextY),
      })),
      st: s.st.slice(0, nextY),
      deps: s.deps.slice(0, nextY),
      additionalDeductions: s.additionalDeductions.slice(0, nextY),
      retireRate: s.retireRate.slice(0, nextY),
      employerMatchRate: s.employerMatchRate.slice(0, nextY),
    };
  };

  const stateBack3 = removeYear(state4);
  assert(stateBack3.years === 3, 'Years decremented back to 3');
  assert(stateBack3.workers[0].wage.length === 3, 'Worker wage cleanly truncated to 3');
  assert(stateBack3.col[0].monthly.length === 3, 'Expense monthly cleanly truncated to 3');

  // Hard clamp at 1 year (cannot remove past 1)
  const state1 = removeYear(removeYear(removeYear(stateBack3)));
  assert(state1.years === 1, 'Clamped at 1 year');
  const stateCantGoBelow1 = removeYear(state1);
  assert(stateCantGoBelow1.years === 1, 'Cannot decrease below 1');

  console.log('✅ Suite 13 Passed: Year expansion and contraction invariants fully preserved.\n');

  // =====================================================================
  // SUITE 14: CATEGORY & SECTION ORDERING MUTATIONS
  // =====================================================================
  console.log('--- Suite 14: Category & Section Ordering Mutations ---');

  const reorderState: PlannerState = {
    ...sample,
    sectionOrder: ['sec-summary', 'sec-income', 'sec-taxes', 'sec-expenses', 'sec-retire'],
    catOrder: ['Utilities', 'Housing', 'Food'],
  };

  const reorderedCalc = computePlanner(reorderState);
  assert(reorderedCalc.g.length === 6, 'Planner computes regardless of custom sectionOrder sequence');

  // Move section utility
  const moveSection = (order: string[], secId: string, dir: 'up' | 'down'): string[] => {
    const idx = order.indexOf(secId);
    if (idx === -1) return order;
    const targetIdx = dir === 'up' ? idx - 1 : idx + 1;
    if (targetIdx < 0 || targetIdx >= order.length) return order;
    const next = [...order];
    const [moved] = next.splice(idx, 1);
    next.splice(targetIdx, 0, moved);
    return next;
  };

  const movedDown = moveSection(reorderState.sectionOrder, 'sec-summary', 'down');
  assert(movedDown[0] === 'sec-income' && movedDown[1] === 'sec-summary', 'Section moved down successfully');
  const movedUp = moveSection(movedDown, 'sec-summary', 'up');
  assert(movedUp[0] === 'sec-summary', 'Section moved up successfully');

  console.log('✅ Suite 14 Passed: Section and category ordering mutations verified.\n');

  // =====================================================================
  // SUITE 15: EXTREME BOUNDARIES & RESILIENCE
  // =====================================================================
  console.log('--- Suite 15: Extreme Boundaries & Resilience ---');

  // $0 gross income
  const zeroState: PlannerState = {
    ...getCleanEmptyState(1),
    workers: [{ id: 'w-1', name: 'Unemployed', frequency: 'Annually', hours: [0], wage: [0] }],
    col: [{ id: 'c-1', name: 'Survival Food', cat: 'Food', monthly: [500] }], // $6,000/yr
  };
  const zeroRes = computePlanner(zeroState);
  assert(zeroRes.g[0] === 0, 'Zero gross is 0');
  assert(zeroRes.fed[0] === 0, 'Zero fed tax is 0');
  assert(zeroRes.net[0] === 0, 'Zero net income is 0');
  assert(zeroRes.savings[0] === -6000, 'Deficit reflects full expenses (-$6,000)');

  // $100,000,000 ultra high income
  const ultraRichState: PlannerState = {
    ...getCleanEmptyState(1),
    workers: [{ id: 'w-1', name: 'Titan', frequency: 'Annually', hours: [40], wage: [100000000] }],
    st: ['CA'],
    retireRate: [10],
    employerMatchRate: [10],
  };
  const ultraRes = computePlanner(ultraRichState);
  assert(ultraRes.g[0] === 100000000, 'Gross is $100M');
  assert(ultraRes.fed[0] > 35000000, 'Federal tax is in top bracket');
  assert(ultraRes.stTax[0] > 10000000, 'CA tax includes 1% mental health on >$1M');
  assert(ultraRes.employeeRetireContrib[0] === 30500, 'Retirement is strictly capped at legal limits even for billionaire');
  assert(ultraRes.employerMatchAmount[0] === CAP401K_EMPLOYEE, 'Employer match capped at employee deferral ($23,500)');
  assert(ultraRes.retirementAlerts[0].hasError === true, 'Retirement alert warns of cap limit');

  // Negative / Credit expenses (reimbursements)
  const creditExpState: PlannerState = {
    ...getCleanEmptyState(1),
    workers: [{ id: 'w-1', name: 'Earner', frequency: 'Annually', hours: [40], wage: [60000] }],
    col: [
      { id: 'c-1', name: 'Expense', cat: 'Living', monthly: [1000] },
      { id: 'c-2', name: 'Reimbursement', cat: 'Living', monthly: [-300] },
    ],
  };
  const creditRes = computePlanner(creditExpState);
  assert(creditRes.colOnly[0] === (1000 - 300) * 12, 'Supports negative credit line items in living expenses ($8,400)');

  console.log('✅ Suite 15 Passed: Extreme bounds ($0, $100M, credits, caps) execute smoothly.\n');

  // =====================================================================
  // SUITE 16: HEAT MAP MATHEMATICAL CURVES
  // =====================================================================
  console.log('--- Suite 16: Heat Map Mathematical Curves ---');

  const computeHeatOpacity = (val: number, maxVal: number, intensity: number, contrast: number): number => {
    if (val <= 0 || intensity === 0) return 0;
    const ratio = Math.min(1, Math.max(0, val / Math.max(1, maxVal)));
    const exp = Math.pow(4, (50 - contrast) / 50);
    let t = Math.pow(ratio, exp) * (intensity / 100);
    if (t > 0 && t < 0.04) t = 0.04;
    return t;
  };

  // Zero value produces 0 opacity
  assert(computeHeatOpacity(0, 5000, 75, 50) === 0, 'Zero cost produces 0 opacity');
  // Full value at 100% intensity and neutral contrast produces 1.0
  assertClose(computeHeatOpacity(5000, 5000, 100, 50), 1.0, 0.001, 'Max value at 100% intensity produces 1.0 opacity');
  // Half value with neutral contrast (exp=1) produces 0.5 * 0.75 = 0.375
  assertClose(computeHeatOpacity(2500, 5000, 75, 50), 0.375, 0.001, 'Half value at 75% intensity produces 0.375 opacity');
  // Minimum visible threshold (0.04 floor)
  assert(computeHeatOpacity(1, 100000, 10, 50) >= 0.04, 'Enforces minimum visible 0.04 floor');

  console.log('✅ Suite 16 Passed: Heat map mathematical formulas and contrast curves verified.\n');

  // =====================================================================
  // SUITE 17: PRE-TAX 401(k), EMPLOYER-MATCH CAP, CTC PHASE-OUT, MFS SURTAX
  // =====================================================================
  console.log('--- Suite 17: Pre-Tax 401(k), Match Cap, CTC Phase-out, MFS Surtax ---');

  // 17a. Traditional 401(k) employee deferral reduces federal + CA taxable income,
  //      but NOT the FICA wage base.
  const preTaxBase: PlannerState = {
    ...baseState,
    taxStatus: 'Single',
    workers: [{ id: 'w-1', name: 'E', frequency: 'Annually', hours: [40], wage: [150000] }],
    other: [],
    st: ['CA'],
    fica: true,
    employerMatchRate: [0],
  };
  const noDefer = computePlanner({ ...preTaxBase, retireRate: [0] });
  const withDefer = computePlanner({ ...preTaxBase, retireRate: [20] }); // target 30k -> 7k Roth + 23k 401k

  const traditional401k = withDefer.k401Arr[0];
  assert(traditional401k === 23000, `401(k) employee deferral is $23,000 (got ${traditional401k})`);

  const expectedFedWithDefer = marginalTax(150000 - 23000 - FED_2025.Single.stdDed, FED_2025.Single.brackets);
  assertClose(withDefer.fed[0], expectedFedWithDefer, 0.01, 'Federal tax uses income minus traditional 401(k)');
  assert(withDefer.fed[0] < noDefer.fed[0], 'Traditional 401(k) lowers federal tax');
  assert(withDefer.stTax[0] < noDefer.stTax[0], 'Traditional 401(k) lowers CA state tax');
  assertClose(withDefer.fica[0], noDefer.fica[0], 0.01, 'Traditional 401(k) does NOT change FICA');

  // Roth-only contribution (target <= Roth cap) must NOT reduce taxable income.
  const rothOnly = computePlanner({ ...preTaxBase, retireRate: [4] }); // target 6k, all Roth
  assert(rothOnly.k401Arr[0] === 0, 'Roth-only scenario has no 401(k) deferral');
  assertClose(rothOnly.fed[0], noDefer.fed[0], 0.01, 'Roth IRA contribution does not reduce federal tax');

  // 17b. Employer match cannot exceed the employee's own 401(k) deferral.
  const matchState: PlannerState = {
    ...preTaxBase,
    workers: [{ id: 'w-1', name: 'E', frequency: 'Annually', hours: [40], wage: [200000] }],
    retireRate: [8],           // target 16k -> 7k Roth + 9k 401k employee
    employerMatchRate: [50],    // 50% of 200k = 100k, but capped to the 9k deferral
  };
  const matchRes = computePlanner(matchState);
  assert(matchRes.k401Arr[0] === 9000, `Employee 401(k) deferral is $9,000 (got ${matchRes.k401Arr[0]})`);
  assert(matchRes.employerMatchAmount[0] === 9000, `Employer match capped at deferral $9,000 (got ${matchRes.employerMatchAmount[0]})`);
  const zeroDeferMatch = computePlanner({ ...matchState, retireRate: [0], employerMatchRate: [50] });
  assert(zeroDeferMatch.employerMatchAmount[0] === 0, 'No employee deferral => no employer match');

  // 17c. Child Tax Credit phases out $50 per $1,000 of gross over $400k (MFJ).
  const ctcBase: PlannerState = {
    ...baseState,
    taxStatus: 'Married',
    workers: [{ id: 'w-1', name: 'E', frequency: 'Annually', hours: [40], wage: [430000] }],
    other: [],
    st: ['NONE'],
    fica: false,
    retireRate: [0],
    deps: [2],
  };
  const ctcRes = computePlanner(ctcBase);
  const grossFed = marginalTax(430000 - FED_2025.Married.stdDed, FED_2025.Married.brackets);
  // $30k over threshold -> 30 * $50 = $1,500 phase-out; credit = max(0, 4000 - 1500) = 2500
  assertClose(ctcRes.fed[0], grossFed - 2500, 0.01, 'CTC phased out by $1,500 at $430k MFJ income');

  // 17d. Additional Medicare surtax threshold for Married Filing Separately is $125,000.
  const mfsState: PlannerState = {
    ...baseState,
    taxStatus: 'MarriedSeparate',
    workers: [{ id: 'w-1', name: 'E', frequency: 'Annually', hours: [40], wage: [150000] }],
    other: [],
    st: ['NONE'],
    fica: true,
    retireRate: [0],
  };
  const mfsRes = computePlanner(mfsState);
  const expectedMfsFica =
    Math.min(150000, SS_WAGE_CAP) * SS_RATE +
    150000 * MEDICARE_RATE +
    (150000 - 125000) * 0.009;
  assertClose(mfsRes.fica[0], expectedMfsFica, 0.01, 'MFS additional Medicare surtax kicks in at $125k');

  // 17e. 'NONE' / unknown jurisdictions produce zero state tax.
  const noneState = computePlanner({ ...preTaxBase, st: ['NONE'], retireRate: [0] });
  assert(noneState.stTax[0] === 0, "Jurisdiction 'NONE' produces $0 state tax");

  console.log('✅ Suite 17 Passed: Pre-tax 401(k), match cap, CTC phase-out, and MFS surtax verified.\n');

  // =====================================================================
  // SUMMARY
  // =====================================================================
  console.log('---------------------------------------------------------');
  console.log(`🎉 ALL ${passedCount} / ${testCount} TEST VERIFICATIONS PASSED WITH 100% SUCCESS!`);
  console.log('---------------------------------------------------------\n');
}

// Execute test suite
runAllTests();
