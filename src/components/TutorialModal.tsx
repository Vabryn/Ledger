import React, { useEffect, useRef, useState } from 'react';
import {
  X,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  LayoutDashboard,
  Layers,
  DollarSign,
  Receipt,
  Landmark,
  PiggyBank,
  TrendingUp,
  Sliders,
  CheckCircle2,
} from 'lucide-react';

export interface TutorialStep {
  id: string;
  title: string;
  subtitle: string;
  targetId?: string;
  categoryTab?: 'all' | 'income' | 'expenses' | 'taxes' | 'retire' | 'summary';
  icon: React.ReactNode;
  content: string;
  tips?: string[];
}

interface TutorialModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectCategory?: (category: any) => void;
}

const TUTORIAL_STEPS: TutorialStep[] = [
  {
    id: 'step-header',
    title: 'Live Header & Cash Flow Dashboard',
    subtitle: 'Real-time Net Savings and Cumulative Trend',
    targetId: 'sticky-header-container',
    categoryTab: 'all',
    icon: <LayoutDashboard className="w-5 h-5 text-indigo-500" />,
    content:
      'The top sticky header stays visible as you scroll, summarizing your Year 1 Net Cash Flow and Total Accumulated Savings across your entire planning horizon. The sparkline visualization turns green during surplus periods and turns red if cash flow drops into a deficit.',
    tips: [
      'Hover over any point on the sparkline to inspect that specific year.',
      'Use the + and - buttons on the right to expand your timeline up to 10 years.',
    ],
  },
  {
    id: 'step-nav',
    title: 'Category Navigation Sub-Bar',
    subtitle: 'Streamlined section switching & quick focus',
    targetId: 'category-nav-bar',
    categoryTab: 'all',
    icon: <Layers className="w-5 h-5 text-blue-500" />,
    content:
      'The category navigation bar allows you to quickly filter down to specific sections—such as Income, Expenses, Taxes, Retirement & Savings, or Summary & Projections—or view the complete master ledger all at once.',
    tips: [
      'Badges indicate the active number of income earners, expense lines, or custom savings funds.',
      'Clicking any category scrolls the ledger and filters your view for clutter-free editing.',
    ],
  },
  {
    id: 'step-income',
    title: 'Income Earners & Wages',
    subtitle: 'Multiple earners, hourly/salary rates, and pay schedules',
    targetId: 'sec-income',
    categoryTab: 'income',
    icon: <DollarSign className="w-5 h-5 text-emerald-500" />,
    content:
      'Define multiple earners, assign custom pay frequencies (Annually, Monthly, Semi-Monthly, Bi-Weekly, Weekly, Hourly), and set baseline wages for each year. You can designate earnings as pre-tax and use the new Copy dropdowns to clone wages across all future years with one click.',
    tips: [
      'Use "Copy [Year X] ➔ [Year Y] [Apply]" to project annual pay raises effortlessly.',
      'Toggle "Edit Planner" in the header to reorder or delete income earners.',
    ],
  },
  {
    id: 'step-other-income',
    title: 'Other Income & Side Hustles',
    subtitle: 'Track variable and secondary income streams',
    targetId: 'sec-other-income',
    categoryTab: 'income',
    icon: <TrendingUp className="w-5 h-5 text-teal-500" />,
    content:
      'Log secondary income sources such as freelance gigs, quarterly dividends, annual bonuses, and rental yields. These amounts are automatically combined into your total gross income projections.',
    tips: [
      'You can hide or expand the Other Income table at any time using the toggle in Edit Mode.',
    ],
  },
  {
    id: 'step-expenses',
    title: 'Living Expenses & Smart Categories',
    subtitle: 'Detailed budget tracking with quick-add & sorting',
    targetId: 'sec-expenses',
    categoryTab: 'expenses',
    icon: <Receipt className="w-5 h-5 text-rose-500" />,
    content:
      'Keep track of expenses by category (Housing, Transportation, Food, Utilities, Healthcare, and custom groups). Click the "+" icon in any category header to instantly add new expense items, or sort items from Highest to Lowest.',
    tips: [
      'Collapse or expand individual categories to keep your workspace clean.',
      'Use the Copy dropdowns to duplicate baseline living expenses into upcoming years.',
    ],
  },
  {
    id: 'step-taxes',
    title: 'Automated Tax Estimation',
    subtitle: 'Federal brackets, FICA, and state tax calculations',
    targetId: 'sec-tax',
    categoryTab: 'taxes',
    icon: <Landmark className="w-5 h-5 text-amber-500" />,
    content:
      'Select your Tax Filing Status (Single, Married Filing Jointly, Head of Household) and choose your US State. The planner automatically calculates Federal Income Tax, Social Security & Medicare (FICA), and State Income Tax brackets.',
    tips: [
      'You can toggle between Auto State Brackets and a Custom Fixed Rate override.',
      'Adjust pre-tax deductions in income/retirement to see their immediate impact on taxable income.',
    ],
  },
  {
    id: 'step-retire',
    title: 'Retirement & Custom Savings Buckets',
    subtitle: '401(k), IRA contributions, and color-coded goal funds',
    targetId: 'sec-retire',
    categoryTab: 'retire',
    icon: <PiggyBank className="w-5 h-5 text-purple-500" />,
    content:
      'Plan pre-tax and Roth retirement contributions with optional employer matches. Create dedicated savings funds (such as Emergency Fund, Vacation, or House Down Payment) with custom color tags and target goals.',
    tips: [
      'Enable "Show in Chart" on any custom savings bucket to visualize its growth alongside gross income.',
    ],
  },
  {
    id: 'step-summary',
    title: 'Summary Matrix & Trends Visualizer',
    subtitle: 'Interactive multi-year projection graphs',
    targetId: 'sec-summary',
    categoryTab: 'summary',
    icon: <Sparkles className="w-5 h-5 text-cyan-500" />,
    content:
      'Review your complete bottom-line financial health. Switch between smooth Spline Trend Area curves and Grouped Bar comparisons. Custom series toggles let you focus on Net Savings, Gross Income, Living Costs, or specific savings funds.',
    tips: [
      'Hover over any point in the chart to see an elevated breakdown card of all active metrics.',
      'Adjust the chart height (Compact, Default, Tall, Expanded) to suit your monitor size.',
    ],
  },
  {
    id: 'step-controls',
    title: 'Planner Toolbar & Global Controls',
    subtitle: 'Dark mode, View modes, and sample templates',
    targetId: 'planner-toolbar',
    categoryTab: 'all',
    icon: <Sliders className="w-5 h-5 text-indigo-500" />,
    content:
      'Switch between Annual and Monthly ledger views to inspect monthly cash flow breakdowns. Toggle Dark/Light mode anytime, load curated sample data to explore scenarios, or click "Done Editing" when you finish updating numbers.',
    tips: [
      'Your ledger data automatically persists locally in your browser between sessions.',
      'You can restart this tutorial at any time by clicking the Tutorial button in the top bar.',
    ],
  },
];

