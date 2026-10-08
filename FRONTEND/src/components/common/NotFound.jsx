import React from "react";
import { Link, useNavigate } from "react-router-dom";
import { Home, ArrowLeft, Compass, Sparkles } from "lucide-react";

/**
 * Nova — 404 Not Found
 * Premium minimal design with animated aurora + floating 404.
 */
const NotFound = () => {
  const navigate = useNavigate();

  return (
    <main className="relative min-h-screen w-full overflow-hidden bg-[var(--background)]">
      {/* ===== ANIMATED AURORA BACKGROUND ===== */}
      <div className="pointer-events-none absolute inset-0 -z-0 overflow-hidden">
        <span
          className="absolute -top-24 -left-24 h-80 w-80 rounded-full opacity-25 blur-3xl animate-aurora-drift-1"
          style={{ background: "var(--primary)" }}
        />
        <span
          className="absolute -bottom-28 -right-20 h-96 w-96 rounded-full opacity-20 blur-3xl animate-aurora-drift-2"
          style={{ background: "var(--accent)" }}
        />
        <span
          className="absolute top-1/3 right-1/4 h-64 w-64 rounded-full opacity-15 blur-3xl animate-aurora-drift-3"
          style={{ background: "var(--primary)" }}
        />
      </div>

      {/* ===== CONTENT ===== */}
      <div className="relative z-10 mx-auto flex min-h-screen max-w-xl flex-col items-center justify-center px-6 py-12 text-center animate-fade-in">
        {/* Orb with 404 */}
        <div className="relative mb-8">
          {/* Pulsing glow */}
          <span
            className="absolute inset-0 rounded-full opacity-30 blur-3xl animate-pulse-glow"
            style={{ background: "var(--primary)" }}
          />

          {/* Rotating dashed ring */}
          <span
            className="absolute -inset-6 rounded-full border border-dashed animate-orbit-slow"
            style={{
              borderColor:
                "color-mix(in oklab, var(--primary) 30%, transparent)",
            }}
          />

          {/* Pulsing rings */}
          <span
            className="absolute inset-0 rounded-full border-2 animate-pulse-ring"
            style={{ borderColor: "var(--primary)" }}
          />
          <span
            className="absolute inset-0 rounded-full border-2 animate-pulse-ring"
            style={{
              borderColor: "var(--primary)",
              animationDelay: "600ms",
            }}
          />

          {/* Center orb */}
          <div
            className="relative flex h-32 w-32 items-center justify-center rounded-full border shadow-[var(--shadow-xl)]"
            style={{
              background:
                "linear-gradient(135deg, color-mix(in oklab, var(--primary) 15%, var(--surface)), var(--surface))",
              borderColor:
                "color-mix(in oklab, var(--primary) 25%, transparent)",
            }}
          >
            <span
              className="font-bold tracking-tighter text-gradient animate-404-float"
              style={{
                fontFamily: "var(--font-display)",
                fontSize: "3rem",
                lineHeight: 1,
              }}
            >
              404
            </span>
          </div>

          {/* Floating sparkles */}
          <Sparkles
            className="absolute -top-2 -right-2 h-5 w-5 animate-float"
            style={{ color: "var(--primary)" }}
            strokeWidth={2}
          />
          <Sparkles
            className="absolute -bottom-1 -left-3 h-4 w-4 animate-float-slow"
            style={{ color: "var(--accent)" }}
            strokeWidth={2}
          />
        </div>

        {/* Heading */}
        <h1
          className="text-3xl font-bold tracking-tight text-[var(--foreground)] md:text-4xl"
          style={{ fontFamily: "var(--font-display)" }}
        >
          Lost in space
        </h1>

        {/* Subtitle */}
        <p className="mt-3 max-w-sm text-sm leading-relaxed text-[var(--muted-foreground)] md:text-base">
          The page you're looking for doesn't exist, or it may have been moved
          to another orbit. Let's get you back on track.
        </p>

        {/* Actions */}
        <div className="mt-8 flex w-full flex-col items-center justify-center gap-2.5 sm:w-auto sm:flex-row">
          <Link
            to="/"
            className="
              inline-flex w-full items-center justify-center gap-2
              rounded-full px-6 py-2.5
              text-sm font-semibold
              transition-all duration-300
              hover:-translate-y-0.5 hover:shadow-[0_6px_24px_color-mix(in_oklab,var(--primary)_40%,transparent)]
              active:scale-95
              sm:w-auto
            "
            style={{
              background: "var(--primary)",
              color: "var(--primary-foreground)",
            }}
          >
            <Home className="h-4 w-4" strokeWidth={2} />
            Back to home
          </Link>

          <button
            type="button"
            onClick={() => navigate(-1)}
            className="
              inline-flex w-full items-center justify-center gap-2
              rounded-full px-6 py-2.5
              text-sm font-semibold
              border border-[var(--border-strong)]
              text-[var(--foreground)]
              transition-all duration-200
              hover:bg-[var(--surface-2)]
              active:scale-95
              sm:w-auto
            "
          >
            <ArrowLeft className="h-4 w-4" strokeWidth={2} />
            Go back
          </button>
        </div>

        {/* Footer */}
        <div className="mt-12 flex items-center justify-center gap-2 text-[11px] uppercase tracking-[0.2em] text-[var(--muted-foreground)]">
          <Compass className="h-3 w-3" strokeWidth={2.2} />
          <span>Nova · Keep exploring</span>
        </div>
      </div>
    </main>
  );
};

export default NotFound;
