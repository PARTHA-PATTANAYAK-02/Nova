import { AlertCircle, Loader2, RefreshCw, Sparkles } from "lucide-react";
import { createElement } from "react";

/* =========================================================
   LOADING STATE — Glass skeleton with spinner
   ========================================================= */
export const LoadingState = ({ message = "Loading...", className = "" }) => (
  <div
    className={`flex items-center justify-center gap-3 p-10 ${className}`}
    role="status"
  >
    <div className="relative">
      <div className="absolute inset-0 rounded-full bg-violet-500/30 blur-lg animate-pulse" />

      <div className="relative w-9 h-9 rounded-full bg-gradient-to-br from-violet-500/25 to-cyan-500/25 border border-white/10 flex items-center justify-center">
        <Loader2
          className="h-4 w-4 animate-spin text-white/80"
          aria-hidden="true"
        />
      </div>
    </div>

    <span className="text-sm text-white/50 font-medium">{message}</span>
  </div>
);

/* =========================================================
   ERROR STATE — Glass card with retry
   ========================================================= */
export const ErrorState = ({ message, onRetry, className = "" }) => (
  <div
    className={`glass rounded-[28px] p-10 flex flex-col items-center justify-center text-center ${className}`}
    role="alert"
  >
    <div className="w-14 h-14 rounded-full bg-rose-500/10 border border-rose-500/20 flex items-center justify-center mb-4">
      <AlertCircle className="h-6 w-6 text-rose-300" aria-hidden="true" />
    </div>

    <p className="font-display text-base font-semibold text-white">
      Something went wrong
    </p>

    <p className="mt-1.5 text-sm text-white/50 max-w-xs">{message}</p>

    {onRetry && (
      <button
        type="button"
        onClick={onRetry}
        className="mt-5 inline-flex items-center gap-2 text-xs font-semibold px-5 py-2.5 rounded-full bg-gradient-to-r from-violet-500 to-cyan-500 text-white shadow-[0_0_20px_rgba(124,92,255,0.4)] hover:opacity-90 active:scale-95 transition-all duration-200"
      >
        <RefreshCw className="h-3.5 w-3.5" aria-hidden="true" />
        Try again
      </button>
    )}
  </div>
);

/* =========================================================
   EMPTY STATE — Reusable empty state
   ========================================================= */
export const EmptyState = ({
  icon: IconComponent = Sparkles,
  title = "Nothing here yet",
  description = "",
  className = "",
}) => (
  <div
    className={`glass rounded-[28px] py-16 px-6 flex flex-col items-center justify-center text-center ${className}`}
  >
    <div className="relative mb-4">
      <div className="absolute inset-0 rounded-full bg-gradient-to-br from-violet-500 to-cyan-500 opacity-20 blur-2xl animate-pulse" />

      <div className="relative w-14 h-14 rounded-full bg-gradient-to-br from-violet-500/20 to-cyan-500/20 border border-white/10 flex items-center justify-center">
        {createElement(IconComponent, {
          className: "w-6 h-6 text-white/60",
          "aria-hidden": true,
        })}
      </div>
    </div>

    <p className="font-display text-base font-semibold text-white">{title}</p>

    {description && (
      <p className="mt-1.5 text-sm text-white/45 max-w-xs">{description}</p>
    )}
  </div>
);
