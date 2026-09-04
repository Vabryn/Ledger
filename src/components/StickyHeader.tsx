import React, { useState, useRef, useEffect } from 'react';
import { PlannerState } from '@/core';
import {
  Sun,
  Moon,
  Edit3,
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
  AlertTriangle,
  Calendar,
} from 'lucide-react';

export type NavCategory = 'all' | 'income' | 'expenses' | 'taxes' | 'retire' | 'summary';

interface StickyHeaderProps {
  state: PlannerState;
  activeCategory: NavCategory;
  effectiveCategory?: NavCategory;
  onSelectCategory: (category: NavCategory) => void;
  onAddYear: () => void;
  onRemoveYear: () => void;
  onToggleDarkMode: () => void;
  onToggleEditMode: () => void;
  onResetDefaults: () => void;
  onClearToBlank: () => void;
  onChangeStartYear?: (startYear: number) => void;
}

export const StickyHeader: React.FC<StickyHeaderProps> = ({
  state,
  activeCategory,
  effectiveCategory,
  onSelectCategory,
  onAddYear,
  onRemoveYear,
  onToggleDarkMode,
  onToggleEditMode,
  onResetDefaults,
  onClearToBlank,
  onChangeStartYear,
}) => {
  const years = state.years || 1;
  const isMonths = state.viewMode === 'months';
  const startYear = state.startYear || 2025;

  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null); // highlighted year column in the header
  const [isEditDropdownOpen, setIsEditDropdownOpen] = useState(false);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const editDropdownRef = useRef<HTMLDivElement | null>(null);
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

  // The sticky year bar's left cell just names the category currently scrolled into view.
  const CATEGORY_LABELS: Record<string, string> = {
    taxes: 'Taxes',
    retire: 'Retirement',
    income: 'Income',
    expenses: 'Expenses',
    summary: 'Summary & Projections',
  };
  const activeCategoryLabel = CATEGORY_LABELS[currentCat] || 'Overview';


  // Close dropdowns on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent | TouchEvent) => {
      if (editDropdownRef.current && !editDropdownRef.current.contains(event.target as Node)) {
        setIsEditDropdownOpen(false);
        setShowClearConfirm(false);
      }
    };
    if (isEditDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('touchstart', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, [isEditDropdownOpen]);

  const navItems: { id: NavCategory; label: string; icon: React.ReactNode }[] = [
    { id: 'all', label: 'All', icon: <Layers className="w-3.5 h-3.5" /> },
    { id: 'income', label: 'Income', icon: <DollarSign className="w-3.5 h-3.5" /> },
    { id: 'expenses', label: 'Expenses', icon: <Receipt className="w-3.5 h-3.5" /> },
    { id: 'taxes', label: 'Taxes', icon: <Landmark className="w-3.5 h-3.5" /> },
    { id: 'retire', label: 'Retirement', icon: <PiggyBank className="w-3.5 h-3.5" /> },
    { id: 'summary', label: 'Summary', icon: <LayoutDashboard className="w-3.5 h-3.5" /> },
  ];

  return (
    <header
      id="sticky-header-container"
      className="sticky top-0 z-50 bg-[var(--bg)] mb-4 transition-colors duration-200"
    >
      {/* Panel box that matches the section cards: left/right/bottom borders,
          rounded bottom corners, no top edge. */}
      <div className="max-w-[1850px] w-full mx-auto px-3 sm:px-5 lg:px-6 pt-2 pb-2 bg-[var(--panel)] border-x border-b border-[var(--border)] rounded-b-xl shadow-sm flex flex-col gap-1.5">
        {/* Category nav + planner toolbar share one line, separated. */}
        <div className="flex items-center justify-between flex-wrap gap-x-5 gap-y-1.5">
          <nav aria-label="Planner sections" className="flex items-center gap-1 sm:gap-1.5 flex-wrap">
            {navItems.map(item => {
              const isActive = activeCategory === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => onSelectCategory(item.id)}
                  aria-current={isActive ? 'page' : undefined}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium font-sans-custom transition-colors cursor-pointer select-none whitespace-nowrap ${
                    isActive
                      ? 'bg-[var(--accent)] text-white font-semibold shadow-sm'
                      : 'text-[var(--muted)] hover:text-[var(--text)] hover:bg-[var(--panel-alt)]'
                  }`}
                >
                  <span className={isActive ? 'text-white' : 'text-[var(--muted2)]'}>{item.icon}</span>
                  <span>{item.label}</span>
                </button>
              );
            })}
          </nav>

          {/* Global Toolbar Controls */}
          <div id="planner-toolbar" className="flex items-center gap-1.5 sm:gap-2 flex-shrink-0">
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
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/10 text-[var(--pos)] font-semibold">
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
                      className="w-full flex items-center gap-2 px-3.5 py-2 text-left text-[var(--neg)] hover:bg-rose-50 dark:hover:bg-rose-950/30 transition cursor-pointer"
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

          </div>
        </div>

        {/* Aligned Sticky Year Columns Bar */}
        <div
          id="sticky-year-bar-container"
          className="border-t border-[var(--border)]/70 pt-1.5 mt-1 select-none px-4 sm:px-5"
        >
            <div
              id="sticky-year-bar-scroll"
              className="overflow-x-auto scrollbar-none"
              onScroll={handleHeaderScroll}
            >
              <table className={`w-full table-fixed text-xs border-collapse${state.isEditMode ? ' is-edit' : ''}`} style={{ minWidth: `calc(var(--label-col-w) + ${years * 2} * var(--yr-col-w) + ${state.isEditMode ? 72 : 0}px)` }}>
                <colgroup>
                  {state.isEditMode && <col className="w-8 min-w-[32px]" />}
                  {/* Name / Category Column */}
                  <col className="w-[var(--label-col-w)] min-w-[var(--label-col-w)]" />
                  {/* Year sub-columns */}
                  {Array.from({ length: years }).map((_, y) => (
                    <React.Fragment key={y}>
                      <col />
                      <col />
                    </React.Fragment>
                  ))}
                  {state.isEditMode && <col className="w-10 min-w-[40px]" />}
                </colgroup>
                <thead>
                  <tr className="bg-[var(--panel-alt)] text-[var(--text)] font-semibold border-b border-[var(--border)]/60">
                    {state.isEditMode && <th className="w-8"></th>}
                    {/* Left Column: Category / Line Items Indicator + Start Year Picker */}
                    <th className="py-1 px-3 text-left align-middle">
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-semibold text-xs text-[var(--text)] tracking-wide uppercase truncate">
                          {activeCategoryLabel}
                        </span>

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
                          className={`py-1 px-2 text-center border-l-2 border-[var(--col-divider)] transition-colors ${
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
                </thead>
              </table>
            </div>
          </div>
      </div>
    </header>
  );
};
