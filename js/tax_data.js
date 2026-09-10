/**
 * ============================================================================
 *  LEDGER V2 · FINANCIAL ENGINE & USER-FRIENDLY INTERACTION
 * ============================================================================
 */


  // ── CONSTANTS & 2025 TAX TABLES ──────────────────────────────────────────
  const STORAGE_KEY = 'ledger_v2_planner_state';
  const BACKUP_STORAGE_KEY = 'ledger_v2_previous_plan';

  const ANNUAL_MULTIPLIERS = {
    Hourly: 52,
    Daily: 260,
    Weekly: 52,
    Biweekly: 26,
    'Bi-Monthly': 24,
    Monthly: 12,
    Quarterly: 4,
    'Semi-Annually': 2,
    Annually: 1,
  };

  const CATEGORY_META = {
    Housing: { color: '#2563eb' },
    Food: { color: '#f59e0b' },
    Transportation: { color: '#10b981' },
    Utilities: { color: '#8b5cf6' },
    Subscriptions: { color: '#06b6d4' },
    'Health & Wellness': { color: '#ef4444' },
    'Additional Payments': { color: '#ea580c' },
    'Business Expenses': { color: '#0d9488' },
    Lifestyle: { color: '#ec4899' },
    Entertainment: { color: '#84cc16' },
  };

  // IRS Publication 501 (2025), Table 6; Schedule 8812 (2025).
  // https://www.irs.gov/publications/p501
  const FED_2025 = {
    Single: {
      stdDed: 15750,
      brackets: [
        [0, 0.1],
        [11925, 0.12],
        [48475, 0.22],
        [103350, 0.24],
        [197300, 0.32],
        [250525, 0.35],
        [626350, 0.37],
      ],
    },
    Married: {
      stdDed: 31500,
      brackets: [
        [0, 0.1],
        [23850, 0.12],
        [96950, 0.22],
        [206700, 0.24],
        [394600, 0.32],
        [501050, 0.35],
        [751600, 0.37],
      ],
    },
    HeadOfHousehold: {
      stdDed: 23625,
      brackets: [
        [0, 0.1],
        [17000, 0.12],
        [64850, 0.22],
        [103350, 0.24],
        [197300, 0.32],
        [250500, 0.35],
        [626350, 0.37],
      ],
    },
    MarriedSeparate: {
      stdDed: 15750,
      brackets: [
        [0, 0.1],
        [11925, 0.12],
        [48475, 0.22],
        [103350, 0.24],
        [197300, 0.32],
        [250525, 0.35],
        [375800, 0.37],
      ],
    },
  };

  const CTC_PER_DEP = 2200;
  const SS_WAGE_CAP = 176100;
  const SS_RATE = 0.062;
  const MEDICARE_RATE = 0.0145;
  const ADDL_MEDICARE_RATE = 0.009;

  const ADDL_MEDICARE_THRESHOLDS = {
    Single: 200000,
    Married: 250000,
    HeadOfHousehold: 200000,
    MarriedSeparate: 125000,
  };

  const ROTH_CAP = 7000;
  const CAP401K_EMPLOYEE = 23500;
  const CAP401K_TOTAL_ADDITIONS = 70000;
  const ROTH_PHASEOUTS_2025 = {
    Single: [150000, 165000],
    Married: [236000, 246000],
    HeadOfHousehold: [150000, 165000],
    MarriedSeparate: [0, 10000],
  };

  // FTB 2025 Form 540 and tax rate schedules.
  // https://www.ftb.ca.gov/forms/2025/2025-540-booklet.html
  const CA_2025 = {
    Single: {
      stdDed: 5706,
      ex: 153,
      phaseout: 252203,
      brackets: [
        [0, 0.01],
        [11079, 0.02],
        [26264, 0.04],
        [41452, 0.06],
        [57542, 0.08],
        [72724, 0.093],
        [371479, 0.103],
        [445771, 0.113],
        [742953, 0.123],
      ],
    },
    Married: {
      stdDed: 11412,
      ex: 306,
      phaseout: 504411,
      brackets: [
        [0, 0.01],
        [22158, 0.02],
        [52528, 0.04],
        [82904, 0.06],
        [115084, 0.08],
        [145448, 0.093],
        [742958, 0.103],
        [891542, 0.113],
        [1485906, 0.123],
      ],
    },
    HeadOfHousehold: {
      stdDed: 11412,
      ex: 153,
      phaseout: 378310,
      brackets: [
        [0, 0.01],
        [22173, 0.02],
        [52530, 0.04],
        [67716, 0.06],
        [83805, 0.08],
        [98990, 0.093],
        [505208, 0.103],
        [606251, 0.113],
        [1010417, 0.123],
      ],
    },
    MarriedSeparate: {
      stdDed: 5706,
      ex: 153,
      phaseout: 252203,
      brackets: [
        [0, 0.01],
        [11079, 0.02],
        [26264, 0.04],
        [41452, 0.06],
        [57542, 0.08],
        [72724, 0.093],
        [371479, 0.103],
        [445771, 0.113],
        [742953, 0.123],
      ],
    },
  };
  const CA_DEP_EXEMPTION_CREDIT = 475;
  const CA_MENTAL_HEALTH_TAX_THRESHOLD = 1000000;
  const CA_MENTAL_HEALTH_TAX_RATE = 0.01;

  const NY_2025 = {
    Single: {
      stdDed: 8000,
      brackets: [
        [0, 0.04],
        [8500, 0.045],
        [11700, 0.0525],
        [13900, 0.055],
        [80650, 0.06],
        [215400, 0.0685],
        [1077550, 0.0965],
        [5000000, 0.103],
        [25000000, 0.109],
      ],
    },
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
      ],
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
      ],
    },
    MarriedSeparate: {
      stdDed: 8000,
      brackets: [
        [0, 0.04],
        [8500, 0.045],
        [11700, 0.0525],
        [13900, 0.055],
        [80650, 0.06],
        [215400, 0.0685],
        [1077550, 0.0965],
        [5000000, 0.103],
        [25000000, 0.109],
      ],
    },
  };
  const NY_DEP_EXEMPTION = 1000;
  const YONKERS_RESIDENT_SURCHARGE = 0.1675;

  const NYC_2025 = {
    Single: {
      brackets: [
        [0, 0.03078],
        [12000, 0.03762],
        [25000, 0.03819],
        [50000, 0.03876],
      ],
    },
    Married: {
      brackets: [
        [0, 0.03078],
        [21600, 0.03762],
        [45000, 0.03819],
        [90000, 0.03876],
      ],
    },
    HeadOfHousehold: {
      brackets: [
        [0, 0.03078],
        [14400, 0.03762],
        [30000, 0.03819],
        [60000, 0.03876],
      ],
    },
    MarriedSeparate: {
      brackets: [
        [0, 0.03078],
        [12000, 0.03762],
        [25000, 0.03819],
        [50000, 0.03876],
      ],
    },
  };

