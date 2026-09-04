import React, { useState } from 'react';
import { CalculationResult, CustomSavingsFund, ViewMode, fmt$, fmtCompact$, num } from '@/core';
import { ShieldCheck, ArrowUp, ArrowDown, Plus, Trash2, AlertCircle, LineChart } from 'lucide-react';

interface RetirementSectionProps {
  years: number;
  viewMode: ViewMode;
  isEditMode: boolean;
  retireRate: number[];
  employerMatchRate: number[];
  customSavings: Record<string, CustomSavingsFund>;
  calc: CalculationResult;
  onChangeRate: (yearIdx: number, val: number) => void;
  onChangeEmployerMatch: (yearIdx: number, val: number) => void;
  onAddCustomSavings: (name: string, targetAmount?: number) => void;
  onRemoveCustomSavings: (fundId: string) => void;
  onUpdateCustomSavings: (fundId: string, field: 'name' | 'color' | 'enabledInChart' | 'targetAmount' | 'monthly', value: any, yearIdx?: number) => void;
  onMoveSection?: (dir: 'up' | 'down') => void;
  isHighlighted?: boolean;
}

export const RetirementSection: React.FC<RetirementSectionProps> = ({
  years,
  viewMode,
  isEditMode,
  retireRate,
  employerMatchRate,
  customSavings,
  calc,
  onChangeRate,
  onChangeEmployerMatch,
  onAddCustomSavings,
  onRemoveCustomSavings,
  onUpdateCustomSavings,
  onMoveSection,
  isHighlighted,
}) => {
  const isMonths = viewMode === 'months';

  const handleTableScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const headerScroll = document.getElementById('sticky-year-bar-scroll');
    if (headerScroll && headerScroll.scrollLeft !== e.currentTarget.scrollLeft) {
      headerScroll.scrollLeft = e.currentTarget.scrollLeft;
    }
  };
  const [newFundName, setNewFundName] = useState('');
  const [newFundTarget, setNewFundTarget] = useState('');

  const handleAddFund = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFundName.trim()) return;
    onAddCustomSavings(newFundName.trim(), newFundTarget ? parseFloat(newFundTarget) : undefined);
    setNewFundName('');
    setNewFundTarget('');
  };

  const fundIds = Object.keys(customSavings || {});

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
          <ShieldCheck className="w-4 h-4 text-[var(--muted2)]" />
          <span>Retirement & Saving Goals</span>
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
        {/* Retirement Calculation Block */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <h3 className="font-serif-custom text-xs font-semibold text-[var(--muted2)] uppercase tracking-wider">
              Retirement Allocation & Employer Match
            </h3>
            <span className="text-[11px] text-[var(--muted2)]">
              2025 Caps: Roth IRA $7k/yr • 401(k) Employee $23.5k/yr • Combined $70k/yr
            </span>
          </div>

          <div className="sub-card">
          <div className="overflow-x-auto category-table-scroll" onScroll={handleTableScroll}>
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
              <tbody>
                {/* Target Employee Rate Row */}
                <tr className="odd:bg-[var(--panel)] even:bg-[var(--row-alt)] hover:bg-[var(--row-hover)] border-b border-[var(--border)]/40 transition-colors">
                  {isEditMode && <td></td>}
                  <td className="py-2 px-3 font-medium text-[var(--text)]">
                    Employee Target Rate (% of Gross)
                  </td>
                  {Array.from({ length: years }).map((_, y) => {
                    const rate = retireRate[y] ?? 0;
                    const alert = calc.retirementAlerts?.[y];
                    const hasErr = alert?.hasError;

                    return (
                      <td key={y} colSpan={2} className="py-1.5 px-2 text-center border-l-2 border-[var(--col-divider)]">
                        <div className="flex flex-col items-center justify-center gap-0.5">
                          <div className="flex items-center justify-center gap-1">
                            <input
                              type="number"
                              min="0"
                              max="100"
                              step="0.5"
                              value={rate === 0 && !retireRate[y] ? '' : rate}
                              onChange={e => onChangeRate(y, num(e.target.value))}
                              placeholder="0"
                              className={`w-14 text-center bg-[var(--panel)] border text-[var(--text)] rounded-md px-1.5 py-0.5 text-xs font-mono-custom focus:outline-none ${
                                hasErr
                                    ? 'border-rose-500 ring-1 ring-rose-500/50 text-rose-600'
                                    : 'border-[var(--border)]/80 focus:border-[var(--accent)]'
                              }`}
                            />
                            <span className="text-[var(--muted2)] text-[11px]">%</span>
                          </div>
                          {hasErr && (
                            <span className="text-[9px] text-rose-500 font-sans-custom flex items-center justify-center gap-0.5">
                              <AlertCircle className="w-2.5 h-2.5" />
                              <span>Capped at limit</span>
                            </span>
                          )}
                        </div>
                      </td>
                    );
                  })}
                  {isEditMode && <td></td>}
                </tr>

                {/* Employer Match % Row */}
                <tr className="odd:bg-[var(--panel)] even:bg-[var(--row-alt)] hover:bg-[var(--row-hover)] border-b border-[var(--border)]/40 transition-colors">
                  {isEditMode && <td></td>}
                  <td className="py-2 px-3 font-medium text-[var(--text)]">
                    Employer Match (% of Gross)
                  </td>
                  {Array.from({ length: years }).map((_, y) => {
                    const matchRate = employerMatchRate[y] ?? 0;
                    return (
                      <td key={y} colSpan={2} className="py-1.5 px-2 text-center border-l-2 border-[var(--col-divider)]">
                        <div className="flex items-center justify-center gap-1">
                          <input
                            type="number"
                            min="0"
                            max="100"
                            step="0.5"
                            value={matchRate === 0 && !employerMatchRate[y] ? '' : matchRate}
                            onChange={e => onChangeEmployerMatch(y, num(e.target.value))}
                            placeholder="0"
                            className="w-14 text-center bg-[var(--panel)] border border-[var(--border)]/80 text-[var(--text)] rounded-md px-1.5 py-0.5 text-xs font-mono-custom focus:outline-none focus:border-[var(--accent)]"
                          />
                          <span className="text-[var(--muted2)] text-[11px]">%</span>
                        </div>
                      </td>
                    );
                  })}
                  {isEditMode && <td></td>}
                </tr>

                {/* Target Dollar Amount */}
                <tr className="odd:bg-[var(--panel)] even:bg-[var(--row-alt)] hover:bg-[var(--row-hover)] border-b border-[var(--border)]/40 font-mono-custom text-[var(--muted)] transition-colors">
                  {isEditMode && <td></td>}
                  <td className="py-2 px-3 font-sans-custom">
                    Target Dollar Amount ({isMonths ? '$/mo' : '$/yr'})
                  </td>
                  {Array.from({ length: years }).map((_, y) => (
                    <td key={y} colSpan={2} className="py-1.5 px-2 text-center border-l-2 border-[var(--col-divider)]">
                      {fmtCompact$(calc.retireTarget[y] ?? 0)}
                    </td>
                  ))}
                  {isEditMode && <td></td>}
                </tr>

                {/* Roth IRA Allocation */}
                <tr className="odd:bg-[var(--panel)] even:bg-[var(--row-alt)] hover:bg-[var(--row-hover)] border-b border-[var(--border)]/40 font-mono-custom transition-colors">
                  {isEditMode && <td></td>}
                  <td className="py-2 px-3 font-sans-custom font-medium text-[var(--text)]">
                    → Roth IRA (Individual Cap)
                  </td>
                  {Array.from({ length: years }).map((_, y) => (
                    <td key={y} colSpan={2} className="py-1.5 px-2 text-center text-[var(--text)] border-l-2 border-[var(--col-divider)]">
                      {fmtCompact$(calc.rothArr[y] ?? 0)}
                    </td>
                  ))}
                  {isEditMode && <td></td>}
                </tr>

                {/* 401k Employee Allocation */}
                <tr className="odd:bg-[var(--panel)] even:bg-[var(--row-alt)] hover:bg-[var(--row-hover)] border-b border-[var(--border)]/40 font-mono-custom transition-colors">
                  {isEditMode && <td></td>}
                  <td className="py-2 px-3 font-sans-custom font-medium text-[var(--text)]">
                    → 401(k) Employee Deferral
                  </td>
                  {Array.from({ length: years }).map((_, y) => (
                    <td key={y} colSpan={2} className="py-1.5 px-2 text-center text-[var(--text)] border-l-2 border-[var(--col-divider)]">
                      {fmtCompact$(calc.k401Arr[y] ?? 0)}
                    </td>
                  ))}
                  {isEditMode && <td></td>}
                </tr>

                {/* Employer Match Contribution Amount */}
                <tr className="odd:bg-[var(--panel)] even:bg-[var(--row-alt)] hover:bg-[var(--row-hover)] border-b border-[var(--border)]/40 font-mono-custom transition-colors">
                  {isEditMode && <td></td>}
                  <td className="py-2 px-3 font-sans-custom font-medium text-[var(--pos)]">
                    + Employer Match Contribution
                  </td>
                  {Array.from({ length: years }).map((_, y) => (
                    <td key={y} colSpan={2} className="py-1.5 px-2 text-center text-[var(--pos)] border-l-2 border-[var(--col-divider)]">
                      +{fmtCompact$(calc.employerMatchAmount[y] ?? 0)}
                    </td>
                  ))}
                  {isEditMode && <td></td>}
                </tr>

                {/* Total Contributed */}
                <tr className="bg-[var(--panel-alt)] font-bold border-t border-[var(--border)]/60 font-mono-custom">
                  {isEditMode && <td></td>}
                  <td className="py-2 px-3 font-sans-custom text-[var(--text)]">
                    Total Retirement Contributed
                  </td>
                  {Array.from({ length: years }).map((_, y) => (
                    <td key={y} colSpan={2} className="py-2 px-2 text-center text-[var(--text)] font-bold border-l-2 border-[var(--col-divider)]">
                      {fmtCompact$(calc.retireActual[y] ?? 0)}
                    </td>
                  ))}
                  {isEditMode && <td></td>}
                </tr>
              </tbody>
            </table>
          </div>
          </div>
        </div>

        {/* Custom Savings Accounts (Flat Key-Value Map) */}
        <div className="border-t border-[var(--border)]/60 pt-4">
          <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
            <h3 className="font-serif-custom text-xs font-semibold text-[var(--muted2)] uppercase tracking-wider">
              Custom Savings Accounts & Goals
            </h3>
            <span className="text-[11px] text-[var(--muted2)]">
              Flat Key-Value Map • Smart Chart Integrated
            </span>
          </div>

          <div className="sub-card">
          <div className="overflow-x-auto category-table-scroll" onScroll={handleTableScroll}>
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
              <tbody>
                {fundIds.length === 0 ? (
                  <tr>
                    <td colSpan={(isEditMode ? 2 : 1) + (years * 2)} className="py-4 text-center text-xs text-[var(--muted2)] italic">
                      No custom savings goals added. Use the form below to create one (e.g. Emergency Fund, College Fund).
                    </td>
                  </tr>
                ) : (
                  fundIds.map(fundId => {
                    const fund = customSavings[fundId];
                    if (!fund) return null;

                    return (
                      <tr
                        key={fundId}
                        className="odd:bg-[var(--panel)] even:bg-[var(--row-alt)] hover:bg-[var(--row-hover)] border-b border-[var(--border)]/40 transition-colors"
                      >
                        {isEditMode && <td></td>}
                        <td className="py-2 px-3">
                          <div className="flex items-center gap-2">
                            {/* Smart Chart Rule: Checkbox to toggle on main chart */}
                            <label className="flex items-center gap-1.5 cursor-pointer select-none" title="Toggle line on main chart">
                              <input
                                type="checkbox"
                                checked={!!fund.enabledInChart}
                                onChange={e => onUpdateCustomSavings(fundId, 'enabledInChart', e.target.checked)}
                                className="rounded border-[var(--border)] text-[var(--accent)] focus:ring-0 cursor-pointer"
                              />
                              <LineChart className="w-3.5 h-3.5 text-[var(--muted2)]" />
                            </label>

                            <input
                              type="color"
                              value={fund.color || '#3B82F6'}
                              onChange={e => onUpdateCustomSavings(fundId, 'color', e.target.value)}
                              className="w-4 h-4 rounded border border-[var(--border)] cursor-pointer p-0 bg-transparent"
                              title="Fund color on chart"
                            />

                            <input
                              type="text"
                              value={fund.name}
                              onChange={e => onUpdateCustomSavings(fundId, 'name', e.target.value)}
                              placeholder="Account Name"
                              className="w-full bg-[var(--panel)] border border-[var(--border)]/80 text-[var(--text)] rounded-md px-2 py-0.5 text-xs font-sans-custom focus:outline-none focus:border-[var(--accent)]"
                            />
                          </div>
                        </td>

                        {Array.from({ length: years }).map((_, y) => {
                          const mVal = fund.monthly?.[y] ?? 0;
                          return (
                            <td key={y} colSpan={2} className="py-1.5 px-2 text-center border-l-2 border-[var(--col-divider)]">
                              <div className="flex flex-col items-center justify-center">
                                <input
                                  type="number"
                                  min="0"
                                  value={mVal === 0 && !fund.monthly?.[y] ? '' : mVal}
                                  onChange={e => onUpdateCustomSavings(fundId, 'monthly', num(e.target.value), y)}
                                  placeholder="$0/mo"
                                  className="w-20 text-center bg-[var(--panel)] border border-[var(--border)]/80 text-[var(--text)] rounded-md px-1.5 py-0.5 text-xs font-mono-custom focus:outline-none focus:border-[var(--accent)]"
                                  title="Monthly allocation"
                                />
                                {viewMode === 'years' && (
                                  <span className="text-[10px] text-[var(--muted2)] font-mono-custom mt-0.5 text-center">
                                    {fmt$(mVal * 12)}/yr
                                  </span>
                                )}
                              </div>
                            </td>
                          );
                        })}

                        {isEditMode && (
                          <td className="py-1.5 px-2 text-center whitespace-nowrap">
                            <button
                              onClick={() => onRemoveCustomSavings(fundId)}
                              className="p-1 text-[var(--neg)] hover:bg-red-50 dark:hover:bg-red-950/40 rounded"
                              title="Delete goal"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </td>
                        )}
                      </tr>
                    );
                  })
                )}
              </tbody>
              <tfoot>
                <tr className="bg-[var(--panel-alt)] font-bold border-t border-[var(--border)]/60 font-mono-custom">
                  {isEditMode && <td></td>}
                  <td className="py-2 px-3 font-sans-custom text-[var(--text)]">Total Custom Savings</td>
                  {Array.from({ length: years }).map((_, y) => (
                    <td key={y} colSpan={2} className="py-2 px-2 text-center text-[var(--accent)] font-bold border-l-2 border-[var(--col-divider)]">
                      {fmtCompact$(calc.customSavingsTotal[y] ?? 0)}
                    </td>
                  ))}
                  {isEditMode && <td></td>}
                </tr>
              </tfoot>
            </table>
          </div>
          </div>

          {/* Add Custom Goal Form */}
          <form onSubmit={handleAddFund} className="flex flex-wrap items-center gap-2 mt-3 pt-2">
            <input
              type="text"
              value={newFundName}
              onChange={e => setNewFundName(e.target.value)}
              placeholder="e.g. Emergency Fund, Down Payment"
              className="bg-[var(--panel)] border border-[var(--border)] text-[var(--text)] text-xs rounded-lg px-3 py-1.5 focus:outline-none focus:border-[var(--accent)] shadow-xs w-64"
            />
            <input
              type="number"
              min="0"
              value={newFundTarget}
              onChange={e => setNewFundTarget(e.target.value)}
              placeholder="Target Goal ($ optional)"
              className="bg-[var(--panel)] border border-[var(--border)] text-[var(--text)] text-xs rounded-lg px-3 py-1.5 focus:outline-none focus:border-[var(--accent)] shadow-xs w-40"
            />
            <button
              type="submit"
              className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold rounded-lg border border-[var(--accent)] text-[var(--accent)] hover:bg-[var(--accent)] hover:text-white transition cursor-pointer shadow-xs"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Create Savings Goal</span>
            </button>
          </form>
        </div>
      </div>
    </details>
  );
};
