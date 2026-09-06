import React from 'react';
import { WorkerItem, IncomeItem, ViewMode, IncomeFrequency, PayoutFrequency, fmtCompact$, num, getAnnualIncome, toPeriodValue } from '@/core';
import { TrendingUp, Plus, Trash2, ArrowUp, ArrowDown, Eye, EyeOff, GripVertical, ChevronDown, ChevronRight } from 'lucide-react';
import { YearColgroup, ledgerTableClass, tableMinWidth, syncScrollToYearBar } from './ledger-table';
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';

interface IncomeSectionProps {
  years: number;
  viewMode: ViewMode;
  isEditMode: boolean;
  workers: WorkerItem[];
  other: IncomeItem[];
  showOtherIncome: boolean;
  onUpdateWorker: (idx: number, field: 'name' | 'frequency' | 'hours' | 'wage', value: string | number, yearIdx?: number) => void;
  onAddWorker: () => void;
  onRemoveWorker: (idx: number) => void;
  onReorderWorkers: (startIndex: number, endIndex: number) => void;
  onUpdateOther: (idx: number, field: 'name' | 'frequency' | 'amount', value: string | number, yearIdx?: number) => void;
  onAddOther: () => void;
  onRemoveOther: (idx: number) => void;
  onReorderOther: (startIndex: number, endIndex: number) => void;
  onToggleOtherIncome: (show: boolean) => void;
  onMoveSection?: (dir: 'up' | 'down') => void;
  isHighlighted?: boolean;
}

