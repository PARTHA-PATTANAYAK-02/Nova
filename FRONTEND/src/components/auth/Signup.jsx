import React, { useEffect, useState } from "react";
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
import AuthStage from "@/components/auth/AuthStage";

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
  const { user } = useSelector((store) => store.auth);
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const changeEventHandler = (e) =>
    setInput({ ...input, [e.target.name]: e.target.value });

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
        { fullName, email: input.email, password: input.password },
        {
          headers: { "Content-Type": "application/json" },
          withCredentials: true,
        },
      );
      if (res.data.success) {
        setOtp("");
        setTimeout(() => {
          setStep("verify");
          toast.success(res.data.message || "Verification code sent.");
        }, 250);
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

  const handleSubmit = async (e) => {
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
    <div className="nv-split">
      <AuthStage variant="signup" />

      <main className="nv-form-side">
        <span className="nv-form-top" aria-hidden />
        <span className="nv-form-glow" aria-hidden />

        <div className="nv-form" style={{ position: "relative" }}>
          {step === "verify" && (
            <button
              type="button"
              onClick={backToDetails}
              aria-label="Back"
              className="nv-otp-back"
            >
              <X className="h-4 w-4" strokeWidth={2.2} />
            </button>
          )}

          <div className="nv-form-mbrand">
            <span className="nv-form-mbrand-logo">
              <img src="/logo.gif" alt="Nova" draggable={false} />
            </span>
            <span className="nv-form-mbrand-name">Nova</span>
          </div>

          {/* ==================== STEP 1 ==================== */}
          {step === "details" && (
            <form onSubmit={handleSubmit} className="nv-step-in">
              <div className="nv-form-head">
                <h1 className="nv-form-title">Create account</h1>
                <p className="nv-form-sub">
                  A minute to set up. A lifetime of moments.
                </p>
              </div>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: "0.75rem",
                  marginBottom: "0.75rem",
                }}
              >
                <div className="nv-field has-icon" style={{ marginBottom: 0 }}>
                  <input
                    id="firstName"
                    name="firstName"
                    type="text"
                    className="nv-field-input"
                    placeholder=" "
                    value={input.firstName}
                    onChange={changeEventHandler}
                    autoComplete="given-name"
                    maxLength={40}
                    required
                  />
                  <label htmlFor="firstName" className="nv-field-label">
                    First name
                  </label>
                  <span className="nv-field-icon">
                    <User strokeWidth={1.8} />
                  </span>
                </div>
                <div className="nv-field" style={{ marginBottom: 0 }}>
                  <input
                    id="lastName"
                    name="lastName"
                    type="text"
                    className="nv-field-input"
                    placeholder=" "
                    value={input.lastName}
                    onChange={changeEventHandler}
                    autoComplete="family-name"
                    maxLength={39}
                    required
                  />
                  <label htmlFor="lastName" className="nv-field-label">
                    Last name
                  </label>
                </div>
              </div>

              <div className="nv-field has-icon">
                <input
                  id="email"
                  name="email"
                  type="email"
                  className="nv-field-input"
                  placeholder=" "
                  value={input.email}
                  onChange={changeEventHandler}
                  autoComplete="email"
                  required
                />
                <label htmlFor="email" className="nv-field-label">
                  Email address
                </label>
                <span className="nv-field-icon">
                  <Mail strokeWidth={1.8} />
                </span>
              </div>

              <div className="nv-field has-icon has-eye">
                <input
                  id="password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  className="nv-field-input"
                  placeholder=" "
                  value={input.password}
                  onChange={changeEventHandler}
                  autoComplete="new-password"
                  minLength={6}
                  required
                />
                <label htmlFor="password" className="nv-field-label">
                  Password
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

              <div className="nv-field has-icon">
                <input
                  id="confirmPassword"
                  name="confirmPassword"
                  type={showPassword ? "text" : "password"}
                  className="nv-field-input"
                  placeholder=" "
                  value={input.confirmPassword}
                  onChange={changeEventHandler}
                  autoComplete="new-password"
                  minLength={6}
                  required
                />
                <label htmlFor="confirmPassword" className="nv-field-label">
                  Retype password
                </label>
                <span className="nv-field-icon">
                  <Lock strokeWidth={1.8} />
                </span>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="nv-form-btn"
                style={{ marginTop: "0.5rem" }}
              >
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Sending code...
                  </>
                ) : (
                  <>
                    Continue
                    <ArrowRight
                      className="nv-form-arrow h-4 w-4"
                      strokeWidth={2.2}
                    />
                  </>
                )}
              </button>

              <p className="nv-form-switch">
                Already have an account? <Link to="/login">Sign in</Link>
              </p>

              <p className="nv-form-terms">
                By continuing you agree to Nova's <Link to="/terms">Terms</Link>{" "}
                & <Link to="/privacy">Privacy</Link>.
              </p>
            </form>
          )}

          {/* ==================== STEP 2 ==================== */}
          {step === "verify" && (
            <div className="nv-step-in">
              <div className="nv-form-head" style={{ textAlign: "center" }}>
                <span
                  className={`nv-otp-badge ${otpSuccess ? "is-success" : ""}`}
                >
                  {otpSuccess ? (
                    <CheckCircle2 className="h-7 w-7" strokeWidth={2} />
                  ) : (
                    <Mail className="h-7 w-7" strokeWidth={1.8} />
                  )}
                </span>
                <h1 className="nv-form-title">
                  {otpSuccess ? "You're in!" : "Check your inbox"}
                </h1>
                <p className="nv-form-sub">
                  {otpSuccess
                    ? "Account created. Taking you in..."
                    : "Enter the 6-digit code we sent to"}
                </p>
                {!otpSuccess && (
                  <p
                    style={{
                      marginTop: "0.35rem",
                      fontSize: "13.5px",
                      fontWeight: 600,
                      color: "var(--foreground)",
                      wordBreak: "break-all",
                    }}
                  >
                    {input.email}
                  </p>
                )}
              </div>

              <div style={{ marginBottom: "1rem" }}>
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

              <div className="nv-otp-status">
                {loading && (
                  <span
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 8,
                      color: "var(--muted-foreground)",
                    }}
                  >
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    Verifying...
                  </span>
                )}
                {otpError && !loading && (
                  <span style={{ color: "var(--danger)", fontWeight: 500 }}>
                    Wrong code. Try again.
                  </span>
                )}
              </div>

              {!otpSuccess && (
                <p className="nv-otp-resend">
                  Didn't get the code?{" "}
                  <button type="button" disabled={loading} onClick={requestOtp}>
                    <RotateCcw
                      className="inline-block h-3 w-3"
                      style={{ verticalAlign: "-2px", marginRight: 4 }}
                      strokeWidth={2.2}
                    />
                    Resend
                  </button>
                </p>
              )}
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default Signup;
