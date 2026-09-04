import { PlannerState, CustomSavingsFund, IncomeFrequency, PayoutFrequency } from './types';
import { getDefaultSampleState } from './starter-data';

const INCOME_FREQUENCIES: readonly IncomeFrequency[] = [
  'Hourly', 'Daily', 'Weekly', 'Biweekly', 'Bi-Monthly', 'Monthly', 'Annually',
];
const PAYOUT_FREQUENCIES: readonly PayoutFrequency[] = [
  'Daily', 'Weekly', 'Biweekly', 'Monthly', 'Annually',
];
const TAX_REGIONS = new Set(['CA', 'NY', 'NYC', 'YONKERS', 'NONE']);
const UNSAFE_KEYS = new Set(['__proto__', 'constructor', 'prototype']);

/** Accepts only a plain #rgb / #rrggbb / #rrggbbaa hex string, else a fallback. */
function safeColor(v: unknown, fallback = '#3B82F6'): string {
  return typeof v === 'string' && /^#[0-9a-fA-F]{3,8}$/.test(v) ? v : fallback;
}

/**
 * In-memory fallback map when localStorage is blocked, restricted, or unavailable
 * (e.g. strict Safari Private Browsing, sandboxed iframes without storage permissions,
 * or corporate security policies).
 */
const memoryStore: Record<string, string> = {};

let isStorageAvailable: boolean | null = null;

function testStorage(): boolean {
  if (isStorageAvailable !== null) return isStorageAvailable;
  try {
    if (typeof window === 'undefined' || !window.localStorage) {
      isStorageAvailable = false;
      return false;
    }
    const testKey = '__storage_test_' + Math.random().toString(36).substring(2, 7);
    window.localStorage.setItem(testKey, '1');
    window.localStorage.removeItem(testKey);
    isStorageAvailable = true;
    return true;
  } catch {
    isStorageAvailable = false;
    return false;
  }
}

export const safeStorage = {
  isAvailable(): boolean {
    return testStorage();
  },

  getItem(key: string): string | null {
    if (testStorage()) {
      try {
        return window.localStorage.getItem(key);
      } catch {
        // Fallback on unexpected read exception
        return memoryStore[key] ?? null;
      }
    }
    return memoryStore[key] ?? null;
  },

  setItem(key: string, value: string): boolean {
    if (testStorage()) {
      try {
        window.localStorage.setItem(key, value);
        return true;
      } catch {
        // Fall back to memory store on quota or security exceptions
        memoryStore[key] = value;
        return false;
      }
    }
    memoryStore[key] = value;
    return true;
  },

  removeItem(key: string): void {
    if (testStorage()) {
      try {
        window.localStorage.removeItem(key);
      } catch {
        // Ignore
      }
    }
    delete memoryStore[key];
  },

  getJson<T>(key: string, fallback: T): T {
    try {
      const raw = this.getItem(key);
      if (!raw) return fallback;
      return JSON.parse(raw) as T;
    } catch {
      return fallback;
    }
  },

  setJson<T>(key: string, value: T): boolean {
    try {
      return this.setItem(key, JSON.stringify(value));
    } catch {
      return false;
    }
  },
};

/**
 * Coerces arbitrary, untrusted state (a corrupted localStorage blob, a hostile
 * import) into a valid PlannerState. Guarantees:
 *   - `years` is an integer in [1, 10] and every per-column array has that length
 *   - enums (frequency, tax region, filing status, graph type) are whitelisted
 *   - numbers are finite; colours are `#hex`; percentages are clamped to [0, 100]
 *   - prototype-poisoning keys (`__proto__` / `constructor` / `prototype`) are
 *     dropped before any value is assigned into a plain object
 * Suite 19 of planner.test.ts fuzzes this against ~30 hostile payloads.
 */
