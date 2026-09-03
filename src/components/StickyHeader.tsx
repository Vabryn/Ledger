import React, { useState, useRef, useEffect } from 'react';
import { fmt$ } from '../utils/taxAndCalculations';
import { CalculationResult, PlannerState, PageWidth, PAGE_WIDTH_CLASSES, PAGE_WIDTH_CONFIG } from '../types';
import {
  Sun,
  Moon,
  Edit3,
  Check,
  Plus,
  Minus,
  RotateCcw,
  Sparkles,
  DollarSign,
  Receipt,
  Landmark,
  PiggyBank,
  LayoutDashboard,
  Layers,
  ChevronDown,
  HelpCircle,
  AlertTriangle,
  Minimize2,
  Maximize2,
  Columns,
  Calendar,
} from 'lucide-react';

export type NavCategory = 'all' | 'income' | 'expenses' | 'taxes' | 'retire' | 'summary';

interface StickyHeaderProps {
  state: PlannerState;
  calc: CalculationResult;
  activeCategory: NavCategory;
  effectiveCategory?: NavCategory;
  activeDescription?: 'income' | 'expenses' | null;
  onSelectCategory: (category: NavCategory) => void;
  counts?: {
    incomeWorkers?: number;
    expenseItems?: number;
    savingsFunds?: number;
  };
  onAddYear: () => void;
  onRemoveYear: () => void;
  onToggleDarkMode: () => void;
  onToggleEditMode: () => void;
  onResetDefaults: () => void;
  onClearToBlank: () => void;
  onOpenTutorial: () => void;
  pageWidth?: PageWidth;
  onChangePageWidth: (width: PageWidth) => void;
  onChangeStartYear?: (startYear: number) => void;
}

