import { useEffect, useMemo } from "react";
import { Sparkles } from "lucide-react";
import { useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import Home from "@/components/feed/Home";
import MainLayout from "@/components/layout/MainLayout";

const WELCOME_DURATION_MS = 5000;

/* heading কে letter-by-letter stagger করে reveal করি */
const RevealText = ({ text }) => {
  const letters = useMemo(() => Array.from(text), [text]);
  return (
    <h1 className="nova-welcome-greeting">
      {letters.map((ch, i) => (
        <span key={i} className="reveal" style={{ "--i": i }}>
          {ch === " " ? "\u00A0" : ch}
        </span>
      ))}
    </h1>
  );
};

const WelcomeScreen = ({ greeting }) => {
  const { user } = useSelector((store) => store.auth);
  const navigate = useNavigate();

  useEffect(() => {
    const t = setTimeout(
      () => navigate("/", { replace: true }),
      WELCOME_DURATION_MS,
    );
    return () => clearTimeout(t);
  }, [navigate]);

  const message =
    greeting || `Welcome back, ${user?.fullName?.trim() || "friend"}`;

  return (
    <div className="min-h-screen">
      <MainLayout>
        <Home />
      </MainLayout>

      {/* inline zIndex — Tailwind বা কোনো library override করতে না পারে */}
      <main
        className="nova-welcome-overlay"
        style={{ zIndex: 2147483647 }}
        aria-live="polite"
      >
        <div className="nova-welcome-aurora" aria-hidden />
        <div className="nova-welcome-vignette" aria-hidden />

        <div className="nova-welcome-stage">
          {/* rings + rotating sweep + orbit dots */}
          <div className="nova-welcome-rings" aria-hidden>
            <span className="nova-welcome-ring" />
            <span className="nova-welcome-ring" />
            <span className="nova-welcome-ring" />
            <span className="nova-welcome-sweep" />
            <div className="nova-welcome-orbit">
              <i />
              <i />
              <i />
            </div>
          </div>

          {/* logo — transparent bg in both themes */}
          <div className="nova-welcome-logo-wrap">
            <img
              src="/logo.gif"
              alt="Nova"
              draggable={false}
              className="nova-welcome-logo"
            />
          </div>

          {/* message */}
          <div className="nova-welcome-message">
            <span className="nova-welcome-kicker">
              <Sparkles className="h-3.5 w-3.5" />
              Your orbit starts here
            </span>
            <RevealText text={message} />
          </div>
        </div>

        {/* thin theme-colored progress bar */}
        <div className="nova-welcome-progress" aria-hidden />
      </main>
    </div>
  );
};

export default WelcomeScreen;
