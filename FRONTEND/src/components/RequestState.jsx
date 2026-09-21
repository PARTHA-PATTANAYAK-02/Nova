import { AlertCircle, Loader2, RefreshCw, Compass } from "lucide-react";

/* =========================================================
   LOADING STATE — spinner only (no text)
   ========================================================= */
export const LoadingState = ({ message, className = "" }) => (
  <div
    className={`flex flex-col items-center justify-center gap-2 p-8 ${className}`}
    role="status"
    aria-label={message || "Loading"}
  >
    <Loader2
      className="h-5 w-5 animate-spin text-[var(--muted-foreground)]"
      strokeWidth={2}
    />
    {message && (
      <span className="text-xs text-[var(--muted-foreground)]">{message}</span>
    )}
  </div>
);

/* =========================================================
   ERROR STATE
   ========================================================= */
export const ErrorState = ({ message, onRetry, className = "" }) => (
  <div
    className={`card p-8 flex flex-col items-center justify-center text-center ${className}`}
    role="alert"
  >
    <div className="w-12 h-12 rounded-full bg-[var(--surface-2)] flex items-center justify-center mb-3">
      <AlertCircle
        className="h-5 w-5 text-[var(--danger)]"
        strokeWidth={1.8}
        aria-hidden="true"
      />
    </div>

    <p
      className="text-base font-semibold text-[var(--foreground)]"
      style={{ fontFamily: "var(--font-display)" }}
    >
      Something went wrong
    </p>
    <p className="mt-1 text-sm text-[var(--muted-foreground)] max-w-xs">
      {message}
    </p>

    {onRetry && (
      <button
        type="button"
        onClick={onRetry}
        className="mt-4 inline-flex items-center gap-1.5 text-xs font-semibold px-4 py-2 rounded-full transition-all active:scale-95"
        style={{
          background: "var(--primary)",
          color: "var(--primary-foreground)",
        }}
      >
        <RefreshCw className="h-3.5 w-3.5" strokeWidth={2} aria-hidden="true" />
        Try again
      </button>
    )}
  </div>
);

/* =========================================================
   EMPTY STATE
   ========================================================= */
export const EmptyState = ({
  icon,
  title = "Nothing here yet",
  description = "",
  className = "",
}) => {
  const Icon = icon || Compass;
  return (
    <div
      className={`card py-12 px-6 flex flex-col items-center justify-center text-center ${className}`}
    >
      <div className="w-12 h-12 rounded-full bg-[var(--surface-2)] flex items-center justify-center mb-3">
        <Icon
          className="w-5 h-5 text-[var(--muted-foreground)]"
          strokeWidth={1.8}
        />
      </div>
      <p
        className="text-base font-semibold text-[var(--foreground)]"
        style={{ fontFamily: "var(--font-display)" }}
      >
        {title}
      </p>
      {description && (
        <p className="mt-1 text-sm text-[var(--muted-foreground)] max-w-xs">
          {description}
        </p>
      )}
    </div>
  );
};