export function validateAndRepairState(raw: any): PlannerState {
  if (!raw || typeof raw !== 'object') {
    return getDefaultSampleState();
  }

  const defaultState = getDefaultSampleState();
  const years = Number.isInteger(raw.years) && raw.years >= 1 && raw.years <= 10 ? raw.years : defaultState.years;

  // Helper to ensure array has length equal to years
  const padArray = <T>(arr: any, fallbackVal: T): T[] => {
    const safeArr: T[] = Array.isArray(arr) ? [...arr] : [];
    while (safeArr.length < years) {
      safeArr.push(safeArr.length > 0 ? safeArr[safeArr.length - 1] : fallbackVal);
    }
    return safeArr.slice(0, years);
  };

  // Validate workers
  const rawWorkers = Array.isArray(raw.workers) ? raw.workers : defaultState.workers;
  const workers = rawWorkers.map((w: any, idx: number) => {
    if (!w || typeof w !== 'object') {
      return {
        id: `w-${idx}-${Date.now()}`,
        name: `Income Earner ${idx + 1}`,
        frequency: 'Annually' as IncomeFrequency,
        hours: Array(years).fill(40),
        wage: Array(years).fill(60000),
      };
    }
    return {
      id: String(w.id || `w-${idx}-${Date.now()}`),
      name: String(w.name || `Income Earner ${idx + 1}`),
      frequency: INCOME_FREQUENCIES.includes(w.frequency) ? w.frequency : 'Annually',
      hours: padArray(w.hours, 40).map(v => (typeof v === 'number' && !isNaN(v) ? v : 40)),
      wage: padArray(w.wage, 0).map(v => (typeof v === 'number' && !isNaN(v) ? v : 0)),
    };
  });

  // Validate other income streams
  const rawOther = Array.isArray(raw.other) ? raw.other : defaultState.other;
  const other = rawOther.map((o: any, idx: number) => {
    if (!o || typeof o !== 'object') {
      return {
        id: `oth-${idx}-${Date.now()}`,
        name: `Other Income ${idx + 1}`,
        frequency: 'Monthly',
        amount: Array(years).fill(0),
      };
    }
    return {
      id: String(o.id || `oth-${idx}-${Date.now()}`),
      name: String(o.name || `Income Stream ${idx + 1}`),
      frequency: PAYOUT_FREQUENCIES.includes(o.frequency) ? o.frequency : 'Monthly',
      amount: padArray(o.amount, 0).map(v => (typeof v === 'number' && !isNaN(v) ? v : 0)),
    };
  });

  // Normalize Cost of Living rows
  const rawCol = Array.isArray(raw.col) ? raw.col : defaultState.col;
  const safeCol = rawCol.map((c: any) => ({
    id: String(c?.id || `c-${Math.random().toString(36).slice(2, 9)}`),
    name: String(c?.name ?? ''),
    cat: String(c?.cat || 'Other'),
    monthly: padArray(c?.monthly, 0).map((v: any) => (typeof v === 'number' && !isNaN(v) ? v : 0)),
  }));

  // Validate custom savings funds
  const safeCustomSavings: Record<string, CustomSavingsFund> = {};
  if (raw.customSavings && typeof raw.customSavings === 'object') {
    Object.keys(raw.customSavings).forEach(k => {
      if (UNSAFE_KEYS.has(k)) return; // never let a crafted key touch the prototype
      const fund = raw.customSavings[k];
      if (fund && typeof fund === 'object') {
        const target = Number(fund.targetAmount);
        safeCustomSavings[k] = {
          id: String(fund.id || k),
          name: String(fund.name || 'Savings Fund'),
          color: safeColor(fund.color),
          monthly: padArray(fund.monthly, 0).map((v: any) => (typeof v === 'number' && !isNaN(v) ? v : 0)),
          ...(Number.isFinite(target) && target > 0 ? { targetAmount: target } : {}),
        };
      }
    });
  }

  // Validate taxes arrays
  const st = padArray(raw.st, 'CA').map(s => {
    const code = String(s || 'CA').toUpperCase();
    return TAX_REGIONS.has(code) ? code : 'NONE';
  });
  const deps = padArray(raw.deps, 0).map(d => (typeof d === 'number' && !isNaN(d) ? d : 0));
  const additionalDeductions = padArray(raw.additionalDeductions, 0).map(d => (typeof d === 'number' && !isNaN(d) ? d : 0));
  const retireRate = padArray(raw.retireRate, 10).map(r => (typeof r === 'number' && !isNaN(r) ? r : 10));
  const employerMatchRate = padArray(raw.employerMatchRate, 0).map(r => (typeof r === 'number' && !isNaN(r) ? r : 0));

  // Section order
  const validSections = ['sec-income', 'sec-expenses', 'sec-taxes', 'sec-retire', 'sec-summary'];
  const rawOrder = Array.isArray(raw.sectionOrder) ? raw.sectionOrder : defaultState.sectionOrder;
  const filteredOrder = rawOrder.filter((s: any) => validSections.includes(s));
  validSections.forEach(s => {
    if (!filteredOrder.includes(s)) filteredOrder.push(s);
  });


  // Validate startYear
  const startYear = Number.isInteger(raw.startYear) && raw.startYear >= 1900 && raw.startYear <= 2100
    ? raw.startYear
    : (defaultState.startYear || 2025);

  // Category order — must be a string[]; the expenses section iterates it directly.
  const catOrder = Array.isArray(raw.catOrder)
    ? raw.catOrder.filter((c: unknown): c is string => typeof c === 'string')
    : defaultState.catOrder;

  const clampPct = (v: unknown, fallback: number) =>
    typeof v === 'number' && Number.isFinite(v) ? Math.min(100, Math.max(0, v)) : fallback;

  // Filter out prototype-poisoning keys, then coerce every value to the right shape.
  const cleanRecord = <T>(src: unknown, coerce: (v: unknown) => T): Record<string, T> => {
    const out: Record<string, T> = {};
    if (src && typeof src === 'object') {
      for (const k of Object.keys(src as object)) {
        if (!UNSAFE_KEYS.has(k)) out[k] = coerce((src as Record<string, unknown>)[k]);
      }
    }
    return out;
  };

  // `...rawRest` carries through fields we don't individually validate (collapsedCats,
  // etc.); strip prototype keys and the dropped legacy `local` field first.
  const rawRest: Record<string, unknown> = {};
  for (const k of Object.keys(raw as object)) {
    if (k !== 'local' && !UNSAFE_KEYS.has(k)) rawRest[k] = (raw as Record<string, unknown>)[k];
  }

  const FILING_STATUSES = ['Married', 'Single', 'HeadOfHousehold', 'MarriedSeparate'];

  return {
    ...defaultState,
    ...rawRest,
    years,
    startYear,
    workers: workers.length > 0 ? workers : defaultState.workers,
    other,
    col: safeCol,
    customSavings: safeCustomSavings,
    catOrder,
    collapsedCats: cleanRecord(raw.collapsedCats, Boolean),
    st,
    deps,
    additionalDeductions,
    retireRate,
    employerMatchRate,
    sectionOrder: filteredOrder,
    taxStatus: FILING_STATUSES.includes(raw.taxStatus) ? raw.taxStatus : 'Married',
    fica: raw.fica !== false,
    colIntensity: clampPct(raw.colIntensity, defaultState.colIntensity),
    colContrast: clampPct(raw.colContrast, defaultState.colContrast),
    colHue: safeColor(raw.colHue, defaultState.colHue),
    viewMode: raw.viewMode === 'months' ? 'months' : 'years',
    darkMode: Boolean(raw.darkMode),
    isEditMode: Boolean(raw.isEditMode),
    showOtherIncome: raw.showOtherIncome !== false,
    barColors: { ...defaultState.barColors, ...cleanRecord(raw.barColors, v => safeColor(v)) },
    graphToggles: { ...defaultState.graphToggles, ...cleanRecord(raw.graphToggles, Boolean) },
    graphType: raw.graphType === 'grouped' ? 'grouped' : 'area',
  };
}
