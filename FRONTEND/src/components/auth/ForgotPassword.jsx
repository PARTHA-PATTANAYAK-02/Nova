import { ArrowLeft, KeyRound } from "lucide-react";
import { Link } from "react-router-dom";
import PasswordResetForm from "@/components/auth/PasswordResetForm";

const ForgotPassword = () => (
  <div className="min-h-screen w-full grid lg:grid-cols-2 bg-[var(--background)]">
    <aside
      className="hidden lg:flex relative flex-col justify-between overflow-hidden p-12"
      style={{ background: "linear-gradient(155deg, var(--primary) 0%, var(--primary-hover) 100%)" }}
    >
      <div className="absolute inset-0 opacity-[0.08]" style={{ backgroundImage: "repeating-linear-gradient(90deg, rgba(255,255,255,0.4) 0, rgba(255,255,255,0.4) 1px, transparent 1px, transparent 48px)" }} />
      <Link to="/" className="relative text-2xl font-bold tracking-tight text-white" style={{ fontFamily: "var(--font-display)" }}>Nova</Link>
      <div className="relative max-w-md">
        <p className="mb-4 text-[11px] font-semibold uppercase tracking-[0.28em] text-white/60">Account recovery</p>
        <h1 className="text-4xl font-bold leading-[1.1] text-white" style={{ fontFamily: "var(--font-display)" }}>Get back to the moments that matter.</h1>
        <p className="mt-5 text-base leading-relaxed text-white/70">A short-lived code keeps your account protected while you choose a new password.</p>
      </div>
      <span className="relative text-xs text-white/50">Private · secure · yours</span>
    </aside>

    <main className="flex items-center justify-center p-6 lg:p-12">
      <div className="w-full max-w-md">
        <Link to="/login" className="mb-5 inline-flex items-center gap-1.5 text-sm text-[var(--muted-foreground)] hover:text-[var(--foreground)]">
          <ArrowLeft className="h-4 w-4" /> Back to sign in
        </Link>
        <section className="card p-6 md:p-8">
          <span className="mb-4 flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--primary)]/12 text-[var(--primary)]"><KeyRound className="h-5 w-5" /></span>
          <h1 className="text-2xl font-bold text-[var(--foreground)]" style={{ fontFamily: "var(--font-display)" }}>Reset password</h1>
          <p className="mb-6 mt-1 text-sm text-[var(--muted-foreground)]">Enter the email on your Nova account. We’ll send a one-time verification code.</p>
          <PasswordResetForm />
        </section>
      </div>
    </main>
  </div>
);

export default ForgotPassword;