export const TutorialModal: React.FC<TutorialModalProps> = ({
  isOpen,
  onClose,
  onSelectCategory,
}) => {
  const [currentStepIdx, setCurrentStepIdx] = useState(0);
  const dialogRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen) {
      setCurrentStepIdx(0);
    }
  }, [isOpen]);

  // Focus management: move focus into the dialog on open, restore it on close,
  // and keep Tab within the dialog while it is open.
  useEffect(() => {
    if (!isOpen) return;
    const previouslyFocused = document.activeElement as HTMLElement | null;
    dialogRef.current?.focus();

    const handleTrap = (e: KeyboardEvent) => {
      if (e.key !== 'Tab' || !dialogRef.current) return;
      const focusable = dialogRef.current.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), input, select, textarea, [tabindex]:not([tabindex="-1"])'
      );
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };
    document.addEventListener('keydown', handleTrap, true);
    return () => {
      document.removeEventListener('keydown', handleTrap, true);
      previouslyFocused?.focus?.();
    };
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;

    const step = TUTORIAL_STEPS[currentStepIdx];
    if (step.categoryTab && onSelectCategory) {
      onSelectCategory(step.categoryTab);
    }

    if (step.targetId) {
      try {
        const el = document.getElementById(step.targetId);
        if (el && typeof el.scrollIntoView === 'function') {
          el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      } catch {
        // Fallback for environments where smooth scrolling is unsupported
      }
    }
  }, [currentStepIdx, isOpen, onSelectCategory]);

  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      } else if (e.key === 'ArrowRight' || e.key === 'Enter') {
        if (currentStepIdx < TUTORIAL_STEPS.length - 1) {
          setCurrentStepIdx(prev => prev + 1);
        } else {
          onClose();
        }
      } else if (e.key === 'ArrowLeft') {
        if (currentStepIdx > 0) {
          setCurrentStepIdx(prev => prev - 1);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, currentStepIdx, onClose]);

  if (!isOpen) return null;

  const currentStep = TUTORIAL_STEPS[currentStepIdx];
  const isFirst = currentStepIdx === 0;
  const isLast = currentStepIdx === TUTORIAL_STEPS.length - 1;

  const handlePrev = () => {
    if (currentStepIdx > 0) {
      setCurrentStepIdx(prev => prev - 1);
    }
  };

  const handleNext = () => {
    if (currentStepIdx < TUTORIAL_STEPS.length - 1) {
      setCurrentStepIdx(prev => prev + 1);
    } else {
      onClose();
    }
  };

  return (
    <div
      id="tutorial-overlay"
      ref={dialogRef}
      tabIndex={-1}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/60 backdrop-blur-xs transition-opacity animate-in fade-in duration-200 outline-none"
      aria-modal="true"
      role="dialog"
      aria-label="Household Ledger tutorial walkthrough"
    >
      {/* Top Right Clear Exit Button */}
      <div className="fixed top-4 right-4 sm:top-6 sm:right-6 z-50">
        <button
          type="button"
          onClick={onClose}
          className="flex items-center gap-2 px-3.5 py-2 bg-[var(--panel)] text-[var(--text)] hover:text-white hover:bg-rose-600 border border-[var(--border)] rounded-xl shadow-lg font-sans-custom font-semibold text-xs transition cursor-pointer"
          title="Exit Tutorial (Esc)"
        >
          <X className="w-4 h-4" />
          <span>Exit Tutorial</span>
        </button>
      </div>

      {/* Tutorial Card */}
      <div className="relative w-full max-w-xl bg-[var(--panel)] text-[var(--text)] border border-[var(--border)] rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header with Step Progress */}
        <div className="px-6 pt-5 pb-4 border-b border-[var(--border)] bg-[var(--panel-alt)]/60">
          <div className="flex items-center justify-between gap-4 mb-2">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-[var(--panel)] border border-[var(--border)] shadow-xs">
                {currentStep.icon}
              </div>
              <div>
                <span className="text-[11px] font-mono-custom font-bold uppercase tracking-wider text-[var(--accent)]">
                  Step {currentStepIdx + 1} of {TUTORIAL_STEPS.length}
                </span>
                <h2 className="text-base sm:text-lg font-serif-custom font-bold text-[var(--text)] leading-tight">
                  {currentStep.title}
                </h2>
              </div>
            </div>
          </div>

          <p className="text-xs text-[var(--muted2)] font-sans-custom">
            {currentStep.subtitle}
          </p>

          {/* Progress Bar */}
          <div className="w-full h-1.5 bg-[var(--border)]/70 rounded-full mt-3 overflow-hidden">
            <div
              className="h-full bg-[var(--accent)] transition-all duration-300 rounded-full"
              style={{
                width: `${((currentStepIdx + 1) / TUTORIAL_STEPS.length) * 100}%`,
              }}
            />
          </div>
        </div>

        {/* Content Body with Crisp, Clear Typography */}
        <div className="p-6 overflow-y-auto space-y-4">
          <p className="text-sm text-[var(--text)] leading-relaxed font-sans-custom font-normal">
            {currentStep.content}
          </p>

          {currentStep.tips && currentStep.tips.length > 0 && (
            <div className="p-3.5 rounded-xl bg-[var(--panel-alt)] border border-[var(--border)]/80 space-y-2">
              <span className="text-[11px] font-bold uppercase font-mono-custom text-[var(--accent)] tracking-wider">
                Quick Tips
              </span>
              <ul className="space-y-1.5 text-xs text-[var(--muted)] font-sans-custom">
                {currentStep.tips.map((tip, idx) => (
                  <li key={idx} className="flex items-start gap-2">
                    <span className="text-[var(--accent)] font-bold text-xs mt-0.5">•</span>
                    <span>{tip}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {/* Footer Navigation Bar */}
        <div className="px-6 py-4 border-t border-[var(--border)] bg-[var(--panel-alt)]/40 flex items-center justify-between gap-4">
          {/* Back / Left Arrow */}
          <button
            type="button"
            onClick={handlePrev}
            disabled={isFirst}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold font-sans-custom border border-[var(--border)] bg-[var(--panel)] text-[var(--text)] hover:bg-[var(--panel-alt)] disabled:opacity-30 disabled:cursor-not-allowed transition cursor-pointer shadow-xs"
            title="Previous step (Left Arrow)"
          >
            <ChevronLeft className="w-4 h-4" />
            <span>Back</span>
          </button>

          {/* Step indicator dots */}
          <div className="flex items-center gap-1.5">
            {TUTORIAL_STEPS.map((_, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => setCurrentStepIdx(idx)}
                className={`w-2 h-2 rounded-full transition-all cursor-pointer ${
                  idx === currentStepIdx
                    ? 'w-6 bg-[var(--accent)]'
                    : 'bg-[var(--border)] hover:bg-[var(--muted2)]'
                }`}
                title={`Go to Step ${idx + 1}`}
              />
            ))}
          </div>

          {/* Next / Right Arrow or Finish */}
          <button
            type="button"
            onClick={handleNext}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold font-sans-custom transition cursor-pointer shadow-xs ${
              isLast
                ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                : 'bg-[var(--accent)] hover:opacity-90 text-white'
            }`}
            title={isLast ? 'Finish Tour' : 'Next step (Right Arrow)'}
          >
            <span>{isLast ? 'Finish Tour' : 'Next'}</span>
            {isLast ? (
              <CheckCircle2 className="w-4 h-4" />
            ) : (
              <ChevronRight className="w-4 h-4" />
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
