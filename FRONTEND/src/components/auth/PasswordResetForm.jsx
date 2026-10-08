import { useEffect, useRef, useState } from "react";
import {
  Mail,
  Lock,
  Eye,
  EyeOff,
  Loader2,
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
  ShieldCheck,
  RefreshCw,
  X,
} from "lucide-react";
import axios from "axios";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import OtpInput from "@/components/auth/OtpInput";
import { apiUrl } from "@/lib/api";
import { getErrorMessage } from "@/lib/utils";

const STEP_EMAIL = "email";
const STEP_OTP = "otp";
const STEP_PASSWORD = "password";
const STEP_DONE = "done";
const RESEND_COOLDOWN = 60;

const PasswordResetForm = ({
  email: initialEmail = "",
  emailLocked = false,
}) => {
  const navigate = useNavigate();

  const [step, setStep] = useState(STEP_EMAIL);
  const [direction, setDirection] = useState("forward");

  const [email, setEmail] = useState(initialEmail);
  const [otp, setOtp] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");

  /* ⬇ separate show/hide toggles per field */
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [otpError, setOtpError] = useState(false);
  const [otpSuccess, setOtpSuccess] = useState(false);

  const [codeSentBurst, setCodeSentBurst] = useState(false);
  const [resendTimer, setResendTimer] = useState(0);

  const emailRef = useRef(null);

  /* Sync external email */
  useEffect(() => {
    if (initialEmail && !email) setEmail(initialEmail);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialEmail]);

  /* Resend countdown */
  useEffect(() => {
    if (resendTimer <= 0) return;
    const id = setInterval(() => {
      setResendTimer((t) => (t <= 1 ? 0 : t - 1));
    }, 1000);
    return () => clearInterval(id);
  }, [resendTimer]);

  const goTo = (next, dir = "forward") => {
    setDirection(dir);
    setError("");
    setStep(next);
  };

  /* ---------- STEP 1: SEND OTP ---------- */
  const handleSendOtp = async (e) => {
    e?.preventDefault();
    const trimmed = email.trim();
    if (!trimmed || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
      setError("Please enter a valid email address.");
      return;
    }
    try {
      setLoading(true);
      setError("");
      const res = await axios.post(
        apiUrl("/api/v1/user/password/request-otp"),
        { email: trimmed },
        { withCredentials: true },
      );
      if (!res.data?.success) {
        throw new Error(res.data?.message || "Unable to send code.");
      }
      setCodeSentBurst(true);
      setTimeout(() => setCodeSentBurst(false), 1200);
      setTimeout(() => {
        goTo(STEP_OTP, "forward");
        setResendTimer(RESEND_COOLDOWN);
        toast.success("Verification code sent to your email");
      }, 700);
    } catch (err) {
      setError(getErrorMessage(err, "Unable to send code."));
    } finally {
      setLoading(false);
    }
  };

  /* ---------- RESEND ---------- */
  const handleResend = async () => {
    if (resendTimer > 0 || loading) return;
    try {
      setLoading(true);
      const res = await axios.post(
        apiUrl("/api/v1/user/password/request-otp"),
        { email: email.trim() },
        { withCredentials: true },
      );
      if (res.data?.success) {
        setCodeSentBurst(true);
        setTimeout(() => setCodeSentBurst(false), 1200);
        setResendTimer(RESEND_COOLDOWN);
        setOtp("");
        setOtpError(false);
        toast.success("New code sent");
      }
    } catch (err) {
      toast.error(getErrorMessage(err, "Unable to resend code."));
    } finally {
      setLoading(false);
    }
  };

  /* ---------- STEP 2: VERIFY OTP ---------- */
  const handleVerifyOtp = async (code) => {
    if (code.length !== 6 || loading) return;
    try {
      setLoading(true);
      setOtpError(false);
      setOtp(code);
      const res = await axios.post(
        apiUrl("/api/v1/user/password/verify-otp"),
        { email: email.trim(), otp: code },
        { withCredentials: true },
      );
      if (!res.data?.success) {
        setOtp("");
        setOtpError(true);
        setTimeout(() => setOtpError(false), 700);
        toast.error(res.data?.message || "Invalid code");
        return;
      }
      setOtpSuccess(true);
      setTimeout(() => {
        setOtpSuccess(false);
        goTo(STEP_PASSWORD, "forward");
      }, 550);
    } catch (err) {
      setOtp("");
      setOtpError(true);
      setTimeout(() => setOtpError(false), 700);
      toast.error(getErrorMessage(err, "Invalid or expired code."));
    } finally {
      setLoading(false);
    }
  };

  /* ---------- STEP 3: RESET ---------- */
  const handleResetPassword = async (e) => {
    e.preventDefault();
    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }
    if (password !== confirm) {
      setError("Passwords don't match.");
      return;
    }
    try {
      setLoading(true);
      setError("");
      const res = await axios.post(
        apiUrl("/api/v1/user/password/reset"),
        { email: email.trim(), otp: otp.trim(), newPassword: password },
        { withCredentials: true },
      );
      if (!res.data?.success) {
        throw new Error(res.data?.message || "Unable to reset password.");
      }
      goTo(STEP_DONE, "forward");
      toast.success("Password reset successfully");
      setTimeout(() => navigate("/login"), 2200);
    } catch (err) {
      setError(getErrorMessage(err, "Unable to reset password."));
    } finally {
      setLoading(false);
    }
  };

  /* Password match state */
  const pwMatchState =
    confirm.length === 0 ? "neutral" : password === confirm ? "ok" : "bad";

  /* ---------- RENDER ---------- */
  return (
    <div className="relative">
      {codeSentBurst && <CodeSentBurst />}

      <StepProgress step={step} />

      <div
        key={step}
        className={direction === "forward" ? "nv-step-fwd" : "nv-step-bk"}
      >
        {/* ============ STEP 1 — EMAIL ============ */}
        {step === STEP_EMAIL && (
          <form onSubmit={handleSendOtp}>
            <div className="nv-field has-icon">
              <input
                id="reset-email"
                ref={emailRef}
                type="email"
                className="nv-field-input"
                placeholder=" "
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
                autoFocus={!emailLocked}
                disabled={loading || emailLocked}
                required
              />
              <label htmlFor="reset-email" className="nv-field-label">
                {emailLocked ? "We'll send the code to" : "Email address"}
              </label>
              <span className="nv-field-icon">
                <Mail strokeWidth={1.8} />
              </span>
            </div>

            {emailLocked && (
              <p
                style={{
                  fontSize: 11,
                  color: "var(--muted-foreground)",
                  marginTop: "-0.35rem",
                  marginBottom: "0.75rem",
                }}
              >
                This is the email tied to your account.
              </p>
            )}

            {error && (
              <p className="nv-reset-error" style={{ marginBottom: 10 }}>
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={loading || !email.trim()}
              className="nv-form-btn"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Sending code...
                </>
              ) : (
                <>
                  Send verification code
                  <ArrowRight
                    className="nv-form-arrow h-4 w-4"
                    strokeWidth={2.2}
                  />
                </>
              )}
            </button>
          </form>
        )}

        {/* ============ STEP 2 — OTP ============ */}
        {step === STEP_OTP && (
          <div>
            <div
              style={{
                textAlign: "center",
                marginBottom: "1.15rem",
              }}
            >
              <p
                style={{
                  fontSize: 13.5,
                  color: "var(--muted-foreground)",
                }}
              >
                We sent a 6-digit code to
              </p>
              <p
                style={{
                  marginTop: 4,
                  fontSize: 14,
                  fontWeight: 600,
                  color: "var(--foreground)",
                  wordBreak: "break-all",
                }}
              >
                {email}
              </p>
            </div>

            <div style={{ marginBottom: "0.75rem" }}>
              <OtpInput
                length={6}
                value={otp}
                onChange={setOtp}
                onComplete={handleVerifyOtp}
                error={otpError}
                success={otpSuccess}
                disabled={loading}
                loading={loading}
              />
            </div>

            <div className="nv-reset-status">
              {loading && (
                <span
                  className="is-load"
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 6,
                  }}
                >
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  Verifying...
                </span>
              )}
              {otpSuccess && !loading && (
                <span
                  className="is-ok"
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 6,
                  }}
                >
                  <CheckCircle2 className="h-3.5 w-3.5" strokeWidth={2.4} />
                  Verified
                </span>
              )}
            </div>

            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "0.55rem",
                marginTop: "0.75rem",
              }}
            >
              <button
                type="button"
                onClick={handleResend}
                disabled={resendTimer > 0 || loading}
                className={`nv-resend ${resendTimer > 0 ? "is-counting" : ""}`}
              >
                <RefreshCw
                  className="nv-resend-icon h-3.5 w-3.5"
                  strokeWidth={2.2}
                />
                {resendTimer > 0 ? (
                  <>
                    Resend in
                    <span className="nv-resend-pill">{resendTimer}s</span>
                  </>
                ) : (
                  "Resend code"
                )}
              </button>

              {!emailLocked && (
                <button
                  type="button"
                  onClick={() => goTo(STEP_EMAIL, "back")}
                  className="nv-reset-linkback"
                >
                  <ArrowLeft className="h-3.5 w-3.5" strokeWidth={2.2} />
                  Use a different email
                </button>
              )}
            </div>
          </div>
        )}

        {/* ============ STEP 3 — NEW PASSWORD ============ */}
        {step === STEP_PASSWORD && (
          <form onSubmit={handleResetPassword}>
            <div className="nv-reset-verified">
              <span className="nv-reset-verified-icon">
                <ShieldCheck className="h-4 w-4" strokeWidth={2.2} />
              </span>
              <div className="nv-reset-verified-text">
                <strong>Code verified</strong>
                <span>Choose a new password</span>
              </div>
            </div>

            {/* ---- New password ---- */}
            <div className="nv-field has-icon has-eye">
              <input
                id="reset-password"
                type={showPassword ? "text" : "password"}
                className="nv-field-input"
                placeholder=" "
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="new-password"
                minLength={6}
                autoFocus
                required
                disabled={loading}
              />
              <label htmlFor="reset-password" className="nv-field-label">
                New password
              </label>
              <span className="nv-field-icon">
                <Lock strokeWidth={1.8} />
              </span>
              <button
                type="button"
                className="nv-field-eye"
                onClick={() => setShowPassword((s) => !s)}
                aria-label={showPassword ? "Hide password" : "Show password"}
                tabIndex={-1}
              >
                {showPassword ? (
                  <EyeOff className="w-4 h-4" strokeWidth={1.8} />
                ) : (
                  <Eye className="w-4 h-4" strokeWidth={1.8} />
                )}
              </button>
            </div>

            {/* ---- Confirm password ---- */}
            <div
              className={`nv-field has-icon has-eye ${
                pwMatchState === "ok" ? "is-match" : ""
              } ${pwMatchState === "bad" ? "is-mismatch" : ""}`}
            >
              <input
                id="reset-confirm"
                type={showConfirm ? "text" : "password"}
                className="nv-field-input"
                placeholder=" "
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                autoComplete="new-password"
                minLength={6}
                required
                disabled={loading}
              />
              <label htmlFor="reset-confirm" className="nv-field-label">
                Confirm password
              </label>
              <span className="nv-field-icon">
                <Lock strokeWidth={1.8} />
              </span>
              <button
                type="button"
                className="nv-field-eye"
                onClick={() => setShowConfirm((s) => !s)}
                aria-label={showConfirm ? "Hide password" : "Show password"}
                tabIndex={-1}
              >
                {showConfirm ? (
                  <EyeOff className="w-4 h-4" strokeWidth={1.8} />
                ) : (
                  <Eye className="w-4 h-4" strokeWidth={1.8} />
                )}
              </button>
            </div>

            {/* ---- Match indicator ---- */}
            <div
              className={`nv-pw-match ${
                pwMatchState === "ok"
                  ? "is-ok"
                  : pwMatchState === "bad"
                    ? "is-bad"
                    : "is-neutral"
              }`}
            >
              {pwMatchState === "ok" && (
                <>
                  <CheckCircle2 strokeWidth={2.4} />
                  <span>Passwords match</span>
                </>
              )}
              {pwMatchState === "bad" && (
                <>
                  <X strokeWidth={2.4} />
                  <span>Passwords don't match</span>
                </>
              )}
              {pwMatchState === "neutral" && (
                <span>Must be at least 6 characters.</span>
              )}
            </div>

            {error && (
              <p className="nv-reset-error" style={{ marginBottom: 10 }}>
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={loading || pwMatchState === "bad"}
              className="nv-form-btn"
              style={{ marginTop: "0.25rem" }}
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Resetting...
                </>
              ) : (
                <>
                  Reset password
                  <ArrowRight
                    className="nv-form-arrow h-4 w-4"
                    strokeWidth={2.2}
                  />
                </>
              )}
            </button>

            {!emailLocked && (
              <button
                type="button"
                onClick={() => goTo(STEP_OTP, "back")}
                className="nv-reset-linkback"
                style={{ marginTop: "0.85rem" }}
              >
                <ArrowLeft className="h-3.5 w-3.5" strokeWidth={2.2} />
                Back to code
              </button>
            )}
          </form>
        )}

        {/* ============ STEP 4 — DONE ============ */}
        {step === STEP_DONE && <SuccessScreen email={email} />}
      </div>
    </div>
  );
};

