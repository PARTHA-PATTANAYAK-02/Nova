import React, { useEffect, useState } from "react";
import { Input } from "@/components/ui/input";
import axios from "axios";
import { toast } from "sonner";
import { Link, useNavigate } from "react-router-dom";
import { Loader2, ArrowRight, Mail, Lock, Eye, EyeOff } from "lucide-react";
import { useDispatch, useSelector } from "react-redux";
import { setAuthUser } from "@/redux/authSlice";
import { getErrorMessage } from "@/lib/utils";
import { apiUrl } from "@/lib/api";

const Login = () => {
  const [input, setInput] = useState({ email: "", password: "" });
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const { user } = useSelector((store) => store.auth);
  const navigate = useNavigate();
  const dispatch = useDispatch();

  const changeEventHandler = (e) => {
    setInput({ ...input, [e.target.name]: e.target.value });
  };

  /* ---------- LOGIN (UNCHANGED LOGIC) ---------- */
  const signupHandler = async (e) => {
    e.preventDefault();
    try {
      setLoading(true);
      const res = await axios.post(apiUrl("/api/v1/user/login"), input, {
        headers: { "Content-Type": "application/json" },
        withCredentials: true,
      });
      if (res.data.success) {
        dispatch(setAuthUser(res.data.user));
        navigate("/welcome", { replace: true });

        setInput({ email: "", password: "" });
      }
    } catch (error) {
      toast.error(
        getErrorMessage(error, "Unable to log in. Please try again."),
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) navigate("/welcome", { replace: true });
  }, [navigate, user]);

  /* ---------- UI ---------- */
  return (
    <div className="min-h-screen w-full grid lg:grid-cols-2 bg-[var(--background)]">
      {/* LEFT — BRAND PANEL */}
      <aside
        className="hidden lg:flex relative flex-col justify-between p-12 overflow-hidden"
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

        <Link to="/" className="relative flex items-center gap-3 w-fit">
          <span
            className="flex items-center justify-center w-10 h-10 rounded-xl bg-white/15 backdrop-blur-sm border border-white/20"
            style={{ color: "#fff" }}
          >
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M12 2L2 22h20L12 2z" />
            </svg>
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
            Welcome back
          </p>
          <h2
            className="text-4xl xl:text-5xl font-bold leading-[1.1] text-white"
            style={{ fontFamily: "var(--font-display)" }}
          >
            A quieter place to be{" "}
            <em className="not-italic text-white/80">loud.</em>
          </h2>
          <p className="mt-5 text-white/70 text-base leading-relaxed">
            Step back into your orbit. Share moments, keep close to the people
            that matter, no noise in between.
          </p>
        </div>

        <div className="relative flex items-center gap-2 text-white/50 text-xs">
          <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
          <span>Systems online</span>
        </div>
      </aside>

      {/* RIGHT — FORM */}
      <main className="flex items-center justify-center p-6 lg:p-12">
        <div className="w-full max-w-md">
          <div className="lg:hidden flex justify-center mb-8">
            <Link to="/" className="flex items-center gap-2.5">
              <span
                className="flex items-center justify-center w-9 h-9 rounded-lg"
                style={{
                  background: "var(--primary)",
                  color: "var(--primary-foreground)",
                }}
              >
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M12 2L2 22h20L12 2z" />
                </svg>
              </span>
              <span
                className="text-2xl font-bold text-[var(--foreground)] tracking-tight"
                style={{ fontFamily: "var(--font-display)" }}
              >
                Nova
              </span>
            </Link>
          </div>

          <form onSubmit={signupHandler} className="card p-6 md:p-8 space-y-5">
            <div className="space-y-1.5">
              <h2
                className="text-2xl md:text-3xl font-bold text-[var(--foreground)]"
                style={{ fontFamily: "var(--font-display)" }}
              >
                Sign in
              </h2>
              <p className="text-sm text-[var(--muted-foreground)]">
                Continue where you left off.
              </p>
            </div>

            {/* Email */}
            <div className="space-y-1.5">
              <label
                htmlFor="email"
                className="text-xs font-medium text-[var(--foreground)]"
              >
                Email
              </label>
              <div className="relative group">
                <Mail
                  className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--muted-foreground)] group-focus-within:text-[var(--primary)] transition-colors pointer-events-none"
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
                  className="pl-10"
                />
              </div>
            </div>

            {/* Password with show/hide */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label
                  htmlFor="password"
                  className="text-xs font-medium text-[var(--foreground)]"
                >
                  Password
                </label>
                <Link
                  to="/forgot-password"
                  className="text-[11px] text-[var(--muted-foreground)] hover:text-[var(--foreground)] transition-colors"
                >
                  Forgot?
                </Link>
              </div>
              <div className="relative group">
                <Lock
                  className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--muted-foreground)] group-focus-within:text-[var(--primary)] transition-colors pointer-events-none"
                  strokeWidth={1.8}
                />
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  name="password"
                  value={input.password}
                  onChange={changeEventHandler}
                  placeholder="••••••••"
                  required
                  className="pl-10 pr-11"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((s) => !s)}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  className="absolute right-3 top-1/2 -translate-y-1/2 w-7 h-7 rounded-md flex items-center justify-center text-[var(--muted-foreground)] hover:text-[var(--foreground)] hover:bg-[var(--surface-2)] transition-colors"
                  tabIndex={-1}
                >
                  {showPassword ? (
                    <EyeOff className="w-4 h-4" strokeWidth={1.8} />
                  ) : (
                    <Eye className="w-4 h-4" strokeWidth={1.8} />
                  )}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full h-11 inline-flex items-center justify-center gap-2 rounded-full font-semibold text-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.98] group"
              style={{
                background: "var(--primary)",
                color: "var(--primary-foreground)",
              }}
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Signing in...
                </>
              ) : (
                <>
                  Sign in
                  <ArrowRight
                    className="h-4 w-4 group-hover:translate-x-0.5 transition-transform"
                    strokeWidth={2}
                  />
                </>
              )}
            </button>

            <div className="flex items-center gap-3">
              <div className="divider flex-1" />
              <span className="text-[10px] uppercase tracking-widest text-[var(--muted-foreground)]">
                or
              </span>
              <div className="divider flex-1" />
            </div>

            <p className="text-center text-sm text-[var(--muted-foreground)]">
              New to Nova?{" "}
              <Link
                to="/signup"
                className="font-semibold text-[var(--primary)] hover:underline"
              >
                Create an account
              </Link>
            </p>
          </form>

          <p className="mt-5 text-center text-[11px] text-[var(--muted-foreground)] leading-relaxed">
            By signing in you agree to Nova's Terms & Privacy Policy.
          </p>
        </div>
      </main>
    </div>
  );
};

export default Login;
