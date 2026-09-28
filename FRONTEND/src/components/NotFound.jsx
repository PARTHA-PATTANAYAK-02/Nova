import React from "react";
import { Link, useNavigate } from "react-router-dom";
import { Home, ArrowLeft, Compass } from "lucide-react";

/**
 * 404 — Not Found page
 * Shows a friendly message + options to go home or go back.
 */
const NotFound = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen w-full flex items-center justify-center px-4 py-10 bg-[var(--background)]">
      <div className="w-full max-w-md text-center animate-fade-in">
        {/* Visual */}
        <div className="relative mb-6">
          {/* Glow */}
          <div
            className="absolute inset-0 rounded-full opacity-25 blur-3xl"
            style={{
              background:
                "radial-gradient(circle, var(--primary) 0%, transparent 70%)",
            }}
          />

          {/* Orb */}
          <div className="relative mx-auto w-24 h-24 rounded-full bg-[var(--surface)] border border-[var(--border)] shadow-[var(--shadow-lg)] flex items-center justify-center">
            <span
              className="text-4xl font-bold tracking-tighter"
              style={{
                fontFamily: "var(--font-display)",
                color: "var(--primary)",
              }}
            >
              404
            </span>
          </div>
        </div>

        {/* Text */}
        <h1
          className="text-2xl md:text-3xl font-bold text-[var(--foreground)] tracking-tight"
          style={{ fontFamily: "var(--font-display)" }}
        >
          Lost in space
        </h1>

        <p className="mt-2 text-sm text-[var(--muted-foreground)] max-w-xs mx-auto leading-relaxed">
          The page you're looking for doesn't exist, or it may have been moved.
          Let's get you back on track.
        </p>

        {/* Actions */}
        <div className="mt-6 flex flex-col sm:flex-row items-center justify-center gap-2.5">
          <Link
            to="/"
            className="
              inline-flex items-center justify-center gap-2
              h-10 px-5 rounded-full
              text-sm font-semibold
              transition-all duration-200
              active:scale-95
            "
            style={{
              background: "var(--primary)",
              color: "var(--primary-foreground)",
            }}
          >
            <Home className="w-4 h-4" strokeWidth={2} />
            Go home
          </Link>

          <button
            type="button"
            onClick={() => navigate(-1)}
            className="
              inline-flex items-center justify-center gap-2
              h-10 px-5 rounded-full
              text-sm font-semibold
              border border-[var(--border-strong)]
              text-[var(--foreground)]
              hover:bg-[var(--surface-2)]
              transition-all duration-200
              active:scale-95
            "
          >
            <ArrowLeft className="w-4 h-4" strokeWidth={2} />
            Go back
          </button>
        </div>

        {/* Footer hint */}
        <div className="mt-8 flex items-center justify-center gap-2 text-[11px] text-[var(--muted-foreground)]">
          <Compass className="w-3 h-3" strokeWidth={2} />
          <span>Nova · Keep exploring</span>
        </div>
      </div>
    </div>
  );
};

export default NotFound;
