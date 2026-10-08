import React, { useEffect, useState } from "react";
import { Input } from "@/components/ui/input";
import axios from "axios";
import { toast } from "sonner";
import { Link, useNavigate } from "react-router-dom";
import {
  Loader2,
  ArrowRight,
  Mail,
  Lock,
  User,
  Eye,
  EyeOff,
  CheckCircle2,
  RotateCcw,
  X,
} from "lucide-react";
import { useDispatch, useSelector } from "react-redux";
import { setAuthUser } from "@/redux/authSlice";
import { getErrorMessage } from "@/lib/utils";
import { apiUrl } from "@/lib/api";
import OtpInput from "@/components/auth/OtpInput";

/* ============================================================
   AMBIENT BACKGROUND — aurora blobs + drifting particles
   ============================================================ */
const AmbientBackground = () => (
  <div className="pointer-events-none absolute inset-0 overflow-hidden">
    <span
      className="absolute -top-20 -left-20 h-56 w-56 rounded-full opacity-30 blur-3xl animate-aurora-drift-1"
      style={{ background: "var(--primary)" }}
    />
    <span
      className="absolute -bottom-24 -right-16 h-64 w-64 rounded-full opacity-25 blur-3xl animate-aurora-drift-2"
      style={{ background: "var(--accent)" }}
    />
    <span
      className="absolute top-1/3 right-1/4 h-40 w-40 rounded-full opacity-20 blur-3xl animate-aurora-drift-3"
      style={{ background: "var(--primary)" }}
    />

    {Array.from({ length: 18 }).map((_, i) => {
      const size = 2 + (i % 3);
      const left = `${(i * 37) % 100}%`;
      const delay = `${(i * 0.4) % 4}s`;
      const duration = `${6 + (i % 4)}s`;
      return (
        <span
          key={i}
          className="absolute rounded-full animate-particle-drift"
          style={{
            width: `${size}px`,
            height: `${size}px`,
            left,
            bottom: "-10px",
            background: i % 2 === 0 ? "var(--primary)" : "var(--accent)",
            opacity: 0.5,
            animationDelay: delay,
            animationDuration: duration,
          }}
        />
      );
    })}
  </div>
);

const ScanningLine = ({ active }) => {
  if (!active) return null;
  return (
    <div className="pointer-events-none absolute inset-x-6 top-0 z-20 h-full overflow-hidden">
      <span className="absolute inset-x-0 h-[2px] bg-gradient-to-r from-transparent via-[var(--primary)] to-transparent animate-scan-line" />
    </div>
  );
};

const SuccessBurst = ({ active }) => {
  if (!active) return null;
  const colors = [
    "var(--primary)",
    "var(--success)",
    "var(--accent)",
    "var(--gold)",
  ];
  return (
    <div className="pointer-events-none absolute inset-0 z-30 flex items-center justify-center">
      {Array.from({ length: 24 }).map((_, i) => {
        const angle = (i / 24) * Math.PI * 2;
        const distance = 80 + (i % 4) * 30;
        const tx = Math.cos(angle) * distance;
        const ty = Math.sin(angle) * distance;
        const size = 4 + (i % 3) * 2;
        return (
          <span
            key={i}
            className="absolute rounded-full animate-success-particle"
            style={{
              width: `${size}px`,
              height: `${size}px`,
              background: colors[i % colors.length],
              "--tx": `${tx}px`,
              "--ty": `${ty}px`,
              animationDelay: `${(i % 6) * 30}ms`,
            }}
          />
        );
      })}
      <span
        className="absolute h-20 w-20 rounded-full border-2 animate-success-ring"
        style={{ borderColor: "var(--success)" }}
      />
      <span
        className="absolute h-20 w-20 rounded-full border-2 animate-success-ring"
        style={{
          borderColor: "var(--success)",
          animationDelay: "200ms",
        }}
      />
    </div>
  );
};

