import React from "react";
import { Link } from "react-router-dom";
import AnimatedIcon from "@/components/common/AnimatedIcon";
import { ArrowLeftIcon, KeyRoundIcon } from "@animateicons/react/lucide";
import PasswordResetForm from "@/components/auth/PasswordResetForm";
import AuthStage from "@/components/auth/AuthStage";

const ForgotPassword = () => {
  return (
    <div className="nv-split">
      <AuthStage variant="login" />

      <main className="nv-form-side">
        <span className="nv-form-top" aria-hidden />
        <span className="nv-form-glow" aria-hidden />

        <div className="nv-form">
          {/* Mobile brand */}
          <div className="nv-form-mbrand">
            <span className="nv-form-mbrand-logo">
              <img src="/logo.gif" alt="Nova" draggable={false} />
            </span>
            <span className="nv-form-mbrand-name">Nova</span>
          </div>

          {/* Back link */}
          <Link to="/login" className="nv-back-link group">
            <AnimatedIcon icon={ArrowLeftIcon} size={14} />
            Back to sign in
          </Link>

          {/* Heading */}
          <div className="nv-form-head">
            <span className="nv-form-badge group">
              <AnimatedIcon icon={KeyRoundIcon} size={16} strokeWidth={2} />
            </span>
            <h1 className="nv-form-title">Reset password</h1>
            <p className="nv-form-sub">
              Enter the email on your Nova account. We'll send a one-time
              verification code.
            </p>
          </div>

          {/* Form */}
          <PasswordResetForm />

          {/* Terms */}
          <p className="nv-form-terms">
            Your account stays protected. Code expires in 10 minutes.
          </p>
        </div>
      </main>
    </div>
  );
};

export default ForgotPassword;
