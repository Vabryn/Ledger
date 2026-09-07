import React from 'react';
import { ArrowUp, ArrowDown } from 'lucide-react';

/**
 * Single source of truth for projection-table geometry.
 *
 * The sticky year bar, every section table and the summary chart must keep
 * their year columns at identical x-positions. Rather than hand-rolling the
 * same `<colgroup>` + `min-width` calc in eight places (and drifting), every
 * one of them derives its layout from here. Change the column shape once.
 *
 * Column layout, left to right:
 *   [edit-mode drag handle 32px]?  [row label var(--label-col-w)]
 *   [ year 1 sub-a | year 1 sub-b ] … [ year N sub-a | year N sub-b ]
 *   [edit-mode trailing action 40px]?
 */

const EDIT_HANDLE_W = 32; // w-8  drag-handle spacer (first column in edit mode)
const EDIT_TRAIL_W = 40; // w-10 trailing action column (delete buttons)

interface Geometry {
  /** true when a trailing 40px action column is present in edit mode (all
   *  section tables; the chart has none). */
  trailingCol?: boolean;
}

/** `min-width` for the scrollable table/flex row so slim columns still fit. */
export function tableMinWidth(years: number, isEditMode: boolean, { trailingCol = true }: Geometry = {}): string {
  const edit = isEditMode ? EDIT_HANDLE_W + (trailingCol ? EDIT_TRAIL_W : 0) : 0;
  return `calc(var(--label-col-w) + ${years * 2} * var(--yr-col-w) + ${edit}px)`;
}

/** Width of just the year grid (no label column) — the summary chart canvas. */
export function yearsGridWidth(years: number): string {
  return `calc(${years * 2} * var(--yr-col-w))`;
}

/** The `<colgroup>` every projection `<table>` must use. */
export function YearColgroup({
  years,
  isEditMode,
  trailingCol = true,
}: {
  years: number;
  isEditMode: boolean;
  trailingCol?: boolean;
}) {
  return (
    <colgroup>
      {isEditMode && <col className="w-8 min-w-[32px]" />}
      <col className="w-[var(--label-col-w)] min-w-[var(--label-col-w)]" />
      {Array.from({ length: years }).map((_, y) => (
        <React.Fragment key={y}>
          <col />
          <col />
        </React.Fragment>
      ))}
      {isEditMode && trailingCol && <col className="w-10 min-w-[40px]" />}
    </colgroup>
  );
}

/** Class string for a projection `<table>` (shared so `.is-edit` + `table-fixed`
 *  can never be forgotten on one table). */
export function ledgerTableClass(isEditMode: boolean): string {
  return `w-full table-fixed text-xs border-collapse${isEditMode ? ' is-edit' : ''}`;
}

type IconType = React.ComponentType<{ className?: string }>;

/**
 * The collapsible `<details>` card every projection section renders: the
 * chevron + icon + title `<summary>`, the edit-mode move up/down buttons, and
 * the `mt-4` body wrapper. Section-specific controls and tables go in `children`.
 */