export const StickyHeader: React.FC<StickyHeaderProps> = ({
  state,
  calc,
  activeCategory,
  effectiveCategory,
  activeDescription,
  onSelectCategory,
  counts,
  onAddYear,
  onRemoveYear,
  onToggleDarkMode,
  onToggleEditMode,
  onResetDefaults,
  onClearToBlank,
  onOpenTutorial,
  pageWidth,
  onChangePageWidth,
  onChangeStartYear,
}) => {
  const years = state.years || 1;
  const isMonths = state.viewMode === 'months';
  const startYear = state.startYear || 2025;

  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);
  const [isEditDropdownOpen, setIsEditDropdownOpen] = useState(false);
  const [isWidthDropdownOpen, setIsWidthDropdownOpen] = useState(false);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const editDropdownRef = useRef<HTMLDivElement | null>(null);
  const widthDropdownRef = useRef<HTMLDivElement | null>(null);
  const svgRef = useRef<SVGSVGElement | null>(null);
  const isSyncingScrollRef = useRef(false);

  const handleHeaderScroll = (e: React.UIEvent<HTMLDivElement>) => {
    if (isSyncingScrollRef.current) return;
    isSyncingScrollRef.current = true;
    const target = e.currentTarget;
    const tables = document.querySelectorAll<HTMLDivElement>('.category-table-scroll');
    tables.forEach(tbl => {
      if (tbl !== target && tbl.scrollLeft !== target.scrollLeft) {
        tbl.scrollLeft = target.scrollLeft;
      }
    });
    requestAnimationFrame(() => {
      isSyncingScrollRef.current = false;
    });
  };

  const currentCat = (activeCategory === 'all' ? (effectiveCategory || 'income') : activeCategory);

  // Column description & sub-columns in header:
  // "only changes the header once it hits the description itself, otherwise the header will only show year."
  let activeCategoryLabel = 'Projection';
  let lineItemLabel = '';
  let hasSubColumns = false;
  let subCol1Label = '';
  let subCol2Label = '';

  if (activeDescription === 'income') {
    activeCategoryLabel = 'Income';
    lineItemLabel = 'Income Earner / Source';
    hasSubColumns = true;
    subCol1Label = 'Rate / Wage';
    subCol2Label = isMonths ? 'Gross Monthly' : 'Gross Annual';
  } else if (activeDescription === 'expenses') {
    activeCategoryLabel = 'Expenses';
    lineItemLabel = 'Category / Item';
    hasSubColumns = true;
    subCol1Label = isMonths ? 'Month' : 'Monthly';
    subCol2Label = isMonths ? 'Mo. Total' : 'Annual';
  } else {
    // "otherwise the header will only show year."
    hasSubColumns = false;
    if (currentCat === 'taxes') {
      activeCategoryLabel = 'Taxes';
    } else if (currentCat === 'retire') {
      activeCategoryLabel = 'Retirement';
    } else if (currentCat === 'income') {
      activeCategoryLabel = 'Income';
    } else if (currentCat === 'expenses') {
      activeCategoryLabel = 'Expenses';
    } else if (currentCat === 'summary') {
      activeCategoryLabel = 'Summary & Projections';
    } else {
      activeCategoryLabel = 'Overview';
    }
  }

  const activePageWidth: PageWidth = pageWidth || state.pageWidth || 'standard';
  const widthClass = PAGE_WIDTH_CLASSES[activePageWidth] || 'max-w-[1360px]';
  const widthConfig = PAGE_WIDTH_CONFIG[activePageWidth] || PAGE_WIDTH_CONFIG.standard;

  const WIDTH_ORDER: PageWidth[] = ['slim', 'compact', 'standard', 'wide', 'full'];
  const currentWidthIdx = WIDTH_ORDER.indexOf(activePageWidth);
  const isAtMin = currentWidthIdx <= 0;
  const isAtMax = currentWidthIdx >= WIDTH_ORDER.length - 1;

  const handleShrinkWidth = () => {
    if (!isAtMin) {
      onChangePageWidth(WIDTH_ORDER[currentWidthIdx - 1]);
    }
  };

  const handleExpandWidth = () => {
    if (!isAtMax) {
      onChangePageWidth(WIDTH_ORDER[currentWidthIdx + 1]);
    }
  };

  // Close dropdowns on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent | TouchEvent) => {
      if (editDropdownRef.current && !editDropdownRef.current.contains(event.target as Node)) {
        setIsEditDropdownOpen(false);
        setShowClearConfirm(false);
      }
      if (widthDropdownRef.current && !widthDropdownRef.current.contains(event.target as Node)) {
        setIsWidthDropdownOpen(false);
      }
    };
    if (isEditDropdownOpen || isWidthDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('touchstart', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, [isEditDropdownOpen, isWidthDropdownOpen]);

  const navItems: { id: NavCategory; label: string; icon: React.ReactNode }[] = [
    {
      id: 'all',
      label: 'All Categories',
      icon: <Layers className="w-3.5 h-3.5" />,
    },
    {
      id: 'income',
      label: 'Income',
      icon: <DollarSign className="w-3.5 h-3.5" />,
    },
    {
      id: 'expenses',
      label: 'Expenses',
      icon: <Receipt className="w-3.5 h-3.5" />,
    },
    {
      id: 'taxes',
      label: 'Taxes',
      icon: <Landmark className="w-3.5 h-3.5" />,
    },
    {
      id: 'retire',
      label: 'Retirement & Savings',
      icon: <PiggyBank className="w-3.5 h-3.5" />,
    },
    {
      id: 'summary',
      label: 'Summary & Projections',
      icon: <LayoutDashboard className="w-3.5 h-3.5" />,
    },
  ];

  // Compute yearly and cumulative values
  const yearlySavings: number[] = [];
  const cumulativeSavings: number[] = [];
  let runningTotal = 0;

  for (let i = 0; i < years; i++) {
    const val = calc.savings[i] ?? 0;
    yearlySavings.push(val);
    runningTotal += val;
    cumulativeSavings.push(runningTotal);
  }

  // Chart dimensions - expanded to fill space with rich curves & visual depth
  const chartWidth = Math.max(460, years * 90);
  const chartHeight = 70;
  const padX = 28;
  const padY = 12;

  // Dedicated Zoomed Scale for Yearly Series
  const yearlyMin = Math.min(...yearlySavings, 0);
  const yearlyMax = Math.max(...yearlySavings, 0);
  const yearlyRange = yearlyMax === yearlyMin ? (Math.abs(yearlyMax) || 1000) * 0.4 : yearlyMax - yearlyMin;
  const effYearlyMin = yearlyMin - yearlyRange * 0.15;
  const effYearlyMax = yearlyMax + yearlyRange * 0.15;
  const effYearlyRange = effYearlyMax - effYearlyMin;

  const getYearlyY = (val: number) => {
    const norm = (val - effYearlyMin) / effYearlyRange;
    return chartHeight - padY - norm * (chartHeight - 2 * padY);
  };

  // Dedicated Scale for Cumulative Series
  const cumulMin = Math.min(...cumulativeSavings, 0);
  const cumulMax = Math.max(...cumulativeSavings, 0);
  const cumulRange = cumulMax === cumulMin ? (Math.abs(cumulMax) || 1000) * 0.4 : cumulMax - cumulMin;
  const effCumulMin = cumulMin - cumulRange * 0.15;
  const effCumulMax = cumulMax + cumulRange * 0.15;
  const effCumulRange = effCumulMax - effCumulMin;

  const getCumulY = (val: number) => {
    const norm = (val - effCumulMin) / effCumulRange;
    return chartHeight - padY - norm * (chartHeight - 2 * padY);
  };

  const getX = (i: number) => {
    if (years <= 1) return chartWidth / 2;
    return padX + (i / (years - 1)) * (chartWidth - 2 * padX);
  };

  // Zero baseline for yearly zoom
  const yZero = getYearlyY(0);

  // Generate points (Yearly is zoomed to highlight annual variances)
  const yearlyPoints = yearlySavings.map((val, i) => ({ x: getX(i), y: getYearlyY(val), val, index: i }));
  const cumulativePoints = cumulativeSavings.map((val, i) => ({ x: getX(i), y: getCumulY(val), val, index: i }));

  // Catmull-Rom or cubic bezier path builder for smooth lines
  const createSmoothPath = (pts: { x: number; y: number }[]) => {
    if (pts.length === 0) return '';
    if (pts.length === 1) return `M ${pts[0].x} ${pts[0].y}`;
    if (pts.length === 2) return `M ${pts[0].x} ${pts[0].y} L ${pts[1].x} ${pts[1].y}`;

    let d = `M ${pts[0].x} ${pts[0].y}`;
    for (let i = 0; i < pts.length - 1; i++) {
      const p0 = pts[i === 0 ? i : i - 1];
      const p1 = pts[i];
      const p2 = pts[i + 1];
      const p3 = pts[i + 2] || p2;

      const cp1x = p1.x + (p2.x - p0.x) / 6;
      const cp1y = p1.y + (p2.y - p0.y) / 6;
      const cp2x = p2.x - (p3.x - p1.x) / 6;
      const cp2y = p2.y - (p3.y - p1.y) / 6;

      d += ` C ${cp1x.toFixed(1)} ${cp1y.toFixed(1)}, ${cp2x.toFixed(1)} ${cp2y.toFixed(1)}, ${p2.x.toFixed(1)} ${p2.y.toFixed(1)}`;
    }
    return d;
  };

  const yearlyPath = createSmoothPath(yearlyPoints);
  const cumulativePath = createSmoothPath(cumulativePoints);

  // Area under yearly path
  const yearlyAreaPath =
    yearlyPoints.length > 1
      ? `${yearlyPath} L ${yearlyPoints[yearlyPoints.length - 1].x} ${yZero} L ${yearlyPoints[0].x} ${yZero} Z`
      : '';

  // Area under cumulative path
  const cumulativeAreaPath =
    cumulativePoints.length > 1
      ? `${cumulativePath} L ${cumulativePoints[cumulativePoints.length - 1].x} ${chartHeight - padY} L ${cumulativePoints[0].x} ${chartHeight - padY} Z`
      : '';

  const activeIdx = hoveredIdx !== null ? hoveredIdx : years - 1;
  const activeYearlyVal = yearlySavings[activeIdx] ?? 0;
  const activeCumulativeVal = cumulativeSavings[activeIdx] ?? 0;

  const handleMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
    if (!svgRef.current || years <= 1) return;
    const rect = svgRef.current.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const relX = (mouseX / rect.width) * chartWidth;

    let closestIdx = 0;
    let minDiff = Infinity;
    for (let i = 0; i < years; i++) {
      const px = getX(i);
      const diff = Math.abs(px - relX);
      if (diff < minDiff) {
        minDiff = diff;
        closestIdx = i;
      }
    }
    setHoveredIdx(closestIdx);
  };

  const handleTouch = (e: React.TouchEvent<SVGSVGElement>) => {
    if (!svgRef.current || years <= 1 || e.touches.length === 0) return;
    const rect = svgRef.current.getBoundingClientRect();
    const touchX = e.touches[0].clientX - rect.left;
    const relX = (touchX / rect.width) * chartWidth;

    let closestIdx = 0;
    let minDiff = Infinity;
    for (let i = 0; i < years; i++) {
      const px = getX(i);
      const diff = Math.abs(px - relX);
      if (diff < minDiff) {
        minDiff = diff;
        closestIdx = i;
      }
    }
    setHoveredIdx(closestIdx);
  };

  return (
    <header
      id="sticky-header-container"
      className="sticky top-0 z-50 bg-[var(--panel)] border-b border-[var(--border)] shadow-sm px-3 sm:px-5 lg:px-6 pt-2 pb-1.5 mb-4 transition-colors duration-200"
    >
      <div className={`${widthClass} w-full mx-auto flex flex-col gap-1.5 transition-all duration-300`}>
        {/* Top Row: Metrics & Toolbar - side by side so sparkline graph is left of Dark mode */}
        <div className="flex items-center justify-between gap-2.5 sm:gap-3">
          {/* Savings Trend Chart & Live Stats Card (Expanded to fill space gracefully) */}
          <div
            id="header-metrics"
            className="flex items-center gap-3 sm:gap-5 flex-1 min-w-0 bg-[var(--panel-alt)]/80 border border-[var(--border)] rounded-xl px-3.5 sm:px-4 py-1.5 shadow-xs overflow-hidden transition-colors"
          >
            {/* Interactive SVG Chart */}
            <div className="relative flex-1 flex items-center min-w-0 overflow-hidden">
              <svg
                ref={svgRef}
                viewBox={`0 0 ${chartWidth} ${chartHeight}`}
                className="w-full h-14 sm:h-16 overflow-visible select-none cursor-crosshair touch-none"
                onMouseMove={handleMouseMove}
                onMouseLeave={() => setHoveredIdx(null)}
                onTouchStart={handleTouch}
                onTouchMove={handleTouch}
                onTouchEnd={() => setHoveredIdx(null)}
              >
                <defs>
                  <linearGradient id="yearlyGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#059669" stopOpacity="0.22" />
                    <stop offset="100%" stopColor="#059669" stopOpacity="0.0" />
                  </linearGradient>
                  <linearGradient id="cumulGradient" x1="0" y1="0" x2="1" y2="0">
                    <stop offset="0%" stopColor="#2563EB" />
                    <stop offset="60%" stopColor="#3B82F6" />
                    <stop offset="100%" stopColor="#0284C7" />
                  </linearGradient>
                  <linearGradient id="cumulAreaGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#3B82F6" stopOpacity="0.12" />
                    <stop offset="100%" stopColor="#3B82F6" stopOpacity="0.0" />
                  </linearGradient>
                </defs>

                {/* Zero reference baseline */}
                <line
                  x1={padX - 8}
                  y1={yZero}
                  x2={chartWidth - padX + 8}
                  y2={yZero}
                  stroke="var(--border)"
                  strokeDasharray="3 3"
                  strokeWidth="1.2"
                  opacity="0.9"
                />

                {/* $0 label */}
                <text
                  x={padX - 10}
                  y={yZero + 3}
                  fill="var(--muted2)"
                  fontSize="9"
                  fontFamily="inherit"
                  textAnchor="end"
                  className="select-none font-mono-custom font-medium"
                >
                  $0
                </text>

                {/* Cumulative Soft Ambient Fill */}
                {cumulativeAreaPath && (
                  <path d={cumulativeAreaPath} fill="url(#cumulAreaGradient)" />
                )}

                {/* Yearly Area Fill */}
                {yearlyAreaPath && (
                  <path d={yearlyAreaPath} fill="url(#yearlyGradient)" />
                )}

                {/* Cumulative Line (Total Savings) */}
                <path
                  d={cumulativePath}
                  fill="none"
                  stroke="url(#cumulGradient)"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />

                {/* Yearly Net Line (Annual Savings) */}
                <path
                  d={yearlyPath}
                  fill="none"
                  stroke="#059669"
                  strokeWidth="2.2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />

                {/* Hover vertical crosshair indicator */}
                {hoveredIdx !== null && (
                  <line
                    x1={getX(hoveredIdx)}
                    y1={padY - 4}
                    x2={getX(hoveredIdx)}
                    y2={chartHeight - padY + 4}
                    stroke="var(--accent)"
                    strokeWidth="1.2"
                    strokeDasharray="2 2"
                    opacity="0.8"
                  />
                )}

                {/* Yearly Data Points (Clean solid circles) */}
                {yearlyPoints.map((pt, i) => {
                  const isHovered = hoveredIdx === i;
                  return (
                    <g key={`y-pt-${i}`} transform={`translate(${pt.x}, ${pt.y})`} className="transition-transform duration-150">
                      <circle cx={0} cy={0} r={isHovered ? 5 : 3.5} fill="#059669" stroke="var(--panel)" strokeWidth="1.5" />
                      {isHovered && <circle cx={0} cy={0} r={7.5} fill="#059669" opacity="0.25" />}
                    </g>
                  );
                })}

                {/* Cumulative Data Points (Clean solid circles) */}
                {cumulativePoints.map((pt, i) => {
                  const isHovered = hoveredIdx === i;
                  return (
                    <g key={`c-pt-${i}`} transform={`translate(${pt.x}, ${pt.y})`} className="transition-transform duration-150">
                      <circle cx={0} cy={0} r={isHovered ? 5.5 : 3.5} fill="#2563EB" stroke="var(--panel)" strokeWidth="1.5" />
                      {isHovered && <circle cx={0} cy={0} r={8} fill="#2563EB" opacity="0.25" />}
                    </g>
                  );
                })}
              </svg>
            </div>

            {/* Live Stats - Stacked Vertically with clear legend labels */}
            <div className="flex flex-col justify-center gap-0.5 font-mono-custom text-xs flex-shrink-0 border-l border-[var(--border)] pl-3.5 sm:pl-4.5">
              <div className="flex items-center gap-3.5 sm:gap-5">
                {/* Yearly Net Value (Stacked) */}
                <div className="flex flex-col items-start leading-tight" title="Net savings or loss in this specific year">
                  <span className="text-[10px] text-[var(--muted2)] uppercase tracking-wider font-semibold font-sans-custom">
                    Year {activeIdx + 1} Net
                  </span>
                  <span
                    className={`text-xs sm:text-sm font-bold ${
                      activeYearlyVal >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
                    }`}
                  >
                    {fmt$(activeYearlyVal)}
                  </span>
                </div>

                <div className="h-7 w-px bg-[var(--border)] select-none opacity-80" />

                {/* Total Saved Value (Stacked) */}
                <div className="flex flex-col items-start leading-tight" title="Accumulated total savings across all years">
                  <span className="text-[10px] text-[var(--muted2)] uppercase tracking-wider font-semibold font-sans-custom">
                    Total Saved
                  </span>
                  <span
                    className={`text-xs sm:text-sm font-bold ${
                      activeCumulativeVal >= 0 ? 'text-blue-600 dark:text-blue-400' : 'text-rose-600 dark:text-rose-400'
                    }`}
                  >
                    {fmt$(activeCumulativeVal)}
                  </span>
                </div>
              </div>

              {/* Hover indication if active */}
              {hoveredIdx !== null && (
                <div className="text-[9.5px] text-[var(--accent)] font-semibold font-sans-custom">
                  Viewing Year {hoveredIdx + 1} projection
                </div>
              )}
            </div>
          </div>

          {/* Distinct Visual Separator Between Graph & Action Buttons */}
          <div className="h-8 w-px bg-[var(--border)] hidden lg:block flex-shrink-0" />

          {/* Global Toolbar Controls */}
          <div id="planner-toolbar" className="flex items-center flex-wrap gap-1.5 sm:gap-2 flex-shrink-0">
            {/* Dark Mode Toggle */}
            <button
              onClick={onToggleDarkMode}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border border-[var(--border)]/80 bg-[var(--panel)] text-[var(--muted)] hover:text-[var(--accent)] hover:border-[var(--accent)] transition-all cursor-pointer shadow-xs"
              title="Toggle theme"
            >
              {state.darkMode ? (
                <>
                  <Sun className="w-3.5 h-3.5 text-amber-400" />
                  <span>Light</span>
                </>
              ) : (
                <>
                  <Moon className="w-3.5 h-3.5" />
                  <span>Dark</span>
                </>
              )}
            </button>

            {/* Page Width Stepper & Dropdown Selector */}
            <div className="relative" ref={widthDropdownRef}>
              <div className="flex items-center rounded-lg border border-[var(--border)]/80 bg-[var(--panel)] shadow-xs">
                {/* Direct Shrink Button */}
                <button
                  type="button"
                  onClick={handleShrinkWidth}
                  disabled={isAtMin}
                  className="p-1.5 hover:text-[var(--accent)] hover:bg-[var(--panel-alt)] disabled:opacity-25 disabled:cursor-not-allowed rounded-l-lg transition cursor-pointer"
                  title={`Shrink page width${!isAtMin ? ` to ${PAGE_WIDTH_CONFIG[WIDTH_ORDER[currentWidthIdx - 1]].label} (${PAGE_WIDTH_CONFIG[WIDTH_ORDER[currentWidthIdx - 1]].width})` : ' (Narrowest preset reached)'}`}
                >
                  <Minimize2 className="w-3.5 h-3.5 text-[var(--muted)]" />
                </button>

                {/* Dropdown Menu Trigger */}
                <button
                  type="button"
                  onClick={() => setIsWidthDropdownOpen(prev => !prev)}
                  className="flex items-center gap-1 px-2 py-1 text-xs text-[var(--muted)] hover:text-[var(--accent)] transition cursor-pointer border-x border-[var(--border)]/60"
                  title="Choose page width preset"
                >
                  <Columns className="w-3 h-3 text-[var(--muted2)]" />
                  <span className="font-semibold text-[11px] font-mono-custom">
                    {widthConfig.label}
                  </span>
                  <ChevronDown
                    className={`w-3 h-3 text-[var(--muted2)] transition-transform duration-200 ${
                      isWidthDropdownOpen ? 'rotate-180 text-[var(--accent)]' : ''
                    }`}
                  />
                </button>

                {/* Direct Expand Button */}
                <button
                  type="button"
                  onClick={handleExpandWidth}
                  disabled={isAtMax}
                  className="p-1.5 hover:text-[var(--accent)] hover:bg-[var(--panel-alt)] disabled:opacity-25 disabled:cursor-not-allowed rounded-r-lg transition cursor-pointer"
                  title={`Expand page width${!isAtMax ? ` to ${PAGE_WIDTH_CONFIG[WIDTH_ORDER[currentWidthIdx + 1]].label} (${PAGE_WIDTH_CONFIG[WIDTH_ORDER[currentWidthIdx + 1]].width})` : ' (Widest preset reached)'}`}
                >
                  <Maximize2 className="w-3.5 h-3.5 text-[var(--muted)]" />
                </button>
              </div>

              {/* Width Presets Dropdown Menu */}
              {isWidthDropdownOpen && (
                <div className="absolute right-0 mt-1.5 w-64 rounded-xl bg-[var(--panel)] border border-[var(--border)] shadow-xl z-50 py-1.5 text-xs animate-in fade-in slide-in-from-top-1 duration-150">
                  <div className="px-3.5 py-1 text-[10px] uppercase font-bold text-[var(--muted2)] tracking-wider border-b border-[var(--border)]/60 mb-1 flex items-center justify-between">
                    <span>Page Layout Width</span>
                    <span className="font-mono-custom text-[9px] lowercase font-normal">{widthConfig.width}</span>
                  </div>

                  {WIDTH_ORDER.map(wKey => {
                    const conf = PAGE_WIDTH_CONFIG[wKey];
                    const isSelected = activePageWidth === wKey;
                    return (
                      <button
                        key={wKey}
                        type="button"
                        onClick={() => {
                          onChangePageWidth(wKey);
                          setIsWidthDropdownOpen(false);
                        }}
                        className={`w-full flex items-center justify-between px-3.5 py-2 text-left hover:bg-[var(--panel-alt)] transition cursor-pointer ${
                          isSelected ? 'bg-[var(--panel-alt)]/60 text-[var(--accent)] font-semibold' : 'text-[var(--text)]'
                        }`}
                      >
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-xs">{conf.label}</span>
                            <span className="text-[10px] font-mono-custom text-[var(--muted2)] bg-[var(--border)]/40 px-1.5 py-0.2 rounded">
                              {conf.width}
                            </span>
                          </div>
                          <div className="text-[10px] text-[var(--muted2)] font-sans-custom mt-0.5">{conf.description}</div>
                        </div>
                        {isSelected && <Check className="w-4 h-4 text-[var(--accent)] flex-shrink-0" />}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Years counter + Add/Remove */}
            <div className="flex items-center gap-1.5 px-2.5 py-1 border border-[var(--border)]/80 rounded-lg bg-[var(--panel)] shadow-xs">
              <span className="text-[10px] text-[var(--muted2)] font-semibold uppercase tracking-wider">
                Years: {state.years}
              </span>
              <button
                onClick={onRemoveYear}
                disabled={state.years <= 1}
                className="w-5 h-5 flex items-center justify-center rounded border border-[var(--border)] hover:border-[var(--accent)] hover:text-[var(--accent)] disabled:opacity-30 disabled:cursor-not-allowed text-xs transition"
                title="Remove last year"
              >
                <Minus className="w-3 h-3" />
              </button>
              <button
                onClick={onAddYear}
                disabled={state.years >= 10}
                className="w-5 h-5 flex items-center justify-center rounded border border-[var(--border)] hover:border-[var(--accent)] hover:text-[var(--accent)] disabled:opacity-30 disabled:cursor-not-allowed text-xs transition"
                title="Add another year"
              >
                <Plus className="w-3 h-3" />
              </button>
            </div>

            {/* Unified Edit Dropdown Menu */}
            <div className="relative" ref={editDropdownRef}>
              <button
                type="button"
                onClick={() => {
                  setIsEditDropdownOpen(prev => !prev);
                  setShowClearConfirm(false);
                }}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition cursor-pointer shadow-xs ${
                  state.isEditMode
                    ? 'bg-emerald-600 border-emerald-600 text-white'
                    : isEditDropdownOpen
                    ? 'bg-[var(--panel-alt)] border-[var(--accent)] text-[var(--accent)]'
                    : 'bg-[var(--panel)] border-[var(--border)]/80 text-[var(--muted)] hover:text-[var(--accent)] hover:border-[var(--accent)]'
                }`}
                title="Open Planner Edit menu"
              >
                <Edit3 className="w-3.5 h-3.5" />
                <span>Edit</span>
                <ChevronDown
                  className={`w-3 h-3 transition-transform duration-200 ${
                    isEditDropdownOpen ? 'rotate-180 text-[var(--accent)]' : ''
                  }`}
                />
              </button>

              {/* Dropdown Popover */}
              {isEditDropdownOpen && (
                <div className="absolute right-0 mt-1.5 w-60 rounded-xl bg-[var(--panel)] border border-[var(--border)] shadow-xl z-50 py-1.5 text-xs animate-in fade-in slide-in-from-top-1 duration-150">
                  {/* Toggle Form Edit Mode */}
                  <button
                    type="button"
                    onClick={() => {
                      onToggleEditMode();
                      setIsEditDropdownOpen(false);
                    }}
                    className="w-full flex items-center justify-between px-3.5 py-2 text-left hover:bg-[var(--panel-alt)] text-[var(--text)] transition cursor-pointer"
                  >
                    <div className="flex items-center gap-2">
                      <Edit3 className="w-3.5 h-3.5 text-[var(--accent)]" />
                      <span className="font-medium">
                        {state.isEditMode ? 'Finish Row Editing' : 'Edit Rows & Order'}
                      </span>
                    </div>
                    {state.isEditMode && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-semibold">
                        Active
                      </span>
                    )}
                  </button>

                  <div className="h-px bg-[var(--border)]/70 my-1" />

                  {/* Sample Planner Option */}
                  <button
                    type="button"
                    onClick={() => {
                      onResetDefaults();
                      setIsEditDropdownOpen(false);
                    }}
                    className="w-full flex items-center gap-2 px-3.5 py-2 text-left hover:bg-[var(--panel-alt)] text-[var(--text)] transition cursor-pointer"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                    <div>
                      <div className="font-medium">Sample Planner</div>
                      <div className="text-[10px] text-[var(--muted2)]">Load example starter template</div>
                    </div>
                  </button>

                  <div className="h-px bg-[var(--border)]/70 my-1" />

                  {/* Clear Option with Confirm State */}
                  {!showClearConfirm ? (
                    <button
                      type="button"
                      onClick={() => setShowClearConfirm(true)}
                      className="w-full flex items-center gap-2 px-3.5 py-2 text-left text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition cursor-pointer"
                    >
                      <RotateCcw className="w-3.5 h-3.5 text-rose-500" />
                      <div>
                        <div className="font-medium">Clear Planner</div>
                        <div className="text-[10px] text-[var(--muted2)]">Reset all inputs to zero</div>
                      </div>
                    </button>
                  ) : (
                    <div className="px-3 py-2 bg-rose-50/80 dark:bg-rose-950/40 border-t border-b border-rose-200 dark:border-rose-900/50">
                      <div className="flex items-center gap-1.5 text-rose-700 dark:text-rose-300 text-[11px] font-semibold mb-2">
                        <AlertTriangle className="w-3.5 h-3.5 text-rose-500 flex-shrink-0" />
                        <span>Are you sure?</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            onClearToBlank();
                            setShowClearConfirm(false);
                            setIsEditDropdownOpen(false);
                          }}
                          className="flex-1 py-1 px-2 rounded-md bg-rose-600 hover:bg-rose-700 text-white font-semibold text-[11px] transition text-center cursor-pointer shadow-xs"
                        >
                          Yes, Clear All
                        </button>
                        <button
                          type="button"
                          onClick={() => setShowClearConfirm(false)}
                          className="py-1 px-2 rounded-md border border-[var(--border)] hover:bg-[var(--panel)] text-[var(--muted)] text-[11px] transition cursor-pointer"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Tutorial Walkthrough Button (Positioned to the right of Edit) */}
            <button
              type="button"
              onClick={onOpenTutorial}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border border-indigo-500/40 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-100 dark:hover:bg-indigo-900/50 transition cursor-pointer shadow-xs"
              title="Start step-by-step tutorial walkthrough"
            >
              <HelpCircle className="w-3.5 h-3.5" />
              <span>Tutorial</span>
            </button>
          </div>
        </div>

        {/* Attached Category Navigation Sub-Bar */}
        <div
          id="category-nav-bar"
          className="border-t border-[var(--border)]/70 pt-1.5 flex items-center justify-start overflow-x-auto scrollbar-none relative"
        >
          <div className="flex items-center gap-1.5 sm:gap-2 flex-nowrap min-w-max pb-1">
            {navItems.map(item => {
              const isActive = activeCategory === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => onSelectCategory(item.id)}
                  className={`relative group flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-medium font-sans-custom transition-all cursor-pointer select-none whitespace-nowrap ${
                    isActive
                      ? 'bg-[var(--accent)] text-white font-semibold shadow-sm'
                      : 'text-[var(--muted)] hover:text-[var(--text)] hover:bg-[var(--panel-alt)]'
                  }`}
                >
                  <span className={isActive ? 'text-white' : 'text-[var(--muted2)]'}>
                    {item.icon}
                  </span>
                  <span>{item.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Aligned Sticky Year Columns Bar */}
        <div
          id="sticky-year-bar-container"
          className="border-t border-[var(--border)]/70 pt-1.5 mt-1 select-none px-4 sm:px-5 border-x border-transparent"
        >
            <div
              id="sticky-year-bar-scroll"
              className="overflow-x-auto scrollbar-none"
              onScroll={handleHeaderScroll}
            >
              <table className="w-full table-fixed text-[12px] border-collapse min-w-[700px]">
                <colgroup>
                  {state.isEditMode && <col className="w-8 min-w-[32px]" />}
                  {/* Name / Category Column */}
                  <col className="w-[280px] min-w-[240px]" />
                  {/* Year sub-columns */}
                  {Array.from({ length: years }).map((_, y) => (
                    <React.Fragment key={y}>
                      <col className="w-[85px] sm:w-[95px] min-w-[78px]" />
                      <col className="w-[85px] sm:w-[95px] min-w-[78px]" />
                    </React.Fragment>
                  ))}
                  {state.isEditMode && <col className="w-10 min-w-[40px]" />}
                </colgroup>
                <thead>
                  <tr className="bg-[var(--panel-alt)]/70 text-[var(--text)] font-semibold border-b border-[var(--border)]/60">
                    {state.isEditMode && <th className="w-8"></th>}
                    {/* Left Column: Category / Line Items Indicator + Start Year Picker */}
                    <th className="py-1 px-3 text-left align-middle">
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-1.5 truncate">
                          <span className="font-semibold text-xs text-[var(--text)] tracking-wide uppercase truncate">
                            {activeCategoryLabel}
                          </span>
                          {hasSubColumns && (
                            <span className="text-[10px] text-[var(--muted2)]">
                              Columns
                            </span>
                          )}
                        </div>

                        {/* Start Year Picker */}
                        {!isMonths && (
                          <div className="flex items-center gap-1 bg-[var(--panel)] border border-[var(--border)] rounded px-1.5 py-0.5 text-[11px] font-mono shadow-2xs">
                            <Calendar className="w-3 h-3 text-[var(--muted2)]" />
                            <button
                              type="button"
                              onClick={() => onChangeStartYear && onChangeStartYear(startYear - 1)}
                              className="hover:text-[var(--accent)] cursor-pointer px-0.5 text-[10px]"
                              title="Previous start year"
                            >
                              ◀
                            </button>
                            <span className="font-bold text-[var(--text)]">{startYear}</span>
                            <button
                              type="button"
                              onClick={() => onChangeStartYear && onChangeStartYear(startYear + 1)}
                              className="hover:text-[var(--accent)] cursor-pointer px-0.5 text-[10px]"
                              title="Next start year"
                            >
                              ▶
                            </button>
                          </div>
                        )}
                      </div>
                    </th>

                    {/* Year Column Headers Aligned with Every Table */}
                    {Array.from({ length: years }).map((_, y) => {
                      const displayYear = isMonths ? `Mo ${y + 1}` : `${startYear + y}`;
                      const isHovered = hoveredIdx === y;
                      return (
                        <th
                          key={y}
                          colSpan={2}
                          onMouseEnter={() => setHoveredIdx(y)}
                          onMouseLeave={() => setHoveredIdx(null)}
                          className={`py-1 px-2 text-center border-l-2 border-stone-300 dark:border-stone-700 transition-colors ${
                            isHovered ? 'bg-[var(--panel-alt)]' : 'bg-[var(--panel-alt)]/50'
                          }`}
                        >
                          <span className="font-mono text-xs font-bold tracking-tight text-[var(--text)]">
                            {displayYear}
                          </span>
                        </th>
                      );
                    })}
                    {state.isEditMode && <th className="w-10"></th>}
                  </tr>
                  {hasSubColumns && (
                    <tr className="bg-[var(--panel-alt)]/40 text-[10.5px] text-[var(--muted2)] font-medium">
                      {state.isEditMode && <th></th>}
                      <th className="py-0.5 px-3 text-left font-sans-custom uppercase tracking-wider text-[10px] text-[var(--muted2)]">
                        {lineItemLabel}
                      </th>
                      {Array.from({ length: years }).map((_, y) => {
                        const isHovered = hoveredIdx === y;
                        return (
                          <React.Fragment key={y}>
                            <th
                              className={`py-0.5 px-1 text-center font-sans-custom border-l-2 border-stone-300 dark:border-stone-700 ${
                                isHovered ? 'bg-[var(--panel-alt)] text-[var(--text)]' : ''
                              }`}
                            >
                              {subCol1Label}
                            </th>
                            <th
                              className={`py-0.5 px-1 text-center font-sans-custom ${
                                isHovered ? 'bg-[var(--panel-alt)] text-[var(--text)]' : ''
                              }`}
                            >
                              {subCol2Label}
                            </th>
                          </React.Fragment>
                        );
                      })}
                      {state.isEditMode && <th></th>}
                    </tr>
                  )}
                </thead>
              </table>
            </div>
          </div>
      </div>
    </header>
  );
};
