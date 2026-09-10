/**
 * ============================================================================
 *  LEDGER V2 · APPLICATION LOGIC
 * ============================================================================
 */
(function () {
  'use strict';

  // ── HELPER FORMATTERS ────────────────────────────────────────────────────
  const num = (v) => {
    if (v === undefined || v === null || v === '') return 0;
    if (typeof v === 'number') return isNaN(v) || !isFinite(v) ? 0 : v;
    if (typeof v === 'string') {
      const cleaned = v.replace(/[$,%\s]/g, '');
      if (!cleaned || cleaned === '-' || cleaned === '.') return 0;
      const n = Number(cleaned);
      return isNaN(n) || !isFinite(n) ? 0 : n;
    }
    return 0;
  };

  const fmt$ = (n) => {
    if (n === undefined || n === null || isNaN(n) || !isFinite(n)) return '$0';
    const rounded = Math.round(n);
    return (rounded < 0 ? '-' : '') + '$' + Math.abs(rounded).toLocaleString('en-US');
  };

  const fmtCompact$ = (n) => {
    if (n === undefined || n === null || isNaN(n) || !isFinite(n)) return '$0';
    const abs = Math.abs(n);
    const sign = n < 0 ? '-' : '';
    if (abs < 100000) return fmt$(n);
    if (abs < 1000000) return `${sign}$${Math.round(abs / 1000).toLocaleString('en-US')}k`;
    const m = abs / 1000000;
    const str = m >= 100 ? Math.round(m).toString() : m.toFixed(2).replace(/\.?0+$/, '');
    return `${sign}$${str}M`;
  };

  const fmtPct = (n) => {
    if (n === undefined || n === null || isNaN(n) || !isFinite(n)) return '0.0%';
    return Number(n).toFixed(1) + '%';
  };

  function getAnnualIncome(frequency, rawVal, hoursPerWeek = 40) {
    const v = num(rawVal);
    if (frequency === 'Hourly') {
      return num(hoursPerWeek) * v * 52;
    }
    const mult = ANNUAL_MULTIPLIERS[frequency] || 1;
    return v * mult;
  }

  function getRothContributionLimit(statusKey, earnedIncome, modifiedAgi, requestedContributors = 1) {
    const contributors = statusKey === 'Married'
      ? Math.max(1, Math.min(2, Math.floor(num(requestedContributors) || 1)))
      : 1;
    const statutoryLimit = ROTH_CAP * contributors;
    const [phaseoutStart, phaseoutEnd] = ROTH_PHASEOUTS_2025[statusKey] || ROTH_PHASEOUTS_2025.Single;
    const phaseoutFraction = modifiedAgi <= phaseoutStart
      ? 1
      : Math.max(0, Math.min(1, (phaseoutEnd - modifiedAgi) / (phaseoutEnd - phaseoutStart)));
    return Math.min(Math.max(0, earnedIncome), statutoryLimit * phaseoutFraction);
  }

  function marginalTax(taxable, brackets) {
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

  // ── STARTER SAMPLE STATE ─────────────────────────────────────────────────
  function getDefaultSampleState() {
    const YEARS = 6;
    return {
      plannerMode: 'single', // 'single' | 'multi'
      storedMultiYears: YEARS,
      viewMode: 'years',
      years: 1,
      startYear: 2025,
      darkMode: true,
      isEditMode: false,
      activeTab: 'overview',
      expenseView: 'cards', // 'cards' | 'table'
      collapsedExpenseCats: {},
      chartType: 'bar',
      chartSeries: {
        gross: true,
        net: true,
        expenses: true,
        savings: true,
        retire: true,
      },
      taxStatus: 'Married',
      st: Array(YEARS).fill('CA'),
      deps: Array(YEARS).fill(0),
      additionalDeductions: Array(YEARS).fill(0),
      fica: true,
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
          name: 'Investments & Yield',
          frequency: 'Annually',
          amount: [1800, 1800, 2200, 2400, 2600, 3000],
        },
      ],
      col: [
        { id: 'c-1', name: 'Mortgage / Rent', cat: 'Housing', monthly: [2400, 2400, 2400, 2400, 2400, 2400] },
        { id: 'c-2', name: 'Groceries', cat: 'Food', monthly: [450, 450, 450, 450, 450, 450] },
        { id: 'c-3', name: 'Dining Out', cat: 'Food', monthly: [300, 350, 400, 320, 450, 380] },
        { id: 'c-4', name: 'Car Payment', cat: 'Transportation', monthly: [410, 410, 410, 410, 410, 410] },
        { id: 'c-5', name: 'Car Insurance', cat: 'Transportation', monthly: [145, 145, 145, 145, 145, 145] },
        { id: 'c-6', name: 'Gas & Charging', cat: 'Transportation', monthly: [130, 140, 125, 150, 160, 145] },
        { id: 'c-7', name: 'Electric & Gas', cat: 'Utilities', monthly: [180, 195, 210, 240, 220, 190] },
        { id: 'c-8', name: 'Water & Sewer', cat: 'Utilities', monthly: [65, 65, 65, 70, 70, 70] },
        { id: 'c-9', name: 'Mobile Phones', cat: 'Utilities', monthly: [85, 85, 85, 85, 85, 85] },
        { id: 'c-10', name: 'Home Internet', cat: 'Utilities', monthly: [79, 79, 79, 79, 79, 79] },
        { id: 'c-11', name: 'Streaming & Software', cat: 'Subscriptions', monthly: [65, 65, 65, 120, 120, 120] },
        { id: 'c-12', name: 'Health Coverage', cat: 'Health & Wellness', monthly: [310, 310, 310, 310, 310, 310] },
        { id: 'c-13', name: 'Gym Membership', cat: 'Health & Wellness', monthly: [80, 80, 80, 80, 80, 80] },
        { id: 'c-14', name: 'Credit Card Debt', cat: 'Additional Payments', monthly: [200, 200, 200, 200, 0, 0] },
        { id: 'c-15', name: 'Pet Care', cat: 'Lifestyle', monthly: [120, 150, 120, 120, 220, 120] },
        { id: 'c-16', name: 'Concerts & Events', cat: 'Entertainment', monthly: [100, 120, 250, 150, 85, 150] },
      ],
      k401Rate: [6, 6, 8, 8, 10, 10],
      rothRate: [4, 4, 4, 5, 5, 5],
      employerMatchRate: [3, 3, 3, 4, 4, 4],
      rothContributors: 1,
      startingCash: 0,
      startingRetirement: 0,
      retirementReturnRate: 6,
      customSavings: {
        'sav-emergency': {
          id: 'sav-emergency',
          name: 'Emergency Fund',
          monthly: [500, 500, 500, 500, 500, 500],
        },
        'sav-vacation': {
          id: 'sav-vacation',
          name: 'Vacation Reserve',
          monthly: [200, 200, 200, 400, 400, 400],
        },
      },
      isSample: true,
      firstRun: false,
      setupGuideVisible: false,
    };
  }

  function getCleanEmptyState(years = 6, previous = {}) {
    const isSingle = previous.plannerMode !== 'multi';
    const effectiveYears = isSingle ? 1 : Math.max(2, years);
    return {
      plannerMode: isSingle ? 'single' : 'multi',
      storedMultiYears: previous.storedMultiYears || 6,
      viewMode: 'years',
      years: effectiveYears,
      startYear: previous.startYear || new Date().getFullYear(),
      darkMode: previous.darkMode !== false,
      isEditMode: false,
      activeTab: 'overview',
      expenseView: 'cards',
      collapsedExpenseCats: {},
      chartType: 'bar',
      chartSeries: { gross: true, net: true, expenses: true, savings: true, retire: true },
      taxStatus: 'Single',
      st: Array(effectiveYears).fill('CA'),
      deps: Array(effectiveYears).fill(0),
      additionalDeductions: Array(effectiveYears).fill(0),
      fica: true,
      workers: [
        { id: 'w-1', name: 'Primary Earner', frequency: 'Hourly', hours: Array(effectiveYears).fill(40), wage: Array(effectiveYears).fill(0) },
      ],
      other: [],
      col: [
        { id: 'c-1', name: 'Housing (Rent/Mortgage)', cat: 'Housing', monthly: Array(effectiveYears).fill(0) },
      ],
      k401Rate: Array(effectiveYears).fill(0),
      rothRate: Array(effectiveYears).fill(0),
      employerMatchRate: Array(effectiveYears).fill(0),
      rothContributors: 1,
      startingCash: 0,
      startingRetirement: 0,
      retirementReturnRate: 6,
      customSavings: {},
      firstRun: true,
      setupGuideVisible: true,
    };
  }

  function ensureArraysLength(targetYears, targetState = state) {
    (targetState.workers || []).forEach((w) => {
      if (!Array.isArray(w.wage)) w.wage = [w.wage || 0];
      if (!Array.isArray(w.hours)) w.hours = [w.hours || 40];
      while (w.wage.length < targetYears) w.wage.push(w.wage[w.wage.length - 1] ?? 0);
      while (w.hours.length < targetYears) w.hours.push(w.hours[w.hours.length - 1] ?? 40);
    });
    (targetState.other || []).forEach((o) => {
      if (!Array.isArray(o.amount)) o.amount = [o.amount || 0];
      while (o.amount.length < targetYears) o.amount.push(o.amount[o.amount.length - 1] ?? 0);
    });
    (targetState.col || []).forEach((c) => {
      if (!Array.isArray(c.monthly)) c.monthly = [c.monthly || 0];
      while (c.monthly.length < targetYears) c.monthly.push(c.monthly[c.monthly.length - 1] ?? 0);
    });
    if (targetState.customSavings) {
      Object.values(targetState.customSavings).forEach((s) => {
        if (!Array.isArray(s.monthly)) s.monthly = [s.monthly || 0];
        while (s.monthly.length < targetYears) s.monthly.push(s.monthly[s.monthly.length - 1] ?? 0);
      });
    }
    if (targetState.k401Rate) {
      while (targetState.k401Rate.length < targetYears) targetState.k401Rate.push(targetState.k401Rate[targetState.k401Rate.length - 1] ?? 0);
    }
    if (targetState.rothRate) {
      while (targetState.rothRate.length < targetYears) targetState.rothRate.push(targetState.rothRate[targetState.rothRate.length - 1] ?? 0);
    }
    if (targetState.employerMatchRate) {
      while (targetState.employerMatchRate.length < targetYears) targetState.employerMatchRate.push(targetState.employerMatchRate[targetState.employerMatchRate.length - 1] ?? 0);
    }
    if (targetState.st) {
      while (targetState.st.length < targetYears) targetState.st.push(targetState.st[targetState.st.length - 1] ?? 'CA');
    }
    if (targetState.deps) {
      while (targetState.deps.length < targetYears) targetState.deps.push(targetState.deps[targetState.deps.length - 1] ?? 0);
    }
    if (targetState.additionalDeductions) {
      while (targetState.additionalDeductions.length < targetYears) targetState.additionalDeductions.push(targetState.additionalDeductions[targetState.additionalDeductions.length - 1] ?? 0);
    }
  }

  function normalizePlan(saved) {
    const plan = { ...getCleanEmptyState(), ...saved };
    plan.plannerMode = saved.plannerMode === 'multi' ? 'multi' : 'single';
    plan.storedMultiYears = Math.max(2, Math.min(10, Math.floor(num(saved.storedMultiYears || saved.years) || 6)));
    plan.years = plan.plannerMode === 'multi' ? Math.max(2, Math.min(10, Math.floor(num(saved.years) || 6))) : 1;
    plan.startYear = Math.max(1980, Math.min(2100, Math.floor(num(saved.startYear) || new Date().getFullYear())));
    plan.firstRun = saved.firstRun === true;
    plan.setupGuideVisible = saved.setupGuideVisible === true;
    plan.chartType = saved.chartType === 'area' ? 'area' : 'bar';
    plan.chartSeries = saved.chartSeries || {};
    plan.collapsedExpenseCats = saved.collapsedExpenseCats || {};
    for (const key of ['workers','other','col']) {
      plan[key] = Array.isArray(saved[key]) ? saved[key].filter(row => row && typeof row === 'object') : plan[key];
    }
    plan.customSavings = saved.customSavings && typeof saved.customSavings === 'object' ? saved.customSavings : {};
    for (const key of ['k401Rate','rothRate','employerMatchRate','deps','additionalDeductions','st']) {
      if (!Array.isArray(plan[key])) plan[key] = [plan[key] ?? (key === 'st' ? 'CA' : 0)];
    }
    if (!saved.k401Rate && saved.retireRate) plan.k401Rate = saved.retireRate;
    ensureArraysLength(Math.max(plan.years, plan.storedMultiYears), plan);
    return plan;
  }

  // ── CORE CALCULATION ENGINE ──────────────────────────────────────────────
  function computePlanner(state) {
    const years = Math.min(10, Math.max(1, Math.floor(Number(state.years)) || 1));
    // Projections are strictly annual (1 to 10 years)
    const periodScale = 1;

    const g = [];
    const earned = [];
    const fed = [];
    const stTax = [];
    const fica = [];
    const totalTax = [];
    const net = [];
    const colOnly = [];
    const retireActual = [];
    const employeeRetireContrib = [];
    const employerMatchAmount = [];
    const rothArr = [];
    const rothLimit = [];
    const k401Arr = [];
    const customSavingsTotal = [];
    const savings = [];
    const savingsOT = [];
    const retireOT = [];
    const unallocatedBalance = [];

    let sOT = Math.max(0, num(state.startingCash));
    let rOT = Math.max(0, num(state.startingRetirement));
    const retirementReturnRate = Math.max(-100, num(state.retirementReturnRate ?? 6)) / 100;

    const statusKey = state.taxStatus || 'Married';
    const addlMedThresh = ADDL_MEDICARE_THRESHOLDS[statusKey] || ADDL_MEDICARE_THRESHOLDS.Single;
    const ctcPhaseoutStart = statusKey === 'Married' ? 400000 : 200000;

    for (let i = 0; i < years; i++) {
      const deps = num(state.deps?.[i]);
      const addlDeduction = num(state.additionalDeductions?.[i]);

      // 1. Earned Income
      let earnedAnnual = 0;
      (state.workers || []).forEach((w) => {
        const wageVal = num(w.wage?.[i]);
        const hrs = num(w.hours?.[i] ?? 40);
        const freq = w.frequency || 'Hourly';
        earnedAnnual += getAnnualIncome(freq, wageVal, hrs);
      });

      // 2. Other Non-Wage Income
      let otherAnnual = 0;
      (state.other || []).forEach((o) => {
        const amt = num(o.amount?.[i]);
        const freq = o.frequency || 'Monthly';
        otherAnnual += getAnnualIncome(freq, amt);
      });

      const annualGross = earnedAnnual + otherAnnual;
      g.push(annualGross * periodScale);
      earned.push(earnedAnnual * periodScale);

      // 3. Retirement Contributions (User specifies individual % towards each)
      const k401Pct = num(state.k401Rate?.[i]);
      const rothPct = num(state.rothRate?.[i]);
      const employerMatchPct = num(state.employerMatchRate?.[i]);

      // Statutory IRS Limits (2025: $23,500 employee 401(k), $7,000 Roth IRA)
      const maxRothAnnual = getRothContributionLimit(
        statusKey,
        earnedAnnual,
        annualGross,
        state.rothContributors
      );
      const max401kEmployeeAnnual = CAP401K_EMPLOYEE;
      const max401kTotalAnnual = CAP401K_TOTAL_ADDITIONS;

      // 401(k) Employee Contribution: strictly clamped to IRS statutory limit
      const k401Desired = earnedAnnual * (k401Pct / 100);
      const k401EmployeeAnnual = Math.min(k401Desired, max401kEmployeeAnnual);

      // Roth IRA Contribution: strictly clamped to IRS statutory limit
      const rothDesired = earnedAnnual * (rothPct / 100);
      const rothContribAnnual = Math.min(rothDesired, maxRothAnnual);

      // 401k match: Matches employee 401(k) contribution up to employerMatchPct of earned wages
      const matchPotential = earnedAnnual * (employerMatchPct / 100);
      const matchAllowable = Math.min(matchPotential, k401EmployeeAnnual);
      const total401kAnnual = Math.min(k401EmployeeAnnual + matchAllowable, max401kTotalAnnual);
      const actualEmployerMatchAnnual = Math.max(0, total401kAnnual - k401EmployeeAnnual);

      const employeeTotalAnnual = rothContribAnnual + k401EmployeeAnnual;
      const retireTotalAnnual = rothContribAnnual + total401kAnnual;
      const preTaxRetirement = k401EmployeeAnnual;

      // 4. Federal Tax
      const fedConfig = FED_2025[statusKey] || FED_2025.Married;
      const fedTaxable = Math.max(0, annualGross - preTaxRetirement - fedConfig.stdDed - addlDeduction);
      const ctcRaw = CTC_PER_DEP * deps;
      const ctcPhaseout = annualGross > ctcPhaseoutStart ? Math.ceil((annualGross - ctcPhaseoutStart) / 1000) * 50 : 0;
      const ctcApplied = Math.max(0, ctcRaw - ctcPhaseout);
      let ftAnnual = Math.max(0, marginalTax(fedTaxable, fedConfig.brackets) - ctcApplied);
      fed.push(ftAnnual * periodScale);

      // 5. State & Local Tax
      const regionKey = String(state.st?.[i] || 'CA').toUpperCase();
      let stxAnnual = 0;

      if (regionKey === 'CA') {
        const cfg = CA_2025[statusKey] || CA_2025.Married;
        const taxable = Math.max(0, annualGross - preTaxRetirement - cfg.stdDed - addlDeduction);
        stxAnnual = marginalTax(taxable, cfg.brackets);
        stxAnnual -= cfg.ex + CA_DEP_EXEMPTION_CREDIT * deps;
        stxAnnual = Math.max(0, stxAnnual);
        if (taxable > CA_MENTAL_HEALTH_TAX_THRESHOLD) {
          stxAnnual += (taxable - CA_MENTAL_HEALTH_TAX_THRESHOLD) * CA_MENTAL_HEALTH_TAX_RATE;
        }
      } else if (regionKey === 'NY' || regionKey === 'NYC' || regionKey === 'YONKERS') {
        const cfg = NY_2025[statusKey] || NY_2025.Married;
        const taxable = Math.max(0, annualGross - preTaxRetirement - cfg.stdDed - addlDeduction - NY_DEP_EXEMPTION * deps);
        stxAnnual = Math.max(0, marginalTax(taxable, cfg.brackets));
        if (regionKey === 'NYC') {
          const nycCpu = NYC_2025[statusKey] || NYC_2025.Married;
          stxAnnual += marginalTax(taxable, nycCpu.brackets);
        } else if (regionKey === 'YONKERS') {
          stxAnnual += stxAnnual * YONKERS_RESIDENT_SURCHARGE;
        }
      }
      stTax.push(stxAnnual * periodScale);

      // 6. FICA Payroll Taxes
      let fcAnnual = 0;
      if (state.fica) {
        let combinedWage = 0;
        (state.workers || []).forEach((w) => {
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

      const yrTax = (ftAnnual + stxAnnual + fcAnnual) * periodScale;
      totalTax.push(yrTax);

      // 7. Take-home cash after payroll taxes and pre-tax 401(k) deductions.
      // Roth contributions remain part of take-home cash until allocated below.
      const periodNet = annualGross * periodScale - yrTax - k401EmployeeAnnual;
      net.push(periodNet);

      rothArr.push(rothContribAnnual * periodScale);
      rothLimit.push(maxRothAnnual * periodScale);
      k401Arr.push(k401EmployeeAnnual * periodScale);
      employerMatchAmount.push(actualEmployerMatchAnnual * periodScale);
      employeeRetireContrib.push(employeeTotalAnnual * periodScale);

      const periodRetireTotal = retireTotalAnnual * periodScale;
      retireActual.push(periodRetireTotal);
      rOT = rOT * (1 + retirementReturnRate) + periodRetireTotal;
      retireOT.push(rOT);

      // 8. Custom Savings
      let periodCustomSavings = 0;
      Object.keys(state.customSavings || {}).forEach((fundId) => {
        const fund = state.customSavings[fundId];
        const mVal = num(fund?.monthly?.[i]);
        periodCustomSavings += mVal * 12;
      });
      customSavingsTotal.push(periodCustomSavings);

      // 9. Expenses (Overhead)
      const periodCol = (state.col || []).reduce((s, r) => {
        const m = num(r.monthly?.[i]);
        return s + m * 12;
      }, 0);
      colOnly.push(periodCol);

      // 10. Cash Savings & Accumulation
      // This is every dollar retained as cash after living costs and Roth funding.
      // Dedicated savings goals are earmarked within this cash balance, not deducted
      // again from it.
      const periodSavings = periodNet - periodCol - rothContribAnnual;
      savings.push(periodSavings);
      sOT += periodSavings;
      savingsOT.push(sOT);

      // Unallocated Surplus is the cash remaining after earmarked savings goals.
      const periodUnallocated = periodSavings - periodCustomSavings;
      unallocatedBalance.push(periodUnallocated);
    }

    return {
      g,
      earned,
      fed,
      stTax,
      fica,
      totalTax,
      net,
      colOnly,
      retireActual,
      employeeRetireContrib,
      employerMatchAmount,
      rothArr,
      rothLimit,
      k401Arr,
      customSavingsTotal,
      savings,
      savingsOT,
      retireOT,
      unallocatedBalance,
    };
  }

  // ── APP STATE & INITIALIZATION ───────────────────────────────────────────
  let storageNotice = '';
  let previousPlan = null;
  let state = loadPersistedState();
  let calc = computePlanner(state);

  function loadPersistedState() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && typeof parsed.years === 'number') {
          return normalizePlan(parsed);
        }
      }
    } catch (e) {
      storageNotice = 'Your saved plan could not be loaded. It has not been replaced; keep this tab open if you need to recover it.';
      console.warn('Could not read state from localStorage', e);
    }
    // A new planner begins with the user's own blank plan. The sample is an
    // explicit choice, so its numbers can never be mistaken for saved data.
    return getCleanEmptyState();
  }

  function persistState() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
      storageNotice = '';
    } catch (e) {
      storageNotice = 'Changes are only in this tab: browser storage is unavailable. Keep this tab open to avoid losing your plan.';
      console.warn('Could not write state to localStorage', e);
    }
    renderStorageNotice();
  }

  function renderStorageNotice() {
    const notice = document.getElementById('storageNotice');
    if (notice) { notice.textContent = storageNotice; notice.hidden = !storageNotice; }
  }

  function recomputeAndRender() {
    calc = computePlanner(state);
    persistState();
    renderAll();
  }

  // ── RENDER ROOT ──────────────────────────────────────────────────────────
  function renderAll() {
    renderStorageNotice();
    renderMastheadControls();
    renderSetupExperience();
    renderHudMetrics();
    renderHighlights();
    renderSummaryMatrix();
    renderWorkersTable();
    renderOtherIncomeTable();
    renderExpensesSection();
    renderTaxTables();
    renderProjectionAssumptions();
    renderRetireTables();
    renderCustomSavingsTable();
    renderActivePanel();
    renderChart();
    labelTableControls();
  }

  function renderSetupExperience() {
    const guide = document.getElementById('setupGuide');
    if (!guide) return;
    guide.hidden = state.setupGuideVisible === false || state.activeTab !== 'overview';
    document.getElementById('sampleNotice').hidden = !state.isSample;
    const kicker = document.getElementById('setupGuideKicker');
    const intro = document.getElementById('setupGuideIntro');
    if (kicker) kicker.textContent = state.firstRun ? 'Welcome to Ledger' : 'Plan setup';
    if (intro) {
      intro.textContent = state.firstRun
        ? 'Your plan starts blank. Add your own numbers, or explore a clearly marked sample first.'
        : 'Work through the key inputs in order, then review the monthly amount left over.';
    }
  }

  // ── MASTHEAD & TOP CONTROLS ──────────────────────────────────────────────
  function updatePlanningPeriodUI() {
    const isSingle = state.plannerMode !== 'multi';
    const singleBtn = document.getElementById('btnModeSingleYear');
    const multiBtn = document.getElementById('btnModeMultiYear');
    const horizonWrapper = document.getElementById('horizonStepperWrapper');
    const projTabBtn = document.getElementById('tabBtnVisualizer');
    const start = state.startYear || new Date().getFullYear();
    document.getElementById('planningPeriodSummary').textContent = isSingle ? `One year: ${start}` : `Forecast: ${start}–${start + state.years - 1}`;
    singleBtn.textContent = start === new Date().getFullYear() ? 'This year' : 'One year';
    document.getElementById('startYearLabel').textContent = isSingle ? 'Year' : 'Start year';
    document.getElementById('btnRemoveYear').disabled = state.years <= 2;
    document.getElementById('btnAddYear').disabled = state.years >= 10;
    document.getElementById('btnPrevStartYear').disabled = start <= 1980;
    document.getElementById('btnNextStartYear').disabled = start >= 2100;

    if (singleBtn && multiBtn) {
      singleBtn.classList.toggle('active', isSingle);
      singleBtn.setAttribute('aria-pressed', String(isSingle));
      multiBtn.classList.toggle('active', !isSingle);
      multiBtn.setAttribute('aria-pressed', String(!isSingle));

    }

    if (horizonWrapper) {
      horizonWrapper.hidden = isSingle;
    }
    if (projTabBtn) {
      projTabBtn.style.display = isSingle ? 'none' : 'inline-flex';
    }

    const kickerEl = document.getElementById('overviewChartKicker');
    const titleEl = document.getElementById('overviewChartTitle');
    if (kickerEl) {
      kickerEl.textContent = isSingle ? 'Cash flow' : 'Forecast';
    }
    if (titleEl) {
      titleEl.textContent = isSingle ? 'Income and expenses' : 'Cash flow and savings';
    }

    const matrixKicker = document.getElementById('summaryMatrixKicker');
    if (matrixKicker) {
      matrixKicker.textContent = isSingle ? 'This year' : 'Forecast by year';
    }
  }

  function setPlannerMode(mode) {
    if (mode !== 'single' && mode !== 'multi') return;
    state.plannerMode = mode;
    if (mode === 'single') {
      if (state.years > 1) {
        state.storedMultiYears = state.years;
      }
      state.years = 1;
      if (state.activeTab === 'visualizer') {
        state.activeTab = 'overview';
      }
    } else {
      const targetYears = Math.max(2, state.storedMultiYears || 6);
      state.years = targetYears;
      ensureArraysLength(targetYears);
    }
    updatePlanningPeriodUI();
    recomputeAndRender();
  }
  window.setPlannerMode = setPlannerMode;

  function renderMastheadControls() {
    document.getElementById('startYearDisplay').textContent = state.startYear || 2025;
    document.getElementById('yearsCountDisplay').textContent = `${state.years} yrs`;

    const isDark = state.darkMode !== false;
    document.documentElement.setAttribute('data-theme', isDark ? 'dark' : 'light');
    document.getElementById('themeIconSun').style.display = isDark ? 'inline' : 'none';
    document.getElementById('themeIconMoon').style.display = isDark ? 'none' : 'inline';
    document.getElementById('themeLabel').textContent = isDark ? 'Light' : 'Dark';

    const editBtn = document.getElementById('btnToggleEdit');
    if (editBtn) {
      editBtn.classList.toggle('active', !!state.isEditMode);
      document.getElementById('lblEditToggle').textContent = state.isEditMode ? 'Done' : 'Manage rows';
    }

    updatePlanningPeriodUI();
  }

  // ── HUD METRICS ──────────────────────────────────────────────────────────
  function renderHudMetrics() {
    const isSingle = state.plannerMode !== 'multi';
    const totalGross = calc.g.reduce((a, b) => a + b, 0);
    const totalNet = calc.net.reduce((a, b) => a + b, 0);
    const totalTax = calc.totalTax.reduce((a, b) => a + b, 0);
    const totalCol = calc.colOnly.reduce((a, b) => a + b, 0);
    const totalRetire = calc.retireOT[state.years - 1] || 0;
    const monthlyLeftOver = (calc.unallocatedBalance?.[0] || 0) / 12;

    const effTaxRate = totalGross > 0 ? (totalTax / totalGross) * 100 : 0;
    const colRate = totalNet > 0 ? (totalCol / totalNet) * 100 : 0;

    const lblGross = document.getElementById('lblGrossMetric');
    if (lblGross) lblGross.textContent = 'Gross income';

    const badgeGross = document.getElementById('badgeGrossTrend');
    if (badgeGross) badgeGross.textContent = isSingle ? 'Annual Total' : `${state.years}-Yr Total`;

    document.getElementById('hudGrossVal').textContent = fmt$(totalGross);
    document.getElementById('hudGrossFoot').textContent = isSingle ? `Total for ${state.startYear}` : `${state.years}-year total`;

    document.getElementById('hudTaxRateBadge').textContent = `${fmtPct(effTaxRate)} tax`;
    document.getElementById('hudNetVal').textContent = fmt$(totalNet);
    document.getElementById('hudNetFoot').textContent = `${isSingle ? 'Annual' : state.years + '-year total'} · after tax & 401(k)`;

    document.getElementById('hudColBadge').textContent = `${fmtPct(colRate)} of pay`;
    document.getElementById('hudColVal').textContent = fmt$(totalCol);
    document.getElementById('hudColFoot').textContent = isSingle ? 'Annual living costs' : `${state.years}-year living costs`;

    document.getElementById('hudSavingsVal').textContent = fmt$(monthlyLeftOver);
    document.getElementById('hudSavingsVal').classList.toggle('is-shortfall', monthlyLeftOver < 0);
    document.getElementById('hudSavingsBadge').className = `metric-badge ${monthlyLeftOver >= 0 ? 'pos' : 'neg'}`;
    document.getElementById('hudSavingsBadge').textContent = monthlyLeftOver >= 0 ? 'Available' : 'Shortfall';
    document.getElementById('lblSavingsMetric').textContent = `Monthly left over · ${state.startYear || 2025}`;
    document.getElementById('hudSavingsFoot').textContent = 'After expenses, retirement & goals';

    document.getElementById('hudRetireVal').textContent = fmt$(totalRetire);
    document.getElementById('hudRetireFoot').textContent = `Est. balance · end of ${(state.startYear || 2025) + state.years - 1}`;
  }

  // ── PERFORMANCE HIGHLIGHTS ───────────────────────────────────────────────
  function renderHighlights() {
    const isSingle = state.plannerMode !== 'multi';
    const totalGross = calc.g.reduce((a, b) => a + b, 0);
    const totalTax = calc.totalTax.reduce((a, b) => a + b, 0);
    const totalSavings = calc.savingsOT[state.years - 1] || 0;
    const totalRetire = calc.retireOT[state.years - 1] || 0;
    const avgBurn = state.years > 0 ? calc.colOnly.reduce((a, b) => a + b, 0) / state.years : 0;
    const effTaxRate = totalGross > 0 ? (totalTax / totalGross) * 100 : 0;

    const netWealth = totalSavings + totalRetire;

    document.getElementById('hlNetWealthVal').textContent = fmt$(netWealth);
    document.getElementById('hlRetireVal').textContent = fmt$(totalRetire);
    document.getElementById('hlBurnVal').textContent = isSingle ? fmt$(avgBurn) : `${fmt$(avgBurn)} / yr`;
    document.getElementById('hlTaxFrictionVal').textContent = fmtPct(effTaxRate);

    const burnMeta = document.querySelector('.highlight-item:nth-child(3) .highlight-meta');
    if (burnMeta) {
      burnMeta.textContent = isSingle ? `${state.startYear || 2025} Living` : 'Average / Year';
    }

    const wealthMeta = document.getElementById('hlNetWealthMeta');
    if (wealthMeta) {
      wealthMeta.textContent = isSingle ? 'Cash + retirement accounts' : 'Cash + retirement accounts';
    }


  }

  function labelTableControls() {
    document.querySelectorAll('.ledger-matrix input, .ledger-matrix select, .ledger-matrix button').forEach(el => {
      if (el.getAttribute('aria-label')) return;
      const row = el.closest('tr');
      const name = row?.querySelector('input[type="text"]')?.value || row?.querySelector('.sticky-col')?.textContent.trim().slice(0,90) || 'Plan';
      const kind = (el.dataset.action || 'value').replace(/-/g,' ');
      const year = el.dataset.year === undefined ? '' : `, ${state.startYear + Number(el.dataset.year)}`;
      el.setAttribute('aria-label', `${name}: ${kind}${year}`);
    });
  }

  // ── TABLE HELPER: THEAD ──────────────────────────────────────────────────
  function buildTableHeader(labelTitle = 'Line Item') {
    let html = `<thead><tr><th class="sticky-col">${labelTitle}</th>`;
    for (let y = 0; y < state.years; y++) {
      const colTitle = `${(state.startYear || 2025) + y}`;
      html += `<th class="year-col-hdr">${colTitle}</th>`;
    }
    if (state.isEditMode) {
      html += `<th style="width: 40px; text-align: center;">Action</th>`;
    }
    html += `</tr></thead>`;
    return html;
  }

  // ── SUMMARY PROJECTION MATRIX ────────────────────────────────────────────
  function renderSummaryMatrix() {
    const table = document.getElementById('summaryMatrixTable');
    let html = buildTableHeader('Category');
    html += '<tbody>';

    const isSingle = state.plannerMode !== 'multi';

    const rowConfigs = [
      {
        label: isSingle ? 'Gross Income' : 'Gross Projected Income',
        data: calc.g,
        cssClass: 'cell-val bold',
        sub: isSingle ? '' : `Total: ${fmt$(calc.g.reduce((a, b) => a + b, 0))}`,
      },
      {
        label: 'Taxes (Fed + State + FICA)',
        data: calc.totalTax,
        cssClass: 'cell-val negative',
        prefix: '-',
        sub: isSingle ? '' : `Total: ${fmt$(calc.totalTax.reduce((a, b) => a + b, 0))}`,
      },
      {
        label: 'Take-Home Pay',
        data: calc.net,
        cssClass: 'cell-val bold',
        sub: isSingle ? '' : `Total: ${fmt$(calc.net.reduce((a, b) => a + b, 0))}`,
      },
      {
        label: 'Living Expenses',
        data: calc.colOnly,
        cssClass: 'cell-val negative',
        prefix: '-',
        sub: isSingle ? '' : `Total: ${fmt$(calc.colOnly.reduce((a, b) => a + b, 0))}`,
      },
      {
        label: isSingle ? 'Net Annual Savings' : 'Net Savings (Annual Cash)',
        data: calc.savings,
        cssClass: 'cell-val positive',
        customFmt: (v) => fmt$(v),
      },
      ...(isSingle ? [] : [
        {
          label: 'Cumulative Cash Balance',
          data: calc.savingsOT,
          cssClass: 'cell-val bold accent',
        },
      ]),
      {
        label: isSingle ? 'Retirement Contributions' : 'Annual Retirement Additions',
        data: calc.retireActual,
        cssClass: 'cell-val gold',
      },
      ...(isSingle ? [] : [
        {
          label: 'Cumulative Retirement Portfolio',
          data: calc.retireOT,
          cssClass: 'cell-val bold gold',
        },
      ]),
      {
        label: 'Unallocated Surplus',
        data: calc.unallocatedBalance,
        cssClass: 'cell-val',
        customFmt: (v) => fmt$(v),
      },
    ];

    rowConfigs.forEach((cfg, idx) => {
      const isTotalRow = isSingle ? (idx === 2 || idx === 4 || idx === 6) : (idx === 2 || idx === 5 || idx === 7);
      html += `<tr class="${isTotalRow ? 'row-summary-total' : ''}">`;
      html += `<td class="sticky-col">
        <div><strong>${cfg.label}</strong></div>
        ${cfg.sub ? `<div style="font-size:10.5px; color:var(--text-muted);">${cfg.sub}</div>` : ''}
      </td>`;

      for (let y = 0; y < state.years; y++) {
        const val = cfg.data[y] ?? 0;
        const formatted = cfg.customFmt ? cfg.customFmt(val) : `${cfg.prefix || ''}${fmtCompact$(val)}`;
        const posNegClass = val < 0 ? 'cell-val negative' : cfg.cssClass;
        html += `<td class="${posNegClass}">${formatted}</td>`;
      }
      if (state.isEditMode) html += `<td></td>`;
      html += `</tr>`;
    });

    html += '</tbody>';
    table.innerHTML = html;
  }

  // ── WORKERS TABLE ────────────────────────────────────────────────────────
  function renderWorkersTable() {
    const table = document.getElementById('workersTable');
    let html = `<thead><tr>
      <th class="sticky-col">Earner & Frequency</th>`;
    for (let y = 0; y < state.years; y++) {
      const colTitle = `${(state.startYear || 2025) + y}`;
      html += `<th class="year-col-hdr">${colTitle}</th>`;
    }
    if (state.isEditMode) html += `<th style="width: 40px;"></th>`;
    html += `</tr></thead><tbody>`;

    (state.workers || []).forEach((w, wIdx) => {
      html += `<tr>`;
      html += `<td class="sticky-col">
        <input type="text" class="table-input text-left" value="${escapeHtml(w.name)}" data-action="worker-name" data-idx="${wIdx}">
        <div style="display:flex; align-items:center; gap:6px; margin-top:2px;">
          <select class="table-select" data-action="worker-freq" data-idx="${wIdx}">
            ${Object.keys(ANNUAL_MULTIPLIERS)
              .map((freq) => `<option value="${freq}" ${w.frequency === freq ? 'selected' : ''}>${freq}</option>`)
              .join('')}
          </select>

        </div>
      </td>`;

      for (let y = 0; y < state.years; y++) {
        const wageVal = w.wage?.[y] ?? 0;
        html += `<td>
          <label class="income-value-label">${w.frequency === 'Hourly' ? '$ per hour' : '$ / ' + w.frequency.toLowerCase()}
            <input type="number" min="0" step="any" class="table-input" value="${wageVal}" data-action="worker-wage" data-idx="${wIdx}" data-year="${y}">
          </label>
          ${w.frequency === 'Hourly' ? `<label class="income-value-label">Hours / week
            <input type="number" min="0" max="168" step="any" class="table-input" value="${w.hours?.[y] ?? 40}" data-action="worker-default-hours" data-idx="${wIdx}" data-year="${y}">
          </label>` : ''}
        </td>`;
      }

      if (state.isEditMode) {
        html += `<td style="text-align:center;">
          <button type="button" class="row-action-btn" data-action="delete-worker" data-idx="${wIdx}">✕</button>
        </td>`;
      }
      html += `</tr>`;
    });

    html += `</tbody>`;
    table.innerHTML = html;
  }

  // ── OTHER INCOME TABLE ───────────────────────────────────────────────────
  function renderOtherIncomeTable() {
    const table = document.getElementById('otherIncomeTable');
    let html = buildTableHeader('Income Source');
    html += `<tbody>`;

    if (!state.other || state.other.length === 0) {
      html += `<tr><td colspan="${state.years + (state.isEditMode ? 2 : 1)}" style="text-align:center; color:var(--text-muted); padding:16px;">
        No additional income sources listed. Click "+ Add Income Source" above.
      </td></tr>`;
    } else {
      state.other.forEach((o, oIdx) => {
        html += `<tr>`;
        html += `<td class="sticky-col">
          <input type="text" class="table-input text-left" value="${escapeHtml(o.name)}" data-action="other-name" data-idx="${oIdx}">
          <select class="table-select" data-action="other-freq" data-idx="${oIdx}">
            <option value="Annually" ${o.frequency === 'Annually' ? 'selected' : ''}>Annually</option>
            <option value="Monthly" ${o.frequency === 'Monthly' ? 'selected' : ''}>Monthly</option>
            <option value="Quarterly" ${o.frequency === 'Quarterly' ? 'selected' : ''}>Quarterly</option>
          </select>
        </td>`;

        for (let y = 0; y < state.years; y++) {
          const amt = o.amount?.[y] ?? 0;
          html += `<td>
            <input type="number" step="any" class="table-input" value="${amt}" data-action="other-amount" data-idx="${oIdx}" data-year="${y}">
          </td>`;
        }

        if (state.isEditMode) {
          html += `<td style="text-align:center;">
            <button type="button" class="row-action-btn" data-action="delete-other" data-idx="${oIdx}">✕</button>
          </td>`;
        }
        html += `</tr>`;
      });
    }

    html += `</tbody>`;
    table.innerHTML = html;
  }

  // ── REDESIGNED USER-FRIENDLY EXPENSES SECTION ────────────────────────────
  function renderExpenseSummary() {
    const categories = Object.keys(CATEGORY_META);

    // Calculate current monthly & annual expenses totals (based on Year 1)
    let totalMonthlyCurrent = 0;
    const catTotalsMonthly = {};
    categories.forEach((c) => (catTotalsMonthly[c] = 0));

    (state.col || []).forEach((item) => {
      const m = num(item.monthly?.[0] ?? 0);
      totalMonthlyCurrent += m;
      if (catTotalsMonthly[item.cat] !== undefined) {
        catTotalsMonthly[item.cat] += m;
      }
    });

    const totalAnnualCurrent = totalMonthlyCurrent * 12;

    document.getElementById('expensesMonthlyTotalVal').textContent = fmt$(totalMonthlyCurrent);
    document.getElementById('expensesAnnualTotalVal').textContent = fmt$(totalAnnualCurrent);

    // 1. Render Multi-Segment Proportional Spending Bar
    const spendBar = document.getElementById('spendDistributionBar');
    const spendLegend = document.getElementById('spendLegendRow');
    let barHtml = '';
    let legendHtml = '';

    categories.forEach((cat) => {
      const catVal = catTotalsMonthly[cat] || 0;
      if (catVal <= 0) return;

      const pct = totalMonthlyCurrent > 0 ? (catVal / totalMonthlyCurrent) * 100 : 0;
      const meta = CATEGORY_META[cat] || { color: '#2563eb' };

      barHtml += `<div class="spend-bar-segment" data-action="focus-cat-card" data-cat="${cat}" role="button" tabindex="0" style="width: ${pct}%; background: ${meta.color};" title="Click to view ${cat} container · ${fmt$(catVal)}/mo (${pct.toFixed(1)}%)" aria-label="View ${cat} category container"></div>`;

      legendHtml += `<div class="spend-legend-pill" style="--puck-color: ${meta.color};" data-action="focus-cat-card" data-cat="${cat}" role="button" tabindex="0" title="Click to view ${cat} container · ${fmt$(catVal)}/mo (${pct.toFixed(0)}%)" aria-label="View ${cat} category container">
        <span class="spend-pill-marker" aria-hidden="true"></span>
        <span class="spend-pill-name">${cat}</span>
        <span class="spend-pill-amount">${fmt$(catVal)}/mo</span>
        <span class="spend-pill-pct">(${pct.toFixed(0)}%)</span>
      </div>`;
    });

    spendBar.innerHTML = barHtml || `<div class="spend-bar-segment" style="width: 100%; background: var(--bg-subtle);"></div>`;
    spendLegend.innerHTML = legendHtml;
    return { categories, totalMonthlyCurrent, catTotalsMonthly };
  }

  function renderExpensesSection() {
    const { categories, totalMonthlyCurrent, catTotalsMonthly } = renderExpenseSummary();

    // Toggle Between Category Cards vs Full Table View
    const isCardsView = state.expenseView !== 'table';
    document.getElementById('expensesCardsContainer').style.display = isCardsView ? 'grid' : 'none';
    document.getElementById('expensesTableContainer').style.display = isCardsView ? 'none' : 'block';

    document.querySelectorAll('#expenseViewModeToggle .segmented-btn').forEach((btn) => {
      btn.classList.toggle('active', isCardsView ? btn.dataset.expView === 'cards' : btn.dataset.expView === 'table');
    });

    // 2. Render Category Cards View
    const cardsContainer = document.getElementById('expensesCardsContainer');
    let cardsHtml = '';

    categories.forEach((cat) => {
      const meta = CATEGORY_META[cat];
      const items = (state.col || []).filter((item) => item.cat === cat);
      const catMonthly = catTotalsMonthly[cat] || 0;
      const pctOfTotal = totalMonthlyCurrent > 0 ? (catMonthly / totalMonthlyCurrent) * 100 : 0;
      const isCollapsed = state.collapsedExpenseCats?.[cat] ?? (items.length === 0);

      cardsHtml += `
        <div class="category-card ${isCollapsed ? 'collapsed' : ''}" data-cat="${cat}" style="--cat-color: ${meta.color};">
          <div class="category-card-header" role="button" tabindex="0" aria-expanded="${!isCollapsed}" data-action="toggle-cat-card" data-cat="${cat}">
            <div class="category-left">
              <div>
                <div class="category-title-row">
                  <span class="category-color-dot" style="background: ${meta.color};"></span>
                  <div class="category-name">${cat}</div>
                </div>
                <div class="category-meta-badge">${items.length} ${items.length === 1 ? 'item' : 'items'} · ${pctOfTotal.toFixed(0)}% of expenses</div>
              </div>
            </div>
            <div class="category-right">
              <div class="category-total-val">${fmt$(catMonthly)}<span style="font-size:11px; font-weight:400; color:var(--text-muted);">/mo</span></div>
              <span class="category-chevron">▼</span>
            </div>
          </div>

          <div class="category-card-body">
            ${items
              .map((item) => {
                const itemIdx = state.col.indexOf(item);
                const mCost = item.monthly?.[0] ?? 0;
                const annualCost = mCost * 12;
                return `
                <div class="expense-item-row">
                  <input type="text" class="expense-item-name-input" value="${escapeHtml(item.name)}" data-action="col-name" data-idx="${itemIdx}" placeholder="Expense name">
                  <div class="expense-item-cost-wrap">
                    <span class="currency-prefix">$</span>
                  <input type="number" step="any" min="0" class="expense-item-cost-input" value="${mCost}" data-action="col-monthly" data-idx="${itemIdx}" data-year="0" placeholder="0" aria-label="${escapeHtml(item.name)} monthly cost for ${(state.startYear || 2025)}">
                  </div>
                  <span class="expense-item-annual-hint">${fmtCompact$(annualCost)}/yr</span>
                  <button type="button" class="expense-item-delete-btn" data-action="delete-col" data-idx="${itemIdx}" title="Remove item">✕</button>
                </div>
              `;
              })
              .join('')}

            <!-- Inline Quick-Add Item -->
            <div class="category-quick-add" id="quickAddWrap_${cat.replace(/\s+/g, '_')}">
              <button type="button" class="btn-inline-add" data-action="show-inline-add" data-cat="${cat}">
                <span>+ Add expense in ${cat}</span>
              </button>
            </div>
          </div>
        </div>
      `;
    });

    cardsContainer.innerHTML = cardsHtml;

    // 3. Render Spreadsheet Table View (for power users)
    renderExpensesTable();
  }

  function renderExpensesTable(updateTotalsOnly = false) {
    const table = document.getElementById('expensesTable');
    let html = buildTableHeader('Expense Item');
    html += `<tbody>`;

    const categories = Object.keys(CATEGORY_META);

    let totalMonthlyCurrent = 0;
    (state.col || []).forEach((item) => {
      totalMonthlyCurrent += num(item.monthly?.[0] ?? 0);
    });

    categories.forEach((cat) => {
      const items = (state.col || []).filter((item) => item.cat === cat);
      if (items.length === 0 && !state.isEditMode) return;
      const meta = CATEGORY_META[cat] || { color: '#2563eb' };

      const catTotals = Array(state.years).fill(0);
      items.forEach((item) => {
        for (let y = 0; y < state.years; y++) {
          const m = num(item.monthly?.[y]);
          catTotals[y] += m * 12;
        }
      });

      const catMonthlyCurrent = catTotals[0] / 12;
      const pctOfTotal = totalMonthlyCurrent > 0 ? (catMonthlyCurrent / totalMonthlyCurrent) * 100 : 0;

      const isCollapsed = state.collapsedExpenseCats?.[cat] ?? (items.length === 0);

      html += `<tr class="row-group-header category-table-header ${isCollapsed ? 'collapsed' : ''}" style="--cat-color: ${meta.color}; cursor: pointer;" data-action="toggle-table-cat" data-cat="${cat}" tabindex="0" aria-expanded="${!isCollapsed}">
        <td class="sticky-col category-table-sticky" style="background: color-mix(in srgb, ${meta.color} 5%, var(--bg-subtle));">
          <div class="category-table-title" style="display:flex; align-items:center; justify-content:space-between; width:100%;">
            <div style="display:flex; align-items:center; gap:8px;">
              <div class="category-title-wrap">
                <div class="category-title-row">
                  <span class="category-color-dot" style="background: ${meta.color};"></span>
                  <span class="category-name-cell">${cat}</span>
                </div>
                <div class="category-meta-badge">${items.length} ${items.length === 1 ? 'item' : 'items'} · ${pctOfTotal.toFixed(0)}%</div>
              </div>
            </div>
            <span class="table-cat-chevron" style="display:inline-block; font-size:10px; color:var(--text-secondary); transition:transform 0.2s ease; transform: ${isCollapsed ? 'rotate(-90deg)' : 'rotate(0deg)'}; padding-right:4px;">▼</span>
          </div>
        </td>`;
      for (let y = 0; y < state.years; y++) {
        html += `<td class="cell-val bold" style="text-align:right; background: color-mix(in srgb, ${meta.color} 3%, var(--bg-subtle));">${fmtCompact$(catTotals[y])}</td>`;
      }
      if (state.isEditMode) {
        html += `<td style="text-align:center; background: color-mix(in srgb, ${meta.color} 3%, var(--bg-subtle));">
          <button type="button" class="table-cat-add-btn" data-action="quick-add-col-table" data-cat="${cat}" title="Add expense in ${cat}">+ Add</button>
        </td>`;
      }
      html += `</tr>`;

      items.forEach((item, itemIdxInCat) => {
        const itemIdx = state.col.indexOf(item);
        const isLast = itemIdxInCat === items.length - 1;
        html += `<tr class="category-table-item-row ${isLast ? 'category-table-last-row' : ''}" style="--cat-color: ${meta.color}; ${isCollapsed ? 'display: none;' : ''}" data-cat="${cat}">
          <td class="sticky-col">
            <input type="text" class="table-input text-left" value="${escapeHtml(item.name)}" data-action="col-name" data-idx="${itemIdx}">
          </td>`;

        for (let y = 0; y < state.years; y++) {
          const mVal = item.monthly?.[y] ?? 0;
          html += `<td>
            <input type="number" step="any" class="table-input" value="${mVal}" data-action="col-monthly" data-idx="${itemIdx}" data-year="${y}">
          </td>`;
        }

        if (state.isEditMode) {
          html += `<td style="text-align:center;">
            <button type="button" class="row-action-btn" data-action="delete-col" data-idx="${itemIdx}">✕</button>
          </td>`;
        }
        html += `</tr>`;
      });

      if (items.length === 0 && state.isEditMode) {
        html += `<tr class="category-table-item-row category-table-last-row" style="--cat-color: ${meta.color}; ${isCollapsed ? 'display: none;' : ''}" data-cat="${cat}">
          <td class="sticky-col" style="font-size:11px; color:var(--text-muted); padding-left: 28px;">No expenses yet in ${cat}</td>`;
        for (let y = 0; y < state.years; y++) {
          html += `<td></td>`;
        }
        html += `<td></td></tr>`;
      }
    });

    html += `<tr class="row-summary-total">
      <td class="sticky-col"><strong>Total Living Expenses</strong></td>`;
    for (let y = 0; y < state.years; y++) {
      html += `<td class="cell-val bold negative">${fmtCompact$(calc.colOnly[y] ?? 0)}</td>`;
    }
    if (state.isEditMode) html += `<td></td>`;
    html += `</tr>`;

    html += `</tbody>`;
    if (updateTotalsOnly) {
      const snapshot = document.createElement('table');
      snapshot.innerHTML = html;
      const nextCells = snapshot.querySelectorAll('td');
      table.querySelectorAll('td').forEach((cell, index) => {
        if (!cell.querySelector('input, select, button') && nextCells[index]) cell.innerHTML = nextCells[index].innerHTML;
      });
    } else table.innerHTML = html;
  }

  // ── TAX TABLES ───────────────────────────────────────────────────────────
  function renderTaxInputsTable() {
    const inputsTable = document.getElementById('taxInputsTable');
    if (!inputsTable) return;
    let htmlIn = buildTableHeader('Setting');
    htmlIn += `<tbody>`;

    htmlIn += `<tr><td class="sticky-col"><strong>State / Jurisdiction</strong></td>`;
    for (let y = 0; y < state.years; y++) {
      const currSt = state.st?.[y] || 'CA';
      htmlIn += `<td>
        <select class="table-select full-width" data-action="tax-st" data-year="${y}">
          <option value="CA" ${currSt === 'CA' ? 'selected' : ''}>California (CA)</option>
          <option value="NY" ${currSt === 'NY' ? 'selected' : ''}>New York (NY)</option>
          <option value="NYC" ${currSt === 'NYC' ? 'selected' : ''}>New York City (NYC)</option>
          <option value="YONKERS" ${currSt === 'YONKERS' ? 'selected' : ''}>Yonkers, NY</option>
          <option value="NONE" ${currSt === 'NONE' ? 'selected' : ''}>No state tax modeled (0%)</option>
        </select>
      </td>`;
    }
    if (state.isEditMode) htmlIn += `<td></td>`;
    htmlIn += `</tr>`;

    htmlIn += `<tr><td class="sticky-col"><strong>Qualifying children for the tax credit</strong></td>`;
    for (let y = 0; y < state.years; y++) {
      const deps = state.deps?.[y] ?? 0;
      htmlIn += `<td>
        <div class="cell-pill-stepper" data-action-group="deps">
          <button type="button" class="pill-step-btn" data-action="step-deps" data-dir="-1" data-year="${y}" title="Decrease dependents" aria-label="Decrease dependents">−</button>
          <div class="pill-input-wrap">
            <input type="text" inputmode="numeric" pattern="[0-9]*" class="pill-num-input" value="${deps}" data-action="tax-deps" data-year="${y}" aria-label="Dependents count">
          </div>
          <button type="button" class="pill-step-btn" data-action="step-deps" data-dir="1" data-year="${y}" title="Increase dependents" aria-label="Increase dependents">+</button>
        </div>
      </td>`;
    }
    if (state.isEditMode) htmlIn += `<td></td>`;
    htmlIn += `</tr>`;

    htmlIn += `<tr><td class="sticky-col"><strong>Additional Deductions ($)</strong></td>`;
    for (let y = 0; y < state.years; y++) {
      const ded = state.additionalDeductions?.[y] ?? 0;
      htmlIn += `<td>
        <div class="cell-pill-stepper cell-pill-stepper-wide" data-action-group="tax-ded">
          <button type="button" class="pill-step-btn" data-action="step-tax-ded" data-dir="-1" data-year="${y}" title="Decrease deductions by $500" aria-label="Decrease deductions">−</button>
          <div class="pill-input-wrap">
            <span class="pill-prefix">$</span>
            <input type="text" inputmode="numeric" class="pill-num-input pill-num-wide" value="${ded}" data-action="tax-ded" data-year="${y}" aria-label="Additional deduction amount">
          </div>
          <button type="button" class="pill-step-btn" data-action="step-tax-ded" data-dir="1" data-year="${y}" title="Increase deductions by $500" aria-label="Increase deductions">+</button>
        </div>
      </td>`;
    }
    if (state.isEditMode) htmlIn += `<td></td>`;
    htmlIn += `</tr>`;
    htmlIn += `</tbody>`;
    inputsTable.innerHTML = htmlIn;
  }

  function renderTaxResultsTable() {
    const resultsTable = document.getElementById('taxResultsTable');
    if (!resultsTable) return;
    let htmlRes = buildTableHeader('Tax Breakdown');
    htmlRes += `<tbody>`;

    const taxRows = [
      { label: 'Federal Income Tax', data: calc.fed, cls: 'cell-val negative' },
      { label: 'State & Local Tax', data: calc.stTax, cls: 'cell-val negative' },
      { label: 'FICA (Social Security & Medicare)', data: calc.fica, cls: 'cell-val negative' },
      { label: 'Total Annual Tax', data: calc.totalTax, cls: 'cell-val bold negative' },
    ];

    taxRows.forEach((r) => {
      htmlRes += `<tr><td class="sticky-col"><strong>${r.label}</strong></td>`;
      for (let y = 0; y < state.years; y++) {
        htmlRes += `<td class="${r.cls}">-${fmtCompact$(r.data[y] ?? 0)}</td>`;
      }
      if (state.isEditMode) htmlRes += `<td></td>`;
      htmlRes += `</tr>`;
    });

    htmlRes += `<tr class="row-summary-total"><td class="sticky-col"><strong>Effective Tax Rate</strong></td>`;
    for (let y = 0; y < state.years; y++) {
      const g = calc.g[y] || 0;
      const t = calc.totalTax[y] || 0;
      const rate = g > 0 ? (t / g) * 100 : 0;
      htmlRes += `<td class="cell-val bold">${fmtPct(rate)}</td>`;
    }
    if (state.isEditMode) htmlRes += `<td></td>`;
    htmlRes += `</tr>`;

    htmlRes += `</tbody>`;
    resultsTable.innerHTML = htmlRes;

    const selTaxStatus = document.getElementById('selTaxStatus');
    if (selTaxStatus) selTaxStatus.value = state.taxStatus || 'Married';
    const chkFica = document.getElementById('chkFicaToggle');
    if (chkFica) chkFica.checked = state.fica !== false;
  }

  function renderTaxTables() {
    renderTaxInputsTable();
    renderTaxResultsTable();
  }

  // ── RETIREMENT TABLES ────────────────────────────────────────────────────
  function renderRetireInputsTable() {
    const inputsTable = document.getElementById('retireInputsTable');
    if (!inputsTable) return;
    let htmlIn = buildTableHeader('Contribution Strategy');
    htmlIn += `<tbody>`;

    const max401kEmployeeAnnual = CAP401K_EMPLOYEE;

    // Row 1: 401(k) Employee Contribution (% of eligible wages)
    htmlIn += `<tr><td class="sticky-col">
      <strong>401(k) Employee (% of Wage Income)</strong>
      <div style="font-size:10.5px; color:var(--text-secondary); margin-top:2px;">One employee-plan limit: ${fmtCompact$(max401kEmployeeAnnual)}/yr</div>
    </td>`;
    for (let y = 0; y < state.years; y++) {
      const rate = state.k401Rate?.[y] ?? 0;
      const k401Amt = calc.k401Arr?.[y] ?? 0;
      const isCapped = k401Amt >= max401kEmployeeAnnual - 1 && k401Amt > 0;
      htmlIn += `<td>
        <div class="cell-pill-stepper" data-action-group="k401-rate">
          <button type="button" class="pill-step-btn" data-action="step-k401-rate" data-dir="-1" data-year="${y}" title="Decrease 401(k) rate" aria-label="Decrease 401(k) rate">−</button>
          <div class="pill-input-wrap">
            <input type="text" inputmode="decimal" class="pill-num-input" value="${rate}" data-action="k401-rate" data-year="${y}" aria-label="401(k) percentage">
            <span class="pill-suffix">%</span>
          </div>
          <button type="button" class="pill-step-btn" data-action="step-k401-rate" data-dir="1" data-year="${y}" title="Increase 401(k) rate" aria-label="Increase 401(k) rate" >+</button>
        </div>
        <div data-retire-result="k401Arr" data-year="${y}" style="font-size:11px; font-weight:600; margin-top:4px; font-family:var(--font-mono); color:${isCapped ? 'var(--accent-gold)' : 'var(--text-secondary)'};">
          ${fmtCompact$(k401Amt)}${isCapped ? ' (Max)' : ''}
        </div>
      </td>`;
    }
    if (state.isEditMode) htmlIn += `<td></td>`;
    htmlIn += `</tr>`;

    // Row 2: Roth IRA Contribution (% of eligible wages)
    htmlIn += `<tr><td class="sticky-col">
      <strong>Roth IRA (% of Wage Income)</strong>
      <div style="font-size:10.5px; color:var(--text-secondary); margin-top:2px;">Income-adjusted limit shown for each year</div>
    </td>`;
    for (let y = 0; y < state.years; y++) {
      const rate = state.rothRate?.[y] ?? 0;
      const rothAmt = calc.rothArr?.[y] ?? 0;
      const maxRothAnnual = calc.rothLimit?.[y] ?? 0;
      const isCapped = rothAmt >= maxRothAnnual - 1 && rothAmt > 0;
      htmlIn += `<td>
        <div class="cell-pill-stepper" data-action-group="roth-rate">
          <button type="button" class="pill-step-btn" data-action="step-roth-rate" data-dir="-1" data-year="${y}" title="Decrease Roth IRA rate" aria-label="Decrease Roth IRA rate">−</button>
          <div class="pill-input-wrap">
            <input type="text" inputmode="decimal" class="pill-num-input" value="${rate}" data-action="roth-rate" data-year="${y}" aria-label="Roth IRA percentage">
            <span class="pill-suffix">%</span>
          </div>
          <button type="button" class="pill-step-btn" data-action="step-roth-rate" data-dir="1" data-year="${y}" title="Increase Roth IRA rate" aria-label="Increase Roth IRA rate" >+</button>
        </div>
        <div data-retire-result="rothArr" data-year="${y}" style="font-size:11px; font-weight:600; margin-top:4px; font-family:var(--font-mono); color:${isCapped ? 'var(--accent-gold)' : 'var(--text-secondary)'};">
          ${fmtCompact$(rothAmt)} / ${fmtCompact$(maxRothAnnual)}${isCapped ? ' (Max)' : ''}
        </div>
      </td>`;
    }
    if (state.isEditMode) htmlIn += `<td></td>`;
    htmlIn += `</tr>`;

    // Row 3: 401k match (%)
    htmlIn += `<tr><td class="sticky-col">
      <strong>401(k) Match (% of Eligible Wages)</strong>
      <div style="font-size:10.5px; color:var(--text-secondary); margin-top:2px;">Assumes a dollar-for-dollar match up to this wage percentage</div>
    </td>`;
    for (let y = 0; y < state.years; y++) {
      const match = state.employerMatchRate?.[y] ?? 0;
      const matchAmt = calc.employerMatchAmount?.[y] ?? 0;
      htmlIn += `<td>
        <div class="cell-pill-stepper" data-action-group="retire-match">
          <button type="button" class="pill-step-btn" data-action="step-retire-match" data-dir="-1" data-year="${y}" title="Decrease 401k match rate" aria-label="Decrease 401k match rate">−</button>
          <div class="pill-input-wrap">
            <input type="text" inputmode="decimal" class="pill-num-input" value="${match}" data-action="retire-match" data-year="${y}" aria-label="401k match percentage">
            <span class="pill-suffix">%</span>
          </div>
          <button type="button" class="pill-step-btn" data-action="step-retire-match" data-dir="1" data-year="${y}" title="Increase 401k match rate" aria-label="Increase 401k match rate">+</button>
        </div>
        <div data-retire-result="employerMatchAmount" data-year="${y}" style="font-size:11px; font-weight:600; margin-top:4px; font-family:var(--font-mono); color:var(--accent-emerald);">
          +${fmtCompact$(matchAmt)}
        </div>
      </td>`;
    }
    if (state.isEditMode) htmlIn += `<td></td>`;
    htmlIn += `</tr>`;

    htmlIn += `</tbody>`;
    inputsTable.innerHTML = htmlIn;
  }

  function renderRetireBreakdownTable() {
    const breakdownTable = document.getElementById('retireBreakdownTable');
    if (!breakdownTable) return;
    let htmlBk = buildTableHeader('Account Type');
    htmlBk += `<tbody>`;

    const isSingle = state.plannerMode !== 'multi';
    const rRows = [
      { label: 'Traditional 401(k) Employee (Pre-Tax)', data: calc.k401Arr, cls: 'cell-val accent' },
      { label: 'Roth IRA (Post-Tax)', data: calc.rothArr, cls: 'cell-val gold' },
      { label: '401k match', data: calc.employerMatchAmount, cls: 'cell-val positive' },
      { label: 'Total Annual Additions', data: calc.retireActual, cls: 'cell-val bold gold' },
      ...(isSingle ? [] : [
        { label: 'Cumulative Portfolio Balance', data: calc.retireOT, cls: 'cell-val bold accent' },
      ]),
    ];

    rRows.forEach((r, idx) => {
      const isTotal = isSingle ? idx === 3 : (idx === 3 || idx === 4);
      htmlBk += `<tr class="${isTotal ? 'row-summary-total' : ''}"><td class="sticky-col"><strong>${r.label}</strong></td>`;
      for (let y = 0; y < state.years; y++) {
        htmlBk += `<td class="${r.cls}">${fmtCompact$(r.data[y] ?? 0)}</td>`;
      }
      if (state.isEditMode) htmlBk += `<td></td>`;
      htmlBk += `</tr>`;
    });

    htmlBk += `</tbody>`;
    breakdownTable.innerHTML = htmlBk;
  }

  function renderRetireTables() {
    renderRetireInputsTable();
    renderRetireBreakdownTable();
  }

  function renderProjectionAssumptions() {
    const startingCash = document.getElementById('inpStartingCash');
    const startingRetirement = document.getElementById('inpStartingRetirement');
    const retirementReturn = document.getElementById('inpRetirementReturn');
    const rothContributors = document.getElementById('selRothContributors');
    if (startingCash) startingCash.value = num(state.startingCash);
    if (startingRetirement) startingRetirement.value = num(state.startingRetirement);
    if (retirementReturn) retirementReturn.value = num(state.retirementReturnRate ?? 6);
    if (rothContributors) {
      const contributors = state.taxStatus === 'Married'
        ? Math.max(1, Math.min(2, Math.floor(num(state.rothContributors) || 1)))
        : 1;
      rothContributors.value = contributors;
      rothContributors.disabled = state.taxStatus !== 'Married';
    }
  }

  // ── CUSTOM SAVINGS TABLE ─────────────────────────────────────────────────
  function renderCustomSavingsTable() {
    const table = document.getElementById('customSavingsTable');
    let html = buildTableHeader('Goal Name');
    html += `<tbody>`;

    const fundKeys = Object.keys(state.customSavings || {});
    if (fundKeys.length === 0) {
      html += `<tr><td colspan="${state.years + (state.isEditMode ? 2 : 1)}" style="text-align:center; color:var(--text-muted); padding:16px;">
        No dedicated savings goals added. Click "+ Add Goal" above.
      </td></tr>`;
    } else {
      fundKeys.forEach((fId) => {
        const fund = state.customSavings[fId];
        html += `<tr><td class="sticky-col">
          <input type="text" class="table-input text-left" value="${escapeHtml(fund.name)}" data-action="fund-name" data-id="${fId}">
          <span style="font-size:10px; color:var(--text-muted);">Monthly allocation</span>
        </td>`;

        for (let y = 0; y < state.years; y++) {
          const m = fund.monthly?.[y] ?? 0;
          html += `<td>
            <input type="number" step="any" class="table-input" value="${m}" data-action="fund-monthly" data-id="${fId}" data-year="${y}">
          </td>`;
        }

        if (state.isEditMode) {
          html += `<td style="text-align:center;">
            <button type="button" class="row-action-btn" data-action="delete-fund" data-id="${fId}">✕</button>
          </td>`;
        }
        html += `</tr>`;
      });
    }

    html += `</tbody>`;
    table.innerHTML = html;
  }

  // ── SVG VISUALIZER ENGINE ────────────────────────────────────────────────
  function renderChart() {
    const isExpanded = state.activeTab === 'visualizer';
    const svgId = isExpanded ? 'vizProjectionChartSvg' : 'projectionChartSvg';
    const legendId = isExpanded ? 'vizChartLegend' : 'chartLegend';
    const tooltipId = isExpanded ? 'vizChartTooltip' : 'chartTooltip';

    const svg = document.getElementById(svgId);
    const legendEl = document.getElementById(legendId);
    if (!svg || !legendEl) return;

    state.chartMode = state.chartMode || 'cashflow';
    state.chartType = state.chartType || (state.chartMode === 'wealth' ? 'area' : 'bar');

    let seriesDef = [];
    if (state.chartMode === 'wealth') {
      const totalWealth = [];
      for (let i = 0; i < state.years; i++) {
        totalWealth.push((calc.savingsOT[i] || 0) + (calc.retireOT[i] || 0));
      }
      seriesDef = [
        { id: 'totalWealth', label: 'Cash + Retirement', color: '#4ea679', data: totalWealth },
        { id: 'retireOT', label: 'Retirement Portfolio', color: '#d4a359', data: calc.retireOT },
        { id: 'savingsOT', label: 'Cash Reserves', color: '#5aa8e6', data: calc.savingsOT },
      ];
    } else {
      seriesDef = [
        { id: 'gross', label: 'Gross Income', color: '#6ba3d6', data: calc.g },
        { id: 'net', label: 'Take-Home Pay', color: '#4ea679', data: calc.net },
        { id: 'expenses', label: 'Living Expenses', color: '#e59866', data: calc.colOnly },
        { id: 'surplus', label: 'Annual Cash Savings', color: '#56b6c2', data: calc.savings },
      ];
    }

    let legendHtml = '';
    seriesDef.forEach((s) => {
      const isActive = state.chartSeries?.[s.id] !== false;
      legendHtml += `<button type="button" aria-pressed="${isActive}" class="chart-chip ${isActive ? '' : 'inactive'}" data-action="toggle-series" data-series="${s.id}">
        <span class="chip-dot" style="background:${s.color};"></span>
        <span>${s.label}</span>
      </button>`;
    });
    legendEl.innerHTML = legendHtml;

    const container = svg.parentElement;
    const contW = container?.clientWidth || (isExpanded ? 1000 : 880);
    const contH = container?.clientHeight || (isExpanded ? 360 : 240);

    const vbHeight = isExpanded ? 360 : 240;
    // Calculate vbWidth dynamically from container dimensions to maintain 1:1 circular scale and eliminate vertical text stretching on phone
    const vbWidth = Math.max(360, Math.round(vbHeight * (contW / contH)));
    svg.setAttribute('viewBox', `0 0 ${vbWidth} ${vbHeight}`);

    const isMobile = vbWidth < 520;
    const padL = isMobile ? 58 : 72;
    const padR = isMobile ? 18 : 30;
    const padT = 24;
    const padB = 36;

    const plotW = vbWidth - padL - padR;
    const plotH = vbHeight - padT - padB;
    const bandW = plotW / Math.max(1, state.years);

    // Group center for year i
    const getGroupCenterX = (i) => padL + (i + 0.5) * bandW;

    let maxVal = 1000;
    let minVal = 0;
    seriesDef.forEach((s) => {
      if (state.chartSeries?.[s.id] !== false) {
        s.data.forEach((v) => {
          if (v > maxVal) maxVal = v;
          if (v < minVal) minVal = v;
        });
      }
    });
    maxVal = Math.ceil((maxVal * 1.15) / 10000) * 10000 || 10000;

    const getY = (val) => padT + plotH - ((val - minVal) / Math.max(1, maxVal - minVal)) * plotH;

    let svgContent = '';

    // Horizontal Grid Lines & Y-Axis Labels
    const yTicks = 4;
    for (let t = 0; t <= yTicks; t++) {
      const val = minVal + (t / yTicks) * (maxVal - minVal);
      const yPos = getY(val);
      svgContent += `<line x1="${padL}" y1="${yPos}" x2="${vbWidth - padR}" y2="${yPos}" class="chart-grid-line" stroke="var(--border-subtle)" stroke-dasharray="3,3" />`;
      svgContent += `<text x="${padL - 10}" y="${yPos + 4}" text-anchor="end" class="chart-axis-text" fill="var(--text-secondary)" font-size="11" font-weight="600" font-family="var(--font-mono)">${fmtCompact$(val)}</text>`;
    }

    // X-Axis Year Labels (Centered under each band)
    for (let i = 0; i < state.years; i++) {
      const xPos = getGroupCenterX(i);
      const isSingle = state.plannerMode !== 'multi';
      const yrLabel = isSingle ? `${(state.startYear || 2025)} (Annual)` : `'${String((state.startYear || 2025) + i).slice(2)}`;
      svgContent += `<text x="${xPos}" y="${vbHeight - 8}" text-anchor="middle" class="chart-axis-text" fill="var(--text-secondary)" font-size="11.5" font-weight="600" font-family="var(--font-mono)">${yrLabel}</text>`;
    }

    if (state.chartType === 'bar') {
      const activeSeries = seriesDef.filter((s) => state.chartSeries?.[s.id] !== false);
      const numSeries = Math.max(1, activeSeries.length);
      const isSingle = state.plannerMode !== 'multi';
      const groupWidth = Math.min(bandW * 0.74, isSingle ? 240 : 115);
      const barSpacing = 0; // ZERO gaps between adjacent vertical bars
      const barWidth = Math.max(4, groupWidth / numSeries);
      const actualGroupW = numSeries * barWidth;

      for (let i = 0; i < state.years; i++) {
        const groupCenterX = getGroupCenterX(i);
        const startX = groupCenterX - actualGroupW / 2;

        activeSeries.forEach((s, sIdx) => {
          const val = s.data[i] || 0;
          const barX = startX + sIdx * barWidth;
          const barY = getY(Math.max(0, val));
          const baseZeroY = getY(0);
          const barHeight = Math.max(2, Math.abs(baseZeroY - barY));
          const year = (state.startYear || 2025) + i;
          // Add 0.5px subpixel overlap on all bars except the last one so adjacent bars touch seamlessly with ZERO gap
          const barW = sIdx < activeSeries.length - 1 ? barWidth + 0.5 : barWidth;

          let subtext = '';
          if (state.chartMode === 'cashflow') {
            const grossVal = calc.g?.[i] || 1;
            const netVal = calc.net?.[i] || 1;
            if (s.id === 'net') {
              subtext = `${((val / grossVal) * 100).toFixed(1)}% of Gross`;
            } else if (s.id === 'expenses') {
              subtext = `${((val / netVal) * 100).toFixed(1)}% of Pay`;
            } else if (s.id === 'surplus') {
              subtext = val >= 0 ? `+${fmt$(val)} Surplus` : `-${fmt$(Math.abs(val))} Deficit`;
            } else if (s.id === 'gross') {
              subtext = `Total Gross Earnings`;
            }
          } else {
            if (s.id === 'totalWealth') {
              subtext = `Net Wealth (Cash + 401k)`;
            } else if (s.id === 'retireOT') {
              subtext = `Invested Retirement`;
            } else if (s.id === 'savingsOT') {
              subtext = `Liquid Bank Reserves`;
            }
          }

          svgContent += `<rect class="chart-bar" x="${barX}" y="${barY}" width="${barW}" height="${barHeight}" fill="${s.color}" rx="0" opacity="0.95" shape-rendering="crispEdges" data-series="${s.id}" data-label="${s.label}" data-year="${year}" data-val="${val}" data-color="${s.color}" data-sub="${subtext}" />`;
        });
      }
    } else {
      // Area / Line Mode
      seriesDef.forEach((s) => {
        if (state.chartSeries?.[s.id] === false) return;

        let pathD = '';
        const pts = [];
        for (let i = 0; i < state.years; i++) {
          const x = getGroupCenterX(i);
          const y = getY(s.data[i] || 0);
          pts.push({ x, y });
        }

        if (pts.length > 1) {
          const rightEdge = vbWidth - padR;
          // Extend flat to beginning of year horizon (padL)
          pathD = `M ${padL} ${pts[0].y} L ${pts[0].x} ${pts[0].y}`;
          for (let i = 0; i < pts.length - 1; i++) {
            const mx = (pts[i].x + pts[i + 1].x) / 2;
            pathD += ` C ${mx} ${pts[i].y}, ${mx} ${pts[i + 1].y}, ${pts[i + 1].x} ${pts[i + 1].y}`;
          }
          // Extend flat to end of year horizon (rightEdge)
          pathD += ` L ${rightEdge} ${pts[pts.length - 1].y}`;

          const baseZeroY = getY(0);
          const areaD = `${pathD} L ${rightEdge} ${baseZeroY} L ${padL} ${baseZeroY} Z`;
          svgContent += `<path d="${areaD}" fill="${s.color}" class="chart-area" opacity="0.18" />`;
          svgContent += `<path d="${pathD}" stroke="${s.color}" class="chart-line" stroke-width="2.5" fill="none" />`;
        } else if (pts.length === 1) {
          const rightEdge = vbWidth - padR;
          pathD = `M ${padL} ${pts[0].y} L ${rightEdge} ${pts[0].y}`;
          const baseZeroY = getY(0);
          const areaD = `${pathD} L ${rightEdge} ${baseZeroY} L ${padL} ${baseZeroY} Z`;
          svgContent += `<path d="${areaD}" fill="${s.color}" class="chart-area" opacity="0.18" />`;
          svgContent += `<path d="${pathD}" stroke="${s.color}" class="chart-line" stroke-width="2.5" fill="none" />`;
        }

        pts.forEach((pt, pIdx) => {
          // Visible dot: left as original clean r=4
          svgContent += `<circle cx="${pt.x}" cy="${pt.y}" r="4" fill="${s.color}" stroke="var(--bg-canvas)" stroke-width="2" class="chart-marker" data-year="${pIdx}" data-series="${s.id}" />`;
          // Large invisible touch/click hit target (r=28) allowing effortless selection without needing to be perfectly on the dot
          svgContent += `<circle cx="${pt.x}" cy="${pt.y}" r="28" fill="transparent" class="chart-marker-hit" data-year="${pIdx}" data-series="${s.id}" style="cursor: pointer; pointer-events: all;" />`;
        });
      });
    }

    svg.innerHTML = svgContent;
    attachChartTooltipEvents(svg, tooltipId, seriesDef, padL, plotW, bandW);
  }

  function attachChartTooltipEvents(svg, tooltipId, seriesDef, padL, plotW, bandW) {
    const tooltip = document.getElementById(tooltipId);
    if (!tooltip) return;

    const container = svg.parentElement;
    let barHoverTimer = null;
    let markerHoverTimer = null;

    // Direct Bar Hover & Touch Events (Spotlight hovered bar, dim other bars, show ONLY this bar's data)
    const bars = svg.querySelectorAll('.chart-bar');
    bars.forEach((bar) => {
      const showBarTooltip = (e) => {
        if (barHoverTimer) {
          clearTimeout(barHoverTimer);
          barHoverTimer = null;
        }
        svg.classList.add('has-bar-hover');
        bars.forEach((b) => b.classList.remove('bar-hovered'));
        bar.classList.add('bar-hovered');

        const year = bar.dataset.year;
        const label = bar.dataset.label;
        const val = num(bar.dataset.val);
        const color = bar.dataset.color;
        const sub = bar.dataset.sub;

        tooltip.innerHTML = `
          <div class="tooltip-bar-header">
            <div class="tooltip-bar-series">
              <span class="tooltip-series-dot" style="background:${color}"></span>
              <span>${label}</span>
            </div>
            <span class="tooltip-bar-year">'${String(year).slice(2)}</span>
          </div>
          <div class="tooltip-bar-val">${fmt$(val)}</div>
          ${sub ? `<div class="tooltip-bar-sub">${sub}</div>` : ''}
        `;
        tooltip.style.display = 'block';

        const barBox = bar.getBoundingClientRect();
        const containerBox = container.getBoundingClientRect();
        const tooltipW = tooltip.offsetWidth || 150;
        const tooltipH = tooltip.offsetHeight || 60;

        // Smart horizontal clamp so tooltip never clips off left or right edge
        let posX = barBox.left + barBox.width / 2 - containerBox.left;
        const minX = tooltipW / 2 + 10;
        const maxX = containerBox.width - tooltipW / 2 - 10;
        posX = Math.max(minX, Math.min(maxX, posX));

        // Smart vertical flip: if bar is near the top of the container, flip tooltip below the bar top
        let posY = barBox.top - containerBox.top;
        if (posY < tooltipH + 18) {
          tooltip.style.transform = 'translate(-50%, 0)';
          tooltip.style.marginTop = '12px';
          tooltip.style.top = `${Math.max(6, posY)}px`;
        } else {
          tooltip.style.transform = 'translate(-50%, -100%)';
          tooltip.style.marginTop = '-10px';
          tooltip.style.top = `${posY}px`;
        }

        tooltip.style.left = `${posX}px`;
      };

      bar.addEventListener('mouseenter', showBarTooltip);
      bar.addEventListener('mousemove', (e) => {
        const barBox = bar.getBoundingClientRect();
        const containerBox = container.getBoundingClientRect();
        const tooltipW = tooltip.offsetWidth || 150;
        const tooltipH = tooltip.offsetHeight || 60;

        let posX = barBox.left + barBox.width / 2 - containerBox.left;
        const minX = tooltipW / 2 + 10;
        const maxX = containerBox.width - tooltipW / 2 - 10;
        posX = Math.max(minX, Math.min(maxX, posX));

        let posY = barBox.top - containerBox.top;
        if (posY < tooltipH + 18) {
          tooltip.style.transform = 'translate(-50%, 0)';
          tooltip.style.marginTop = '12px';
          tooltip.style.top = `${Math.max(6, posY)}px`;
        } else {
          tooltip.style.transform = 'translate(-50%, -100%)';
          tooltip.style.marginTop = '-10px';
          tooltip.style.top = `${posY}px`;
        }

        tooltip.style.left = `${posX}px`;
      });
      bar.addEventListener('mouseleave', (e) => {
        bar.classList.remove('bar-hovered');
        // Do not hide tooltip if moving into another bar right next to it (eliminates visual flicker and gaps)
        if (e.relatedTarget && e.relatedTarget.classList && e.relatedTarget.classList.contains('chart-bar')) {
          return;
        }
        if (barHoverTimer) clearTimeout(barHoverTimer);
        barHoverTimer = setTimeout(() => {
          svg.classList.remove('has-bar-hover');
          tooltip.style.display = 'none';
        }, 50);
      });
      bar.addEventListener('touchstart', (e) => {
        showBarTooltip(e);
      }, { passive: true });
    });

    // Direct Marker Hover, Click & Touch Events in Area Mode (handles enlarged hit circle)
    const hits = svg.querySelectorAll('.chart-marker-hit');
    hits.forEach((el) => {
      const showMarkerTooltip = (e) => {
        if (markerHoverTimer) {
          clearTimeout(markerHoverTimer);
          markerHoverTimer = null;
        }
        svg.classList.add('has-marker-hover');
        const yearIdx = parseInt(el.dataset.year, 10);
        const sId = el.dataset.series;
        const s = seriesDef.find((item) => item.id === sId);
        if (!s) return;

        // Highlight matching visible marker
        const visibleMarker = svg.querySelector(`.chart-marker[data-year="${yearIdx}"][data-series="${sId}"]`);
        svg.querySelectorAll('.chart-marker').forEach((m) => m.classList.remove('marker-hovered'));
        if (visibleMarker) visibleMarker.classList.add('marker-hovered');

        const year = (state.startYear || 2025) + yearIdx;
        const val = s.data[yearIdx] || 0;

        tooltip.innerHTML = `
          <div class="tooltip-bar-header">
            <div class="tooltip-bar-series">
              <span class="tooltip-series-dot" style="background:${s.color}"></span>
              <span>${s.label}</span>
            </div>
            <span class="tooltip-bar-year">${year}</span>
          </div>
          <div class="tooltip-bar-val">${fmt$(val)}</div>
        `;
        tooltip.style.display = 'block';

        const targetBox = (visibleMarker || el).getBoundingClientRect();
        const containerBox = container.getBoundingClientRect();
        const tooltipW = tooltip.offsetWidth || 150;
        const tooltipH = tooltip.offsetHeight || 60;

        let posX = targetBox.left + targetBox.width / 2 - containerBox.left;
        const minX = tooltipW / 2 + 10;
        const maxX = containerBox.width - tooltipW / 2 - 10;
        posX = Math.max(minX, Math.min(maxX, posX));

        let posY = targetBox.top - containerBox.top;
        if (posY < tooltipH + 18) {
          tooltip.style.transform = 'translate(-50%, 0)';
          tooltip.style.marginTop = '12px';
          tooltip.style.top = `${Math.max(6, posY)}px`;
        } else {
          tooltip.style.transform = 'translate(-50%, -100%)';
          tooltip.style.marginTop = '-10px';
          tooltip.style.top = `${posY}px`;
        }

        tooltip.style.left = `${posX}px`;
      };

      el.addEventListener('mouseenter', showMarkerTooltip);
      el.addEventListener('mouseleave', (e) => {
        if (e.relatedTarget && e.relatedTarget.classList && e.relatedTarget.classList.contains('chart-marker-hit')) {
          return;
        }
        if (markerHoverTimer) clearTimeout(markerHoverTimer);
        markerHoverTimer = setTimeout(() => {
          svg.querySelectorAll('.chart-marker').forEach((m) => m.classList.remove('marker-hovered'));
          svg.classList.remove('has-marker-hover');
          tooltip.style.display = 'none';
        }, 50);
      });
      el.addEventListener('touchstart', (e) => {
        showMarkerTooltip(e);
      }, { passive: true });
      el.addEventListener('click', (e) => {
        showMarkerTooltip(e);
      });
    });

    svg.addEventListener('mouseleave', () => {
      if (barHoverTimer) clearTimeout(barHoverTimer);
      if (markerHoverTimer) clearTimeout(markerHoverTimer);
      svg.classList.remove('has-bar-hover');
      svg.classList.remove('has-marker-hover');
      svg.querySelectorAll('.chart-bar').forEach((b) => b.classList.remove('bar-hovered'));
      svg.querySelectorAll('.chart-marker').forEach((m) => m.classList.remove('marker-hovered'));
      tooltip.style.display = 'none';
    });
  }

  // ── GLOBAL HELPER ACTIONS (ACCESSIBLE TO INLINE ONCLICK & JS) ───────────
  window.computePlanner = computePlanner;
  window.getDefaultSampleState = getDefaultSampleState;
  window.getCleanEmptyState = getCleanEmptyState;
  window.renderExpensesTable = renderExpensesTable;
  window.renderExpensesSection = renderExpensesSection;
  window.renderChart = renderChart;
  window.renderWorkersTable = renderWorkersTable;
  window.stepStartYear = function (delta) {
    state.startYear = Math.max(1980, Math.min(2100, (state.startYear || 2025) + delta));
    recomputeAndRender();
  };

  window.stepYears = function (delta) {
    if (delta < 0) {
      if (state.years > 2) {
        state.years -= 1;
        state.storedMultiYears = state.years;
        recomputeAndRender();
      }
    } else if (delta > 0) {
      if (state.years < 10) {
        state.years += 1;
        state.storedMultiYears = state.years;
        ensureArraysLength(state.years);
        recomputeAndRender();
      }
    }
  };

  function showPlanChangeToast(message) {
    const toast = document.getElementById('planChangeToast');
    const messageEl = document.getElementById('planChangeToastMessage');
    if (!toast || !messageEl) return;
    messageEl.textContent = message;
    toast.hidden = false;
  }

  function replacePlan(nextState, message) {
    previousPlan = JSON.parse(JSON.stringify(state));
    try {
      localStorage.setItem(BACKUP_STORAGE_KEY, JSON.stringify(previousPlan));
    } catch (e) {
      console.warn('Could not back up the current plan', e);
    }
    state = nextState;
    recomputeAndRender();
    showPlanChangeToast(message);
  }

  window.loadSampleData = function () {
    const currentMode = state.plannerMode || 'single';
    const nextState = getDefaultSampleState();
    nextState.plannerMode = currentMode;
    if (currentMode === 'multi') {
      nextState.years = nextState.storedMultiYears || 6;
      ensureArraysLength(nextState.years, nextState);
    } else {
      nextState.years = 1;
    }
    replacePlan(nextState, 'Sample plan loaded. Your previous plan is ready to undo.');
  };

  window.resetData = function () {
    const currentMode = state.plannerMode || 'single';
    const nextState = getCleanEmptyState(currentMode === 'single' ? 1 : (state.storedMultiYears || 6), state);
    nextState.plannerMode = currentMode;
    if (currentMode === 'single') {
      nextState.years = 1;
    }
    nextState.firstRun = false;
    replacePlan(nextState, 'A fresh plan is ready. Your previous plan is ready to undo.');
  };

  window.requestLoadSampleData = function () {
    if (window.confirm('Load the sample plan? It will replace the plan on screen. You can undo it right after loading.')) {
      window.loadSampleData();
    }
  };

  window.requestResetData = function () {
    if (window.confirm('Start a fresh plan? It will replace the plan on screen. You can undo it right after resetting.')) {
      window.resetData();
    }
  };

  window.undoPlanReplacement = function () {
    try {
      const raw = previousPlan ? null : localStorage.getItem(BACKUP_STORAGE_KEY);
      const backup = previousPlan || (raw && JSON.parse(raw));
      if (!backup || typeof backup.years !== 'number') return;
      state = normalizePlan(backup);
      previousPlan = null;
      try { localStorage.removeItem(BACKUP_STORAGE_KEY); } catch {}
      recomputeAndRender();
      const toast = document.getElementById('planChangeToast');
      if (toast) toast.hidden = true;
    } catch (e) {
      console.warn('Could not restore the previous plan', e);
    }
  };

  window.dismissSetupGuide = function () {
    state.firstRun = false;
    state.setupGuideVisible = false;
    persistState();
    renderSetupExperience();
  };

  window.openSetupStep = function (tabKey) {
    state.firstRun = false;
    persistState();
    window.switchTab(tabKey);
  };

  window.toggleDarkMode = function () {
    state.darkMode = !state.darkMode;
    recomputeAndRender();
  };

  window.toggleEditMode = function () {
    state.isEditMode = !state.isEditMode;
    renderAll();
  };

  const PANEL_IDS = {overview:'panelOverview',income:'panelIncome',expenses:'panelExpenses',taxes:'panelTaxes',retire:'panelRetire',visualizer:'panelVisualizer'};
  function renderActivePanel() {
    if (!PANEL_IDS[state.activeTab] || (state.activeTab === 'visualizer' && state.plannerMode !== 'multi')) state.activeTab = 'overview';
    document.body.dataset.tab = state.activeTab;
    document.body.dataset.mode = state.plannerMode;
    document.querySelectorAll('#sectionTabs [data-tab]').forEach(btn => {
      const active = btn.dataset.tab === state.activeTab;
      btn.classList.toggle('active', active);
      btn.setAttribute('aria-current', active ? 'page' : 'false');
    });
    document.querySelectorAll('.tab-panel').forEach(panel => panel.classList.toggle('active', panel.id === PANEL_IDS[state.activeTab]));
    const next = {taxes:['income','Next: income'],income:['expenses','Next: monthly expenses'],expenses:['retire','Next: retirement and goals'],retire:['overview','Review your plan']}[state.activeTab];
    const guideNext = document.getElementById('setupNext');
    guideNext.hidden = state.setupGuideVisible === false || !next;
    if (next) { guideNext.dataset.tab = next[0]; guideNext.textContent = next[1]; }
  }
  window.switchTab = function (tabKey) {
    state.activeTab = tabKey;
    renderActivePanel();
    renderSetupExperience();
    renderExpensesSection();
    labelTableControls();
    renderChart();
    persistState();
  };

  window.setChartMode = function (mode) {
    if (!mode) return;
    state.chartMode = mode;
    state.chartType = state.chartMode === 'wealth' ? 'area' : 'bar';
    document.querySelectorAll('#chartModeToggle .segmented-btn, #vizChartModeToggle .segmented-btn').forEach((b) => {
      b.classList.toggle('active', b.dataset.mode === state.chartMode);
    });
    document.querySelectorAll('#chartTypeToggle .segmented-btn, #vizChartTypeToggle .segmented-btn').forEach((b) => {
      b.classList.toggle('active', b.dataset.chart === state.chartType);
    });
    renderChart();
    persistState();
  };

  window.setChartType = function (type) {
    if (!type) return;
    state.chartType = type;
    document.querySelectorAll('#chartTypeToggle .segmented-btn, #vizChartTypeToggle .segmented-btn').forEach((b) => {
      b.classList.toggle('active', b.dataset.chart === state.chartType);
    });
    renderChart();
    persistState();
  };

  window.setExpenseView = function (view) {
    if (!view) return;
    state.expenseView = view;
    document.querySelectorAll('#expenseViewModeToggle .segmented-btn').forEach((b) => {
      b.classList.toggle('active', b.dataset.expView === view);
    });
    renderExpensesSection();
    persistState();
  };

  window.addWorker = function () {
    state.workers = state.workers || [];
    state.workers.push({
      id: `w-${Date.now()}`,
      name: `Earner ${state.workers.length + 1}`,
      frequency: 'Hourly',
      hours: Array(state.years).fill(40),
      wage: Array(state.years).fill(0),
    });
    recomputeAndRender();
  };

  window.addOtherIncome = function () {
    state.other = state.other || [];
    state.other.push({
      id: `o-${Date.now()}`,
      name: 'Other Income',
      frequency: 'Monthly',
      amount: Array(state.years).fill(0),
    });
    recomputeAndRender();
  };

  window.addSavingsFund = function () {
    state.customSavings = state.customSavings || {};
    const fId = `sav-${Date.now()}`;
    state.customSavings[fId] = {
      id: fId,
      name: 'New Savings Goal',
      monthly: Array(state.years).fill(0),
    };
    recomputeAndRender();
  };

  // ── GLOBAL EVENT HANDLERS ────────────────────────────────────────────────
  function bindEvents() {
    // 0. Planning-period selector
    const singleBtn = document.getElementById('btnModeSingleYear');
    if (singleBtn) singleBtn.onclick = () => window.setPlannerMode('single');
    const multiBtn = document.getElementById('btnModeMultiYear');
    if (multiBtn) multiBtn.onclick = () => window.setPlannerMode('multi');

    // 1. Start Year Stepper
    const btnPrevSY = document.getElementById('btnPrevStartYear');
    if (btnPrevSY) btnPrevSY.onclick = () => window.stepStartYear(-1);
    const btnNextSY = document.getElementById('btnNextStartYear');
    if (btnNextSY) btnNextSY.onclick = () => window.stepStartYear(1);

    // 2. Forecast-length stepper (1-10 years)
    const btnRemYr = document.getElementById('btnRemoveYear');
    if (btnRemYr) btnRemYr.onclick = () => window.stepYears(-1);
    const btnAddYr = document.getElementById('btnAddYear');
    if (btnAddYr) btnAddYr.onclick = () => window.stepYears(1);

    // 3. Expense View Switcher (Cards vs Table)
    const expViewToggle = document.getElementById('expenseViewModeToggle');
    if (expViewToggle) {
      expViewToggle.onclick = (e) => {
        const btn = e.target.closest('.segmented-btn');
        if (btn && btn.dataset.expView) {
          window.setExpenseView(btn.dataset.expView);
        }
      };
    }

    // 5. Theme Toggle
    const themeBtn = document.getElementById('themeToggleBtn');
    if (themeBtn) themeBtn.onclick = () => window.toggleDarkMode();

    // 6. Sample & Reset State
    const sampleBtn = document.getElementById('btnSampleState');
    if (sampleBtn) sampleBtn.onclick = () => window.requestLoadSampleData();
    const clearBtn = document.getElementById('btnClearState');
    if (clearBtn) clearBtn.onclick = () => window.requestResetData();
    const undoPlanBtn = document.getElementById('btnUndoPlanChange');
    if (undoPlanBtn) undoPlanBtn.onclick = () => window.undoPlanReplacement();

    // 7. Edit Table Toggle
    const editBtn = document.getElementById('btnToggleEdit');
    if (editBtn) editBtn.onclick = () => window.toggleEditMode();

    // 8. Navigation Tabs Switcher
    const tabsContainer = document.getElementById('sectionTabs');
    if (tabsContainer) {
      tabsContainer.onclick = (e) => {
        const btn = e.target.closest('.segmented-btn');
        if (btn && btn.dataset.tab) {
          window.switchTab(btn.dataset.tab);
        }
      };
    }

    // 9. Chart Type & Mode Toggles
    const handleChartModeClick = (e) => {
      const btn = e.target.closest('.segmented-btn');
      if (btn && btn.dataset.mode) {
        window.setChartMode(btn.dataset.mode);
      }
    };
    const cmt = document.getElementById('chartModeToggle');
    if (cmt) cmt.onclick = handleChartModeClick;
    const vcmt = document.getElementById('vizChartModeToggle');
    if (vcmt) vcmt.onclick = handleChartModeClick;

    const handleChartTypeClick = (e) => {
      const btn = e.target.closest('.segmented-btn');
      if (btn && btn.dataset.chart) {
        window.setChartType(btn.dataset.chart);
      }
    };
    const ctt = document.getElementById('chartTypeToggle');
    if (ctt) ctt.onclick = handleChartTypeClick;
    const vctt = document.getElementById('vizChartTypeToggle');
    if (vctt) vctt.onclick = handleChartTypeClick;

    // 10. Legend Toggles
    document.addEventListener('click', (e) => {
      const chip = e.target.closest('[data-action="toggle-series"]');
      if (chip && chip.dataset.series) {
        const sKey = chip.dataset.series;
        state.chartSeries = state.chartSeries || {};
        state.chartSeries[sKey] = state.chartSeries[sKey] === false;
        renderChart();
        persistState();
        document.querySelector(`[data-action="toggle-series"][data-series="${sKey}"]`)?.focus({preventScroll:true});
      }
    });

    // 11. Delegated Table and Card Events
    document.addEventListener('input', handleTableInput);
    document.addEventListener('change', handleTableChange);
    document.addEventListener('click', handleGlobalClicks);

    // 12. Spend Bar & Puck Hover Synchronization
    const spendBarEl = document.getElementById('spendDistributionBar');
    const spendLegendEl = document.getElementById('spendLegendRow');

    if (spendBarEl) {
      spendBarEl.addEventListener('mouseover', (e) => {
        const seg = e.target.closest('.spend-bar-segment');
        if (seg && seg.dataset.cat) {
          const cat = seg.dataset.cat;
          document.querySelectorAll(`.spend-legend-pill[data-cat="${cat}"]`).forEach((p) => p.classList.add('active-hover'));
        }
      });
      spendBarEl.addEventListener('mouseout', (e) => {
        const seg = e.target.closest('.spend-bar-segment');
        if (seg && seg.dataset.cat) {
          const cat = seg.dataset.cat;
          document.querySelectorAll(`.spend-legend-pill[data-cat="${cat}"]`).forEach((p) => p.classList.remove('active-hover'));
        }
      });
    }

    if (spendLegendEl) {
      spendLegendEl.addEventListener('mouseover', (e) => {
        const pill = e.target.closest('.spend-legend-pill');
        if (pill && pill.dataset.cat) {
          const cat = pill.dataset.cat;
          document.querySelectorAll(`.spend-bar-segment[data-cat="${cat}"]`).forEach((s) => s.classList.add('active-hover'));
        }
      });
      spendLegendEl.addEventListener('mouseout', (e) => {
        const pill = e.target.closest('.spend-legend-pill');
        if (pill && pill.dataset.cat) {
          const cat = pill.dataset.cat;
          document.querySelectorAll(`.spend-bar-segment[data-cat="${cat}"]`).forEach((s) => s.classList.remove('active-hover'));
        }
      });
    }

    // 13. Keyboard Accessibility for Spend Bar Segments & Pucks
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        const activeEl = document.activeElement;
        if (activeEl && activeEl.dataset && ['focus-cat-card','toggle-cat-card','toggle-table-cat'].includes(activeEl.dataset.action)) {
          e.preventDefault();
          activeEl.click();
        }
      }
    });

    // 12. Add Earner Button
    const btnAddE = document.getElementById('btnAddEarner');
    if (btnAddE) btnAddE.onclick = () => window.addWorker();

    // 13. Add Other Income Button
    const btnAddOI = document.getElementById('btnAddOtherIncome');
    if (btnAddOI) btnAddOI.onclick = () => window.addOtherIncome();

    // 14. Add Custom Savings Fund Button
    const btnAddSF = document.getElementById('btnAddSavingsFund');
    if (btnAddSF) btnAddSF.onclick = () => window.addSavingsFund();
  }

  // ── DELEGATED INPUT HANDLERS ─────────────────────────────────────────────
  // Update values without replacing the focused control or the next click target.
  function handleTableInput(e) {
    const action = e.target.dataset.action;
    const idx = Number(e.target.dataset.idx);
    const yr = Number(e.target.dataset.year || 0);
    const val = e.target.value;
    const n = num(val);
    const nonnegative = Math.max(0, n);
    const rate = Math.max(0, Math.min(100, n));
    let changed = true;
    if (action === 'worker-name' && state.workers[idx]) state.workers[idx].name = val;
    else if (action === 'other-name' && state.other[idx]) state.other[idx].name = val;
    else if (action === 'col-name' && state.col[idx]) state.col[idx].name = val;
    else if (action === 'fund-name' && state.customSavings[e.target.dataset.id]) state.customSavings[e.target.dataset.id].name = val;
    else if (action === 'worker-wage' && state.workers[idx]) state.workers[idx].wage[yr] = nonnegative;
    else if (action === 'worker-default-hours' && state.workers[idx]) state.workers[idx].hours[yr] = Math.max(0, Math.min(168, n));
    else if (action === 'other-amount' && state.other[idx]) state.other[idx].amount[yr] = nonnegative;
    else if (action === 'col-monthly' && state.col[idx]) state.col[idx].monthly[yr] = nonnegative;
    else if (action === 'fund-monthly' && state.customSavings[e.target.dataset.id]) state.customSavings[e.target.dataset.id].monthly[yr] = nonnegative;
    else if (action === 'starting-cash') state.startingCash = nonnegative;
    else if (action === 'starting-retirement') state.startingRetirement = nonnegative;
    else if (action === 'retirement-return-rate') state.retirementReturnRate = Math.max(-100, Math.min(100, n));
    else if (action === 'k401-rate') state.k401Rate[yr] = rate;
    else if (action === 'roth-rate') state.rothRate[yr] = rate;
    else if (action === 'retire-match') state.employerMatchRate[yr] = rate;
    else if (action === 'tax-deps') state.deps[yr] = Math.max(0, Math.min(20, Math.floor(n)));
    else if (action === 'tax-ded') state.additionalDeductions[yr] = nonnegative;
    else changed = false;
    if (!changed) return;
    persistState();
    if (!action.endsWith('-name')) refreshResults();
  }

  function refreshResults() {
    calc = computePlanner(state);
    renderHudMetrics();
    renderHighlights();
    renderSummaryMatrix();
    renderTaxResultsTable();
    renderRetireBreakdownTable();
    renderChart();
    // Update expense totals and retirement amounts in place, preserving typing.
    renderExpenseSummary();
    renderExpensesTable(true);
    document.querySelectorAll('[data-retire-result]').forEach(el => {
      const y = Number(el.dataset.year);
      const key = el.dataset.retireResult;
      el.textContent = key === 'rothArr'
        ? `${fmt$(calc.rothArr[y])} / ${fmt$(calc.rothLimit[y])} limit`
        : fmt$(calc[key][y]);
    });
    document.querySelectorAll('.category-card').forEach(card => {
      const total = state.col.filter(c => c.cat === card.dataset.cat).reduce((sum,c) => sum + num(c.monthly[0]), 0);
      card.querySelector('.category-total-val').textContent = `${fmt$(total)}/mo`;
      const items = state.col.filter(c => c.cat === card.dataset.cat);
      const share = calc.colOnly[0] > 0 ? total * 12 / calc.colOnly[0] * 100 : 0;
      card.querySelector('.category-meta-badge').textContent = `${items.length} ${items.length === 1 ? 'item' : 'items'} · ${share.toFixed(0)}% of expenses`;
      card.querySelectorAll('.expense-item-row').forEach(row => {
        const field = row.querySelector('[data-action="col-monthly"]');
        row.querySelector('.expense-item-annual-hint').textContent = `${fmtCompact$(num(state.col[field.dataset.idx].monthly[0])*12)}/yr`;
      });
    });
  }

  function handleTableChange(e) {
    const action = e.target.dataset.action;
    const idx = Number(e.target.dataset.idx);
    const yr = Number(e.target.dataset.year || 0);
    if (action === 'worker-freq' && state.workers[idx]) state.workers[idx].frequency = e.target.value;
    else if (action === 'other-freq' && state.other[idx]) state.other[idx].frequency = e.target.value;
    else if (action === 'tax-st') state.st[yr] = e.target.value;
    else if (action === 'roth-contributors') state.rothContributors = Math.max(1, Math.min(2, Math.floor(num(e.target.value) || 1)));
    else if (e.target.id === 'selTaxStatus') state.taxStatus = e.target.value;
    else if (e.target.id === 'chkFicaToggle') state.fica = e.target.checked;
    else {
      // Normalize committed numeric values without rebuilding any controls.
      if (e.target.type === 'number' || e.target.inputMode === 'decimal' || e.target.inputMode === 'numeric') {
        if (e.target.validity?.badInput) return;
        if (action === 'tax-deps') e.target.value = state.deps[yr];
        else if (action === 'worker-default-hours') e.target.value = state.workers[idx].hours[yr];
        else if (['k401-rate','roth-rate','retire-match'].includes(action)) e.target.value = Math.max(0,Math.min(100,num(e.target.value)));
        else if (action && action !== 'retirement-return-rate') e.target.value = Math.max(0,num(e.target.value));
      }
      return;
    }
    recomputeAndRender();
  }

  function handleGlobalClicks(e) {
    const setupStep = e.target.closest('[data-action="setup-step"]');
    if (setupStep?.dataset.tab) {
      window.openSetupStep(setupStep.dataset.tab);
      return;
    }
    if (e.target.closest('[data-action="dismiss-setup-guide"]')) {
      window.dismissSetupGuide();
      return;
    }
    if (e.target.closest('[data-action="setup-sample"]')) {
      window.requestLoadSampleData();
      return;
    }

    // 0. Focus Category Card or Table Header when clicking Legend Puck
    const pill = e.target.closest('[data-action="focus-cat-card"]');
    if (pill && pill.dataset.cat) {
      const cat = pill.dataset.cat;
      if (state.expenseView === 'table') {
        state.collapsedExpenseCats = state.collapsedExpenseCats || {};
        state.collapsedExpenseCats[cat] = false; // Expand in spreadsheet
        persistState();
        renderExpensesTable();
        const targetRow = document.querySelector(`.category-table-header[data-cat="${cat}"]`);
        if (targetRow) {
          targetRow.scrollIntoView({ behavior: 'smooth', block: 'center' });
          targetRow.classList.add('table-row-highlight-pulse');
          setTimeout(() => targetRow.classList.remove('table-row-highlight-pulse'), 1200);
        }
      } else {
        const targetCard = document.querySelector(`.category-card[data-cat="${cat}"]`);
        if (targetCard) {
          if (targetCard.classList.contains('collapsed')) {
            targetCard.classList.remove('collapsed');
            targetCard.querySelector('.category-card-header').setAttribute('aria-expanded', 'true');
            if (state.collapsedExpenseCats) state.collapsedExpenseCats[cat] = false;
            persistState();
          }
          targetCard.scrollIntoView({ behavior: 'smooth', block: 'center' });
          targetCard.classList.add('card-highlight-pulse');
          setTimeout(() => targetCard.classList.remove('card-highlight-pulse'), 1200);
        }
      }
      return;
    }

    // 0b. Quick-Add Item in Spreadsheet Mode
    const btnAddTable = e.target.closest('[data-action="quick-add-col-table"]');
    if (btnAddTable && btnAddTable.dataset.cat) {
      const cat = btnAddTable.dataset.cat;
      state.col = state.col || [];
      state.col.push({
        id: `c-${Date.now()}`,
        name: `New ${cat} Item`,
        cat,
        monthly: Array(state.years).fill(0),
      });
      recomputeAndRender();
      return;
    }

    // Custom Table Cell Steppers
    const btnStepDeps = e.target.closest('[data-action="step-deps"]');
    if (btnStepDeps) {
      const yr = parseInt(btnStepDeps.dataset.year, 10);
      const dir = parseInt(btnStepDeps.dataset.dir, 10);
      state.deps = state.deps || Array(state.years).fill(0);
      const current = state.deps[yr] ?? 0;
      state.deps[yr] = Math.max(0, Math.min(20, current + dir));
      recomputeAndRender();
      return;
    }

    const btnStepDed = e.target.closest('[data-action="step-tax-ded"]');
    if (btnStepDed) {
      const yr = parseInt(btnStepDed.dataset.year, 10);
      const dir = parseInt(btnStepDed.dataset.dir, 10);
      state.additionalDeductions = state.additionalDeductions || Array(state.years).fill(0);
      const current = state.additionalDeductions[yr] ?? 0;
      const step = e.shiftKey ? 2500 : 500;
      state.additionalDeductions[yr] = Math.max(0, current + dir * step);
      recomputeAndRender();
      return;
    }

    const btnStepK401 = e.target.closest('[data-action="step-k401-rate"]');
    if (btnStepK401) {
      const yr = parseInt(btnStepK401.dataset.year, 10);
      const dir = parseFloat(btnStepK401.dataset.dir);
      state.k401Rate = state.k401Rate || Array(state.years).fill(0);
      const current = state.k401Rate[yr] ?? 0;
      const step = e.shiftKey ? 5 : 1;
      const eligibleWages = calc.earned?.[yr] || 0;
      const maxK401 = CAP401K_EMPLOYEE;
      const maxPct = 100;
      const targetPct = Math.round((current + dir * step) * 10) / 10;
      state.k401Rate[yr] = Math.max(0, Math.min(maxPct, targetPct));
      recomputeAndRender();
      return;
    }

    const btnStepRoth = e.target.closest('[data-action="step-roth-rate"]');
    if (btnStepRoth) {
      const yr = parseInt(btnStepRoth.dataset.year, 10);
      const dir = parseFloat(btnStepRoth.dataset.dir);
      state.rothRate = state.rothRate || Array(state.years).fill(0);
      const current = state.rothRate[yr] ?? 0;
      const step = e.shiftKey ? 2 : 0.5;
      const eligibleWages = calc.earned?.[yr] || 0;
      const maxRoth = calc.rothLimit?.[yr] || 0;
      const maxPct = 100;
      const targetPct = Math.round((current + dir * step) * 10) / 10;
      state.rothRate[yr] = Math.max(0, Math.min(maxPct, targetPct));
      recomputeAndRender();
      return;
    }

    const btnStepMatch = e.target.closest('[data-action="step-retire-match"]');
    if (btnStepMatch) {
      const yr = parseInt(btnStepMatch.dataset.year, 10);
      const dir = parseFloat(btnStepMatch.dataset.dir);
      state.employerMatchRate = state.employerMatchRate || Array(state.years).fill(0);
      const current = state.employerMatchRate[yr] ?? 0;
      const step = e.shiftKey ? 1 : 0.5;
      state.employerMatchRate[yr] = Math.max(0, Math.min(100, Math.round((current + dir * step) * 10) / 10));
      recomputeAndRender();
      return;
    }

    // 1. Toggle Category Card Accordion
    const toggleHeader = e.target.closest('[data-action="toggle-cat-card"]');
    if (toggleHeader) {
      const cat = toggleHeader.dataset.cat;
      state.collapsedExpenseCats = state.collapsedExpenseCats || {};
      const isCurrentlyCollapsed = state.collapsedExpenseCats[cat] ?? !state.col.some(item => item.cat === cat);
      state.collapsedExpenseCats[cat] = !isCurrentlyCollapsed;
      const card = toggleHeader.closest('.category-card');
      if (card) {
        card.classList.toggle('collapsed', state.collapsedExpenseCats[cat]);
        toggleHeader.setAttribute('aria-expanded', String(!state.collapsedExpenseCats[cat]));
      }
      persistState();
      return;
    }

    // 1b. Toggle Category in Spreadsheet Mode
    const toggleTableRow = e.target.closest('[data-action="toggle-table-cat"]');
    if (toggleTableRow) {
      if (e.target.closest('[data-action="quick-add-col-table"]')) return;
      const cat = toggleTableRow.dataset.cat;
      state.collapsedExpenseCats = state.collapsedExpenseCats || {};
      const isCurrentlyCollapsed = state.collapsedExpenseCats[cat] ?? !state.col.some(item => item.cat === cat);
      state.collapsedExpenseCats[cat] = !isCurrentlyCollapsed;
      persistState();
      renderExpensesTable();
      return;
    }

    // 2. Show Inline Quick-Add Line in Category Card
    const btnShowInline = e.target.closest('[data-action="show-inline-add"]');
    if (btnShowInline) {
      const cat = btnShowInline.dataset.cat;
      const wrap = btnShowInline.parentElement;
      wrap.innerHTML = `
        <div class="quick-add-active-form">
          <input type="text" class="control-input" id="newExpName_${cat.replace(/\s+/g, '_')}" placeholder="Item name (e.g. Wi-Fi)" style="flex:1;">
          <input type="number" class="control-input" id="newExpCost_${cat.replace(/\s+/g, '_')}" placeholder="$ / mo" style="width:90px;">
          <button type="button" class="btn-primary-sm" data-action="submit-inline-add" data-cat="${cat}">Add</button>
          <button type="button" class="row-action-btn" data-action="cancel-inline-add" data-cat="${cat}">✕</button>
        </div>
      `;
      const nameInput = document.getElementById(`newExpName_${cat.replace(/\s+/g, '_')}`);
      if (nameInput) nameInput.focus();
      return;
    }

    // 3. Submit Inline Quick-Add
    const btnSubmitInline = e.target.closest('[data-action="submit-inline-add"]');
    if (btnSubmitInline) {
      const cat = btnSubmitInline.dataset.cat;
      const cleanCat = cat.replace(/\s+/g, '_');
      const name = (document.getElementById(`newExpName_${cleanCat}`)?.value || '').trim();
      const monthly = Math.max(0, num(document.getElementById(`newExpCost_${cleanCat}`)?.value || 0));

      if (name) {
        state.col = state.col || [];
        state.col.push({
          id: `c-${Date.now()}`,
          name,
          cat,
          monthly: Array(state.years).fill(monthly),
        });
        recomputeAndRender();
      }
      return;
    }

    // 4. Cancel Inline Quick-Add
    const btnCancelInline = e.target.closest('[data-action="cancel-inline-add"]');
    if (btnCancelInline) {
      const cat = btnCancelInline.dataset.cat;
      renderExpensesSection();
      return;
    }

    // 5. Delete Action Handlers
    const actBtn = e.target.closest('[data-action]');
    if (!actBtn) return;
    const action = actBtn.dataset.action;

    const idx = parseInt(actBtn.dataset.idx, 10);
    if (action === 'delete-worker' && state.workers?.[idx]) {
      state.workers.splice(idx, 1);
      recomputeAndRender();
    } else if (action === 'delete-other' && state.other?.[idx]) {
      state.other.splice(idx, 1);
      recomputeAndRender();
    } else if (action === 'delete-col' && state.col?.[idx]) {
      state.col.splice(idx, 1);
      recomputeAndRender();
    } else if (action === 'delete-fund') {
      const fId = actBtn.dataset.id;
      if (state.customSavings?.[fId]) {
        delete state.customSavings[fId];
        recomputeAndRender();
      }
    }
  }

  function escapeHtml(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  // ── INIT ─────────────────────────────────────────────────────────────────
  function init() {
    const urlParams = new URLSearchParams(window.location.search);
    const paramTheme = urlParams.get('theme');
    if (paramTheme === 'light' || paramTheme === 'dark') {
      state.darkMode = paramTheme === 'dark';
    }
    const paramMode = urlParams.get('mode');
    if (paramMode === 'single' || paramMode === 'multi') {
      state.plannerMode = paramMode;
      if (paramMode === 'single') {
        state.years = 1;
      } else {
        state.years = Math.max(2, state.storedMultiYears || 6);
        ensureArraysLength(state.years);
      }
    }
    const paramTab = urlParams.get('tab');
    if (paramTab && ['overview', 'income', 'expenses', 'taxes', 'retire', 'visualizer'].includes(paramTab)) {
      state.activeTab = paramTab;
    }

    const period = document.getElementById('planningPeriod');
    const model = document.getElementById('modelDetails');
    document.getElementById('btnFinishPeriod').onclick = () => { period.open = false; period.querySelector('summary').focus(); };
    for (const detail of [period, model]) {
      detail.addEventListener('toggle', () => { if (detail.open) (detail === period ? model : period).open = false; });
    }
    document.addEventListener('click', e => {
      for (const detail of [period, model]) if (detail.open && !detail.contains(e.target)) detail.open = false;
    });
    document.addEventListener('keydown', e => {
      if (e.key === 'Escape') for (const detail of [period, model]) if (detail.open) {
        detail.open = false; detail.querySelector('summary').focus();
      }
    });
    bindEvents();
    calc = computePlanner(state);
    renderAll();
    try {
      if (localStorage.getItem(BACKUP_STORAGE_KEY)) showPlanChangeToast('Your previous plan is available to restore.');
    } catch {}

    // Ensure fluid indicator geometry is exact once fonts & layout settle
    requestAnimationFrame(() => {
      updatePlanningPeriodUI();
    });

    let resizeTimer;
    window.addEventListener('resize', () => {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(() => {
        updatePlanningPeriodUI();
        renderChart();
      }, 100);
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
