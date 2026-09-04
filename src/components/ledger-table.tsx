import React from 'react';

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

/**
 * onScroll handler that keeps a section table (or the chart) in horizontal
 * lockstep with the sticky year bar. The year bar's own handler (which pushes
 * the other way, to every table at once) lives in StickyHeader.
 */
export function syncScrollToYearBar(e: React.UIEvent<HTMLElement>): void {
  const bar = document.getElementById('sticky-year-bar-scroll');
  if (bar && bar.scrollLeft !== e.currentTarget.scrollLeft) {
    bar.scrollLeft = e.currentTarget.scrollLeft;
  }
}
