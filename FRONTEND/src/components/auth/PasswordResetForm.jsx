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
} from "lucide-react";
import axios from "axios";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { Input } from "@/components/ui/input";
import OtpInput from "@/components/auth/OtpInput";
import { apiUrl } from "@/lib/api";
import { getErrorMessage } from "@/lib/utils";

/* Steps */
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
  const [direction, setDirection] = useState("forward"); // forward | back

  const [email, setEmail] = useState(initialEmail);
  const [otp, setOtp] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");

  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [otpError, setOtpError] = useState(false);
  const [otpSuccess, setOtpSuccess] = useState(false);

  const [codeSentBurst, setCodeSentBurst] = useState(false);
  const [resendTimer, setResendTimer] = useState(0);

  const emailRef = useRef(null);

  /* ============================================================
     SYNC EXTERNAL EMAIL (AccountSecurity arrives after mount)
     ============================================================ */
  useEffect(() => {
    if (initialEmail && !email) {
      setEmail(initialEmail);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialEmail]);

  /* ============================================================
     RESEND COUNTDOWN
     ============================================================ */
  useEffect(() => {
    if (resendTimer <= 0) return;
    const id = setInterval(() => {
      setResendTimer((t) => {
        if (t <= 1) {
          clearInterval(id);
          return 0;
        }
        return t - 1;
      });
    }, 1000);
    return () => clearInterval(id);
  }, [resendTimer]);

  /* ============================================================
     STEP TRANSITION
     ============================================================ */
  const goTo = (next, dir = "forward") => {
    setDirection(dir);
    setError("");
    setStep(next);
  };

  /* ============================================================
     STEP 1 — SEND OTP
     ============================================================ */
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

      // Success! Trigger code-sent burst animation
      setCodeSentBurst(true);
      setTimeout(() => setCodeSentBurst(false), 1200);

      // Move to OTP step after a short pause
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

  /* ============================================================
     RESEND OTP
     ============================================================ */
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

  /* ============================================================
     STEP 2 — VERIFY OTP → go to password step
     ============================================================ */
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
        setOtpError(true);
        setTimeout(() => setOtpError(false), 700);
        toast.error(res.data?.message || "Invalid code");
        return;
      }

      setOtpSuccess(true);
      setTimeout(() => {
        setOtpSuccess(false);
        goTo(STEP_PASSWORD, "forward");
      }, 500);
    } catch (err) {
      setOtpError(true);
      setTimeout(() => setOtpError(false), 700);
      toast.error(getErrorMessage(err, "Invalid or expired code."));
    } finally {
      setLoading(false);
    }
  };

  /* ============================================================
     STEP 3 — RESET PASSWORD
     ============================================================ */
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

  /* ============================================================
     RENDER
     ============================================================ */
  return (
    <div className="relative">
      {/* Code-sent burst (delivery effect) */}
      {codeSentBurst && <CodeSentBurst />}

      {/* Progress indicator */}
      <StepProgress step={step} />

      {/* Animated step content */}
      <div
        key={step}
        className={
          direction === "forward"
            ? "animate-step-in-forward"
            : "animate-step-in-back"
        }
      >
        {/* =================================================
            STEP 1 — EMAIL
        ================================================= */}
        {step === STEP_EMAIL && (
          <form onSubmit={handleSendOtp} className="space-y-4">
            <div className="space-y-1.5">
              <label
                htmlFor="email"
                className="text-xs font-medium text-[var(--foreground)]"
              >
                {emailLocked ? "We'll send the code to" : "Email address"}
              </label>
              <div className="relative group">
                <Mail
                  className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--muted-foreground)] group-focus-within:text-[var(--primary)] transition-colors pointer-events-none"
                  strokeWidth={1.8}
                />
                <Input
                  id="email"
                  ref={emailRef}
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  autoFocus={!emailLocked}
                  className="pl-10"
                  disabled={loading || emailLocked}
                  readOnly={emailLocked}
                />
              </div>
              {emailLocked && (
                <p className="text-[11px] text-[var(--muted-foreground)]">
                  This is the email tied to your account.
                </p>
              )}
            </div>

            {error && <ErrorLine message={error} />}

            <button
              type="submit"
              disabled={loading || !email.trim()}
              className="
                w-full h-11
                inline-flex items-center justify-center gap-2
                rounded-full
                font-semibold text-sm
                transition-all
                active:scale-[0.98]
                disabled:opacity-50 disabled:cursor-not-allowed
                group
              "
              style={{
                background: "var(--primary)",
                color: "var(--primary-foreground)",
              }}
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
                    className="h-4 w-4 group-hover:translate-x-0.5 transition-transform"
                    strokeWidth={2}
                  />
                </>
              )}
            </button>
          </form>
        )}

        {/* =================================================
            STEP 2 — OTP
        ================================================= */}
        {step === STEP_OTP && (
          <div className="space-y-5">
            <div className="text-center">
              <p className="text-sm text-[var(--foreground)]">
                We sent a 6-digit code to
              </p>
              <p className="mt-1 text-sm font-semibold text-[var(--foreground)]">
                {email}
              </p>
            </div>

            {/* OTP input */}
            <OtpInput
              length={6}
              value={otp}
              onChange={setOtp}
              onComplete={handleVerifyOtp}
              error={otpError}
              success={otpSuccess}
              disabled={loading}
            />

            {/* Verify state */}
            <div className="flex items-center justify-center min-h-[20px]">
              {loading && (
                <span className="inline-flex items-center gap-2 text-xs text-[var(--muted-foreground)]">
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  Verifying...
                </span>
              )}
              {otpSuccess && !loading && (
                <span className="inline-flex items-center gap-2 text-xs text-[var(--success)] font-semibold animate-fade-in">
                  <CheckCircle2 className="h-3.5 w-3.5" strokeWidth={2.2} />
                  Verified
                </span>
              )}
            </div>

            {/* Actions row */}
            <div className="flex flex-col gap-2.5">
              <button
                type="button"
                onClick={handleResend}
                disabled={resendTimer > 0 || loading}
                className="
                  w-full h-11
                  inline-flex items-center justify-center gap-2
                  rounded-full
                  text-sm font-semibold
                  border border-[var(--border-strong)]
                  text-[var(--foreground)]
                  hover:bg-[var(--surface-2)]
                  transition-all
                  active:scale-[0.98]
                  disabled:opacity-50 disabled:cursor-not-allowed
                "
              >
                <RefreshCw
                  className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`}
                  strokeWidth={2}
                />
                {resendTimer > 0 ? `Resend in ${resendTimer}s` : "Resend code"}
              </button>

              {!emailLocked && (
                <button
                  type="button"
                  onClick={() => goTo(STEP_EMAIL, "back")}
                  className="
                    inline-flex items-center justify-center gap-1.5
                    text-xs text-[var(--muted-foreground)]
                    hover:text-[var(--foreground)]
                    transition-colors
                    mx-auto
                  "
                >
                  <ArrowLeft className="h-3.5 w-3.5" strokeWidth={2} />
                  Use a different email
                </button>
              )}
            </div>
          </div>
        )}

        {/* =================================================
            STEP 3 — NEW PASSWORD
        ================================================= */}
        {step === STEP_PASSWORD && (
          <form onSubmit={handleResetPassword} className="space-y-4">
            <div className="flex items-center gap-2 mb-2">
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[var(--success)]/12 text-[var(--success)]">
                <ShieldCheck className="h-4 w-4" strokeWidth={2} />
              </span>
              <div>
                <p className="text-xs font-semibold text-[var(--foreground)]">
                  Code verified
                </p>
                <p className="text-[11px] text-[var(--muted-foreground)]">
                  Choose a new password
                </p>
              </div>
            </div>

            {/* Password */}
            <div className="space-y-1.5">
              <label
                htmlFor="password"
                className="text-xs font-medium text-[var(--foreground)]"
              >
                New password
              </label>
              <div className="relative group">
                <Lock
                  className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--muted-foreground)] group-focus-within:text-[var(--primary)] transition-colors pointer-events-none"
                  strokeWidth={1.8}
                />
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="At least 6 characters"
                  autoFocus
                  className="pl-10 pr-11"
                  disabled={loading}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((s) => !s)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 w-7 h-7 rounded-md flex items-center justify-center text-[var(--muted-foreground)] hover:text-[var(--foreground)] hover:bg-[var(--surface-2)] transition-colors"
                  tabIndex={-1}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? (
                    <EyeOff className="w-4 h-4" strokeWidth={1.8} />
                  ) : (
                    <Eye className="w-4 h-4" strokeWidth={1.8} />
                  )}
                </button>
              </div>
            </div>

            {/* Confirm */}
            <div className="space-y-1.5">
              <label
                htmlFor="confirm"
                className="text-xs font-medium text-[var(--foreground)]"
              >
                Confirm password
              </label>
              <div className="relative group">
                <Lock
                  className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--muted-foreground)] group-focus-within:text-[var(--primary)] transition-colors pointer-events-none"
                  strokeWidth={1.8}
                />
                <Input
                  id="confirm"
                  type={showPassword ? "text" : "password"}
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  placeholder="Repeat password"
                  className="pl-10 pr-11"
                  disabled={loading}
                />
              </div>
            </div>

            {error && <ErrorLine message={error} />}

            <button
              type="submit"
              disabled={loading}
              className="
                w-full h-11
                inline-flex items-center justify-center gap-2
                rounded-full
                font-semibold text-sm
                transition-all
                active:scale-[0.98]
                disabled:opacity-50 disabled:cursor-not-allowed
                group
              "
              style={{
                background: "var(--primary)",
                color: "var(--primary-foreground)",
              }}
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
                    className="h-4 w-4 group-hover:translate-x-0.5 transition-transform"
                    strokeWidth={2}
                  />
                </>
              )}
            </button>

            {!emailLocked && (
              <button
                type="button"
                onClick={() => goTo(STEP_OTP, "back")}
                className="
                  inline-flex items-center justify-center gap-1.5
                  text-xs text-[var(--muted-foreground)]
                  hover:text-[var(--foreground)]
                  transition-colors
                  mx-auto
                  w-full
                "
              >
                <ArrowLeft className="h-3.5 w-3.5" strokeWidth={2} />
                Back to code
              </button>
            )}
          </form>
        )}

        {/* =================================================
            STEP 4 — DONE
        ================================================= */}
        {step === STEP_DONE && <SuccessScreen email={email} />}
      </div>
    </div>
  );
};

/* ============================================================
   SUB-COMPONENTS
   ============================================================ */

/* Step progress dots */
const StepProgress = ({ step }) => {
  const order = [STEP_EMAIL, STEP_OTP, STEP_PASSWORD, STEP_DONE];
  const activeIndex = order.indexOf(step);

  return (
    <div className="mb-5 flex items-center justify-center gap-1.5">
      {order.map((s, i) => {
        const isActive = i === activeIndex;
        const isComplete = i < activeIndex;

        return (
          <span
            key={s}
            className={`
              h-1 rounded-full transition-all duration-500
              ${
                isActive
                  ? "w-8 bg-[var(--primary)]"
                  : isComplete
                    ? "w-4 bg-[var(--primary)]/40"
                    : "w-4 bg-[var(--border)]"
              }
            `}
          />
        );
      })}
    </div>
  );
};

/* Error line */
const ErrorLine = ({ message }) => (
  <p className="text-xs text-[var(--danger)] animate-fade-in">{message}</p>
);

/* Success screen */
const SuccessScreen = ({ email }) => (
  <div className="flex flex-col items-center text-center py-4">
    <div className="relative mb-5">
      <span className="absolute inset-0 rounded-full bg-[var(--success)]/20 blur-xl animate-pulse" />
      <span className="relative flex h-16 w-16 items-center justify-center rounded-full bg-[var(--success)]/12 border-2 border-[var(--success)]/30 animate-success-pop">
        <CheckCircle2
          className="h-8 w-8 text-[var(--success)]"
          strokeWidth={2.2}
        />
      </span>
    </div>
    <h2
      className="text-xl font-bold text-[var(--foreground)]"
      style={{ fontFamily: "var(--font-display)" }}
    >
      Password reset
    </h2>
    <p className="mt-1.5 text-sm text-[var(--muted-foreground)] max-w-xs">
      You can now sign in to <span className="font-medium">{email}</span> with
      your new password. Redirecting...
    </p>
  </div>
);

/* Code-sent burst overlay */
const CodeSentBurst = () => (
  <div className="pointer-events-none absolute inset-0 z-20 flex items-center justify-center overflow-hidden">
    {/* Expanding rings */}
    <span className="absolute h-24 w-24 rounded-full border-2 border-[var(--primary)]/40 animate-code-ring" />
    <span
      className="absolute h-24 w-24 rounded-full border-2 border-[var(--primary)]/30 animate-code-ring"
      style={{ animationDelay: "150ms" }}
    />
    <span
      className="absolute h-24 w-24 rounded-full border-2 border-[var(--primary)]/20 animate-code-ring"
      style={{ animationDelay: "300ms" }}
    />

    {/* Center icon */}
    <span className="relative flex h-14 w-14 items-center justify-center rounded-full bg-[var(--primary)] text-[var(--primary-foreground)] shadow-[0_8px_24px_rgba(34,64,138,0.4)] animate-code-pop">
      <Mail className="h-6 w-6" strokeWidth={2} />
    </span>

    {/* Flying mini-codes */}
    {[0, 1, 2, 3, 4, 5].map((i) => (
      <span
        key={i}
        className="absolute text-[10px] font-bold text-[var(--primary)] animate-code-fly"
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
