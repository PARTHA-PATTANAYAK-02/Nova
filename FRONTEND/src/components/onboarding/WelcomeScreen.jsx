import { useEffect, useMemo } from "react";
import { Sparkles } from "lucide-react";
import { useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import Home from "@/components/feed/Home";
import MainLayout from "@/components/layout/MainLayout";

const WELCOME_DURATION_MS = 5000;

const RevealText = ({ text }) => {
  const letters = useMemo(() => Array.from(text), [text]);
  return (
    <h1 className="nv-welcome__greeting">
      {letters.map((ch, i) => (
        <span key={i} className="nv-welcome__reveal" style={{ "--i": i }}>
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

      <main
        className="nv-welcome"
        style={{ zIndex: 2147483647 }}
        aria-live="polite"
      >
        <div className="nv-welcome__aurora" aria-hidden />
        <div className="nv-welcome__vignette" aria-hidden />

        <div className="nv-welcome__rings" aria-hidden>
          <span className="nv-welcome__ring nv-welcome__ring--1" />
          <span className="nv-welcome__ring nv-welcome__ring--2" />
          <span className="nv-welcome__ring nv-welcome__ring--3" />
          <span className="nv-welcome__sweep" />
          <span className="nv-welcome__orbit nv-welcome__orbit--a">
            <i />
          </span>
          <span className="nv-welcome__orbit nv-welcome__orbit--b">
            <i />
          </span>
          <span className="nv-welcome__orbit nv-welcome__orbit--c">
            <i />
          </span>
        </div>

        <div className="nv-welcome__stage">
          <div className="nv-welcome__logo-wrap">
            <img
              src="/logo.gif"
              alt="Nova"
              draggable={false}
              className="nv-welcome__logo"
            />
            <span className="nv-welcome__logo-glow" aria-hidden />
          </div>

          <div className="nv-welcome__message">
            <span className="nv-welcome__kicker">
              <Sparkles className="size-3.5" strokeWidth={2.2} />
              Your orbit starts here
            </span>
            <RevealText text={message} />
          </div>
        </div>

        <div className="nv-welcome__progress" aria-hidden />
      </main>
    </div>
  );
};

export default WelcomeScreen;
