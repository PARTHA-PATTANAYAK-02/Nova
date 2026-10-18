import React, { useEffect } from "react";
import { useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import { Sparkles } from "lucide-react";

const ProtectedRoutes = ({ children }) => {
  const { user } = useSelector((store) => store.auth);
  const navigate = useNavigate();

  useEffect(() => {
    if (!user) navigate("/login");
  }, [user, navigate]);

  if (!user) {
    return (
      <div className="nv-guard">
        <span className="nv-guard__aurora nv-guard__aurora--a" aria-hidden />
        <span className="nv-guard__aurora nv-guard__aurora--b" aria-hidden />

        <div className="nv-guard__content">
          <div className="nv-guard__orb">
            <span className="nv-guard__orb-ring" aria-hidden />
            <span className="nv-guard__orb-spin" aria-hidden />
            <span className="nv-guard__orb-core">
              <Sparkles className="size-4" strokeWidth={2.4} />
            </span>
            <span className="nv-guard__orb-pulse" aria-hidden />
          </div>

          <p className="nv-guard__brand">Nova</p>
          <p className="nv-guard__msg">Verifying your orbit…</p>

          <div className="nv-guard__dots">
            <span />
            <span />
            <span />
          </div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};

export default ProtectedRoutes;