const IconOrb = ({ success }) => (
  <div className="relative mx-auto h-20 w-20">
    <span
      className="absolute inset-0 rounded-full opacity-40 blur-2xl animate-pulse-glow"
      style={{
        background: success ? "var(--success)" : "var(--primary)",
      }}
    />
    <span
      className="absolute inset-0 rounded-full border border-dashed animate-orbit-slow"
      style={{
        borderColor: success
          ? "color-mix(in oklab, var(--success) 40%, transparent)"
          : "color-mix(in oklab, var(--primary) 30%, transparent)",
      }}
    />
    <span
      className="absolute inset-1 rounded-full border-2 animate-pulse-ring"
      style={{
        borderColor: success ? "var(--success)" : "var(--primary)",
      }}
    />
    <span
      className="absolute inset-1 rounded-full border-2 animate-pulse-ring"
      style={{
        borderColor: success ? "var(--success)" : "var(--primary)",
        animationDelay: "500ms",
      }}
    />
    <span
      className="relative flex h-full w-full items-center justify-center rounded-2xl border transition-colors duration-500"
      style={{
        background: success
          ? "color-mix(in oklab, var(--success) 12%, transparent)"
          : "color-mix(in oklab, var(--primary) 10%, transparent)",
        borderColor: success
          ? "color-mix(in oklab, var(--success) 30%, transparent)"
          : "color-mix(in oklab, var(--primary) 20%, transparent)",
        color: success ? "var(--success)" : "var(--primary)",
      }}
    >
      {success ? (
        <CheckCircle2 className="h-8 w-8" strokeWidth={2} />
      ) : (
        <Mail className="h-8 w-8" strokeWidth={1.8} />
      )}
    </span>
  </div>
);

const MagneticGlow = ({ children, disabled }) => {
  const [pos, setPos] = useState({ x: 0, y: 0, active: false });
  const ref = React.useRef(null);

  const handleMove = (e) => {
    if (disabled || !ref.current) return;
    const rect = ref.current.getBoundingClientRect();
    setPos({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
      active: true,
    });
  };

  const handleLeave = () => setPos((p) => ({ ...p, active: false }));

  return (
    <div
      ref={ref}
      onMouseMove={handleMove}
      onMouseLeave={handleLeave}
      className="relative"
    >
      <span
        className="pointer-events-none absolute inset-0 rounded-2xl transition-opacity duration-300"
        style={{
          opacity: pos.active && !disabled ? 1 : 0,
          background: `radial-gradient(120px circle at ${pos.x}px ${pos.y}px, color-mix(in oklab, var(--primary) 20%, transparent), transparent 70%)`,
        }}
      />
      {children}
    </div>
  );
};

