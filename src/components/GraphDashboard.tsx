import React, { useRef, useState } from 'react';
import { CalculationResult, PlannerState, fmt$ } from '@/core';
import { TrendingUp, BarChart3 } from 'lucide-react';

interface GraphDashboardProps {
  state: PlannerState;
  calc: CalculationResult;
  onChangeGraphType: (type: 'area' | 'grouped') => void;
  onToggleSeries: (key: string, val: boolean) => void;
  onChangeColor: (key: string, color: string) => void;
}

// Fixed chart height (matches the former "XL" preset).
const CHART_HEIGHT = 460;

function getSplinePath(pts: { x: number; y: number }[]): string {
  if (pts.length === 0) return '';
  if (pts.length === 1) return `M ${pts[0].x},${pts[0].y}`;
  if (pts.length === 2) {
    return `M ${pts[0].x},${pts[0].y} L ${pts[1].x},${pts[1].y}`;
  }

  let d = `M ${pts[0].x},${pts[0].y}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = i > 0 ? pts[i - 1] : pts[i];
    const p1 = pts[i];
    const p2 = pts[i + 1];
    const p3 = i < pts.length - 2 ? pts[i + 2] : p2;

    const tension = 0.22;
    const cp1x = p1.x + (p2.x - p0.x) * tension;
    const cp1y = p1.y + (p2.y - p0.y) * tension;
    const cp2x = p2.x - (p3.x - p1.x) * tension;
    const cp2y = p2.y - (p3.y - p1.y) * tension;

    d += ` C ${cp1x.toFixed(2)},${cp1y.toFixed(2)} ${cp2x.toFixed(2)},${cp2y.toFixed(2)} ${p2.x.toFixed(2)},${p2.y.toFixed(2)}`;
  }
  return d;
}

function getSplineAreaPath(pts: { x: number; y: number }[], baseY: number): string {
  if (pts.length === 0) return '';
  const curve = getSplinePath(pts);
  const last = pts[pts.length - 1];
  const first = pts[0];
  return `${curve} L ${last.x},${baseY} L ${first.x},${baseY} Z`;
}

export const GraphDashboard: React.FC<GraphDashboardProps> = ({
  state,
  calc,
  onChangeGraphType,
  onToggleSeries,
  onChangeColor,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [hoverYear, setHoverYear] = useState<number | null>(null);
  const [tooltipPos, setTooltipPos] = useState<{ x: number; isRight: boolean }>({ x: 0, isRight: false });

  const years = state.years || 1;
  const isMonths = state.viewMode === 'months';
  const height = CHART_HEIGHT;
  const width = 1000; // ViewBox baseline

  // Keep the chart's horizontal scroll in lockstep with the section tables.
  const handleChartScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const headerScroll = document.getElementById('sticky-year-bar-scroll');
    if (headerScroll && headerScroll.scrollLeft !== e.currentTarget.scrollLeft) {
      headerScroll.scrollLeft = e.currentTarget.scrollLeft;
    }
  };
  const padT = 24;
  const padB = 36;
  const drawH = height - padT - padB;
  const startYearNum = state.startYear || 2025;

  // Each year occupies an equal column across the canvas to align with the table headers
  const colW = width / Math.max(1, years);

  // Standard series list
  const baseSeriesList = [
    { k: 'gross', l: 'Gross Income', v: calc.g, defaultColor: '#10B981' },
    { k: 'colOnly', l: 'Living Expenses', v: calc.colOnly, defaultColor: '#EF4444' },
    { k: 'save', l: 'Net Savings', v: calc.savings.map(v => Math.max(0, v)), defaultColor: '#3B82F6' },
    { k: 'retire', l: 'Retirement', v: calc.retireActual, defaultColor: '#8B5CF6' },
  ];

  // Dynamically append custom savings funds that are enabled
  const customSavingsSeries = Object.keys(state.customSavings || {}).map(fundId => {
    const fund = state.customSavings[fundId];
    return {
      k: fundId,
      l: fund.name,
      v: calc.fundValues[fundId] || Array(years).fill(0),
      defaultColor: fund.color || '#F59E0B',
      isCustomFund: true,
      enabled: !!fund.enabledInChart,
    };
  });

  const allSeries = [
    ...baseSeriesList.map(s => ({
      ...s,
      enabled: state.graphToggles[s.k] !== false,
      color: state.barColors[s.k] || s.defaultColor,
    })),
    ...customSavingsSeries.map(s => ({
      ...s,
      enabled: s.enabled && state.graphToggles[s.k] !== false,
      color: state.barColors[s.k] || s.defaultColor,
    })),
  ];

  const activeSeries = allSeries.filter(s => s.enabled);

  let maxVal = 1000;
  activeSeries.forEach(s => {
    s.v.forEach(val => {
      if (val > maxVal) maxVal = val;
    });
  });
  maxVal = maxVal * 1.15;

  const getY = (val: number) => {
    return padT + drawH - (Math.max(0, val) / maxVal) * drawH;
  };

  const getX = (idx: number) => {
    return (idx + 0.5) * colW;
  };

  const mode = state.graphType || 'area';

  const handleMouseMove = (e: React.MouseEvent<SVGRectElement>, yIdx: number) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    setHoverYear(yIdx);
    setTooltipPos({
      x: mouseX,
      isRight: mouseX > rect.width / 2,
    });
  };

  const handleTouch = (e: React.TouchEvent<SVGRectElement>, yIdx: number) => {
    if (!containerRef.current || e.touches.length === 0) return;
    const rect = containerRef.current.getBoundingClientRect();
    const touchX = e.touches[0].clientX - rect.left;
    setHoverYear(yIdx);
    setTooltipPos({
      x: touchX,
      isRight: touchX > rect.width / 2,
    });
  };

  const yTicks = [0, 0.25, 0.5, 0.75, 1];

  return (
    <div className="sub-card relative mt-5 transition-all">
      {/* Y-axis scale — anchored to the non-scrolling outer card at the canvas's
          left edge, so it stays put while the canvas scrolls horizontally. HTML,
          not SVG <text>, so the non-uniform SVG scale can't stretch the type. */}
      <div className="pointer-events-none absolute inset-0 select-none z-10">
        {yTicks.map(pct => {
          const labelVal = maxVal * pct;
          return (
            <span
              key={pct}
              className="absolute -translate-y-1/2 rounded bg-[var(--row-alt)] px-1 text-[9px] font-semibold font-mono-custom text-[var(--muted2)] leading-none"
              style={{
                top: `${padT + drawH * (1 - pct)}px`,
                left: `calc(var(--label-col-w)${state.isEditMode ? ' + 32px' : ''} + 6px)`,
              }}
            >
              {labelVal >= 1000 ? `$${Math.round(labelVal / 1000)}k` : `$${Math.round(labelVal)}`}
            </span>
          );
        })}
      </div>
      <div className="overflow-x-auto pb-1 pr-1 category-table-scroll" onScroll={handleChartScroll}>
        <div
          className="w-full flex items-stretch"
          style={{ minWidth: `calc(var(--label-col-w) + ${years * 2} * var(--yr-col-w)${state.isEditMode ? ' + 32px' : ''})` }}
        >
          {/* Left rail: edit-mode spacer + control sidebar, pinned like the
              tables' frozen row-label column so it stays put while scrolling. */}
          <div className="frozen-col flex flex-shrink-0 items-stretch">
            {state.isEditMode && <div className="w-8 min-w-[32px] border-r border-[var(--border)]/40" />}
            <div className="w-[var(--label-col-w)] min-w-[var(--label-col-w)] p-3.5 sm:p-4 flex flex-col justify-between gap-4 select-none">
            <div className="space-y-4">
              {/* 1. Mode Switcher (Trend vs Comparison) */}
              <div>
                <div className="text-[10px] uppercase font-bold text-[var(--muted2)] tracking-wider mb-1.5">
                  View Mode
                </div>
                <div className="grid grid-cols-2 p-1 bg-[var(--panel-alt)] border border-[var(--border)] rounded-lg gap-1">
                  <button
                    type="button"
                    onClick={() => onChangeGraphType('area')}
                    title="Trend lines"
                    className={`flex items-center justify-center gap-1 py-1.5 text-[11px] font-semibold rounded-md transition cursor-pointer ${
                      mode === 'area'
                        ? 'bg-[var(--accent)] text-white shadow-xs'
                        : 'text-[var(--muted)] hover:text-[var(--text)]'
                    }`}
                  >
                    <TrendingUp className="w-3.5 h-3.5 flex-shrink-0" />
                    <span>Trend</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => onChangeGraphType('grouped')}
                    title="Grouped bars"
                    className={`flex items-center justify-center gap-1 py-1.5 text-[11px] font-semibold rounded-md transition cursor-pointer ${
                      mode === 'grouped'
                        ? 'bg-[var(--accent)] text-white shadow-xs'
                        : 'text-[var(--muted)] hover:text-[var(--text)]'
                    }`}
                  >
                    <BarChart3 className="w-3.5 h-3.5 flex-shrink-0" />
                    <span>Bars</span>
                  </button>
                </div>
              </div>

              {/* 2. Series Toggles & Color Pickers */}
              <div>
                <div className="text-[10px] uppercase font-bold text-[var(--muted2)] tracking-wider mb-2">
                  Metrics & Colors
                </div>
                <div className="space-y-1.5">
                  {allSeries.map(s => {
                    const active = s.enabled;
                    return (
                      <div
                        key={s.k}
                        className={`flex items-center justify-between gap-2 px-2.5 py-1.5 rounded-lg text-xs font-sans-custom border transition ${
                          active
                            ? 'bg-[var(--panel)] border-[var(--border)] text-[var(--text)] shadow-xs'
                            : 'opacity-40 bg-transparent border-dashed border-[var(--border)] text-[var(--muted)]'
                        }`}
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <button
                            type="button"
                            role="switch"
                            aria-checked={active}
                            onClick={() => onToggleSeries(s.k, !active)}
                            className={`relative inline-flex h-3.5 w-6 flex-shrink-0 cursor-pointer rounded-full border border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                              active ? 'bg-[var(--accent)]' : 'bg-[var(--border)]'
                            }`}
                            title={`Toggle ${s.l}`}
                          >
                            <span
                              className={`pointer-events-none inline-block h-2.5 w-2.5 transform rounded-full bg-white shadow-xs transition duration-200 ease-in-out ${
                                active ? 'translate-x-2.5' : 'translate-x-0.5'
                              } mt-[1px]`}
                            />
                          </button>
                          <button
                            type="button"
                            onClick={() => onToggleSeries(s.k, !active)}
                            className="cursor-pointer font-medium truncate text-[11px] text-left bg-transparent border-0 p-0"
                            title={`Toggle ${s.l}`}
                          >
                            {s.l}
                          </button>
                        </div>

                        <input
                          type="color"
                          value={s.color}
                          onChange={e => onChangeColor(s.k, e.target.value)}
                          className="w-4 h-4 rounded border border-[var(--border)] cursor-pointer p-0 bg-transparent flex-shrink-0"
                          title={`Change ${s.l} color`}
                        />
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

              <div className="text-[10px] text-[var(--muted2)] font-mono-custom pt-2 border-t border-[var(--border)]/50">
                Columns line up with {startYearNum}–{startYearNum + years - 1}
              </div>
            </div>
          </div>

          {/* Right Canvas: grows to fill the width left of the sidebar (like the
              section tables' year columns), with a slim floor, and scrolls in
              lockstep via the shared .category-table-scroll wrapper. */}
          <div
            ref={containerRef}
            className="flex-1 min-w-0 relative"
            style={{ height: `${height}px`, minWidth: `calc(${years} * 2 * var(--yr-col-w))` }}
          >
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="w-full h-full block select-none"
          preserveAspectRatio="none"
          role="img"
          aria-label={
            `${mode === 'area' ? 'Trend' : 'Comparison'} chart over ${years} ${isMonths ? 'months' : 'years'}` +
            (isMonths ? '' : ` (${startYearNum}–${startYearNum + years - 1})`) +
            `. Series: ${activeSeries.map(s => s.l).join(', ') || 'none'}. ` +
            `The projection matrix table above lists every value.`
          }
        >
          <defs>
            {activeSeries.map(s => {
              const c = s.color;
              return (
                <linearGradient key={s.k} id={`grad-${s.k}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={c} stopOpacity="0.28" />
                  <stop offset="65%" stopColor={c} stopOpacity="0.08" />
                  <stop offset="100%" stopColor={c} stopOpacity="0.00" />
                </linearGradient>
              );
            })}
            <filter id="subtle-glow" x="-20%" y="-20%" width="140%" height="140%">
              <feDropShadow dx="0" dy="2" stdDeviation="3" floodOpacity="0.15" />
            </filter>
            {/* Low-intensity two-sided soft shadow for the vertical column
                lines — the SVG counterpart of the tables' divider ::before. */}
            <linearGradient id="vdiv-shadow" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="#000" stopOpacity="0" />
              <stop offset="50%" stopColor="#000" stopOpacity="0.045" />
              <stop offset="100%" stopColor="#000" stopOpacity="0" />
            </linearGradient>
          </defs>

          {/* Horizontal gridlines (labels are HTML overlays — see below — so the
              non-uniform SVG stretch never distorts text). */}
          {yTicks.map(pct => {
            const yPos = padT + drawH * (1 - pct);
            return (
              <line
                key={pct}
                x1={0}
                y1={yPos}
                x2={width}
                y2={yPos}
                stroke="var(--border)"
                strokeWidth="1"
                opacity="0.5"
                strokeDasharray={pct === 0 ? undefined : '3 3'}
              />
            );
          })}

          {/* Vertical column separators between years — crisp line plus the
              same low-intensity two-sided soft shadow as the table dividers. */}
          {Array.from({ length: years }).map((_, y) => {
            if (y === 0) return null;
            const xPos = y * colW;
            const y2 = height - padB + 6;
            return (
              <g key={`vgrid-${y}`}>
                <rect x={xPos - 3.5} y={0} width={7} height={y2} fill="url(#vdiv-shadow)" />
                <line x1={xPos} y1={0} x2={xPos} y2={y2} stroke="var(--col-divider)" strokeWidth="2" />
              </g>
            );
          })}

          {/* AREA / TREND MODE - Spline Curves with Multi-Stop Gradients */}
          {mode === 'area' &&
            activeSeries.map(s => {
              const color = s.color;
              if (years <= 1) {
                const cx = colW / 2;
                const cy = getY(s.v[0] ?? 0);
                return (
                  <g key={s.k}>
                    <line
                      x1={cx}
                      y1={padT + drawH}
                      x2={cx}
                      y2={cy}
                      stroke={color}
                      strokeWidth="3"
                      filter="url(#subtle-glow)"
                    />
                    <circle
                      cx={cx}
                      cy={cy}
                      r={5}
                      fill={color}
                      stroke="var(--panel)"
                      strokeWidth="2.5"
                    />
                  </g>
                );
              }

              const pts = Array.from({ length: years }).map((_, i) => ({
                x: getX(i),
                y: getY(s.v[i] ?? 0),
              }));

              const dArea = getSplineAreaPath(pts, padT + drawH);
              const dLine = getSplinePath(pts);

              return (
                <g key={s.k}>
                  <path d={dArea} fill={`url(#grad-${s.k})`} />
                  <path
                    d={dLine}
                    fill="none"
                    stroke={color}
                    strokeWidth="2.75"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    filter="url(#subtle-glow)"
                  />
                  {pts.map((pt, i) => (
                    <circle
                      key={i}
                      cx={pt.x}
                      cy={pt.y}
                      r="4"
                      fill={color}
                      stroke="var(--panel)"
                      strokeWidth="2"
                    />
                  ))}
                </g>
              );
            })}

          {/* GROUPED COMPARISON MODE */}
          {mode === 'grouped' &&
            Array.from({ length: years }).map((_, y) => {
              // Bar width is fixed off the full series count so a bar keeps the
              // same thickness across years, but only the series that actually
              // have a value this year get a slot — and that visible cluster is
              // centred in the column. Otherwise years where the savings funds
              // are still $0 leave empty slots that shove the visible bars hard
              // against the left gridline and it reads as misaligned.
              const barW = Math.min(36, (colW * 0.72) / Math.max(1, activeSeries.length));
              const shown = activeSeries.filter(s => (s.v[y] ?? 0) > 0);
              const cluster = shown.length ? shown : activeSeries;
              const cx = (y + 0.5) * colW;
              const startX = cx - (barW * cluster.length) / 2;

              return (
                <g key={y}>
                  {cluster.map((s, sIdx) => {
                    const val = s.v[y] ?? 0;
                    const valY = getY(val);
                    const barH = Math.max(0, padT + drawH - valY);
                    return (
                      <rect
                        key={s.k}
                        x={startX + sIdx * barW}
                        y={valY}
                        width={Math.max(3, barW - 3)}
                        height={barH}
                        fill={s.color}
                        rx="4"
                        opacity="0.9"
                        filter="url(#subtle-glow)"
                      />
                    );
                  })}
                </g>
              );
            })}

          {/* Interactive Hover Zones */}
          {Array.from({ length: years }).map((_, y) => {
            return (
              <rect
                key={y}
                x={y * colW}
                y={0}
                width={colW}
                height={height}
                fill="transparent"
                className="cursor-crosshair touch-none"
                onMouseEnter={e => handleMouseMove(e, y)}
                onMouseMove={e => handleMouseMove(e, y)}
                onMouseLeave={() => setHoverYear(null)}
                onTouchStart={e => handleTouch(e, y)}
                onTouchMove={e => handleTouch(e, y)}
                onTouchEnd={() => setHoverYear(null)}
              />
            );
          })}

          {/* Active Hover Guide Line & Indicators */}
          {hoverYear !== null && (
            <g>
              <line
                x1={(hoverYear + 0.5) * colW}
                y1={padT}
                x2={(hoverYear + 0.5) * colW}
                y2={padT + drawH}
                stroke="var(--accent)"
                strokeWidth="1.5"
                strokeDasharray="3 3"
                opacity="0.8"
                pointerEvents="none"
              />
              {mode === 'area' &&
                activeSeries.map(s => {
                  const val = s.v[hoverYear] ?? 0;
                  const cx = (hoverYear + 0.5) * colW;
                  const cy = getY(val);
                  return (
                    <circle
                      key={`hover-${s.k}`}
                      cx={cx}
                      cy={cy}
                      r="5.5"
                      fill={s.color}
                      stroke="white"
                      strokeWidth="2"
                      pointerEvents="none"
                    />
                  );
                })}
            </g>
          )}
        </svg>

        {/* X-axis labels — HTML overlay, not SVG <text>, so the non-uniform
            SVG scale can't stretch the type. Scrolls with the columns. */}
        <div className="pointer-events-none absolute inset-0 select-none">
          <div className="absolute inset-x-0 bottom-1.5 flex">
            {Array.from({ length: years }).map((_, y) => (
              <span
                key={y}
                className="flex-1 text-center text-[11px] font-bold font-mono-custom text-[var(--text)]"
              >
                {isMonths ? `Mo ${y + 1}` : `${startYearNum + y}`}
              </span>
            ))}
          </div>
        </div>

        {/* Floating Tooltip with Elevated Card Design */}
        {hoverYear !== null && (
          <div
            className="absolute top-3 pointer-events-none bg-[var(--panel)] text-[var(--text)] px-4 py-3 rounded-xl text-xs font-mono-custom shadow-xl border border-[var(--border)] z-20 backdrop-blur-md transition-all duration-150"
            style={{
              left: tooltipPos.isRight ? 'auto' : `${tooltipPos.x + 18}px`,
              right: tooltipPos.isRight ? `${(containerRef.current?.clientWidth || 800) - tooltipPos.x + 18}px` : 'auto',
            }}
          >
            <div className="font-sans-custom font-bold text-[var(--accent)] text-xs uppercase tracking-wider pb-1.5 mb-2 border-b border-[var(--border)]/60 flex items-center justify-between gap-4">
              <span>{isMonths ? `Month ${hoverYear + 1}` : `${startYearNum + hoverYear}`} Breakdown</span>
            </div>
            <div className="space-y-1.5 min-w-40">
              {activeSeries.map(s => (
                <div key={s.k} className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-1.5">
                    <span
                      className="w-2.5 h-2.5 rounded-full inline-block shadow-2xs"
                      style={{ backgroundColor: s.color }}
                    />
                    <span className="text-[var(--text)] text-[11px] font-sans-custom">{s.l}</span>
                  </div>
                  <strong className="text-[var(--text)] font-mono-custom font-bold">
                    {fmt$(s.v[hoverYear] ?? 0)}
                  </strong>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Edit mode right spacer */}
      {state.isEditMode && <div className="w-10 min-w-[40px] flex-shrink-0 border-l border-[var(--border)]/40" />}
        </div>
      </div>
    </div>
  );
};
