import React from "react";
import { Link, useNavigate } from "react-router-dom";
import { Home, ArrowLeft, Compass, Sparkles, Orbit } from "lucide-react";

const NotFound = () => {
  const navigate = useNavigate();

  return (
    <main className="nv-404">
      {/* ambient aurora */}
      <span className="nv-404__aurora nv-404__aurora--a" aria-hidden />
      <span className="nv-404__aurora nv-404__aurora--b" aria-hidden />
      <span className="nv-404__aurora nv-404__aurora--c" aria-hidden />
      <span className="nv-404__grid" aria-hidden />

      <div className="nv-404__content">
        {/* ═══════ ORB ═══════ */}
        <div className="nv-404__orb-wrap">
          <span className="nv-404__glow" aria-hidden />
          <span className="nv-404__ring nv-404__ring--dashed" aria-hidden />
          <span className="nv-404__ring nv-404__ring--pulse" aria-hidden />
          <span
            className="nv-404__ring nv-404__ring--pulse"
            style={{ animationDelay: "600ms" }}
            aria-hidden
          />

          <div className="nv-404__orb">
            <span className="nv-404__num">404</span>
          </div>

          <Sparkles
            className="nv-404__spark nv-404__spark--a"
            strokeWidth={2.2}
          />
          <Sparkles
            className="nv-404__spark nv-404__spark--b"
            strokeWidth={2.2}
          />
          <Orbit className="nv-404__spark nv-404__spark--c" strokeWidth={2} />
        </div>

        {/* ═══════ TEXT ═══════ */}
        <span className="nv-404__eyebrow">
          <Compass className="size-3.5" strokeWidth={2.2} />
          Signal lost
        </span>

        <h1 className="nv-404__title">
          Lost in <em>space.</em>
        </h1>

        <p className="nv-404__sub">
          The page you're looking for doesn't exist, or it drifted into another
          orbit. Let's get you back on track.
        </p>

        {/* ═══════ ACTIONS ═══════ */}
        <div className="nv-404__actions">
          <Link to="/" className="nv-404__cta nv-404__cta--primary">
            <Home className="size-4" strokeWidth={2.2} />
            Back to home
          </Link>
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="nv-404__cta nv-404__cta--ghost"
          >
            <ArrowLeft className="size-4" strokeWidth={2.2} />
            Go back
          </button>
        </div>

        {/* ═══════ FOOTER ═══════ */}
        <div className="nv-404__foot">
          <span className="nv-404__dot" />
          <span>Nova · Keep exploring</span>
        </div>
      </div>
    </main>
  );
};

export default NotFound;
