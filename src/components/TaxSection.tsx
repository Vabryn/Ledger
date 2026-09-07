import React from 'react';
import { CalculationResult, FilingStatus, fmtCompact$ } from '@/core';
import { Percent, HelpCircle } from 'lucide-react';
import { SectionShell, ScrollBox, ProjectionTable } from './ledger-table';

interface TaxSectionProps {
  years: number;
  isEditMode: boolean;
  taxStatus: FilingStatus;
  fica: boolean;
  st: string[];
  deps: number[];
  additionalDeductions: number[];
  calc: CalculationResult;
  onChangeTaxStatus: (status: FilingStatus) => void;
  onChangeFica: (checked: boolean) => void;
  onChangeState: (yearIdx: number, val: string) => void;
  onChangeDeps: (yearIdx: number, val: number) => void;
  onChangeAdditionalDeductions: (yearIdx: number, val: number) => void;
  onMoveSection?: (dir: 'up' | 'down') => void;
  isHighlighted?: boolean;
}

export const TaxSection: React.FC<TaxSectionProps> = ({
  years,
  isEditMode,
  taxStatus,
  fica,
  st,
  deps,
  additionalDeductions,
  calc,
  onChangeTaxStatus,
  onChangeFica,
  onChangeState,
  onChangeDeps,
  onChangeAdditionalDeductions,
  onMoveSection,
  isHighlighted,
}) => {

  return (
    <SectionShell
      title="Income Tax and Deductions"
      icon={Percent}
      isEditMode={isEditMode}
      onMoveSection={onMoveSection}
      isHighlighted={isHighlighted}
      bodyClassName="space-y-5"
    >
        {/* Global Tax Controls & Aligned FICA Box */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pb-4 border-b border-[var(--border)]/60 items-end">
          {/* Filing Status Dropdown */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] uppercase font-semibold tracking-wider text-[var(--muted2)]">
              Filing Status
            </label>
            <select
              value={taxStatus}
              onChange={e => onChangeTaxStatus(e.target.value as FilingStatus)}
              className="w-full bg-[var(--panel)] border border-[var(--border)] text-[var(--text)] text-xs font-medium rounded-lg px-3 py-2 focus:outline-none focus:border-[var(--accent)] cursor-pointer shadow-xs"
            >
              <option value="Married">Married Filing Jointly</option>
              <option value="Single">Single</option>
              <option value="HeadOfHousehold">Head of Household</option>
              <option value="MarriedSeparate">Married Filing Separately</option>
            </select>
          </div>

          {/* FICA Toggle Perfectly Aligned with Info Tooltip */}
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center gap-1.5">
              <label className="text-[10px] uppercase font-semibold tracking-wider text-[var(--muted2)]">
                FICA Deductions
              </label>
              <div className="relative group">
                <HelpCircle className="w-3.5 h-3.5 text-[var(--muted2)] cursor-help hover:text-[var(--accent)]" />
                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-72 p-2.5 bg-[var(--panel)] text-[var(--text)] text-[11px] rounded-lg border border-[var(--border)] shadow-xl pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity z-30 font-sans-custom leading-relaxed">
                  <strong>Federal Insurance Contributions Act (FICA):</strong> 6.2% Social Security tax up to annual wage cap ($176,100) + 1.45% Medicare tax (+ 0.9% Additional Medicare for high earners).
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between bg-[var(--panel-alt)] border border-[var(--border)] rounded-lg px-3 py-1.5 shadow-xs">
              <span
                onClick={() => onChangeFica(!fica)}
                className="text-xs font-medium text-[var(--text)] cursor-pointer select-none"
              >
                Include Social Security & Medicare
              </span>

              <button
                type="button"
                role="switch"
                aria-checked={fica}
                onClick={() => onChangeFica(!fica)}
                className={`relative inline-flex h-5 w-9 flex-shrink-0 cursor-pointer rounded-full border border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                  fica ? 'bg-[var(--accent)]' : 'bg-[var(--border)]'
                }`}
                title="Toggle Social Security & Medicare (FICA)"
              >
                <span
                  className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-xs transition duration-200 ease-in-out ${
                    fica ? 'translate-x-4' : 'translate-x-0.5'
                  } mt-[1px]`}
                />
              </button>
            </div>
          </div>
        </div>

        <p className="text-[11px] text-[var(--muted2)] -mt-2">
          State income tax is modeled for <strong>California</strong> and <strong>New York</strong> (incl. NYC / Yonkers) only.
          Choose <em>“No state income tax”</em> for every other state. Federal figures use 2025 IRS brackets;
          verify against official IRS / FTB / NY DTF tables before relying on exact amounts.
        </p>

        {/* Tax Table */}
        <ScrollBox>
          <ProjectionTable years={years} isEditMode={isEditMode}>
            <tbody>
              {/* Location Row */}
              <tr className="odd:bg-[var(--panel)] even:bg-[var(--row-alt)] hover:bg-[var(--row-hover)] border-b border-[var(--border)]/40 transition-colors">
                {isEditMode && <td></td>}
                <td className="py-2 px-3 font-medium text-[var(--text)]">Tax Jurisdiction</td>
                {Array.from({ length: years }).map((_, y) => {
                  const currentSt = st[y] || 'CA';
                  return (
                    <td key={y} colSpan={2} className="py-1.5 px-2 text-center border-l-2 border-[var(--col-divider)]">
                      <select
                        value={currentSt}
                        onChange={e => onChangeState(y, e.target.value)}
                        className="w-full max-w-[140px] mx-auto bg-[var(--panel)] border border-[var(--border)]/80 text-[var(--text)] rounded-md px-2 py-1 text-xs text-center focus:outline-none focus:border-[var(--accent)] cursor-pointer"
                      >
                        <option value="NONE">No state income tax</option>
                        <option value="CA">California</option>
                        <optgroup label="New York">
                          <option value="NY">NY (State Only)</option>
                          <option value="NYC">NY + New York City</option>
                          <option value="YONKERS">NY + Yonkers</option>
                        </optgroup>
                      </select>
                    </td>
                  );
                })}
                {isEditMode && <td></td>}
              </tr>

              {/* Dependents */}
              <tr className="odd:bg-[var(--panel)] even:bg-[var(--row-alt)] hover:bg-[var(--row-hover)] border-b border-[var(--border)]/40 transition-colors">
                {isEditMode && <td></td>}
                <td className="py-2 px-3 font-medium text-[var(--text)]">Dependents</td>
                {Array.from({ length: years }).map((_, y) => {
                  const depCount = deps[y] ?? 0;
                  return (
                    <td key={y} colSpan={2} className="py-1.5 px-2 text-center border-l-2 border-[var(--col-divider)]">
                      <input
                        type="number"
                        min="0"
                        max="15"
                        value={depCount === 0 && !deps[y] ? '' : depCount}
                        onChange={e => onChangeDeps(y, Math.max(0, Math.min(15, parseInt(e.target.value, 10) || 0)))}
                        placeholder="0"
                        className="w-16 mx-auto text-center bg-[var(--panel)] border border-[var(--border)]/80 text-[var(--text)] rounded-md px-2 py-0.5 text-xs font-mono-custom focus:outline-none focus:border-[var(--accent)]"
                      />
                    </td>
                  );
                })}
                {isEditMode && <td></td>}
              </tr>

              {/* Additional Deductions */}
              <tr className="odd:bg-[var(--panel)] even:bg-[var(--row-alt)] hover:bg-[var(--row-hover)] border-b border-[var(--border)]/40 transition-colors">
                {isEditMode && <td></td>}
                <td className="py-2 px-3 font-medium text-[var(--text)]">Additional Deductions ($/yr)</td>
                {Array.from({ length: years }).map((_, y) => {
                  const addl = additionalDeductions[y] ?? 0;
                  return (
                    <td key={y} colSpan={2} className="py-1.5 px-2 text-center border-l-2 border-[var(--col-divider)]">
                      <input
                        type="number"
                        min="0"
                        step="100"
                        value={addl === 0 && !additionalDeductions[y] ? '' : addl}
                        onChange={e => onChangeAdditionalDeductions(y, parseFloat(e.target.value) || 0)}
                        placeholder="$0"
                        className="w-24 mx-auto text-center bg-[var(--panel)] border border-[var(--border)]/80 text-[var(--text)] rounded-md px-2 py-0.5 text-xs font-mono-custom focus:outline-none focus:border-[var(--accent)]"
                      />
                    </td>
                  );
                })}
                {isEditMode && <td></td>}
              </tr>

              {/* Federal Tax */}
              <tr className="odd:bg-[var(--panel)] even:bg-[var(--row-alt)] hover:bg-[var(--row-hover)] border-b border-[var(--border)]/40 font-mono-custom transition-colors">
                {isEditMode && <td></td>}
                <td className="py-2 px-3 font-sans-custom text-[var(--muted)]">Federal Income Tax</td>
                {Array.from({ length: years }).map((_, y) => (
                  <td key={y} colSpan={2} className="py-1.5 px-2 text-center text-[var(--neg)] border-l-2 border-[var(--col-divider)]">
                    {fmtCompact$(calc.fed[y] ?? 0)}
                  </td>
                ))}
                {isEditMode && <td></td>}
              </tr>

              {/* State/Local Tax */}
              <tr className="odd:bg-[var(--panel)] even:bg-[var(--row-alt)] hover:bg-[var(--row-hover)] border-b border-[var(--border)]/40 font-mono-custom transition-colors">
                {isEditMode && <td></td>}
                <td className="py-2 px-3 font-sans-custom text-[var(--muted)]">State & Local Tax</td>
                {Array.from({ length: years }).map((_, y) => (
                  <td key={y} colSpan={2} className="py-1.5 px-2 text-center text-[var(--neg)] border-l-2 border-[var(--col-divider)]">
                    {fmtCompact$(calc.stTax[y] ?? 0)}
                  </td>
                ))}
                {isEditMode && <td></td>}
              </tr>

              {/* Social Security & Medicare (FICA) */}
              <tr className="odd:bg-[var(--panel)] even:bg-[var(--row-alt)] hover:bg-[var(--row-hover)] border-b border-[var(--border)]/40 font-mono-custom transition-colors">
                {isEditMode && <td></td>}
                <td className="py-2 px-3 font-sans-custom text-[var(--muted)]">Social Security & Medicare (FICA)</td>
                {Array.from({ length: years }).map((_, y) => (
                  <td key={y} colSpan={2} className="py-1.5 px-2 text-center text-[var(--neg)] border-l-2 border-[var(--col-divider)]">
                    {fmtCompact$(calc.fica[y] ?? 0)}
                  </td>
                ))}
                {isEditMode && <td></td>}
              </tr>

              {/* Total Tax */}
              <tr className="border-t-2 border-[var(--text)]/25 font-mono-custom bg-[var(--panel)]">
                {isEditMode && <td></td>}
                <td className="py-2.5 px-3 font-sans-custom text-xs font-bold uppercase tracking-wider text-[var(--text)]">Total Tax Liability</td>
                {Array.from({ length: years }).map((_, y) => {
                  const totalT = (calc.fed[y] ?? 0) + (calc.stTax[y] ?? 0) + (calc.fica[y] ?? 0);
                  return (
                    <td key={y} colSpan={2} className="py-2 px-2 text-center text-sm text-[var(--neg)] font-extrabold border-l-2 border-[var(--col-divider)]">
                      {fmtCompact$(totalT)}
                    </td>
                  );
                })}
                {isEditMode && <td></td>}
              </tr>
            </tbody>
          </ProjectionTable>
        </ScrollBox>
    </SectionShell>
  );
};
