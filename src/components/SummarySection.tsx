import React from 'react';
import { CalculationResult, PlannerState } from '../types';
import { fmt$, fmtPct } from '../utils/taxAndCalculations';
import { GraphDashboard } from './GraphDashboard';
import { LayoutDashboard, ArrowUp, ArrowDown } from 'lucide-react';

interface SummarySectionProps {
  state: PlannerState;
  calc: CalculationResult;
  onChangeGraphType: (type: 'area' | 'grouped') => void;
  onToggleSeries: (key: string, val: boolean) => void;
  onChangeColor: (key: string, color: string) => void;
  onMoveSection?: (dir: 'up' | 'down') => void;
  isHighlighted?: boolean;
}

export const SummarySection: React.FC<SummarySectionProps> = ({
  state,
  calc,
  onChangeGraphType,
  onToggleSeries,
  onChangeColor,
  onMoveSection,
  isHighlighted,
}) => {
  const years = state.years || 1;
  const isMonths = state.viewMode === 'months';
  const periodLabel = isMonths ? 'Month' : 'Year';
  const kpiPeriodName = isMonths ? `${years}-Month` : `${years}-Year`;

  const totalSavings = calc.savingsOT[years - 1] ?? 0;
  const totalRetire = calc.retireOT[years - 1] ?? 0;
  const totalGross = calc.g.reduce((a, b) => a + b, 0);
  const totalTax =
    calc.fed.reduce((a, b) => a + b, 0) +
    calc.stTax.reduce((a, b) => a + b, 0) +
    calc.fica.reduce((a, b) => a + b, 0);

  const effectiveTaxPct = totalGross > 0 ? (totalTax / totalGross) * 100 : 0;

  // Keep this table's horizontal scroll in lockstep with the sticky year bar
  // (and, through it, every other section table).
  const handleTableScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const headerScroll = document.getElementById('sticky-year-bar-scroll');
    if (headerScroll && headerScroll.scrollLeft !== e.currentTarget.scrollLeft) {
      headerScroll.scrollLeft = e.currentTarget.scrollLeft;
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
          <LayoutDashboard className="w-4 h-4 text-[var(--muted2)]" />
          <span>Summary & Projections</span>
        </div>
        {state.isEditMode && onMoveSection && (
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
        {/* Dynamic Metric Cards with Column Counts */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
          <div className="text-center bg-[var(--panel-alt)] border border-[var(--border)]/70 rounded-xl p-4 shadow-xs transition-colors">
            <div className="text-[10px] font-semibold uppercase tracking-wider text-[var(--muted2)]">
              {kpiPeriodName} Net Savings
            </div>
            <div
              className={`text-2xl sm:text-3xl font-extrabold font-mono-custom tracking-tight mt-1.5 ${
                totalSavings < 0 ? 'text-[var(--neg)]' : 'text-[var(--text)]'
              }`}
            >
              {fmt$(totalSavings)}
            </div>
          </div>

          <div className="text-center bg-[var(--panel-alt)] border border-[var(--border)]/70 rounded-xl p-4 shadow-xs transition-colors">
            <div className="text-[10px] font-semibold uppercase tracking-wider text-[var(--muted2)]">
              {kpiPeriodName} Retirement
            </div>
            <div className="text-2xl sm:text-3xl font-extrabold font-mono-custom tracking-tight mt-1.5 text-[var(--text)]">
              {fmt$(totalRetire)}
            </div>
          </div>

          <div className="text-center bg-[var(--panel-alt)] border border-[var(--border)]/70 rounded-xl p-4 shadow-xs transition-colors">
            <div className="text-[10px] font-semibold uppercase tracking-wider text-[var(--muted2)]">
              Avg. Effective Tax Rate
            </div>
            <div className="text-2xl sm:text-3xl font-extrabold font-mono-custom tracking-tight mt-1.5 text-[var(--text)]">
              {fmtPct(effectiveTaxPct)}
            </div>
          </div>
        </div>

        {/* Aligned Projection Matrix Table */}
        <div className="overflow-x-auto pb-1 category-table-scroll" onScroll={handleTableScroll}>
          <table className="table-fixed text-xs border-collapse min-w-[480px]" style={{ width: `calc(var(--label-col-w) + ${years * 2} * var(--yr-col-w) + ${state.isEditMode ? 72 : 0}px)` }}>
            <colgroup>
              {state.isEditMode && <col className="w-8 min-w-[32px]" />}
              {/* Left Overview & Metrics Column */}
              <col className="w-[var(--label-col-w)] min-w-[var(--label-col-w)]" />
              {/* Year Columns matching sticky header */}
              {Array.from({ length: years }).map((_, y) => (
                <React.Fragment key={y}>
                  <col className="w-[var(--yr-col-w)] min-w-[var(--yr-col-w)]" />
                  <col className="w-[var(--yr-col-w)] min-w-[var(--yr-col-w)]" />
                </React.Fragment>
              ))}
              {state.isEditMode && <col className="w-10 min-w-[40px]" />}
            </colgroup>
            <thead>
              <tr className="bg-[var(--panel-alt)] text-[var(--muted)] font-semibold border-b border-[var(--border)]/70 font-sans-custom uppercase text-[10px] tracking-wider">
                {state.isEditMode && <th className="w-8 min-w-[32px]"></th>}
                <th className="py-2.5 px-3 text-left">Overview Metric</th>
                {Array.from({ length: years }).map((_, y) => {
                  const startYearNum = state.startYear || 2025;
                  const displayYear = isMonths ? `Mo ${y + 1}` : `${startYearNum + y}`;
                  return (
                    <th
                      key={y}
                      colSpan={2}
                      className="py-2.5 px-2 text-center border-l-2 border-[var(--col-divider)] font-mono-custom text-xs font-bold text-[var(--text)]"
                    >
                      {displayYear}
                    </th>
                  );
                })}
                {state.isEditMode && <th className="w-10 min-w-[40px]"></th>}
              </tr>
            </thead>
            <tbody>
              {/* 1. Gross Income */}
              <tr className="odd:bg-[var(--panel)] even:bg-[var(--panel-alt)]/40 hover:bg-[var(--panel-alt)]/80 border-b border-[var(--border)]/40 font-mono-custom transition-colors">
                {state.isEditMode && <td></td>}
                <td className="py-2 px-3 text-left">
                  <div className="font-semibold text-xs text-[var(--text)] font-sans-custom">
                    Gross Income
                  </div>
                  <div className="text-[10px] font-mono-custom text-[var(--muted2)] mt-0.5">
                    {kpiPeriodName} Total: <span className="font-semibold text-[var(--text)]">{fmt$(totalGross)}</span>
                  </div>
                </td>
                {Array.from({ length: years }).map((_, y) => (
                  <td
                    key={y}
                    colSpan={2}
                    className="py-2 px-2 text-center border-l-2 border-[var(--col-divider)] font-mono-custom text-xs text-[var(--text)]"
                  >
                    {fmt$(calc.g[y] ?? 0)}
                  </td>
                ))}
                {state.isEditMode && <td></td>}
              </tr>

              {/* 2. Taxes */}
              <tr className="odd:bg-[var(--panel)] even:bg-[var(--panel-alt)]/40 hover:bg-[var(--panel-alt)]/80 border-b border-[var(--border)]/40 font-mono-custom transition-colors">
                {state.isEditMode && <td></td>}
                <td className="py-2 px-3 text-left">
                  <div className="font-semibold text-xs text-[var(--text)] font-sans-custom">
                    Total Taxes (Fed + State + FICA)
                  </div>
                  <div className="text-[10px] font-mono-custom text-[var(--muted2)] mt-0.5">
                    {kpiPeriodName} Total: <span className="font-semibold text-[var(--neg)]">-{fmt$(totalTax)}</span>{' '}
                    <span className="text-[9px]">({fmtPct(effectiveTaxPct)} eff.)</span>
                  </div>
                </td>
                {Array.from({ length: years }).map((_, y) => {
                  const yrTax = (calc.fed[y] ?? 0) + (calc.stTax[y] ?? 0) + (calc.fica[y] ?? 0);
                  return (
                    <td
                      key={y}
                      colSpan={2}
                      className="py-2 px-2 text-center border-l-2 border-[var(--col-divider)] font-mono-custom text-xs text-[var(--neg)]"
                    >
                      -{fmt$(yrTax)}
                    </td>
                  );
                })}
                {state.isEditMode && <td></td>}
              </tr>

              {/* 3. Net Take-Home */}
              <tr className="odd:bg-[var(--panel)] even:bg-[var(--panel-alt)]/40 hover:bg-[var(--panel-alt)]/80 border-b border-[var(--border)]/40 font-mono-custom transition-colors">
                {state.isEditMode && <td></td>}
                <td className="py-2 px-3 text-left">
                  <div className="font-semibold text-xs text-[var(--text)] font-sans-custom">
                    Net Take-Home Pay
                  </div>
                  <div className="text-[10px] font-mono-custom text-[var(--muted2)] mt-0.5">
                    {kpiPeriodName} Total: <span className="font-semibold text-[var(--text)]">{fmt$(calc.net.reduce((a, b) => a + b, 0))}</span>
                  </div>
                </td>
                {Array.from({ length: years }).map((_, y) => (
                  <td
                    key={y}
                    colSpan={2}
                    className="py-2 px-2 text-center border-l-2 border-[var(--col-divider)] font-mono-custom text-xs font-semibold text-[var(--text)]"
                  >
                    {fmt$(calc.net[y] ?? 0)}
                  </td>
                ))}
                {state.isEditMode && <td></td>}
              </tr>

              {/* 4. Living Expenses */}
              <tr className="odd:bg-[var(--panel)] even:bg-[var(--panel-alt)]/40 hover:bg-[var(--panel-alt)]/80 border-b border-[var(--border)]/40 font-mono-custom transition-colors">
                {state.isEditMode && <td></td>}
                <td className="py-2 px-3 text-left">
                  <div className="font-semibold text-xs text-[var(--text)] font-sans-custom">
                    Living Expenses
                  </div>
                  <div className="text-[10px] font-mono-custom text-[var(--muted2)] mt-0.5">
                    {kpiPeriodName} Total: <span className="font-semibold text-[var(--neg)]">-{fmt$(calc.colOnly.reduce((a, b) => a + b, 0))}</span>
                  </div>
                </td>
                {Array.from({ length: years }).map((_, y) => (
                  <td
                    key={y}
                    colSpan={2}
                    className="py-2 px-2 text-center border-l-2 border-[var(--col-divider)] font-mono-custom text-xs text-[var(--neg)]"
                  >
                    -{fmt$(calc.colOnly[y] ?? 0)}
                  </td>
                ))}
                {state.isEditMode && <td></td>}
              </tr>

              {/* 5. Net Savings (Per Period) */}
              <tr className="odd:bg-[var(--panel)] even:bg-[var(--panel-alt)]/40 hover:bg-[var(--panel-alt)]/80 border-b border-[var(--border)]/40 font-mono-custom transition-colors">
                {state.isEditMode && <td></td>}
                <td className="py-2 px-3 text-left">
                  <div className="font-semibold text-xs text-[var(--text)] font-sans-custom">
                    Net Savings ({periodLabel})
                  </div>
                  <div className="text-[10px] font-mono-custom text-[var(--muted2)] mt-0.5">
                    {kpiPeriodName} Net: <span className={`font-semibold ${totalSavings >= 0 ? 'text-[var(--pos)]' : 'text-[var(--neg)]'}`}>{fmt$(totalSavings)}</span>
                  </div>
                </td>
                {Array.from({ length: years }).map((_, y) => {
                  const yrSavings = calc.savings[y] ?? 0;
                  return (
                    <td
                      key={y}
                      colSpan={2}
                      className={`py-2 px-2 text-center border-l-2 border-[var(--col-divider)] font-mono-custom text-xs font-semibold ${
                        yrSavings >= 0 ? 'text-[var(--pos)]' : 'text-[var(--neg)]'
                      }`}
                    >
                      {fmt$(yrSavings)}
                    </td>
                  );
                })}
                {state.isEditMode && <td></td>}
              </tr>

              {/* 6. Cumulative Savings */}
              <tr className="odd:bg-[var(--panel)] even:bg-[var(--panel-alt)]/40 hover:bg-[var(--panel-alt)]/80 border-b border-[var(--border)]/40 font-mono-custom transition-colors bg-[var(--panel-alt)]/30">
                {state.isEditMode && <td></td>}
                <td className="py-2 px-3 text-left">
                  <div className="font-semibold text-xs text-[var(--text)] font-sans-custom">
                    Cumulative Savings
                  </div>
                  <div className="text-[10px] font-mono-custom text-[var(--muted2)] mt-0.5">
                    Final Accumulated: <span className="font-bold text-[var(--accum)]">{fmt$(totalSavings)}</span>
                  </div>
                </td>
                {Array.from({ length: years }).map((_, y) => {
                  const cumSavings = calc.savingsOT[y] ?? 0;
                  return (
                    <td
                      key={y}
                      colSpan={2}
                      className={`py-2 px-2 text-center border-l-2 border-[var(--col-divider)] font-mono-custom text-xs font-bold ${
                        cumSavings >= 0 ? 'text-[var(--accum)]' : 'text-[var(--neg)]'
                      }`}
                    >
                      {fmt$(cumSavings)}
                    </td>
                  );
                })}
                {state.isEditMode && <td></td>}
              </tr>

              {/* 7. Retirement Contribution */}
              <tr className="odd:bg-[var(--panel)] even:bg-[var(--panel-alt)]/40 hover:bg-[var(--panel-alt)]/80 border-b border-[var(--border)]/40 font-mono-custom transition-colors">
                {state.isEditMode && <td></td>}
                <td className="py-2 px-3 text-left">
                  <div className="font-semibold text-xs text-[var(--text)] font-sans-custom">
                    Retirement Contributions
                  </div>
                  <div className="text-[10px] font-mono-custom text-[var(--muted2)] mt-0.5">
                    {kpiPeriodName} Total: <span className="font-semibold text-[var(--text)]">{fmt$(calc.retireActual.reduce((a, b) => a + b, 0))}</span>
                  </div>
                </td>
                {Array.from({ length: years }).map((_, y) => (
                  <td
                    key={y}
                    colSpan={2}
                    className="py-2 px-2 text-center border-l-2 border-[var(--col-divider)] font-mono-custom text-xs text-[var(--text)]"
                  >
                    {fmt$(calc.retireActual[y] ?? 0)}
                  </td>
                ))}
                {state.isEditMode && <td></td>}
              </tr>

              {/* 8. Cumulative Retirement */}
              <tr className="odd:bg-[var(--panel)] even:bg-[var(--panel-alt)]/40 hover:bg-[var(--panel-alt)]/80 border-b border-[var(--border)]/40 font-mono-custom transition-colors bg-[var(--panel-alt)]/30">
                {state.isEditMode && <td></td>}
                <td className="py-2 px-3 text-left">
                  <div className="font-semibold text-xs text-[var(--text)] font-sans-custom">
                    Cumulative Retirement
                  </div>
                  <div className="text-[10px] font-mono-custom text-[var(--muted2)] mt-0.5">
                    Final Accumulated: <span className="font-bold text-[var(--text)]">{fmt$(totalRetire)}</span>
                  </div>
                </td>
                {Array.from({ length: years }).map((_, y) => (
                  <td
                    key={y}
                    colSpan={2}
                    className="py-2 px-2 text-center border-l-2 border-[var(--col-divider)] font-mono-custom text-xs font-bold text-[var(--text)]"
                  >
                    {fmt$(calc.retireOT[y] ?? 0)}
                  </td>
                ))}
                {state.isEditMode && <td></td>}
              </tr>

              {/* 9. Unallocated Balance */}
              <tr className="odd:bg-[var(--panel)] even:bg-[var(--panel-alt)]/40 hover:bg-[var(--panel-alt)]/80 border-b border-[var(--border)]/40 font-mono-custom transition-colors">
                {state.isEditMode && <td></td>}
                <td className="py-2 px-3 text-left">
                  <div className="font-semibold text-xs text-[var(--text)] font-sans-custom">
                    Unallocated Balance
                  </div>
                  <div className="text-[10px] font-mono-custom text-[var(--muted2)] mt-0.5">
                    Final Balance: <span className={`font-semibold ${(calc.unallocatedBalance[years - 1] ?? 0) >= 0 ? 'text-[var(--pos)]' : 'text-[var(--neg)]'}`}>{fmt$(calc.unallocatedBalance[years - 1] ?? 0)}</span>
                  </div>
                </td>
                {Array.from({ length: years }).map((_, y) => {
                  const unalloc = calc.unallocatedBalance[y] ?? 0;
                  return (
                    <td
                      key={y}
                      colSpan={2}
                      className={`py-2 px-2 text-center border-l-2 border-[var(--col-divider)] font-mono-custom text-xs font-semibold ${
                        unalloc >= 0 ? 'text-[var(--pos)]' : 'text-[var(--neg)]'
                      }`}
                    >
                      {fmt$(unalloc)}
                    </td>
                  );
                })}
                {state.isEditMode && <td></td>}
              </tr>
            </tbody>
          </table>
        </div>

        {/* Visual Graph Dashboard */}
        <GraphDashboard
          state={state}
          calc={calc}
          onChangeGraphType={onChangeGraphType}
          onToggleSeries={onToggleSeries}
          onChangeColor={onChangeColor}
        />
      </div>
    </details>
  );
};
