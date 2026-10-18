import { AlertCircle, Loader2, RefreshCw, Compass } from "lucide-react";

/* ═══════════════════════════════════════════════
   LOADING
   ═══════════════════════════════════════════════ */
export const LoadingState = ({ message, className = "" }) => (
  <div
    className={`nv-state nv-state--loading ${className}`}
    role="status"
    aria-label={message || "Loading"}
  >
    <div className="nv-state__loader">
      <span className="nv-state__loader-ring" aria-hidden />
      <span className="nv-state__loader-arc" aria-hidden />
      <span className="nv-state__loader-core" aria-hidden>
        <Loader2 className="size-3.5 animate-spin" strokeWidth={2.4} />
      </span>
    </div>
    {message && <span className="nv-state__msg">{message}</span>}
  </div>
);

/* ═══════════════════════════════════════════════
   ERROR
   ═══════════════════════════════════════════════ */
export const ErrorState = ({ message, onRetry, className = "" }) => (
  <div className={`nv-state nv-state--error ${className}`} role="alert">
    <span className="nv-state__orb nv-state__orb--danger" aria-hidden>
      <AlertCircle className="size-5" strokeWidth={1.9} />
    </span>

    <h3 className="nv-state__title">Something went wrong</h3>
    <p className="nv-state__sub">{message}</p>

    {onRetry && (
      <button type="button" onClick={onRetry} className="nv-state__cta">
        <RefreshCw className="size-3.5" strokeWidth={2.2} aria-hidden />
        Try again
      </button>
    )}
  </div>
);

/* ═══════════════════════════════════════════════
   EMPTY
   ═══════════════════════════════════════════════ */
export const EmptyState = ({
  icon,
  title = "Nothing here yet",
  description = "",
  className = "",
}) => {
  const Icon = icon || Compass;
  return (
    <div className={`nv-state nv-state--empty ${className}`}>
      <span className="nv-state__orb nv-state__orb--neutral" aria-hidden>
        <Icon className="size-5" strokeWidth={1.9} />
      </span>
      <h3 className="nv-state__title">{title}</h3>
      {description && <p className="nv-state__sub">{description}</p>}
    </div>
  );
};
