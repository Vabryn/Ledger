import React from 'react';
import { ExpenseItem, CalculationResult, ViewMode, fmtCompact$, num } from '@/core';
import { ReceiptText, Plus, Trash2, ArrowUp, ArrowDown, FolderPlus, GripVertical, ChevronDown, ChevronRight } from 'lucide-react';
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';

interface ExpensesSectionProps {
  years: number;
  viewMode: ViewMode;
  isEditMode: boolean;
  col: ExpenseItem[];
  catOrder: string[];
  collapsedCats: Record<string, boolean>;
  colIntensity: number;
  colContrast: number;
  colHue: string;
  calc: CalculationResult;
  onUpdateExpense: (idx: number, field: 'name' | 'cat' | 'monthly', value: any, yearIdx?: number) => void;
  onAddExpense: (cat?: string) => void;
  onAddCategory: () => void;
  onRemoveExpense: (idx: number) => void;
  onReorderCategoryRows: (cat: string, startIndex: number, endIndex: number) => void;
  onReorderCategories: (startIndex: number, endIndex: number) => void;
  onToggleCategoryCollapse: (cat: string) => void;
  onRenameCategory: (oldCat: string, newCat: string) => void;
  onSortExpenses: (dir: 'desc' | 'asc') => void;
  onChangeIntensity: (val: number) => void;
  onChangeContrast: (val: number) => void;
  onChangeHue: (val: string) => void;
  onMoveSection?: (dir: 'up' | 'down') => void;
  isHighlighted?: boolean;
}

