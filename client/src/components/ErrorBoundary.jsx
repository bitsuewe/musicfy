import React from 'react';
import { WifiOff, RefreshCw, HardDrive, Music } from 'lucide-react';

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.warn('Musicfy ErrorBoundary caught an error:', error, errorInfo);
  }

  handleReload = () => {
    window.location.reload();
  };

  handleGoOffline = () => {
    this.setState({ hasError: false, error: null });
    window.location.href = '/library?tab=downloads';
  };

  render() {
    if (this.state.hasError) {
      const isOffline = typeof navigator !== 'undefined' && !navigator.onLine;

      return (
        <div className="flex flex-col items-center justify-center min-h-screen w-screen bg-[#09090B] text-[#FAFAFA] p-6 font-['Plus_Jakarta_Sans',sans-serif] select-none">
          <div className="max-w-md w-full bg-[#18181C] border border-white/10 rounded-2xl p-8 shadow-2xl flex flex-col items-center text-center space-y-5 animate-fadeIn">
            {/* Glow Icon */}
            <div className="w-16 h-16 rounded-full bg-[#10B981]/15 border border-[#10B981]/30 flex items-center justify-center shadow-lg shadow-[#10B981]/10">
              {isOffline ? (
                <WifiOff className="w-8 h-8 text-[#10B981]" />
              ) : (
                <Music className="w-8 h-8 text-[#10B981]" />
              )}
            </div>

            <div className="space-y-2">
              <h1 className="text-2xl font-black tracking-tight text-white">
                {isOffline ? "You're Offline" : "Musicfy Player"}
              </h1>
              <p className="text-xs sm:text-sm text-[#A1A1AA] leading-relaxed">
                {isOffline
                  ? "You're currently disconnected from the internet. Your downloaded music and offline library are still available."
                  : "An unexpected error occurred. You can reload or jump straight into your offline library."}
              </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 w-full pt-2">
              <button
                onClick={this.handleGoOffline}
                className="flex-1 py-3 px-4 rounded-xl bg-[#10B981] hover:bg-[#059669] text-black font-extrabold text-xs flex items-center justify-center gap-2 shadow-lg transition-all active:scale-95 cursor-pointer"
              >
                <HardDrive className="w-4 h-4" />
                <span>Downloaded Songs</span>
              </button>

              <button
                onClick={this.handleReload}
                className="flex-1 py-3 px-4 rounded-xl bg-white/10 hover:bg-white/15 text-white font-bold text-xs flex items-center justify-center gap-2 border border-white/10 transition-all active:scale-95 cursor-pointer"
              >
                <RefreshCw className="w-4 h-4" />
                <span>Reload Page</span>
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