export function SectionShell({
  title,
  icon: Icon,
  isEditMode,
  onMoveSection,
  isHighlighted,
  bodyClassName = 'space-y-6',
  children,
}: {
  title: React.ReactNode;
  icon: IconType;
  isEditMode: boolean;
  onMoveSection?: (dir: 'up' | 'down') => void;
  isHighlighted?: boolean;
  bodyClassName?: string;
  children: React.ReactNode;
}) {
  return (
    <details
      open
      className={`bg-[var(--panel)] border-[1.5px] rounded-xl p-4 sm:p-5 mb-4 transition-all duration-300 ${
        isHighlighted ? 'section-glow-active' : 'border-[var(--card-line)] shadow'
      }`}
    >
      <summary className="cursor-pointer list-none flex items-center justify-between font-serif-custom text-base font-semibold text-[var(--text)] select-none">
        <div className="flex items-center gap-2">
          <span className="text-xs transition-transform duration-150 inline-block text-[var(--muted2)]">▼</span>
          <Icon className="w-4 h-4 text-[var(--muted2)]" />
          <span>{title}</span>
        </div>
        {isEditMode && onMoveSection && (
          <div className="flex items-center gap-1" onClick={e => e.stopPropagation()}>
            <button
              onClick={() => onMoveSection('up')}
              className="p-1 hover:text-[var(--accent)] text-[var(--muted2)] text-xs rounded"
              title="Move section up"
            >
              <ArrowUp className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => onMoveSection('down')}
              className="p-1 hover:text-[var(--accent)] text-[var(--muted2)] text-xs rounded"
              title="Move section down"
            >
              <ArrowDown className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </summary>
      <div className={`mt-4 ${bodyClassName}`}>{children}</div>
    </details>
  );
}

/**
 * `sub-card` + the horizontally-scrolling wrapper that must carry
 * `onScroll={syncScrollToYearBar}`. Wrap a `<ProjectionTable>` (or a
 * `<DragDropContext>` around one) in it.
 */
export function ScrollBox({ children }: { children: React.ReactNode }) {
  return (
    <div className="sub-card">
      <div className="overflow-x-auto category-table-scroll" onScroll={syncScrollToYearBar}>
        {children}
      </div>
    </div>
  );
}

/**
 * A projection `<table>` with the three things that must stay in lockstep —
 * `ledgerTableClass`, the `min-width` from `tableMinWidth`, and `<YearColgroup>`.
 * `children` is the `<thead>?` + `<tbody>`.
 */
export function ProjectionTable({
  years,
  isEditMode,
  trailingCol = true,
  children,
}: {
  years: number;
  isEditMode: boolean;
  trailingCol?: boolean;
  children: React.ReactNode;
}) {
  return (
    <table
      className={ledgerTableClass(isEditMode)}
      style={{ minWidth: tableMinWidth(years, isEditMode, { trailingCol }) }}
    >
      <YearColgroup years={years} isEditMode={isEditMode} trailingCol={trailingCol} />
      {children}
    </table>
  );
}

/**
 * Universal, loop-free horizontal scroll synchronization.
 *
 * Tracks the actively scrolling element so secondary programmatic scroll events
 * never trigger echo updates or overwrite the element currently receiving touch gestures.
 */
let activeScroller: HTMLElement | null = null;
let resetTimer: ReturnType<typeof setTimeout> | null = null;

export function syncScrollToYearBar(e: React.UIEvent<HTMLElement>): void {
  const current = e.currentTarget;
  if (current.scrollLeft < 0) {
    current.scrollLeft = 0;
  }

  if (activeScroller && activeScroller !== current) {
    return;
  }
  activeScroller = current;
  if (resetTimer) clearTimeout(resetTimer);
  resetTimer = setTimeout(() => {
    activeScroller = null;
    const bar = document.getElementById('sticky-year-bar-scroll');
    const targetX = bar ? Math.max(0, bar.scrollLeft) : 0;
    if (targetX < 1) {
      if (bar && bar.scrollLeft !== 0) bar.scrollLeft = 0;
      document.querySelectorAll<HTMLElement>('.category-table-scroll').forEach(tbl => {
        if (tbl.scrollLeft !== 0) tbl.scrollLeft = 0;
      });
    }
  }, 100);

  const scrollX = Math.max(0, current.scrollLeft);

  // Sync the sticky year bar if it wasn't the source
  const bar = document.getElementById('sticky-year-bar-scroll');
  if (bar && bar !== current && Math.abs(bar.scrollLeft - scrollX) > 0.5) {
    bar.scrollLeft = scrollX;
  }

  // Sync all category tables that weren't the source
  const tables = document.querySelectorAll<HTMLElement>('.category-table-scroll');
  tables.forEach(tbl => {
    if (tbl !== current && Math.abs(tbl.scrollLeft - scrollX) > 0.5) {
      tbl.scrollLeft = scrollX;
    }
  });
}