export const ExpensesSection: React.FC<ExpensesSectionProps> = ({
  years,
  viewMode,
  isEditMode,
  col,
  catOrder,
  collapsedCats,
  colIntensity,
  colContrast,
  colHue,
  calc,
  onUpdateExpense,
  onAddExpense,
  onAddCategory,
  onRemoveExpense,
  onReorderCategoryRows,
  onReorderCategories,
  onToggleCategoryCollapse,
  onRenameCategory,
  onSortExpenses,
  onChangeIntensity,
  onChangeContrast,
  onChangeHue,
  onMoveSection,
  isHighlighted,
}) => {
  const isMonths = viewMode === 'months';
  const totalColLabel = isMonths ? 'Month Total' : 'Annual Total';

  // Column count for full-width rows (category rule + empty state).
  const fullColSpan = (isEditMode ? 2 : 1) + years * 2 + (isEditMode ? 1 : 0);

  const handleTableScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const headerScroll = document.getElementById('sticky-year-bar-scroll');
    if (headerScroll && headerScroll.scrollLeft !== e.currentTarget.scrollLeft) {
      headerScroll.scrollLeft = e.currentTarget.scrollLeft;
    }
  };

  // Compute heat map color
  const hex = (colHue || '#8C3B33').replace('#', '');
  const hr = parseInt(hex.slice(0, 2), 16) || 140;
  const hg = parseInt(hex.slice(2, 4), 16) || 59;
  const hb = parseInt(hex.slice(4, 6), 16) || 51;
  const exp = Math.pow(4, (50 - colContrast) / 50);

  const getHeatStyle = (periodVal: number): React.CSSProperties => {
    if (periodVal <= 0 || colIntensity === 0) return {};
    const maxCost = Math.max(1, calc.maxGlobalCost || 1);
    const ratio = Math.min(1, Math.max(0, periodVal / maxCost));
    let t = Math.pow(ratio, exp) * (colIntensity / 100);
    if (t > 0 && t < 0.04) t = 0.04;
    return {
      backgroundColor: `rgba(${hr}, ${hg}, ${hb}, ${t.toFixed(3)})`,
    };
  };

  // Filter out any automated retirement/savings rows (those belong in Retirement & Saving Goals)
  const nonRetireRows = col.filter(r => r.cat !== 'Retirement' && r.cat !== 'Savings Goals');

  // Ensure unique categories
  const categoriesInUse: string[] = Array.from(new Set(nonRetireRows.map(r => r.cat || 'Other')));
  const orderedCats: string[] = [];
  (catOrder || []).forEach(c => {
    if (categoriesInUse.includes(c) && !orderedCats.includes(c)) orderedCats.push(c);
  });
  categoriesInUse.forEach((c: string) => {
    if (!orderedCats.includes(c)) orderedCats.push(c);
  });


  const handleCategoryDragEnd = (result: DropResult) => {
    if (!result.destination) return;
    const { source, destination } = result;

    if (source.droppableId.startsWith('cat-items-') && destination.droppableId.startsWith('cat-items-')) {
      // Ensure drag scope restriction: cannot drop across different categories
      if (source.droppableId === destination.droppableId) {
        const catName = source.droppableId.replace('cat-items-', '');
        onReorderCategoryRows(catName, source.index, destination.index);
      }
    } else if (source.droppableId === 'categories-master-list' && destination.droppableId === 'categories-master-list') {
      onReorderCategories(source.index, destination.index);
    }
  };

  return (
    <details
      open
      className={`bg-[var(--panel)] border rounded-xl p-4 sm:p-5 mb-4 transition-all duration-300 ${
        isHighlighted
          ? 'section-glow-active'
          : 'border-[var(--border)] shadow-sm'
      }`}
    >
      <summary className="cursor-pointer list-none flex items-center justify-between font-serif-custom text-base font-semibold text-[var(--text)] select-none">
        <div className="flex items-center gap-2">
          <span className="text-xs transition-transform duration-150 inline-block text-[var(--muted2)]">▼</span>
          <ReceiptText className="w-4 h-4 text-[var(--muted2)]" />
          <span>{isMonths ? 'Monthly Expenses' : 'Living Expenses'}</span>
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

      <div className="mt-4 space-y-5">
        {/* Heat Map & Sort Controls */}
        <div className="flex flex-wrap items-center justify-between gap-3 pb-2.5 border-b border-[var(--border)]/60">
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2">
              <span className="text-[10px] uppercase font-semibold text-[var(--muted2)] tracking-wider">
                Sort:
              </span>
              <select
                onChange={e => {
                  if (e.target.value) onSortExpenses(e.target.value as 'desc' | 'asc');
                  e.target.value = '';
                }}
                className="bg-[var(--panel)] border border-[var(--border)] text-[var(--text)] text-xs rounded-lg px-2.5 py-1 focus:outline-none cursor-pointer shadow-xs"
              >
                <option value="">Manual Order...</option>
                <option value="desc">Highest ➔ Lowest</option>
                <option value="asc">Lowest ➔ Highest</option>
              </select>
            </div>

            <div className="flex items-center gap-4">
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] uppercase font-semibold text-[var(--muted2)]">Intensity:</span>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={colIntensity}
                  onChange={e => onChangeIntensity(parseInt(e.target.value, 10))}
                  className="heat-range"
                  title="Heat map intensity"
                />
              </div>

              <div className="flex items-center gap-1.5">
                <span className="text-[10px] uppercase font-semibold text-[var(--muted2)]">Contrast:</span>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={colContrast}
                  onChange={e => onChangeContrast(parseInt(e.target.value, 10))}
                  className="heat-range"
                  title="Heat map contrast"
                />
              </div>

              <div className="flex items-center gap-1.5">
                <span className="text-[10px] uppercase font-semibold text-[var(--muted2)]">Color:</span>
                <input
                  type="color"
                  value={colHue}
                  onChange={e => onChangeHue(e.target.value)}
                  className="w-5 h-5 rounded cursor-pointer border border-[var(--border)] p-0"
                  title="Heat color hue"
                />
              </div>
            </div>
          </div>

        </div>

        {/* Expenses Table with Scoped Drag-and-Drop */}
        <div className="overflow-x-auto pb-1 category-table-scroll" onScroll={handleTableScroll}>
          <DragDropContext onDragEnd={handleCategoryDragEnd}>
            <table className={`w-full table-fixed text-xs border-collapse${isEditMode ? ' is-edit' : ''}`} style={{ minWidth: `calc(var(--label-col-w) + ${years * 2} * var(--yr-col-w) + ${isEditMode ? 72 : 0}px)` }}>
              <colgroup>
                {isEditMode && <col className="w-8 min-w-[32px]" />}
                <col className="w-[var(--label-col-w)] min-w-[var(--label-col-w)]" />
                {Array.from({ length: years }).map((_, y) => (
                  <React.Fragment key={y}>
                    <col />
                    <col />
                  </React.Fragment>
                ))}
                {isEditMode && <col className="w-10 min-w-[40px]" />}
              </colgroup>

              <thead>
                <tr
                  id="expenses-table-desc"
                  className="border-b-2 border-[var(--col-divider)] bg-[var(--panel-alt)] text-[10px] text-[var(--muted2)] uppercase font-semibold select-none"
                >
                  {isEditMode && <th className="w-8"></th>}
                  <th className="py-2 px-3 text-left font-sans-custom tracking-wider">
                    Category / Item
                  </th>
                  {Array.from({ length: years }).map((_, y) => (
                    <React.Fragment key={y}>
                      <th className="py-1.5 pl-2.5 pr-1 text-center border-l-2 border-[var(--col-divider)]">
                        Monthly
                      </th>
                      <th className="py-1.5 pl-1 pr-2.5 text-center text-[var(--muted)]">
                        {totalColLabel}
                      </th>
                    </React.Fragment>
                  ))}
                  {isEditMode && <th className="w-10"></th>}
                </tr>
              </thead>


              {orderedCats.map((cat) => {
                const isCollapsed = !!collapsedCats[cat];
                const catRows = nonRetireRows.filter(r => (r.cat || 'Other') === cat);
                const catMonthlyTotals = Array.from({ length: years }).map((_, y) => {
                  return catRows.reduce((sum, r) => sum + (r.monthly?.[y] ?? 0), 0);
                });

                return (
                  <React.Fragment key={cat}>
                    {/* Category Header Row with Quick-Add (+) Button */}
                    <tbody>
                      <tr
                        onClick={() => onToggleCategoryCollapse(cat)}
                        className="group bg-[var(--panel-alt)] cursor-pointer select-none transition-colors"
                      >
                        {isEditMode && <td className="w-8"></td>}
                        <td className="py-2 px-3">
                          {/* Thread stem — drops from the disclosure arrow into the
                              item rows, so the whole group reads as one branch. */}
                          {!isCollapsed && catRows.length > 0 && (
                            <span
                              aria-hidden="true"
                              className="pointer-events-none absolute left-[17px] w-px bg-[var(--col-divider)]"
                              style={{ top: '50%', bottom: 0 }}
                            />
                          )}
                          <div className="flex items-center gap-2 text-xs font-semibold text-[var(--text)] truncate">
                            {isCollapsed ? (
                              <ChevronRight className="w-3.5 h-3.5 text-[var(--muted2)] flex-shrink-0" />
                            ) : (
                              <ChevronDown className="w-3.5 h-3.5 text-[var(--muted2)] flex-shrink-0" />
                            )}
                            {isEditMode ? (
                              <input
                                type="text"
                                value={cat}
                                onClick={e => e.stopPropagation()}
                                onChange={e => onRenameCategory(cat, e.target.value)}
                                className="bg-[var(--panel)] border border-[var(--border)] px-2 py-0.5 rounded-md text-xs font-semibold text-[var(--text)] focus:outline-none"
                              />
                            ) : (
                              <span className="truncate uppercase tracking-wide text-[11px]">{cat}</span>
                            )}

                            {/* Quick-Add (+) Button inside Category Header */}
                            <button
                              type="button"
                              onClick={e => {
                                e.stopPropagation();
                                onAddExpense(cat);
                              }}
                              className="flex items-center justify-center w-5 h-5 ml-1 rounded text-[var(--muted2)] hover:text-[var(--accent)] hover:bg-[var(--panel)] opacity-0 group-hover:opacity-100 focus:opacity-100 transition cursor-pointer flex-shrink-0"
                              title={`Add item to ${cat}`}
                            >
                              <Plus className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                        {/* Category Subtotals aligned to each Year column */}
                        {Array.from({ length: years }).map((_, y) => {
                          const mTotal = catMonthlyTotals[y] ?? 0;
                          const aTotal = isMonths ? mTotal : mTotal * 12;
                          return (
                            <React.Fragment key={y}>
                              <td className="py-1.5 pl-2.5 pr-1 border-l-2 border-[var(--col-divider)] text-right font-mono text-[11px] font-semibold text-[var(--text)]">
                                {mTotal > 0 ? fmtCompact$(mTotal) : '—'}
                              </td>
                              <td className="py-1.5 pl-1 pr-2.5 text-right font-mono text-[11px] font-semibold text-[var(--muted)]">
                                {aTotal > 0 ? fmtCompact$(aTotal) : '—'}
                              </td>
                            </React.Fragment>
                          );
                        })}
                        {isEditMode && <td className="w-10"></td>}
                      </tr>

                      {/* Underline under the category title — a crisp rule with a
                          soft downward fade, echoing the frozen column's vertical
                          divider. Spans the full table width. The thread stem
                          continues through it so the arrow connects to the items. */}
                      {!isCollapsed && (
                        <tr aria-hidden="true">
                          <td colSpan={fullColSpan} className="cat-rule-cell">
                            {catRows.length > 0 && (
                              <span className="pointer-events-none absolute left-[17px] inset-y-0 w-px bg-[var(--col-divider)]" />
                            )}
                            <div
                              className="h-1.5"
                              style={{
                                background:
                                  'linear-gradient(to bottom, var(--col-divider) 0 2px, rgb(0 0 0 / 0.08) 2px, transparent)',
                              }}
                            />
                          </td>
                        </tr>
                      )}
                    </tbody>

                    {/* Scoped Drag-and-Drop Droppable for this category only */}
                    {!isCollapsed && (
                      <Droppable droppableId={`cat-items-${cat}`}>
                        {dropProvided => (
                          <tbody ref={dropProvided.innerRef} {...dropProvided.droppableProps}>
                            {catRows.length === 0 ? (
                              <tr className="border-b border-[var(--border)]/40">
                                <td
                                  colSpan={fullColSpan}
                                  className="py-3 px-3 text-center text-xs text-[var(--muted2)] italic bg-[var(--panel)]"
                                >
                                  No expense items in {cat}. Click &quot;+&quot; above to add an item.
                                </td>
                              </tr>
                            ) : (
                              catRows.map((row, catRowIdx) => {
                                const ri = col.findIndex(item => item.id === row.id);
                                const draggableId = row.id || `exp-${cat}-${catRowIdx}`;
                                const isLastInCat = catRowIdx === catRows.length - 1;

                                return (
                                  <React.Fragment key={draggableId}>
                                    <Draggable
                                      draggableId={draggableId}
                                      index={catRowIdx}
                                      isDragDisabled={!isEditMode}
                                    >
                                      {dragProvided => (
                                        <tr
                                          ref={dragProvided.innerRef}
                                          {...dragProvided.draggableProps}
                                          className="odd:bg-[var(--panel)] even:bg-[var(--row-alt)] hover:bg-[var(--row-hover)] border-b border-[var(--border)]/40 transition-colors"
                                        >
                                          {isEditMode && (
                                            <td className="py-1.5 px-1 text-center" {...dragProvided.dragHandleProps}>
                                              <GripVertical className="w-4 h-4 text-[var(--muted2)] hover:text-[var(--accent)] cursor-grab active:cursor-grabbing mx-auto" />
                                            </td>
                                          )}

                                          <td className="py-1.5 pl-[29px] pr-2.5">
                                            {/* Thread line — a faint vertical rail down the
                                                left of a category's items. It runs unbroken
                                                from the header arrow (via the title-rule stem)
                                                and rounds off 7px above the last row, so the
                                                whole group reads as one comment-style thread. */}
                                            <span
                                              aria-hidden="true"
                                              className="pointer-events-none absolute left-[17px] w-px bg-[var(--col-divider)]"
                                              style={{
                                                top: 0,
                                                bottom: isLastInCat ? '7px' : 0,
                                              }}
                                            />
                                            <input
                                              type="text"
                                              value={row.name}
                                              onChange={e => onUpdateExpense(ri, 'name', e.target.value)}
                                              placeholder="Expense Item"
                                              className="ledger-text-input text-xs font-semibold text-[var(--text)]"
                                            />
                                          </td>

                                          {Array.from({ length: years }).map((_, y) => {
                                            const mVal = row.monthly?.[y] ?? 0;
                                            const periodCost = isMonths ? mVal : mVal * 12;
                                            const isNonZero = periodCost > 0;
                                            const heatStyle = getHeatStyle(periodCost);

                                            return (
                                              <React.Fragment key={y}>
                                                <td className="py-1.5 pl-2.5 pr-1 border-l-2 border-[var(--col-divider)] text-center">
                                                  <input
                                                    type="number"
                                                    min="0"
                                                    value={mVal === 0 && !row.monthly?.[y] ? '' : Math.round(mVal * 100) / 100}
                                                    onChange={e => onUpdateExpense(ri, 'monthly', num(e.target.value), y)}
                                                    placeholder="0"
                                                    className={`ledger-input text-center text-xs font-mono-custom ${
                                                      mVal === 0 ? 'text-[var(--muted2)] opacity-40' : 'text-[var(--text)]'
                                                    }`}
                                                    title={`Monthly cost for Year ${y + 1}`}
                                                  />
                                                </td>
                                                <td
                                                  style={heatStyle}
                                                  className="py-1.5 pl-1 pr-2.5 text-center font-mono-custom transition-colors"
                                                >
                                                  <input
                                                    type="number"
                                                    min="0"
                                                    value={periodCost === 0 && !row.monthly?.[y] ? '' : Math.round(periodCost)}
                                                    onChange={e => onUpdateExpense(ri, 'monthly', num(e.target.value) / (isMonths ? 1 : 12), y)}
                                                    placeholder="0"
                                                    className={`ledger-input text-center text-xs font-mono-custom ${
                                                      isNonZero
                                                        ? 'text-emerald-700 dark:text-emerald-400 font-medium'
                                                        : 'text-[var(--muted2)] opacity-40'
                                                    }`}
                                                    title={`Annual total for Year ${y + 1} (updates monthly)`}
                                                  />
                                                </td>
                                              </React.Fragment>
                                            );
                                          })}

                                          {isEditMode && (
                                            <td className="py-1.5 px-1.5 text-center whitespace-nowrap">
                                              <button
                                                onClick={() => onRemoveExpense(ri)}
                                                className="p-1 text-[var(--neg)] hover:bg-red-50 dark:hover:bg-red-950/40 rounded"
                                                title="Remove expense"
                                              >
                                                <Trash2 className="w-3.5 h-3.5" />
                                              </button>
                                            </td>
                                          )}
                                        </tr>
                                      )}
                                    </Draggable>
                                  </React.Fragment>
                                );
                              })
                            )}
                            {dropProvided.placeholder}
                          </tbody>
                        )}
                      </Droppable>
                    )}

                    {/* Closing rule — the mirror of the title underline: a faint
                        line with an upward fade that caps the bottom of this
                        category and sits flush against the top of the next, so
                        the group is bounded on both sides. */}
                    <tbody>
                      <tr aria-hidden="true">
                        <td colSpan={fullColSpan} className="cat-rule-cell">
                          <div
                            className="h-1.5"
                            style={{
                              background:
                                'linear-gradient(to top, var(--col-divider) 0 1px, rgb(0 0 0 / 0.05) 1px, transparent)',
                            }}
                          />
                        </td>
                      </tr>
                    </tbody>
                  </React.Fragment>
                );
              })}

              <tfoot>
                <tr className="bg-[var(--panel-alt)] font-bold border-t-2 border-[var(--border)] font-mono-custom">
                  {isEditMode && <td></td>}
                  <td className="py-2.5 px-3 font-sans-custom text-xs text-[var(--text)] font-bold uppercase tracking-wider">
                    Total Living Expenses
                  </td>
                  {Array.from({ length: years }).map((_, y) => {
                    const annualCol = calc.colOnly[y] ?? 0;
                    const displayTotal = isMonths ? annualCol / 12 : annualCol;
                    return (
                      <React.Fragment key={y}>
                        <td className="py-2 pl-2.5 pr-1 text-right text-[var(--muted)] text-xs font-semibold border-l-2 border-[var(--col-divider)]">
                          {fmtCompact$(annualCol / 12)}
                        </td>
                        <td className="py-2 pl-1 pr-2.5 text-right text-xs sm:text-sm text-emerald-700 dark:text-emerald-400 font-bold">
                          {fmtCompact$(displayTotal)}
                        </td>
                      </React.Fragment>
                    );
                  })}
                  {isEditMode && <td></td>}
                </tr>
              </tfoot>
            </table>
          </DragDropContext>
        </div>

        {/* Add Row & Add Category actions */}
        <div className="flex flex-wrap items-center gap-2.5 pt-1">
          <button
            onClick={() => onAddExpense()}
            className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold rounded-lg border border-[var(--accent)] text-[var(--accent)] hover:bg-[var(--accent)] hover:text-white transition cursor-pointer shadow-xs"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Expense Row</span>
          </button>

          <button
            onClick={onAddCategory}
            className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-medium rounded-lg border border-[var(--border)] text-[var(--muted)] hover:text-[var(--accent)] hover:border-[var(--accent)] transition cursor-pointer shadow-xs"
          >
            <FolderPlus className="w-3.5 h-3.5" />
            <span>Add New Category Group</span>
          </button>
        </div>
      </div>
    </details>
  );
};