const Signup = () => {
  const [input, setInput] = useState({
    firstName: "",
    lastName: "",
    email: "",
    password: "",
    confirmPassword: "",
  });
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [otp, setOtp] = useState("");
  const [step, setStep] = useState("details");
  const [otpError, setOtpError] = useState(false);
  const [otpSuccess, setOtpSuccess] = useState(false);
  const [burst, setBurst] = useState(false);
  const { user } = useSelector((store) => store.auth);
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const changeEventHandler = (e) => {
    setInput({ ...input, [e.target.name]: e.target.value });
  };

  const requestOtp = async () => {
    const fullName =
      `${input.firstName.trim()} ${input.lastName.trim()}`.trim();
    if (input.password !== input.confirmPassword) {
      toast.error("Your passwords don't match.");
      return;
    }
    try {
      setLoading(true);
      const res = await axios.post(
        apiUrl("/api/v1/user/register/request-otp"),
        {
          fullName,
          email: input.email,
          password: input.password,
        },
        {
          headers: { "Content-Type": "application/json" },
          withCredentials: true,
        },
      );
      if (res.data.success) {
        setOtp("");
        setBurst(true);
        setTimeout(() => setBurst(false), 1200);
        setTimeout(() => {
          setStep("verify");
          toast.success(res.data.message || "Verification code sent.");
        }, 500);
      }
    } catch (error) {
      toast.error(
        getErrorMessage(
          error,
          "Unable to send a verification code. Please try again.",
        ),
      );
    } finally {
      setLoading(false);
    }
  };

  const signupHandler = async (e) => {
    e.preventDefault();
    if (input.password !== input.confirmPassword) {
      toast.error("Your passwords don't match.");
      return;
    }
    await requestOtp();
  };

  const verifySignupHandler = async (code) => {
    const otpValue = code || otp;
    if (!otpValue || otpValue.length !== 6 || loading) return;

    try {
      setLoading(true);
      setOtpError(false);

      const res = await axios.post(
        apiUrl("/api/v1/user/register/verify-otp"),
        {
          fullName: `${input.firstName.trim()} ${input.lastName.trim()}`.trim(),
          email: input.email,
          password: input.password,
          otp: otpValue,
        },
        {
          headers: { "Content-Type": "application/json" },
          withCredentials: true,
        },
      );

      if (res.data.success) {
        setOtpSuccess(true);
        dispatch(setAuthUser(res.data.user));
        setTimeout(() => navigate("/welcome/setup", { replace: true }), 900);
      }
    } catch (error) {
      setOtpError(true);
      setTimeout(() => setOtpError(false), 700);
      toast.error(
        getErrorMessage(error, "Unable to verify that code. Please try again."),
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user)
      navigate(user.username ? "/" : "/welcome/setup", { replace: true });
  }, [navigate, user]);

  const backToDetails = () => {
    setOtp("");
    setOtpError(false);
    setStep("details");
  };

  return (
    <div className="h-screen w-full grid lg:grid-cols-2 bg-[var(--background)] overflow-hidden">
      {/* LEFT — BRAND */}
      <aside
        className="hidden lg:flex relative flex-col justify-between p-12 overflow-hidden h-screen"
        style={{
          background:
            "linear-gradient(155deg, var(--primary) 0%, var(--primary-hover) 100%)",
        }}
      >
        <div
          className="absolute inset-0 opacity-[0.08]"
          style={{
            backgroundImage:
              "repeating-linear-gradient(90deg, rgba(255,255,255,0.4) 0, rgba(255,255,255,0.4) 1px, transparent 1px, transparent 48px)",
          }}
        />

        <Link to="/" className="relative flex items-center gap-3 w-fit group">
          <span
            className="
              relative flex items-center justify-center
              w-14 h-14
              rounded-full
              overflow-hidden
              bg-black
              ring-1 ring-white/20
              shadow-[0_4px_20px_rgba(0,0,0,0.4)]
              transition-all duration-300
              group-hover:scale-110
              group-hover:ring-white/40
            "
          >
            <img
              src="/logo.gif"
              alt="Nova"
              draggable={false}
              className="w-full h-full object-cover select-none"
            />
          </span>
          <span
            className="text-2xl font-bold text-white tracking-tight"
            style={{ fontFamily: "var(--font-display)" }}
          >
            Nova
          </span>
        </Link>

        <div className="relative max-w-md">
          <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-white/60 mb-4">
            Begin your journey
          </p>
          <h2
            className="text-4xl xl:text-5xl font-bold leading-[1.1] text-white"
            style={{ fontFamily: "var(--font-display)" }}
          >
            Where every <em className="not-italic text-white/80">moment</em>{" "}
            finds its people.
          </h2>
          <p className="mt-5 text-white/70 text-base leading-relaxed">
            No noise, no algorithms fighting for your attention. Just you, your
            people, and the moments worth keeping.
          </p>
        </div>

        <div className="relative flex items-center gap-2 text-white/50 text-xs">
          <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
          <span>Free forever · No credit card</span>
        </div>
      </aside>

      {/* RIGHT — FORM */}
      <main className="flex items-center justify-center px-6 py-6 lg:p-8 overflow-y-auto">
        <div className="w-full max-w-md">
          {/* Mobile logo */}
          <div className="lg:hidden flex justify-center mb-5">
            <Link to="/" className="flex items-center gap-2.5 group">
              <span
                className="
                  relative flex items-center justify-center
                  w-11 h-11
                  rounded-full
                  overflow-hidden
                  bg-black
                  ring-1 ring-[var(--border)]
                  shadow-[var(--shadow-sm)]
                  transition-all duration-300
                  group-hover:scale-110
                "
              >
                <img
                  src="/logo.gif"
                  alt="Nova"
                  draggable={false}
                  className="w-full h-full object-cover select-none"
                />
              </span>
              <span
                className="text-xl font-bold text-[var(--foreground)] tracking-tight"
                style={{ fontFamily: "var(--font-display)" }}
              >
                Nova
              </span>
            </Link>
          </div>

          {/* ============ STEP 1 ============ */}
          {step === "details" && (
            <form
              onSubmit={signupHandler}
              className="card p-5 md:p-6 relative overflow-hidden animate-step-in-back"
            >
              {burst && <CodeSentBurst />}

              <div className="mb-4">
                <h2
                  className="text-xl md:text-2xl font-bold text-[var(--foreground)]"
                  style={{ fontFamily: "var(--font-display)" }}
                >
                  Create account
                </h2>
                <p className="text-xs text-[var(--muted-foreground)] mt-0.5">
                  We'll check your email before creating your account.
                </p>
              </div>

              {/* Name row */}
              <div className="grid grid-cols-2 gap-3 mb-3">
                <div className="space-y-1">
                  <label
                    htmlFor="firstName"
                    className="text-[11px] font-medium text-[var(--foreground)]"
                  >
                    First name
                  </label>
                  <div className="relative group">
                    <User
                      className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[var(--muted-foreground)] group-focus-within:text-[var(--primary)] transition-colors pointer-events-none"
                      strokeWidth={1.8}
                    />
                    <Input
                      id="firstName"
                      type="text"
                      name="firstName"
                      value={input.firstName}
                      onChange={changeEventHandler}
                      placeholder="First name"
                      autoComplete="given-name"
                      maxLength={40}
                      required
                      className="pl-9 h-10 text-sm"
                    />
                  </div>
                </div>
                <div className="space-y-1">
                  <label
                    htmlFor="lastName"
                    className="text-[11px] font-medium text-[var(--foreground)]"
                  >
                    Last name
                  </label>
                  <Input
                    id="lastName"
                    type="text"
                    name="lastName"
                    value={input.lastName}
                    onChange={changeEventHandler}
                    placeholder="Last name"
                    autoComplete="family-name"
                    maxLength={39}
                    required
                    className="h-10 text-sm"
                  />
                </div>
              </div>

              {/* Email */}
              <div className="space-y-1 mb-3">
                <label
                  htmlFor="email"
                  className="text-[11px] font-medium text-[var(--foreground)]"
                >
                  Email
                </label>
                <div className="relative group">
                  <Mail
                    className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[var(--muted-foreground)] group-focus-within:text-[var(--primary)] transition-colors pointer-events-none"
                    strokeWidth={1.8}
                  />
                  <Input
                    id="email"
                    type="email"
                    name="email"
                    value={input.email}
                    onChange={changeEventHandler}
                    placeholder="you@example.com"
                    required
                    className="pl-9 h-10 text-sm"
                  />
                </div>
              </div>

              {/* Password */}
              <div className="space-y-1 mb-3">
                <label
                  htmlFor="password"
                  className="text-[11px] font-medium text-[var(--foreground)]"
                >
                  Password
                </label>
                <div className="relative group">
                  <Lock
                    className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[var(--muted-foreground)] group-focus-within:text-[var(--primary)] transition-colors pointer-events-none"
                    strokeWidth={1.8}
                  />
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    name="password"
                    value={input.password}
                    onChange={changeEventHandler}
                    placeholder="At least 6 characters"
                    required
                    minLength={6}
                    className="pl-9 pr-10 h-10 text-sm"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((s) => !s)}
                    aria-label={
                      showPassword ? "Hide password" : "Show password"
                    }
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 w-7 h-7 rounded-md flex items-center justify-center text-[var(--muted-foreground)] hover:text-[var(--foreground)] hover:bg-[var(--surface-2)] transition-colors"
                    tabIndex={-1}
                  >
                    {showPassword ? (
                      <EyeOff className="w-3.5 h-3.5" strokeWidth={1.8} />
                    ) : (
                      <Eye className="w-3.5 h-3.5" strokeWidth={1.8} />
                    )}
                  </button>
                </div>
              </div>

              {/* Confirm password */}
              <div className="space-y-1 mb-4">
                <label
                  htmlFor="confirmPassword"
                  className="text-[11px] font-medium text-[var(--foreground)]"
                >
                  Retype password
                </label>
                <div className="relative group">
                  <Lock
                    className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[var(--muted-foreground)] group-focus-within:text-[var(--primary)] transition-colors pointer-events-none"
                    strokeWidth={1.8}
                  />
                  <Input
                    id="confirmPassword"
                    type={showPassword ? "text" : "password"}
                    name="confirmPassword"
                    value={input.confirmPassword}
                    onChange={changeEventHandler}
                    placeholder="Retype your password"
                    autoComplete="new-password"
                    required
                    minLength={6}
                    className="pl-9 pr-10 h-10 text-sm"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full h-10 inline-flex items-center justify-center gap-2 rounded-full font-semibold text-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.98] group"
                style={{
                  background: "var(--primary)",
                  color: "var(--primary-foreground)",
                }}
              >
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Checking email...
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

              <p className="mt-4 text-center text-sm text-[var(--muted-foreground)]">
                Already have an account?{" "}
                <Link
                  to="/login"
                  className="font-semibold text-[var(--primary)] hover:underline"
                >
                  Sign in
                </Link>
              </p>
            </form>
          )}

          {/* ============ STEP 2 — VERIFY ============ */}
          {step === "verify" && (
            <div className="card relative overflow-hidden animate-step-in-up">
              <AmbientBackground />
              <ScanningLine active={loading} />
              <SuccessBurst active={otpSuccess} />
              {burst && <CodeSentBurst />}

              <div className="relative z-10 flex items-center justify-between px-5 pt-4">
                <button
                  type="button"
                  onClick={backToDetails}
                  aria-label="Close"
                  className="
                    w-8 h-8 rounded-full
                    flex items-center justify-center
                    text-[var(--muted-foreground)]
                    hover:text-[var(--foreground)] hover:bg-[var(--surface-2)]
                    transition-colors
                  "
                >
                  <X className="h-4 w-4" strokeWidth={2.2} />
                </button>
                <span className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[var(--muted-foreground)]">
                  Step 2 of 2
                </span>
                <div className="w-8 h-8" />
              </div>

              <div className="relative z-10 px-6 md:px-8 pb-6 md:pb-8 pt-4 text-center">
                <div
                  className="mb-5 animate-stagger-1"
                  style={{ animationDelay: "100ms" }}
                >
                  <IconOrb success={otpSuccess} />
                </div>

                <div
                  className="animate-stagger-2"
                  style={{ animationDelay: "220ms" }}
                >
                  <h2
                    className="text-2xl md:text-3xl font-bold text-[var(--foreground)] tracking-tight"
                    style={{ fontFamily: "var(--font-display)" }}
                  >
                    {otpSuccess ? "You're in!" : "Check your inbox"}
                  </h2>
                  <p className="mt-2 text-sm text-[var(--muted-foreground)] leading-relaxed">
                    {otpSuccess
                      ? "Account created. Taking you to sign in..."
                      : "We sent a 6-digit code to"}
                  </p>
                  {!otpSuccess && (
                    <p className="mt-0.5 text-sm font-semibold text-[var(--foreground)] truncate">
                      {input.email}
                    </p>
                  )}
                </div>

                <div
                  className="mt-7 animate-stagger-3"
                  style={{ animationDelay: "340ms" }}
                >
                  <MagneticGlow disabled={loading || otpSuccess}>
                    <div className="relative py-2">
                      <OtpInput
                        length={6}
                        value={otp}
                        onChange={setOtp}
                        onComplete={verifySignupHandler}
                        error={otpError}
                        success={otpSuccess}
                        disabled={loading || otpSuccess}
                      />
                    </div>
                  </MagneticGlow>
                </div>

                <div
                  className="mt-5 flex items-center justify-center min-h-[20px] animate-stagger-4"
                  style={{ animationDelay: "460ms" }}
                >
                  {loading && (
                    <span className="inline-flex items-center gap-2 text-xs text-[var(--muted-foreground)]">
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      Verifying...
                    </span>
                  )}
                  {otpError && !loading && (
                    <span className="text-xs text-[var(--danger)] animate-fade-in font-medium">
                      Wrong code. Try again.
                    </span>
                  )}
                </div>

                {!otpSuccess && (
                  <div
                    className="mt-6 pt-5 border-t border-[var(--border)] animate-stagger-5"
                    style={{ animationDelay: "580ms" }}
                  >
                    <p className="text-xs text-[var(--muted-foreground)]">
                      Didn't get the code?
                    </p>
                    <button
                      type="button"
                      disabled={loading}
                      onClick={requestOtp}
                      className="
                        mt-1.5 inline-flex items-center gap-1.5
                        text-xs font-semibold
                        text-[var(--primary)] hover:underline
                        transition-colors
                        disabled:opacity-50
                      "
                    >
                      <RotateCcw className="h-3 w-3" strokeWidth={2.2} />
                      Resend code
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}

          <p className="mt-4 text-center text-[10px] text-[var(--muted-foreground)] leading-relaxed">
            By continuing you agree to Nova's Terms & Privacy Policy.
          </p>
        </div>
      </main>
    </div>
  );
};

/* ============================================================
   Code-sent burst overlay
   ============================================================ */
const CodeSentBurst = () => (
  <div className="pointer-events-none absolute inset-0 z-20 flex items-center justify-center overflow-hidden">
    <span className="absolute h-24 w-24 rounded-full border-2 border-[var(--primary)]/40 animate-code-ring" />
    <span
      className="absolute h-24 w-24 rounded-full border-2 border-[var(--primary)]/30 animate-code-ring"
      style={{ animationDelay: "150ms" }}
    />
    <span
      className="absolute h-24 w-24 rounded-full border-2 border-[var(--primary)]/20 animate-code-ring"
      style={{ animationDelay: "300ms" }}
    />

    <span className="relative flex h-14 w-14 items-center justify-center rounded-full bg-[var(--primary)] text-[var(--primary-foreground)] shadow-[0_8px_24px_rgba(34,64,138,0.4)] animate-code-pop">
      <Mail className="h-6 w-6" strokeWidth={2} />
    </span>

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

export default Signup;
