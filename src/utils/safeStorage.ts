import { PlannerState, CustomSavingsFund, IncomeFrequency } from '../types';
import { getDefaultSampleState } from './taxRulesAndStarterData';

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
 * Validates and repairs arbitrary state from storage or import,
 * guaranteeing all arrays and structures match `state.years` and prevent runtime crashes.
 */
export function validateAndRepairState(raw: any): PlannerState {
  if (!raw || typeof raw !== 'object') {
    return getDefaultSampleState();
  }

  const defaultState = getDefaultSampleState();
  const years = typeof raw.years === 'number' && raw.years >= 1 && raw.years <= 10 ? raw.years : defaultState.years;

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
      frequency: (w.frequency || 'Annually') as IncomeFrequency,
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
      frequency: o.frequency || 'Monthly',
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
      const fund = raw.customSavings[k];
      if (fund && typeof fund === 'object') {
        safeCustomSavings[k] = {
          id: String(fund.id || k),
          name: String(fund.name || 'Savings Fund'),
          color: String(fund.color || '#3B82F6'),
          monthly: padArray(fund.monthly, 0).map((v: any) => (typeof v === 'number' && !isNaN(v) ? v : 0)),
          enabledInChart: Boolean(fund.enabledInChart),
        };
      }
    });
  }

  // Validate taxes arrays
  const st = padArray(raw.st, 'CA').map(s => String(s || 'CA'));
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

  // Validate pageWidth
  const validPageWidths = ['slim', 'compact', 'standard', 'wide', 'full'];
  const pageWidth = validPageWidths.includes(raw.pageWidth) ? raw.pageWidth : 'standard';

  // Validate startYear
  const startYear = typeof raw.startYear === 'number' && raw.startYear >= 1900 && raw.startYear <= 2100
    ? raw.startYear
    : (defaultState.startYear || 2025);

  const { local: _legacyLocal, ...rawRest } = raw as Record<string, unknown>;

  return {
    ...defaultState,
    ...rawRest,
    pageWidth,
    years,
    startYear,
    workers: workers.length > 0 ? workers : defaultState.workers,
    other,
    col: safeCol,
    customSavings: safeCustomSavings,
    st,
    deps,
    additionalDeductions,
    retireRate,
    employerMatchRate,
    sectionOrder: filteredOrder,
    viewMode: raw.viewMode === 'months' ? 'months' : 'years',
    darkMode: Boolean(raw.darkMode),
    isEditMode: Boolean(raw.isEditMode),
    showOtherIncome: raw.showOtherIncome !== false,
    barColors: typeof raw.barColors === 'object' && raw.barColors ? raw.barColors : defaultState.barColors,
    graphToggles: typeof raw.graphToggles === 'object' && raw.graphToggles ? raw.graphToggles : defaultState.graphToggles,
    graphType: raw.graphType === 'grouped' ? 'grouped' : 'area',
    graphHeight: typeof raw.graphHeight === 'number' ? raw.graphHeight : defaultState.graphHeight,
  };
}