/* ============================================================
   SUB-COMPONENTS
   ============================================================ */

const StepProgress = ({ step }) => {
  const order = [STEP_EMAIL, STEP_OTP, STEP_PASSWORD, STEP_DONE];
  const activeIndex = order.indexOf(step);
  return (
    <div className="nv-reset-progress">
      {order.map((s, i) => (
        <span
          key={s}
          className={`nv-reset-dot ${
            i === activeIndex
              ? "is-active"
              : i < activeIndex
                ? "is-complete"
                : ""
          }`}
        />
      ))}
    </div>
  );
};

const SuccessScreen = ({ email }) => (
  <div className="nv-reset-success">
    <div className="nv-reset-success-orb">
      <span>
        <CheckCircle2 className="h-7 w-7" strokeWidth={2.4} />
      </span>
    </div>
    <h2 className="nv-reset-success-title">Password reset</h2>
    <p className="nv-reset-success-sub">
      You can now sign in to <strong>{email}</strong> with your new password.
      Redirecting...
    </p>
  </div>
);

const CodeSentBurst = () => (
  <div className="nv-code-burst" aria-hidden>
    <span className="nv-code-burst-ring" />
    <span className="nv-code-burst-ring" style={{ animationDelay: "150ms" }} />
    <span className="nv-code-burst-ring" style={{ animationDelay: "300ms" }} />

    <span className="nv-code-burst-core">
      <Mail className="h-5 w-5" strokeWidth={2.2} />
    </span>

    {[0, 1, 2, 3, 4, 5].map((i) => (
      <span
        key={i}
        className="nv-code-burst-digit"
        style={{
          animationDelay: `${i * 60}ms`,
          "--tx": `${Math.cos((i / 6) * Math.PI * 2) * 60}px`,
          "--ty": `${Math.sin((i / 6) * Math.PI * 2) * 60}px`,
        }}
      >
        {i + 1}
      </span>
    ))}
  </div>
);

export default PasswordResetForm;
