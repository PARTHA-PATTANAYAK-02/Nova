import React, { useEffect, useState } from "react";
import axios from "axios";
import { toast } from "sonner";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { Loader2, ArrowRight, Mail, Lock, Eye, EyeOff } from "lucide-react";
import { useDispatch, useSelector } from "react-redux";
import { setAuthUser } from "@/redux/authSlice";
import { getErrorMessage } from "@/lib/utils";
import { apiUrl } from "@/lib/api";
import AuthStage from "@/components/auth/AuthStage";

const Login = () => {
  const [input, setInput] = useState({ email: "", password: "" });
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const { user } = useSelector((store) => store.auth);
  const navigate = useNavigate();
  const location = useLocation();
  const dispatch = useDispatch();

  const changeEventHandler = (e) =>
    setInput({ ...input, [e.target.name]: e.target.value });

  const getRedirectPath = () => {
    if (location.state?.from?.pathname) {
      return location.state.from.pathname + (location.state.from.search || "");
    }
    return "/welcome";
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      setLoading(true);
      const res = await axios.post(apiUrl("/api/v1/user/login"), input, {
        headers: { "Content-Type": "application/json" },
        withCredentials: true,
      });
      if (res.data.success) {
        dispatch(setAuthUser(res.data.user));
        const destination =
          location.state?.from?.pathname && location.state.from.pathname !== "/"
            ? location.state.from.pathname + (location.state.from.search || "")
            : "/";
        navigate("/welcome", { state: { redirectTo: destination }, replace: true });
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
    if (user) {
      const destination =
        location.state?.from?.pathname && location.state.from.pathname !== "/"
          ? location.state.from.pathname + (location.state.from.search || "")
          : "/";
      navigate("/welcome", { state: { redirectTo: destination }, replace: true });
    }
  }, [navigate, user, location]);

  const isFromPost = Boolean(
    location.state?.from?.pathname?.startsWith("/post/")
  );

  return (
    <div className="nv-split">
      <AuthStage variant="login" />

      <main className="nv-form-side">
        <span className="nv-form-top" aria-hidden />
        <span className="nv-form-glow" aria-hidden />

        <form onSubmit={handleSubmit} className="nv-form">
          <div className="nv-form-mbrand">
            <span className="nv-form-mbrand-logo">
              <img src="/logo.gif" alt="Nova" draggable={false} />
            </span>
            <span className="nv-form-mbrand-name">Nova</span>
          </div>

          <div className="nv-form-head">
            <h1 className="nv-form-title">Sign in</h1>
            <p className="nv-form-sub">
              {isFromPost
                ? "Sign in to unlock the shared post"
                : "Welcome back. Continue where you left off."}
            </p>
          </div>

          {isFromPost && (
            <div className="mb-4 p-3.5 rounded-2xl bg-gradient-to-r from-purple-500/15 via-pink-500/15 to-amber-500/15 border border-purple-500/30 text-left animate-in fade-in slide-in-from-top-2 duration-300">
              <div className="flex items-center gap-2 mb-1 text-purple-400 font-semibold text-xs">
                <Lock className="size-3.5" />
                <span>Post requires Nova account</span>
              </div>
              <p className="text-xs text-[var(--foreground)] font-medium leading-relaxed">
                Log in below to view the shared post. You'll be taken straight to it!
              </p>
            </div>
          )}

          {/* Email */}
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

          {/* Password */}
          <div className="nv-field has-icon has-eye">
            <input
              id="password"
              name="password"
              type={showPassword ? "text" : "password"}
              className="nv-field-input"
              placeholder=" "
              value={input.password}
              onChange={changeEventHandler}
              autoComplete="current-password"
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

          <div className="nv-form-forgot">
            <Link to="/forgot-password">Forgot password?</Link>
          </div>

          <button type="submit" disabled={loading} className="nv-form-btn">
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Signing in...
              </>
            ) : (
              <>
                Sign in
                <ArrowRight
                  className="nv-form-arrow h-4 w-4"
                  strokeWidth={2.2}
                />
              </>
            )}
          </button>

          <p className="nv-form-switch">
            New to Nova?{" "}
            <Link to="/signup" state={{ from: location.state?.from }}>
              Create an account
            </Link>
          </p>

          <p className="nv-form-terms">
            By signing in you agree to Nova's <Link to="/terms">Terms</Link> &{" "}
            <Link to="/privacy">Privacy</Link>.
          </p>
        </form>
      </main>
    </div>
  );
};

export default Login;
