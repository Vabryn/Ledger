import React, { useState, useEffect } from 'react';
import { Copy } from 'lucide-react';

interface CopyYearControlProps {
  years: number;
  periodLabel: string;
  onCopy: (fromYear: number, toYear: number | 'all') => void;
  className?: string;
}

export const CopyYearControl: React.FC<CopyYearControlProps> = ({
  years,
  periodLabel,
  onCopy,
  className = '',
}) => {
  const [fromYear, setFromYear] = useState<number>(0);
  const [toYear, setToYear] = useState<number | 'all'>(years > 1 ? 1 : 'all');

  // Keep the selected source/target in range when the number of years shrinks.
  useEffect(() => {
    setFromYear(f => Math.min(f, Math.max(0, years - 1)));
    setToYear(t => (t === 'all' ? 'all' : Math.min(t, Math.max(0, years - 1))));
  }, [years]);

  if (years <= 1) return null;

  const handleApply = () => {
    onCopy(fromYear, toYear);
  };

  const shortLabel = periodLabel === 'Month' ? 'M' : 'Y';

  return (
    <div
      className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md border border-[var(--border)] bg-[var(--panel)] shadow-2xs text-[10px] font-sans-custom ${className}`}
    >
      <span className="text-[9px] uppercase font-bold text-[var(--muted2)] tracking-wider">
        Copy
      </span>

      {/* From Year Dropdown - Exact Same Width */}
      <select
        value={fromYear}
        onChange={e => setFromYear(Number(e.target.value))}
        className="w-[58px] bg-[var(--panel-alt)] border border-[var(--border)] text-[var(--text)] text-[10px] font-mono-custom rounded px-1 py-0.5 focus:outline-none focus:border-[var(--accent)] cursor-pointer text-center"
        title={`Source ${periodLabel} to copy from`}
      >
        {Array.from({ length: years }).map((_, i) => (
          <option key={i} value={i}>
            {shortLabel}{i + 1}
          </option>
        ))}
      </select>

      {/* Visible Copy Sign Between The Two Dropdowns */}
      <div
        className="flex items-center gap-0.5 text-[var(--accent)] px-0.5"
        title="Copy to"
      >
        <Copy className="w-2.5 h-2.5" />
        <span className="text-[9px] font-bold font-mono-custom">➔</span>
      </div>

      {/* To Year Dropdown - Exact Same Width */}
      <select
        value={toYear}
        onChange={e => setToYear(e.target.value === 'all' ? 'all' : Number(e.target.value))}
        className="w-[58px] bg-[var(--panel-alt)] border border-[var(--border)] text-[var(--text)] text-[10px] font-mono-custom rounded px-1 py-0.5 focus:outline-none focus:border-[var(--accent)] cursor-pointer text-center"
        title={`Destination ${periodLabel} to copy into`}
      >
        {Array.from({ length: years }).map((_, i) => (
          <option key={i} value={i}>
            {shortLabel}{i + 1}
          </option>
        ))}
        <option value="all">All {shortLabel}s</option>
      </select>

      {/* Execute Copy Button */}
      <button
        type="button"
        onClick={handleApply}
        className="px-1.5 py-0.5 bg-[var(--accent)] text-white hover:opacity-90 active:scale-95 text-[10px] font-semibold rounded transition cursor-pointer shadow-xs"
        title={`Apply copy from ${periodLabel} ${fromYear + 1} to ${
          toYear === 'all' ? 'all other ' + periodLabel + 's' : periodLabel + ' ' + (Number(toYear) + 1)
        }`}
      >
        Apply
      </button>
    </div>
  );
};
