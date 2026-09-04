import { useState, useEffect, useLayoutEffect, useMemo, useRef, useDeferredValue } from 'react';
import type {
  PlannerState,
  ExpenseItem,
  FilingStatus,
  CustomSavingsFund,
  IncomeFrequency,
  PayoutFrequency,
} from '@/core';
import {
  getDefaultSampleState,
  getCleanEmptyState,
  computePlanner,
  num,
  STORAGE_KEY,
  safeStorage,
  validateAndRepairState,
} from '@/core';
import { StickyHeader, NavCategory } from './components/StickyHeader';
import { IncomeSection } from './components/IncomeSection';
import { TaxSection } from './components/TaxSection';
import { ExpensesSection } from './components/ExpensesSection';
import { RetirementSection } from './components/RetirementSection';
import { SummarySection } from './components/SummarySection';

export default function App() {
  const [activeCategory, setActiveCategory] = useState<NavCategory>('all');
  const [scrolledCategory, setScrolledCategory] = useState<NavCategory>('income');
  const [state, setState] = useState<PlannerState>(() => {
    const saved = safeStorage.getJson<any>(STORAGE_KEY, null);
    if (saved) {
      return validateAndRepairState(saved);
    }
    const defaultState = getDefaultSampleState();
    if (typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
      defaultState.darkMode = true;
    }
    return defaultState;
  });

  // Dark mode effect
  useEffect(() => {
    if (state.darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [state.darkMode]);

  // Follow OS light/dark changes until the user explicitly picks a theme this session.
  const userChoseThemeRef = useRef(false);
  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return;
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const onChange = (e: MediaQueryListEvent) => {
      if (userChoseThemeRef.current) return;
      setState(prev => (prev.darkMode === e.matches ? prev : { ...prev, darkMode: e.matches }));
    };
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);

  // Keep every category's horizontal scroll in lockstep with the header.
  // Sections stay mounted but hidden, and a hidden scroll box ignores
  // scrollLeft writes — so when a category becomes visible again it would
  // otherwise snap back to 0 while the (always-visible) header bar stays put.
  // On every category switch, re-apply the header's scrollLeft to whatever
  // tables are now on screen.
  useLayoutEffect(() => {
    const sync = () => {
      const header = document.getElementById('sticky-year-bar-scroll');
      if (!header) return;
      const x = header.scrollLeft;
      document.querySelectorAll<HTMLElement>('.category-table-scroll').forEach(el => {
        if (el.scrollLeft !== x) el.scrollLeft = x;
      });
    };
    sync();
    // Second pass after paint: a section revealed this frame may not have had
    // its scroll width yet on the synchronous pass.
    const raf = requestAnimationFrame(sync);
    return () => cancelAnimationFrame(raf);
  }, [activeCategory]);

  // Persist to safe storage — debounced so typing in a cell doesn't serialize
  // the entire planner and hit localStorage on every keystroke.
  useEffect(() => {
    const t = setTimeout(() => safeStorage.setJson(STORAGE_KEY, state), 400);
    return () => clearTimeout(t);
  }, [state]);

  // Normalize optional fields for a stable shape before computing.
  const safeState = useMemo(() => {
    return {
      ...state,
      startYear: state.startYear || 2025,
      col: state.col || [],
      customSavings: state.customSavings || {},
      employerMatchRate: state.employerMatchRate || Array(state.years || 1).fill(0),
      additionalDeductions: state.additionalDeductions || Array(state.years || 1).fill(0),
      viewMode: state.viewMode || 'years',
    };
  }, [state]);

  // Compute live calculations. Deferred so keystrokes stay responsive while the
  // (heavier) chart + summary re-render catches up on the next idle frame.
  const calcNow = useMemo(() => computePlanner(safeState), [safeState]);
  const calc = useDeferredValue(calcNow);

  // Start Year Handler
  const handleChangeStartYear = (newStartYear: number) => {
    setState(prev => ({
      ...prev,
      startYear: Math.max(1900, Math.min(2100, newStartYear)),
    }));
  };


  // Year Handlers
  const handleAddYear = () => {
    if (state.years >= 10) return;
    const newYears = state.years + 1;
    setState(prev => {
      const newWorkers = prev.workers.map(w => ({
        ...w,
        hours: [...w.hours, w.hours[w.hours.length - 1] ?? 40],
        wage: [...w.wage, w.wage[w.wage.length - 1] ?? 0],
      }));
      const newOther = prev.other.map(o => ({
        ...o,
        amount: [...o.amount, o.amount[o.amount.length - 1] ?? 0],
      }));
      const newCol = prev.col.map(c => ({
        ...c,
        monthly: [...c.monthly, c.monthly[c.monthly.length - 1] ?? 0],
      }));

      const newCustomSavings: Record<string, CustomSavingsFund> = {};
      Object.keys(prev.customSavings || {}).forEach(k => {
        const fund = prev.customSavings[k];
        newCustomSavings[k] = {
          ...fund,
          monthly: [...fund.monthly, fund.monthly[fund.monthly.length - 1] ?? 0],
        };
      });

      return {
        ...prev,
        years: newYears,
        workers: newWorkers,
        other: newOther,
        col: newCol,
        st: [...prev.st, prev.st[prev.st.length - 1] || 'CA'],
        deps: [...prev.deps, prev.deps[prev.deps.length - 1] ?? 0],
        additionalDeductions: [...(prev.additionalDeductions || []), 0],
        retireRate: [...prev.retireRate, prev.retireRate[prev.retireRate.length - 1] ?? 0],
        employerMatchRate: [...(prev.employerMatchRate || []), prev.employerMatchRate?.[prev.employerMatchRate.length - 1] ?? 0],
        customSavings: newCustomSavings,
      };
    });
  };

  const handleRemoveYear = () => {
    if (state.years <= 1) return;
    const newYears = state.years - 1;
    setState(prev => {
      const newCustomSavings: Record<string, CustomSavingsFund> = {};
      Object.keys(prev.customSavings || {}).forEach(k => {
        const fund = prev.customSavings[k];
        newCustomSavings[k] = {
          ...fund,
          monthly: fund.monthly.slice(0, newYears),
        };
      });

      return {
        ...prev,
        years: newYears,
        workers: prev.workers.map(w => ({
          ...w,
          hours: w.hours.slice(0, newYears),
          wage: w.wage.slice(0, newYears),
        })),
        other: prev.other.map(o => ({
          ...o,
          amount: o.amount.slice(0, newYears),
        })),
        col: prev.col.map(c => ({
          ...c,
          monthly: c.monthly.slice(0, newYears),
        })),
        st: prev.st.slice(0, newYears),
        deps: prev.deps.slice(0, newYears),
        additionalDeductions: (prev.additionalDeductions || []).slice(0, newYears),
        retireRate: prev.retireRate.slice(0, newYears),
        employerMatchRate: (prev.employerMatchRate || []).slice(0, newYears),
        customSavings: newCustomSavings,
      };
    });
  };

  // Move Section
  const handleMoveSection = (secId: string, dir: 'up' | 'down') => {
    setState(prev => {
      const order = [...prev.sectionOrder];
      const idx = order.indexOf(secId);
      if (dir === 'up' && idx > 0) {
        const temp = order[idx - 1];
        order[idx - 1] = secId;
        order[idx] = temp;
      } else if (dir === 'down' && idx < order.length - 1) {
        const temp = order[idx + 1];
        order[idx + 1] = secId;
        order[idx] = temp;
      }
      return { ...prev, sectionOrder: order };
    });
  };

  // Workers
  const handleUpdateWorker = (
    idx: number,
    field: 'name' | 'frequency' | 'hours' | 'wage',
    value: string | number,
    yearIdx?: number
  ) => {
    setState(prev => {
      const updated = [...prev.workers];
      if (!updated[idx]) return prev;
      if (field === 'name') {
        updated[idx] = { ...updated[idx], name: String(value) };
      } else if (field === 'frequency') {
        updated[idx] = { ...updated[idx], frequency: value as IncomeFrequency };
      } else if (yearIdx !== undefined && (field === 'wage' || field === 'hours')) {
        const arr = [...updated[idx][field]];
        arr[yearIdx] = num(value);
        updated[idx] = { ...updated[idx], [field]: arr };
      }
      return { ...prev, workers: updated };
    });
  };

  const handleAddWorker = () => {
    setState(prev => ({
      ...prev,
      workers: [
        ...prev.workers,
        {
          id: `w-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          name: 'New Income Earner',
          frequency: 'Annually',
          hours: Array(prev.years).fill(40),
          wage: Array(prev.years).fill(60000),
        },
      ],
    }));
  };

  const handleRemoveWorker = (idx: number) => {
    setState(prev => {
      // Keep at least one income earner so the table and derived counts stay valid.
      if (prev.workers.length <= 1) return prev;
      return { ...prev, workers: prev.workers.filter((_, i) => i !== idx) };
    });
  };

  const handleReorderWorkers = (startIndex: number, endIndex: number) => {
    setState(prev => {
      const result = Array.from(prev.workers);
      const [removed] = result.splice(startIndex, 1);
      result.splice(endIndex, 0, removed);
      return { ...prev, workers: result };
    });
  };


  // Other Income
  const handleUpdateOther = (
    idx: number,
    field: 'name' | 'frequency' | 'amount',
    value: string | number,
    yearIdx?: number
  ) => {
    setState(prev => {
      const updated = [...prev.other];
      if (!updated[idx]) return prev;
      if (field === 'name') {
        updated[idx] = { ...updated[idx], name: String(value) };
      } else if (field === 'frequency') {
        updated[idx] = { ...updated[idx], frequency: value as PayoutFrequency };
      } else if (yearIdx !== undefined && field === 'amount') {
        const arr = [...updated[idx].amount];
        arr[yearIdx] = num(value);
        updated[idx] = { ...updated[idx], amount: arr };
      }
      return { ...prev, other: updated };
    });
  };

  const handleAddOther = () => {
    setState(prev => ({
      ...prev,
      other: [
        ...prev.other,
        {
          id: `o-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          name: 'New Income Source',
          frequency: 'Monthly',
          amount: Array(prev.years).fill(0),
        },
      ],
    }));
  };

  const handleRemoveOther = (idx: number) => {
    setState(prev => ({
      ...prev,
      other: prev.other.filter((_, i) => i !== idx),
    }));
  };

  const handleReorderOther = (startIndex: number, endIndex: number) => {
    setState(prev => {
      const result = Array.from(prev.other);
      const [removed] = result.splice(startIndex, 1);
      result.splice(endIndex, 0, removed);
      return { ...prev, other: result };
    });
  };


  // Expenses
  const handleUpdateExpense = (
    idx: number,
    field: 'name' | 'cat' | 'monthly',
    value: any,
    yearIdx?: number
  ) => {
    setState(prev => {
      const updated = [...prev.col];
      if (!updated[idx]) return prev;
      if (field === 'name') {
        updated[idx] = { ...updated[idx], name: String(value) };
      } else if (field === 'cat') {
        updated[idx] = { ...updated[idx], cat: String(value) };
      } else if (yearIdx !== undefined) {
        const arr = [...updated[idx].monthly];
        arr[yearIdx] = num(value);
        updated[idx] = { ...updated[idx], monthly: arr };
      }
      return { ...prev, col: updated };
    });
  };

  const handleAddExpense = (cat?: string) => {
    setState(prev => {
      const targetCat = cat || (prev.catOrder[0] || 'Housing');
      const newRow: ExpenseItem = {
        id: `c-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        name: 'New Expense',
        cat: targetCat,
        monthly: Array(prev.years).fill(0),
      };
      return {
        ...prev,
        col: [...prev.col, newRow],
      };
    });
  };

  const handleAddCategory = () => {
    setState(prev => {
      const newCat = `Category ${prev.catOrder.length + 1}`;
      const newRow: ExpenseItem = {
        id: `c-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        name: 'New Item',
        cat: newCat,
        monthly: Array(prev.years).fill(0),
      };
      return {
        ...prev,
        catOrder: [...prev.catOrder, newCat],
        col: [...prev.col, newRow],
      };
    });
  };

  const handleRemoveExpense = (idx: number) => {
    setState(prev => ({
      ...prev,
      col: prev.col.filter((_, i) => i !== idx),
    }));
  };

  const handleReorderCategoryRows = (cat: string, startIndex: number, endIndex: number) => {
    setState(prev => {
      const catRows = prev.col.filter(r => (r.cat || 'Other') === cat);
      const otherRows = prev.col.filter(r => (r.cat || 'Other') !== cat);
      
      const [moved] = catRows.splice(startIndex, 1);
      catRows.splice(endIndex, 0, moved);

      return {
        ...prev,
        col: [...otherRows, ...catRows],
      };
    });
  };

  const handleReorderCategories = (startIndex: number, endIndex: number) => {
    setState(prev => {
      const result = Array.from(prev.catOrder);
      const [removed] = result.splice(startIndex, 1);
      result.splice(endIndex, 0, removed);
      return { ...prev, catOrder: result };
    });
  };

  const handleToggleCategoryCollapse = (cat: string) => {
    setState(prev => ({
      ...prev,
      collapsedCats: {
        ...prev.collapsedCats,
        [cat]: !prev.collapsedCats[cat],
      },
    }));
  };

  const handleRenameCategory = (oldCat: string, newCat: string) => {
    if (!newCat.trim() || oldCat === newCat) return;
    setState(prev => ({
      ...prev,
      catOrder: prev.catOrder.map(c => (c === oldCat ? newCat : c)),
      col: prev.col.map(r => ((r.cat || 'Other') === oldCat ? { ...r, cat: newCat } : r)),
    }));
  };

  const handleSortExpenses = (dir: 'desc' | 'asc') => {
    setState(prev => {
      const catTotals: Record<string, number> = {};
      prev.col.forEach(r => {
        const cat = r.cat || 'Other';
        if (!catTotals[cat]) catTotals[cat] = 0;
        const rowSum = r.monthly.reduce((sum, val) => sum + num(val), 0);
        catTotals[cat] += rowSum;
      });

      const sortedCatOrder = [...prev.catOrder].sort((a, b) => {
        const diff = (catTotals[b] || 0) - (catTotals[a] || 0);
        return dir === 'desc' ? diff : -diff;
      });

      const sortedCol = [...prev.col].sort((a, b) => {
        const catA = a.cat || 'Other';
        const catB = b.cat || 'Other';
        const catDiff = sortedCatOrder.indexOf(catA) - sortedCatOrder.indexOf(catB);
        if (catDiff !== 0) return catDiff;
        const sumA = a.monthly.reduce((sum, val) => sum + num(val), 0);
        const sumB = b.monthly.reduce((sum, val) => sum + num(val), 0);
        return dir === 'desc' ? sumB - sumA : sumA - sumB;
      });

      return {
        ...prev,
        catOrder: sortedCatOrder,
        col: sortedCol,
      };
    });
  };


  // Retirement & Custom Savings
  const handleAddCustomSavings = (name: string, targetAmount?: number) => {
    const fundId = `fund-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`;
    const colors = ['#3B82F6', '#10B981', '#F59E0B', '#8B5CF6', '#EC4899', '#06B6D4'];
    const assignedColor = colors[Object.keys(state.customSavings || {}).length % colors.length];

    const newFund: CustomSavingsFund = {
      id: fundId,
      name,
      targetAmount,
      color: assignedColor,
      enabledInChart: true,
      monthly: Array(state.years || 1).fill(0),
    };

    setState(prev => ({
      ...prev,
      customSavings: {
        ...(prev.customSavings || {}),
        [fundId]: newFund,
      },
    }));
  };

  const handleRemoveCustomSavings = (fundId: string) => {
    setState(prev => {
      const updated = { ...(prev.customSavings || {}) };
      delete updated[fundId];
      return { ...prev, customSavings: updated };
    });
  };

  const handleUpdateCustomSavings = (
    fundId: string,
    field: 'name' | 'color' | 'enabledInChart' | 'targetAmount' | 'monthly',
    value: any,
    yearIdx?: number
  ) => {
    setState(prev => {
      const fund = prev.customSavings?.[fundId];
      if (!fund) return prev;

      let updatedFund = { ...fund };
      if (field === 'name') updatedFund.name = String(value);
      if (field === 'color') updatedFund.color = String(value);
      if (field === 'enabledInChart') updatedFund.enabledInChart = Boolean(value);
      if (field === 'targetAmount') updatedFund.targetAmount = value ? Number(value) : undefined;
      if (field === 'monthly' && yearIdx !== undefined) {
        const arr = [...fund.monthly];
        arr[yearIdx] = num(value);
        updatedFund.monthly = arr;
      }

      return {
        ...prev,
        customSavings: {
          ...prev.customSavings,
          [fundId]: updatedFund,
        },
      };
    });
  };

  // Check if a section is currently highlighted based on active category
  const isSectionHighlighted = (secId: string) => {
    if (activeCategory === 'all') return true;
    if (activeCategory === 'income' && secId === 'sec-income') return true;
    if (activeCategory === 'expenses' && secId === 'sec-expenses') return true;
    if (activeCategory === 'taxes' && secId === 'sec-taxes') return true;
    if (activeCategory === 'retire' && secId === 'sec-retire') return true;
    if (activeCategory === 'summary' && secId === 'sec-summary') return true;
    return false;
  };

  // Dynamically update column descriptions based on which category is scrolled into view
  useEffect(() => {
    let rafPending = false;
    const onScrollOrResize = () => {
      if (rafPending) return;
      rafPending = true;
      requestAnimationFrame(() => {
        rafPending = false;
        checkVisibleCategory();
      });
    };
    const checkVisibleCategory = () => {
      const headerEl = document.getElementById('sticky-header-container');
      const headerBottom = headerEl ? headerEl.getBoundingClientRect().bottom : 120;

      // 3. Update active scrolled category
      if (activeCategory === 'all') {
        const secOrder = state.sectionOrder || ['sec-income', 'sec-taxes', 'sec-expenses', 'sec-retire', 'sec-summary'];
        const secMap: Record<string, NavCategory> = {
          'sec-income': 'income',
          'sec-taxes': 'taxes',
          'sec-expenses': 'expenses',
          'sec-retire': 'retire',
          'sec-summary': 'summary',
        };

        let activeFound: NavCategory = 'income';

        for (const secId of secOrder) {
          const el = document.getElementById(secId);
          if (el) {
            const rect = el.getBoundingClientRect();
            if (rect.top <= headerBottom + 100 && rect.bottom > headerBottom + 30) {
              activeFound = secMap[secId] || 'income';
              break;
            } else if (rect.top <= headerBottom + 100) {
              activeFound = secMap[secId] || 'income';
            }
          }
        }

        setScrolledCategory(activeFound);
      } else {
        setScrolledCategory(activeCategory);
      }
    };

    window.addEventListener('scroll', onScrollOrResize, { passive: true });
    window.addEventListener('resize', onScrollOrResize, { passive: true });
    checkVisibleCategory();

    return () => {
      window.removeEventListener('scroll', onScrollOrResize);
      window.removeEventListener('resize', onScrollOrResize);
    };
  }, [activeCategory, state.sectionOrder]);

  // Section Render Map
  const renderSection = (secId: string) => {
    const isHighlighted = isSectionHighlighted(secId);
    switch (secId) {
      case 'sec-income':
        return (
          <IncomeSection
            key="sec-income"
            years={state.years}
            viewMode={state.viewMode}
            isEditMode={state.isEditMode}
            workers={state.workers}
            other={state.other}
            showOtherIncome={state.showOtherIncome}
            onUpdateWorker={handleUpdateWorker}
            onAddWorker={handleAddWorker}
            onRemoveWorker={handleRemoveWorker}
            onReorderWorkers={handleReorderWorkers}
            onUpdateOther={handleUpdateOther}
            onAddOther={handleAddOther}
            onRemoveOther={handleRemoveOther}
            onReorderOther={handleReorderOther}
            onToggleOtherIncome={show => setState(prev => ({ ...prev, showOtherIncome: show }))}
            onMoveSection={dir => handleMoveSection('sec-income', dir)}
            isHighlighted={isHighlighted}
          />
        );

      case 'sec-taxes':
        return (
          <TaxSection
            key="sec-taxes"
            years={state.years}
            isEditMode={state.isEditMode}
            taxStatus={state.taxStatus}
            fica={state.fica}
            st={state.st}
            deps={state.deps}
            additionalDeductions={safeState.additionalDeductions}
            calc={calc}
            onChangeTaxStatus={status => setState(prev => ({ ...prev, taxStatus: status as FilingStatus }))}
            onChangeFica={checked => setState(prev => ({ ...prev, fica: checked }))}
            onChangeState={(y, val) =>
              setState(prev => {
                const arr = [...prev.st];
                arr[y] = val;
                return { ...prev, st: arr };
              })
            }
            onChangeDeps={(y, val) =>
              setState(prev => {
                const arr = [...prev.deps];
                arr[y] = val;
                return { ...prev, deps: arr };
              })
            }
            onChangeAdditionalDeductions={(y, val) =>
              setState(prev => {
                const arr = [...(prev.additionalDeductions || Array(prev.years).fill(0))];
                arr[y] = val;
                return { ...prev, additionalDeductions: arr };
              })
            }
            onMoveSection={dir => handleMoveSection('sec-taxes', dir)}
            isHighlighted={isHighlighted}
          />
        );

      case 'sec-expenses':
        return (
          <ExpensesSection
            key="sec-expenses"
            years={state.years}
            viewMode={state.viewMode}
            isEditMode={state.isEditMode}
            col={safeState.col}
            catOrder={state.catOrder}
            collapsedCats={state.collapsedCats}
            colIntensity={state.colIntensity}
            colContrast={state.colContrast}
            colHue={state.colHue}
            calc={calc}
            onUpdateExpense={handleUpdateExpense}
            onAddExpense={handleAddExpense}
            onAddCategory={handleAddCategory}
            onRemoveExpense={handleRemoveExpense}
            onReorderCategoryRows={handleReorderCategoryRows}
            onReorderCategories={handleReorderCategories}
            onToggleCategoryCollapse={handleToggleCategoryCollapse}
            onRenameCategory={handleRenameCategory}
            onSortExpenses={handleSortExpenses}
            onChangeIntensity={val => setState(prev => ({ ...prev, colIntensity: val }))}
            onChangeContrast={val => setState(prev => ({ ...prev, colContrast: val }))}
            onChangeHue={val => setState(prev => ({ ...prev, colHue: val }))}
            onMoveSection={dir => handleMoveSection('sec-expenses', dir)}
            isHighlighted={isHighlighted}
          />
        );

      case 'sec-retire':
        return (
          <RetirementSection
            key="sec-retire"
            years={state.years}
            viewMode={state.viewMode}
            isEditMode={state.isEditMode}
            retireRate={state.retireRate}
            employerMatchRate={safeState.employerMatchRate}
            customSavings={safeState.customSavings}
            calc={calc}
            onChangeRate={(y, val) =>
              setState(prev => {
                const arr = [...prev.retireRate];
                arr[y] = val;
                return { ...prev, retireRate: arr };
              })
            }
            onChangeEmployerMatch={(y, val) =>
              setState(prev => {
                const arr = [...(prev.employerMatchRate || Array(prev.years).fill(0))];
                arr[y] = val;
                return { ...prev, employerMatchRate: arr };
              })
            }
            onAddCustomSavings={handleAddCustomSavings}
            onRemoveCustomSavings={handleRemoveCustomSavings}
            onUpdateCustomSavings={handleUpdateCustomSavings}
            onMoveSection={dir => handleMoveSection('sec-retire', dir)}
            isHighlighted={isHighlighted}
          />
        );

      case 'sec-summary':
        return (
          <SummarySection
            key="sec-summary"
            state={safeState}
            calc={calc}
            onChangeGraphType={type => setState(prev => ({ ...prev, graphType: type }))}
            onToggleSeries={(k, val) =>
              setState(prev => ({
                ...prev,
                graphToggles: { ...prev.graphToggles, [k]: val },
              }))
            }
            onChangeColor={(k, color) =>
              setState(prev => ({
                ...prev,
                barColors: { ...prev.barColors, [k]: color },
              }))
            }
            onMoveSection={dir => handleMoveSection('sec-summary', dir)}
            isHighlighted={isHighlighted}
          />
        );

      default:
        return null;
    }
  };


  return (
    <div className="min-h-screen bg-[var(--bg)] text-[var(--text)] transition-colors duration-200">
      {/* Sticky Top Header Bar with Attached Category Navigation */}
      <StickyHeader
        state={safeState}
        activeCategory={activeCategory}
        effectiveCategory={activeCategory === 'all' ? scrolledCategory : activeCategory}
        onSelectCategory={cat => setActiveCategory(cat)}
        onAddYear={handleAddYear}
        onRemoveYear={handleRemoveYear}
        onToggleDarkMode={() => {
          userChoseThemeRef.current = true;
          setState(prev => ({ ...prev, darkMode: !prev.darkMode }));
        }}
        onToggleEditMode={() => setState(prev => ({ ...prev, isEditMode: !prev.isEditMode }))}
        onResetDefaults={() => setState(getDefaultSampleState())}
        onClearToBlank={() => setState(getCleanEmptyState(state.years || 3))}
        onChangeStartYear={handleChangeStartYear}
      />

      {/* Main Container */}
      <main className="max-w-[1850px] w-full mx-auto px-3 sm:px-5 lg:px-6 pt-4 pb-20">
        {/* All sections stay mounted; a category filter just hides the rest,
            so switching categories never tears down / rebuilds the DOM. */}
        <div className="flex flex-col">
          {state.sectionOrder.map(secId => {
            const cat = secId.replace('sec-', '') as NavCategory;
            const visible = activeCategory === 'all' || activeCategory === cat;
            return (
              <div id={secId} key={secId} hidden={!visible}>
                {renderSection(secId)}
              </div>
            );
          })}
        </div>

        {/* Footnote */}
        <footer className="mt-8 pt-4 border-t border-[var(--border)] text-center text-[11px] text-[var(--muted2)]">
          Figures are projections based on the inputs above and 2025 tax brackets — not formal financial or tax advice.
        </footer>
      </main>

    </div>
  );
}
