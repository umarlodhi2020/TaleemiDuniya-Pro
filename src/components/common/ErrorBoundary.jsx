import React from 'react';
import { AlertTriangle, RefreshCw, Home, ShieldAlert } from 'lucide-react';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    this.setState({ errorInfo });
    console.error("TaleemiDunya ErrorBoundary Caught an Error:", error, errorInfo);
  }

  handleReload = () => {
    window.location.reload();
  };

  handleGoHome = () => {
    window.location.href = '#/school-admin/dashboard';
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-dark-bg text-dark-text flex flex-col items-center justify-center p-6 select-none relative z-50">
          <div className="max-w-md w-full bg-dark-card border border-red-500/30 rounded-2xl p-6 shadow-2xl space-y-5 animate-fade-in text-center">
            <div className="w-16 h-16 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-500 mx-auto animate-pulse">
              <ShieldAlert size={36} />
            </div>

            <div>
              <h2 className="text-lg font-black text-white tracking-wide">
                Oops! Display Issue Encountered
              </h2>
              <p className="text-xs text-dark-muted font-medium mt-1">
                A temporary data formatting or loading glitch occurred on this screen. Don't worry, your data is 100% safe!
              </p>
            </div>

            {this.state.error && (
              <div className="p-3 rounded-xl bg-black/40 border border-red-500/20 text-left overflow-x-auto text-[10px] font-mono text-red-400 max-h-32">
                {this.state.error.toString()}
              </div>
            )}

            <div className="flex flex-col sm:flex-row gap-3 pt-2">
              <button
                onClick={this.handleReload}
                className="flex-1 py-2.5 px-4 bg-primary-500 hover:bg-primary-600 text-white font-black text-xs rounded-xl flex items-center justify-center gap-2 transition-all shadow-lg shadow-primary-500/20"
              >
                <RefreshCw size={14} /> Reload Screen
              </button>
              <button
                onClick={this.handleGoHome}
                className="flex-1 py-2.5 px-4 bg-white/5 hover:bg-white/10 text-white font-black text-xs rounded-xl border border-white/10 flex items-center justify-center gap-2 transition-all"
              >
                <Home size={14} /> Back to Dashboard
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
