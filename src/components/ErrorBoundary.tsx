import React, { Component, ErrorInfo, ReactNode } from 'react';
import { STORAGE_KEY } from '../utils/taxRulesAndStarterData';
import { safeStorage } from '../utils/safeStorage';
import { AlertTriangle, RotateCcw, RefreshCw } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, errorInfo: null };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error in Household Ledger:', error, errorInfo);
    this.setState({ error, errorInfo });
  }

  private handleReload = () => {
    window.location.reload();
  };

  private handleReset = () => {
    try {
      safeStorage.removeItem(STORAGE_KEY);
    } catch {
      // Ignore
    }
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[#F5F3EE] dark:bg-[#121212] text-[#20201C] dark:text-[#F3F4F6] flex items-center justify-center p-4">
          <div className="max-w-md w-full bg-white dark:bg-[#1E1E1E] border border-amber-200 dark:border-amber-900/50 rounded-2xl p-6 sm:p-8 shadow-xl text-center">
            <div className="w-12 h-12 rounded-full bg-amber-100 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center mx-auto mb-4">
              <AlertTriangle className="w-6 h-6" />
            </div>

            <h1 className="text-xl font-bold font-serif-custom mb-2">
              Something went wrong
            </h1>
            <p className="text-xs sm:text-sm text-[#6B675C] dark:text-[#9CA3AF] mb-6 leading-relaxed">
              Household Ledger encountered an unexpected problem rendering this page. You can reload or reset to a clean state.
            </p>

            <div className="flex flex-col sm:flex-row items-center gap-2.5 justify-center mb-5">
              <button
                type="button"
                onClick={this.handleReload}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-[#26344F] dark:bg-blue-600 text-white text-xs font-semibold hover:opacity-90 transition cursor-pointer shadow-xs"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Reload Page</span>
              </button>

              <button
                type="button"
                onClick={this.handleReset}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl border border-rose-300 dark:border-rose-800/60 text-rose-700 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/30 text-xs font-semibold hover:bg-rose-100 dark:hover:bg-rose-900/40 transition cursor-pointer shadow-xs"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Reset to Sample Data</span>
              </button>
            </div>

            {this.state.error && (
              <details className="text-left mt-4 pt-4 border-t border-[#E1DCCF] dark:border-[#3A3A3A]">
                <summary className="text-[11px] text-[#9C978A] dark:text-[#6B7280] cursor-pointer hover:underline">
                  View Technical Details
                </summary>
                <pre className="mt-2 p-2.5 bg-[#F1EEE6] dark:bg-[#2A2A2A] rounded-lg text-[10px] font-mono overflow-x-auto text-rose-700 dark:text-rose-300 max-h-36">
                  {this.state.error.toString()}
                  {this.state.errorInfo?.componentStack}
                </pre>
              </details>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