export const IncomeSection: React.FC<IncomeSectionProps> = ({
  years,
  viewMode,
  isEditMode,
  workers,
  other,
  showOtherIncome,
  onUpdateWorker,
  onAddWorker,
  onRemoveWorker,
  onReorderWorkers,
  onUpdateOther,
  onAddOther,
  onRemoveOther,
  onReorderOther,
  onToggleOtherIncome,
  onMoveSection,
  isHighlighted,
}) => {
  const isMonths = viewMode === 'months';
  const grossLabel = isMonths ? 'Gross Monthly' : 'Gross Annual';


  const [isOtherCollapsed, setIsOtherCollapsed] = React.useState(false);

  const handleWorkerDragEnd = (result: DropResult) => {
    if (!result.destination) return;
    onReorderWorkers(result.source.index, result.destination.index);
  };

  const handleOtherDragEnd = (result: DropResult) => {
    if (!result.destination) return;
    onReorderOther(result.source.index, result.destination.index);
  };

  return (
    <details
      open
      className={`bg-[var(--panel)] border-[1.5px] rounded-xl p-4 sm:p-5 mb-4 transition-all duration-300 ${
        isHighlighted
          ? 'section-glow-active'
          : 'border-[var(--card-line)] shadow'
      }`}
    >
      <summary className="cursor-pointer list-none flex items-center justify-between font-serif-custom text-base font-semibold text-[var(--text)] select-none">
        <div className="flex items-center gap-2">
          <span className="text-xs transition-transform duration-150 inline-block text-[var(--muted2)]">▼</span>
          <TrendingUp className="w-4 h-4 text-[var(--muted2)]" />
          <span>Income</span>
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

      <div className="mt-4 space-y-6">
        {/* Wages / Income Earners Table */}
        <div>
          <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
            <div className="flex items-center gap-3">
              <h3 className="font-serif-custom text-xs font-semibold text-[var(--muted2)] uppercase tracking-wider">
                Income Earners (Wages & Salary)
              </h3>
            </div>
          </div>

          <div className="sub-card">
          <div className="overflow-x-auto category-table-scroll" onScroll={syncScrollToYearBar}>
            <DragDropContext onDragEnd={handleWorkerDragEnd}>
              <table className={ledgerTableClass(isEditMode)} style={{ minWidth: tableMinWidth(years, isEditMode) }}>
                <YearColgroup years={years} isEditMode={isEditMode} />

                <thead>
                  <tr
                    id="income-table-desc"
                    className="border-b-2 border-[var(--col-divider)] bg-[var(--panel-alt)] text-[10px] text-[var(--muted2)] uppercase font-semibold select-none"
                  >
                    {isEditMode && <th className="w-8"></th>}
                    <th className="py-2 px-3 text-left font-sans-custom tracking-wider">
                      Income Earner & Pay Frequency
                    </th>
                    {Array.from({ length: years }).map((_, y) => (
                      <React.Fragment key={y}>
                        <th className="py-1.5 pl-2.5 pr-1 text-center border-l-2 border-[var(--col-divider)]">
                          Rate / Wage
                        </th>
                        <th className="py-1.5 pl-1 pr-2.5 text-center text-[var(--muted)]">
                          {grossLabel}
                        </th>
                      </React.Fragment>
                    ))}
                    {isEditMode && <th className="w-10"></th>}
                  </tr>
                </thead>

                <Droppable droppableId="workers-table-body">
                  {provided => (
                    <tbody ref={provided.innerRef} {...provided.droppableProps}>
                      {workers.length === 0 ? (
                        <tr>
                          <td colSpan={2 + years * 2 + (isEditMode ? 1 : 0)} className="py-5 text-center text-xs text-[var(--muted2)] italic">
                            No income earners added. Click &quot;+ Add Income Earner&quot; below to add wages.
                          </td>
                        </tr>
                      ) : (
                        workers.map((w, wi) => {
                          const freq: IncomeFrequency = w.frequency || 'Hourly';
                          const isHourly = freq === 'Hourly';

                          return (
                            <React.Fragment key={w.id || `w-${wi}`}>
                              <Draggable draggableId={w.id || `w-${wi}`} index={wi} isDragDisabled={!isEditMode}>
                                {dragProvided => (
                                  <tr
                                    ref={dragProvided.innerRef}
                                    {...dragProvided.draggableProps}
                                    className="odd:bg-[var(--panel)] even:bg-[var(--row-alt)] hover:bg-[var(--row-hover)] border-b border-[var(--border)]/50 transition-colors"
                                  >
                                  {isEditMode && (
                                    <td className="py-2 px-1 text-center" {...dragProvided.dragHandleProps}>
                                      <GripVertical className="w-4 h-4 text-[var(--muted2)] hover:text-[var(--accent)] cursor-grab active:cursor-grabbing mx-auto" />
                                    </td>
                                  )}

                                  <td className="py-2 px-3">
                                    <div className="space-y-1.5">
                                      <input
                                        type="text"
                                        value={w.name}
                                        onChange={e => onUpdateWorker(wi, 'name', e.target.value)}
                                        placeholder="Income Earner Name"
                                        className="ledger-text-input text-xs font-semibold text-[var(--text)]"
                                      />
                                      <div>
                                        <div className="text-[9px] uppercase tracking-wider text-[var(--muted2)] font-semibold select-none mb-0.5">
                                          Income Frequency
                                        </div>
                                        <div className="flex items-center gap-2">
                                          <select
                                            value={w.frequency || ''}
                                            onChange={e => onUpdateWorker(wi, 'frequency', e.target.value as IncomeFrequency)}
                                            className="bg-[var(--panel-alt)] border border-[var(--border)] text-[var(--text)] text-[11px] rounded-md px-2 py-0.5 focus:outline-none cursor-pointer font-sans-custom"
                                            title="Income payment frequency"
                                          >
                                            <option value="" disabled>Income Frequency</option>
                                            <option value="Hourly">Hourly</option>
                                            <option value="Daily">Daily</option>
                                            <option value="Weekly">Weekly</option>
                                            <option value="Biweekly">Bi-weekly (every 2 wks)</option>
                                            <option value="Bi-Monthly">Semi-monthly (2x/mo)</option>
                                            <option value="Monthly">Monthly</option>
                                            <option value="Annually">Annually</option>
                                          </select>
                                        </div>
                                      </div>
                                    </div>
                                  </td>

                                  {Array.from({ length: years }).map((_, y) => {
                                    const rawWage = w.wage?.[y] ?? 0;
                                    const hrs = w.hours?.[y] ?? 40;
                                    const annualIncome = getAnnualIncome(freq, rawWage, hrs);
                                    const periodDisplay = toPeriodValue(annualIncome, viewMode);
                                    const isNonZero = periodDisplay > 0;

                                    return (
                                      <React.Fragment key={y}>
                                        <td className="py-1.5 px-1 border-l-2 border-[var(--col-divider)] text-center">
                                          {isHourly ? (
                                            <div className="flex flex-col items-stretch gap-0.5 mx-auto max-w-full bg-[var(--panel-alt)] border border-[var(--border)]/70 rounded px-1 py-0.5 font-mono-custom focus-within:border-[var(--accent)] focus-within:ring-1 focus-within:ring-[var(--accent)]/30 transition-colors">
                                              <div className="flex items-center justify-center">
                                                <span className="text-[10px] text-[var(--muted2)] select-none">$</span>
                                                <input
                                                  type="number"
                                                  min="0"
                                                  step="0.5"
                                                  value={rawWage === 0 && !w.wage?.[y] ? '' : rawWage}
                                                  onChange={e => onUpdateWorker(wi, 'wage', num(e.target.value), y)}
                                                  placeholder="0"
                                                  className={`w-full min-w-0 text-center bg-transparent text-[11px] font-mono-custom focus:outline-none ${
                                                    rawWage === 0 ? 'text-[var(--muted2)] opacity-40' : 'text-[var(--text)]'
                                                  }`}
                                                  title={`Hourly wage ($/hr) for Year ${y + 1}`}
                                                />
                                              </div>
                                              <div className="flex items-center justify-center border-t border-[var(--border)]/60">
                                                <span className="text-[9px] text-[var(--muted2)] select-none mr-0.5">×</span>
                                                <input
                                                  type="number"
                                                  min="0"
                                                  max="168"
                                                  value={hrs}
                                                  onChange={e => onUpdateWorker(wi, 'hours', num(e.target.value), y)}
                                                  className="w-full min-w-0 text-center bg-transparent text-[10px] font-mono-custom text-[var(--muted)] focus:outline-none"
                                                  title={`Hours per week for Year ${y + 1}`}
                                                />
                                                <span className="text-[9px] text-[var(--muted2)] select-none">h</span>
                                              </div>
                                            </div>
                                          ) : (
                                            <div className="relative flex items-center justify-center max-w-full mx-auto bg-[var(--panel-alt)] border border-[var(--border)]/70 rounded px-1 py-0.5 focus-within:border-[var(--accent)] focus-within:ring-1 focus-within:ring-[var(--accent)]/30 transition-colors">
                                              <span className="text-[10px] text-[var(--muted2)] select-none">$</span>
                                              <input
                                                type="number"
                                                min="0"
                                                value={rawWage === 0 && !w.wage?.[y] ? '' : rawWage}
                                                onChange={e => onUpdateWorker(wi, 'wage', num(e.target.value), y)}
                                                placeholder="0"
                                                className={`w-full min-w-0 text-center bg-transparent text-xs font-mono-custom focus:outline-none ${
                                                  rawWage === 0 ? 'text-[var(--muted2)] opacity-40' : 'text-[var(--text)]'
                                                }`}
                                                title={`Raw rate per ${freq.toLowerCase()}`}
                                              />
                                            </div>
                                          )}
                                        </td>
                                        <td className="py-1.5 px-1 text-center font-mono-custom">
                                          <span className={`total-cell-text ${isNonZero ? 'active-total' : 'zero-total'} text-xs font-semibold`}>
                                            {fmtCompact$(periodDisplay)}
                                          </span>
                                        </td>
                                      </React.Fragment>
                                    );
                                  })}

                                  {isEditMode && (
                                    <td className="py-2 px-2 text-center whitespace-nowrap">
                                      <button
                                        onClick={() => onRemoveWorker(wi)}
                                        className="p-1 text-[var(--neg)] hover:bg-red-50 dark:hover:bg-red-950/40 rounded"
                                        title="Remove Earner"
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
                      {provided.placeholder}
                    </tbody>
                  )}
                </Droppable>
              </table>
            </DragDropContext>
          </div>
          </div>

          <button
            onClick={onAddWorker}
            className="mt-3 flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold rounded-lg border border-[var(--accent)] text-[var(--accent)] hover:bg-[var(--accent)] hover:text-white transition cursor-pointer shadow-xs"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Income Earner</span>
          </button>
        </div>

        {/* Other Income Section */}
        <div id="sec-other-income" className="border-t border-[var(--border)]/60 pt-4">
          <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
            <button
              type="button"
              onClick={() => setIsOtherCollapsed(!isOtherCollapsed)}
              className="flex items-center gap-2 cursor-pointer select-none group bg-transparent border-0 p-0 text-left"
              title={isOtherCollapsed ? 'Expand Other Income' : 'Collapse Other Income'}
            >
              <span className="text-[var(--muted2)] group-hover:text-[var(--text)] transition-colors inline-flex">
                {isOtherCollapsed ? <ChevronRight className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
              </span>
              <h3 className="font-serif-custom text-xs font-semibold text-[var(--muted2)] uppercase tracking-wider group-hover:text-[var(--text)] transition-colors">
                Other Income
              </h3>
              {!showOtherIncome && (
                <span className="text-[10px] text-[var(--muted2)] italic">(Hidden)</span>
              )}
            </button>

            <div className="flex items-center gap-3 ml-auto">
              {isEditMode && (
                <button
                  onClick={() => onToggleOtherIncome(!showOtherIncome)}
                  className="flex items-center gap-1 text-xs text-[var(--muted)] hover:text-[var(--accent)] cursor-pointer"
                >
                  {showOtherIncome ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  <span>{showOtherIncome ? 'Hide' : 'Show'}</span>
                </button>
              )}
            </div>
          </div>

          {!showOtherIncome ? (
            <div className="py-2">
              <button
                onClick={() => onToggleOtherIncome(true)}
                className="text-xs text-[var(--accent)] underline cursor-pointer"
              >
                + Restore & show Other Income section
              </button>
            </div>
          ) : !isOtherCollapsed ? (
            <div>
              <div className="sub-card">
              <div className="overflow-x-auto category-table-scroll" onScroll={syncScrollToYearBar}>
                <DragDropContext onDragEnd={handleOtherDragEnd}>
                  <table className={ledgerTableClass(isEditMode)} style={{ minWidth: tableMinWidth(years, isEditMode) }}>
                    <YearColgroup years={years} isEditMode={isEditMode} />

                    <thead>
                      <tr
                        id="other-income-table-desc"
                        className="border-b-2 border-[var(--col-divider)] bg-[var(--panel-alt)] text-[10px] text-[var(--muted2)] uppercase font-semibold select-none"
                      >
                        {isEditMode && <th className="w-8"></th>}
                        <th className="py-2 px-3 text-left font-sans-custom tracking-wider">
                          Income Source & Payout Frequency
                        </th>
                        {Array.from({ length: years }).map((_, y) => (
                          <React.Fragment key={y}>
                            <th className="py-1.5 pl-2.5 pr-1 text-center border-l-2 border-[var(--col-divider)]">
                              Amount / Period
                            </th>
                            <th className="py-1.5 pl-1 pr-2.5 text-center text-[var(--muted)]">
                              {grossLabel}
                            </th>
                          </React.Fragment>
                        ))}
                        {isEditMode && <th className="w-10"></th>}
                      </tr>
                    </thead>

                    <Droppable droppableId="other-table-body">
                      {provided => (
                        <tbody ref={provided.innerRef} {...provided.droppableProps}>
                          {other.length === 0 ? (
                            <tr>
                              <td colSpan={2 + years * 2 + (isEditMode ? 1 : 0)} className="py-4 text-center text-xs text-[var(--muted2)] italic">
                                No other income sources added.
                              </td>
                            </tr>
                          ) : (
                            other.map((item, ri) => {
                              const freq: PayoutFrequency = item.frequency || 'Monthly';

                              return (
                                <React.Fragment key={item.id || `o-${ri}`}>
                                  <Draggable draggableId={item.id || `o-${ri}`} index={ri} isDragDisabled={!isEditMode}>
                                    {dragProvided => (
                                      <tr
                                        ref={dragProvided.innerRef}
                                        {...dragProvided.draggableProps}
                                        className="odd:bg-[var(--panel)] even:bg-[var(--row-alt)] hover:bg-[var(--row-hover)] border-b border-[var(--border)]/50 transition-colors"
                                      >
                                        {isEditMode && (
                                          <td className="py-2 px-1 text-center" {...dragProvided.dragHandleProps}>
                                            <GripVertical className="w-4 h-4 text-[var(--muted2)] hover:text-[var(--accent)] cursor-grab active:cursor-grabbing mx-auto" />
                                          </td>
                                        )}

                                        <td className="py-2 px-2.5">
                                          <div className="space-y-1.5">
                                            <input
                                              type="text"
                                              value={item.name}
                                              onChange={e => onUpdateOther(ri, 'name', e.target.value)}
                                              placeholder="e.g. Side Hustle, Dividends"
                                              className="ledger-text-input text-xs font-semibold text-[var(--text)]"
                                            />
                                            <div className="flex items-center gap-2">
                                              <select
                                                value={freq}
                                                onChange={e => onUpdateOther(ri, 'frequency', e.target.value as PayoutFrequency)}
                                                className="bg-[var(--panel-alt)] border border-[var(--border)] text-[var(--text)] text-[11px] rounded-md px-2 py-0.5 focus:outline-none cursor-pointer font-sans-custom"
                                                title="Payout frequency"
                                              >
                                                <option value="Daily">Daily ($/day)</option>
                                                <option value="Weekly">Weekly ($/wk)</option>
                                                <option value="Biweekly">Biweekly ($/2wk)</option>
                                                <option value="Monthly">Monthly ($/mo)</option>
                                                <option value="Annually">Annually ($/yr)</option>
                                              </select>
                                            </div>
                                          </div>
                                        </td>

                                        {Array.from({ length: years }).map((_, y) => {
                                          const rawAmt = item.amount?.[y] ?? 0;
                                          const annualIncome = getAnnualIncome(freq, rawAmt);
                                          const periodDisplay = toPeriodValue(annualIncome, viewMode);
                                          const isNonZero = periodDisplay > 0;

                                          return (
                                            <React.Fragment key={y}>
                                              <td className="py-1.5 pl-2.5 pr-1 border-l-2 border-[var(--col-divider)] text-center">
                                                <div className="relative flex items-center justify-center mx-auto bg-[var(--panel-alt)] border border-[var(--border)]/70 rounded px-1 py-0.5 focus-within:border-[var(--accent)] focus-within:ring-1 focus-within:ring-[var(--accent)]/30 transition-colors">
                                              <span className="text-[10px] text-[var(--muted2)] select-none">$</span>
                                                  <input
                                                    type="number"
                                                    min="0"
                                                    value={rawAmt === 0 && !item.amount?.[y] ? '' : rawAmt}
                                                    onChange={e => onUpdateOther(ri, 'amount', num(e.target.value), y)}
                                                    placeholder="0"
                                                    className={`w-full min-w-0 text-center bg-transparent text-[11px] font-mono-custom focus:outline-none ${
                                                      rawAmt === 0 ? 'text-[var(--muted2)] opacity-40' : 'text-[var(--text)]'
                                                    }`}
                                                    title={`Raw payout per ${freq.toLowerCase()}`}
                                                  />
                                                </div>
                                              </td>
                                              <td className="py-1.5 pl-1 pr-2.5 text-center font-mono-custom">
                                                <span className={`total-cell-text ${isNonZero ? 'active-total' : 'zero-total'} text-xs font-semibold`}>
                                                  {fmtCompact$(periodDisplay)}
                                                </span>
                                              </td>
                                            </React.Fragment>
                                          );
                                        })}

                                        {isEditMode && (
                                          <td className="py-2 px-2 text-center whitespace-nowrap">
                                            <button
                                              onClick={() => onRemoveOther(ri)}
                                              className="p-1 text-[var(--neg)] hover:bg-red-50 dark:hover:bg-red-950/40 rounded"
                                              title="Remove Other Income"
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
                          {provided.placeholder}
                        </tbody>
                      )}
                    </Droppable>
                      </table>
                    </DragDropContext>
                  </div>
                  </div>

                  <button
                    onClick={onAddOther}
                    className="mt-3 flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold rounded-lg border border-[var(--accent)] text-[var(--accent)] hover:bg-[var(--accent)] hover:text-white transition cursor-pointer shadow-xs"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add Other Income</span>
                  </button>
                </div>
              ) : null}
            </div>
          </div>
        </details>
      );
    };
