import React, { useEffect, useState } from "react";
import { Input } from "./ui/input";
import axios from "axios";
import { toast } from "sonner";
import { Link, useNavigate } from "react-router-dom";
import { Loader2, Sparkles, ArrowRight, Mail, Lock } from "lucide-react";
import { useDispatch, useSelector } from "react-redux";
import { setAuthUser } from "@/redux/authSlice";
import { getErrorMessage } from "@/lib/utils";
import { apiUrl } from "@/lib/api";

const Login = () => {
  const [input, setInput] = useState({ email: "", password: "" });
  const [loading, setLoading] = useState(false);
  const { user } = useSelector((store) => store.auth);
  const navigate = useNavigate();
  const dispatch = useDispatch();

  const changeEventHandler = (e) => {
    setInput({ ...input, [e.target.name]: e.target.value });
  };

  /* ---------- LOGIC (UNCHANGED) ---------- */
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
        navigate("/");
        toast.success(res.data.message);
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
    if (user) navigate("/");
  }, [navigate, user]);

  /* ---------- UI ---------- */
  return (
    <div className="min-h-screen w-full grid lg:grid-cols-2 relative overflow-hidden">
      {/* ================= LEFT — BRAND PANEL ================= */}
      <aside className="hidden lg:flex relative flex-col justify-between p-12 overflow-hidden">
        {/* Aurora blobs */}
        <div className="absolute inset-0 -z-10">
          <div className="absolute top-[10%] left-[15%] w-[380px] h-[380px] rounded-full bg-violet-500/30 blur-[100px] animate-float" />
          <div className="absolute bottom-[15%] right-[10%] w-[420px] h-[420px] rounded-full bg-cyan-500/25 blur-[110px] animate-float-slow" />
          <div className="absolute top-[45%] right-[30%] w-[260px] h-[260px] rounded-full bg-fuchsia-500/20 blur-[90px] animate-float" />
        </div>

        {/* Logo */}
        <div className="flex items-center gap-3">
          <div className="relative w-12 h-12 flex items-center justify-center">
            <div className="w-11 h-11 rounded-full bg-gradient-to-br from-violet-500 via-fuchsia-500 to-cyan-400 flex items-center justify-center glow-primary">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <span className="absolute inset-0 rounded-full bg-violet-500/25 animate-glow-pulse" />
          </div>
          <h1 className="font-display text-3xl font-bold text-gradient">
            Nova
          </h1>
        </div>

        {/* Center tagline */}
        <div className="max-w-md">
          <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-white/40 mb-4">
            Welcome back to your orbit
          </p>
          <h2 className="font-display text-5xl font-bold leading-tight tracking-tight text-white">
            Where every <span className="text-gradient">moment</span> finds its
            people.
          </h2>
          <p className="mt-5 text-white/55 text-base leading-relaxed">
            Step back into a space built for real connection. Share, discover,
            and stay close to the people that matter.
          </p>
        </div>

        {/* Footer badge */}
        <div className="flex items-center gap-2 text-white/30 text-xs">
          <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span>Systems online</span>
        </div>
      </aside>

      {/* ================= RIGHT — FORM ================= */}
      <main className="flex items-center justify-center p-6 lg:p-12 relative">
        {/* Mobile-only aurora hint */}
        <div className="lg:hidden absolute inset-0 -z-10 overflow-hidden">
          <div className="absolute -top-20 -left-20 w-72 h-72 rounded-full bg-violet-500/25 blur-[100px] animate-float" />
          <div className="absolute -bottom-24 -right-16 w-80 h-80 rounded-full bg-cyan-500/20 blur-[110px] animate-float-slow" />
        </div>

        <div className="w-full max-w-md animate-fade-in">
          {/* Mobile logo */}
          <div className="lg:hidden flex justify-center mb-8">
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-violet-500 via-fuchsia-500 to-cyan-400 flex items-center justify-center glow-primary">
                <Sparkles className="w-4 h-4 text-white" />
              </div>
              <h1 className="font-display text-2xl font-bold text-gradient">
                Nova
              </h1>
            </div>
          </div>

          <form
            onSubmit={signupHandler}
            className="glass rounded-[32px] p-7 md:p-9 space-y-6 shadow-[0_20px_60px_rgba(0,0,0,0.45)]"
          >
            {/* Header */}
            <div className="space-y-1.5">
              <h2 className="font-display text-2xl md:text-3xl font-bold text-white">
                Sign in
              </h2>
              <p className="text-sm text-white/45">
                Continue where you left off.
              </p>
            </div>

            {/* Email */}
            <div className="space-y-2">
              <label
                htmlFor="email"
                className="text-xs font-medium text-white/70"
              >
                Email
              </label>
              <div className="relative group">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30 group-focus-within:text-violet-300 transition-colors" />
                <Input
                  id="email"
                  type="email"
                  name="email"
                  value={input.email}
                  onChange={changeEventHandler}
                  placeholder="you@example.com"
                  required
                  className="pl-10 h-11 bg-white/5 border-white/10 text-white placeholder:text-white/25 rounded-xl focus-visible:border-violet-400/50 focus-visible:ring-violet-400/20"
                />
              </div>
            </div>

            {/* Password */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label
                  htmlFor="password"
                  className="text-xs font-medium text-white/70"
                >
                  Password
                </label>
                <button
                  type="button"
                  className="text-[11px] text-white/40 hover:text-white/70 transition-colors"
                  tabIndex={-1}
                >
                  Forgot?
                </button>
              </div>
              <div className="relative group">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30 group-focus-within:text-violet-300 transition-colors" />
                <Input
                  id="password"
                  type="password"
                  name="password"
                  value={input.password}
                  onChange={changeEventHandler}
                  placeholder="••••••••"
                  required
                  className="pl-10 h-11 bg-white/5 border-white/10 text-white placeholder:text-white/25 rounded-xl focus-visible:border-violet-400/50 focus-visible:ring-violet-400/20"
                />
              </div>
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className="w-full h-12 inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-violet-500 to-cyan-500 text-white font-semibold text-sm shadow-[0_0_28px_rgba(124,92,255,0.45)] hover:opacity-95 active:scale-[0.98] transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed group"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Signing in...
                </>
              ) : (
                <>
                  Sign in
                  <ArrowRight className="h-4 w-4 group-hover:translate-x-0.5 transition-transform" />
                </>
              )}
            </button>

            {/* Divider */}
            <div className="flex items-center gap-3">
              <div className="h-px flex-1 bg-white/8" />
              <span className="text-[10px] uppercase tracking-widest text-white/30">
                or
              </span>
              <div className="h-px flex-1 bg-white/8" />
            </div>

            {/* Signup link */}
            <p className="text-center text-sm text-white/50">
              New to Nova?{" "}
              <Link
                to="/signup"
                className="font-semibold text-white hover:text-violet-300 transition-colors"
              >
                Create an account
              </Link>
            </p>
          </form>

          {/* Legal */}
          <p className="mt-6 text-center text-[11px] text-white/25 leading-relaxed">
            By signing in you agree to Nova's Terms & Privacy Policy.
          </p>
        </div>
      </main>
    </div>
  );
};

export default Login;
