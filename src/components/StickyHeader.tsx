import React, { useState, useRef, useEffect } from 'react';
import { PlannerState, PageWidth, PAGE_WIDTH_CLASSES, PAGE_WIDTH_CONFIG } from '../types';
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

  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null); // highlighted year column in the header
  const [isEditDropdownOpen, setIsEditDropdownOpen] = useState(false);
  const [isWidthDropdownOpen, setIsWidthDropdownOpen] = useState(false);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const editDropdownRef = useRef<HTMLDivElement | null>(null);
  const widthDropdownRef = useRef<HTMLDivElement | null>(null);
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

  return (
    <header
      id="sticky-header-container"
      className="sticky top-0 z-50 bg-[var(--panel)] border-b border-[var(--border)] shadow-sm px-3 sm:px-5 lg:px-6 pt-2 pb-1.5 mb-4 transition-colors duration-200"
    >
      <div className={`${widthClass} w-full mx-auto flex flex-col gap-1.5 transition-all duration-300`}>
        {/* Top Row: Metrics & Toolbar - side by side so sparkline graph is left of Dark mode */}
        <div className="flex items-center justify-between gap-2.5 sm:gap-3">
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

                  {/* Sample Planner Option — replaces all current data, so confirm first */}
                  {!showResetConfirm ? (
                    <button
                      type="button"
                      onClick={() => setShowResetConfirm(true)}
                      className="w-full flex items-center gap-2 px-3.5 py-2 text-left hover:bg-[var(--panel-alt)] text-[var(--text)] transition cursor-pointer"
                    >
                      <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                      <div>
                        <div className="font-medium">Sample Planner</div>
                        <div className="text-[10px] text-[var(--muted2)]">Replace current data with the example template</div>
                      </div>
                    </button>
                  ) : (
                    <div className="px-3 py-2 bg-amber-50/80 dark:bg-amber-950/40 border-t border-b border-amber-200 dark:border-amber-900/50">
                      <div className="flex items-center gap-1.5 text-amber-700 dark:text-amber-300 text-[11px] font-semibold mb-2">
                        <AlertTriangle className="w-3.5 h-3.5 text-amber-500 flex-shrink-0" />
                        <span>Replace all current data with the sample?</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            onResetDefaults();
                            setShowResetConfirm(false);
                            setIsEditDropdownOpen(false);
                          }}
                          className="flex-1 py-1 px-2 rounded-md bg-amber-600 hover:bg-amber-700 text-white font-semibold text-[11px] transition text-center cursor-pointer shadow-xs"
                        >
                          Yes, Load Sample
                        </button>
                        <button
                          type="button"
                          onClick={() => setShowResetConfirm(false)}
                          className="py-1 px-2 rounded-md border border-[var(--border)] hover:bg-[var(--panel)] text-[var(--muted)] text-[11px] transition cursor-pointer"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  )}

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
                      <col className="w-[var(--yr-col-w)] min-w-[84px]" />
                      <col className="w-[var(--yr-col-w)] min-w-[84px]" />
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
