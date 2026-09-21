import React, { useEffect } from "react";
import { useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import { Loader2, Sparkles } from "lucide-react";

const ProtectedRoutes = ({ children }) => {
  const { user } = useSelector((store) => store.auth);
  const navigate = useNavigate();

  /* ---------- LOGIC (UNCHANGED) ---------- */
  useEffect(() => {
    if (!user) {
      navigate("/login");
    }
  }, [user, navigate]);

  if (!user) {
    return (
      <div className="flex items-center justify-center h-screen w-screen relative overflow-hidden">
        {/* Aurora hint */}
        <div className="absolute inset-0 -z-10">
          <div className="absolute top-1/4 left-1/4 w-72 h-72 rounded-full bg-violet-500/25 blur-[100px] animate-float" />
          <div className="absolute bottom-1/4 right-1/4 w-80 h-80 rounded-full bg-cyan-500/20 blur-[110px] animate-float-slow" />
        </div>

        <div className="flex flex-col items-center gap-4 animate-fade-in">
          {/* Animated orb loader */}
          <div className="relative w-16 h-16">
            {/* Outer ring */}
            <div className="absolute inset-0 rounded-full border-2 border-white/8" />

            {/* Spinning gradient ring */}
            <div className="absolute inset-0 rounded-full border-2 border-transparent border-t-violet-400 border-r-cyan-400 animate-spin" />

            {/* Center orb with glow */}
            <div className="absolute inset-[14px] rounded-full bg-gradient-to-br from-violet-500 to-cyan-500 flex items-center justify-center glow-primary">
              <Sparkles className="w-4 h-4 text-white" />
            </div>

            {/* Pulsing aura */}
            <span className="absolute inset-0 rounded-full bg-violet-500/20 animate-glow-pulse" />
          </div>

          {/* Text */}
          <div className="text-center">
            <p className="font-display text-sm font-semibold text-white tracking-tight">
              Nova
            </p>
            <p className="text-xs text-white/40 mt-1">
              Verifying your orbit...
            </p>
          </div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};

export default ProtectedRoutes;
