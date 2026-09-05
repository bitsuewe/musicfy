import React from 'react';
import { useNavigate } from 'react-router-dom';
import { WifiOff, Download, RotateCcw, ArrowRight } from 'lucide-react';

export default function OfflineNotice({
  title = "You're offline",
  description = "Check your connection and try again, or listen to the songs you've downloaded.",
  onRetry = null,
  compact = false
}) {
  const navigate = useNavigate();

  if (compact) {
    return (
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-4 rounded-2xl bg-[#18181C] border border-white/10 text-white animate-fadeIn">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center shrink-0">
            <WifiOff className="w-4 h-4 text-[#10B981]" />
          </div>
          <div>
            <p className="text-xs font-bold text-white leading-tight">{title}</p>
            <p className="text-[11px] text-[#A1A1AA] leading-snug">{description}</p>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0 w-full sm:w-auto">
          {onRetry && (
            <button
              onClick={onRetry}
              className="flex-1 sm:flex-initial px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Retry</span>
            </button>
          )}
          <button
            onClick={() => navigate('/library?tab=downloads')}
            className="flex-1 sm:flex-initial px-3.5 py-1.5 rounded-xl bg-[#10B981] hover:bg-[#059669] text-black text-xs font-extrabold flex items-center justify-center gap-1.5 shadow-md shadow-[#10B981]/20 transition-all"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Downloads</span>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center text-center p-8 sm:p-12 my-6 rounded-3xl bg-[#121216] border border-white/10 max-w-lg mx-auto shadow-2xl animate-fadeIn select-none">
      {/* YouTube Style Pulsing Wi-Fi Off Icon */}
      <div className="relative mb-5">
        <div className="w-20 h-20 rounded-full bg-white/5 border border-white/10 flex items-center justify-center shadow-inner">
          <WifiOff className="w-9 h-9 text-[#10B981]" />
        </div>
        <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-[#10B981] animate-ping opacity-60" />
      </div>

      <h3 className="text-xl sm:text-2xl font-black text-white tracking-tight mb-2">
        {title}
      </h3>
      <p className="text-xs sm:text-sm text-[#A1A1AA] max-w-sm leading-relaxed mb-6 font-medium">
        {description}
      </p>

      <div className="flex flex-col sm:flex-row items-center gap-3 w-full sm:w-auto">
        <button
          onClick={() => navigate('/library?tab=downloads')}
          className="w-full sm:w-auto px-6 py-3 rounded-2xl bg-gradient-to-r from-[#10B981] to-[#34D399] text-black font-extrabold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-lg shadow-[#10B981]/30 hover:scale-105 active:scale-95 transition-all"
        >
          <Download className="w-4 h-4" />
          <span>Explore Offline Downloads</span>
          <ArrowRight className="w-3.5 h-3.5 ml-0.5" />
        </button>

        {onRetry && (
          <button
            onClick={onRetry}
            className="w-full sm:w-auto px-5 py-3 rounded-2xl bg-white/10 hover:bg-white/20 border border-white/15 text-white font-bold text-xs sm:text-sm flex items-center justify-center gap-2 transition-all active:scale-95"
          >
            <RotateCcw className="w-4 h-4" />
            <span>Try Again</span>
          </button>
        )}
      </div>
    </div>
  );
}
