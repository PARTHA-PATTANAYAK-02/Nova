import { useState } from "react";
import axios from "axios";
import {
  AlertTriangle,
  ArrowLeft,
  KeyRound,
  Loader2,
  ShieldCheck,
  Trash2,
  Lock,
  Eye,
  EyeOff,
  X,
} from "lucide-react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { setAuthUser } from "@/redux/authSlice";
import { setPosts, setSelectedPost } from "@/redux/postSlice";
import { apiUrl } from "@/lib/api";
import { getErrorMessage } from "@/lib/utils";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import PasswordResetForm from "@/components/auth/PasswordResetForm";

const AccountSecurity = () => {
  const { user } = useSelector((store) => store.auth);
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [deleting, setDeleting] = useState(false);

  /* ---------- DELETE ACCOUNT ---------- */
  const deleteAccount = async (event) => {
    event.preventDefault();
    if (!password.trim()) return;

    try {
      setDeleting(true);
      const response = await axios.delete(apiUrl("/api/v1/user/account"), {
        data: { password },
        withCredentials: true,
      });
      if (response.data.success) {
        dispatch(setAuthUser(null));
        dispatch(setSelectedPost(null));
        dispatch(setPosts([]));
        toast.success(
          response.data.message || "Your account has been deleted.",
        );
        navigate("/login", { replace: true });
      }
    } catch (error) {
      toast.error(getErrorMessage(error, "Unable to delete your account."));
    } finally {
      setDeleting(false);
    }
  };

  const focusReset = () => {
    setDeleteOpen(false);
    setTimeout(() => {
      document
        .getElementById("password-reset")
        ?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 200);
  };

  const closeDeleteModal = () => {
    if (deleting) return;
    setDeleteOpen(false);
    setPassword("");
    setShowPassword(false);
  };

  return (
    <main className="mx-auto max-w-2xl px-3 py-5 sm:px-4 animate-fade-in">
      {/* ============ BACK ============ */}
      <button
        type="button"
        onClick={() => navigate(`/profile/${user?._id}`)}
        className="group mb-4 inline-flex items-center gap-1.5 text-sm text-[var(--muted-foreground)] transition-colors hover:text-[var(--foreground)]"
      >
        <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-0.5" />
        Back to profile
      </button>

      {/* ============ PAGE HEADER ============ */}
      <header className="mb-6">
        <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[var(--muted-foreground)]">
          Settings
        </p>
        <h1
          className="mt-1 text-2xl md:text-3xl font-bold text-[var(--foreground)] tracking-tight"
          style={{ fontFamily: "var(--font-display)" }}
        >
          Account & security
        </h1>
        <p className="mt-1.5 text-sm text-[var(--muted-foreground)]">
          Manage your password and account safety.
        </p>
      </header>

      {/* ============ PASSWORD RESET SECTION ============ */}
      <section
        id="password-reset"
        className="card overflow-hidden scroll-mt-20 mb-4"
      >
        {/* Header */}
        <div className="border-b border-[var(--border)] px-5 py-5">
          <div className="flex items-start gap-3.5">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[var(--primary)]/12 text-[var(--primary)]">
              <ShieldCheck className="h-5 w-5" strokeWidth={2} />
            </span>
            <div className="min-w-0 flex-1">
              <h2
                className="text-base font-semibold text-[var(--foreground)]"
                style={{ fontFamily: "var(--font-display)" }}
              >
                Password
              </h2>
              <p className="mt-0.5 text-xs text-[var(--muted-foreground)] leading-relaxed">
                Verify with a one-time code sent to your email, then choose a
                new password.
              </p>
            </div>
          </div>
        </div>

        {/* Form */}
        <div className="p-5">
          <PasswordResetForm email={user?.email} emailLocked />
        </div>
      </section>

      {/* ============ DANGER ZONE ============ */}
      <section className="relative overflow-hidden rounded-2xl border border-[var(--danger)]/30 bg-[var(--danger)]/[0.04]">
        {/* Ambient glow */}
        <div
          className="pointer-events-none absolute -right-16 -top-16 h-40 w-40 rounded-full opacity-20 blur-3xl"
          style={{ background: "var(--danger)" }}
        />

        {/* Header */}
        <div className="relative border-b border-[var(--danger)]/20 px-5 py-5">
          <div className="flex items-start gap-3.5">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[var(--danger)]/12 text-[var(--danger)]">
              <AlertTriangle className="h-5 w-5" strokeWidth={2} />
            </span>
            <div className="min-w-0 flex-1">
              <h2
                className="text-base font-semibold text-[var(--danger)]"
                style={{ fontFamily: "var(--font-display)" }}
              >
                Danger zone
              </h2>
              <p className="mt-0.5 text-xs text-[var(--muted-foreground)] leading-relaxed">
                Permanently delete your profile, posts, stories, likes,
                comments, saved posts, messages, and notifications.
              </p>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="relative flex flex-wrap items-center justify-between gap-3 px-5 py-4">
          <p className="text-[11px] text-[var(--muted-foreground)]">
            Password required to continue.
          </p>
          <button
            type="button"
            onClick={() => {
              setPassword("");
              setShowPassword(false);
              setDeleteOpen(true);
            }}
            className="
              inline-flex items-center gap-1.5
              rounded-full
              bg-[var(--danger)] px-4 py-2
              text-xs font-semibold text-white
              transition-all
              hover:opacity-90
              active:scale-95
            "
          >
            <Trash2 className="h-3.5 w-3.5" strokeWidth={2.2} />
            Delete account
          </button>
        </div>
      </section>

      {/* ============ DELETE CONFIRMATION DIALOG ============ */}
      <Dialog open={deleteOpen} onOpenChange={(v) => !v && closeDeleteModal()}>
        <DialogContent
          showCloseButton={false}
          className="max-w-[min(94vw,440px)] p-0 overflow-hidden !gap-0"
        >
          {/* Header */}
          <DialogHeader className="relative px-5 pt-5 pb-4 border-b border-[var(--border)]">
            <div className="flex items-start gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[var(--danger)]/12 text-[var(--danger)]">
                <AlertTriangle className="h-5 w-5" strokeWidth={2.2} />
              </span>
              <div className="flex-1 min-w-0">
                <DialogTitle
                  className="text-base font-semibold text-[var(--danger)]"
                  style={{ fontFamily: "var(--font-display)" }}
                >
                  Delete account?
                </DialogTitle>
                <p className="mt-0.5 text-xs text-[var(--muted-foreground)]">
                  This action cannot be undone.
                </p>
              </div>

              <button
                type="button"
                onClick={closeDeleteModal}
                disabled={deleting}
                aria-label="Close"
                className="
                  w-8 h-8 rounded-full
                  flex items-center justify-center
                  text-[var(--muted-foreground)]
                  hover:text-[var(--foreground)] hover:bg-[var(--surface-2)]
                  transition-colors
                  disabled:opacity-50
                "
              >
                <X className="h-4 w-4" strokeWidth={2.2} />
              </button>
            </div>
          </DialogHeader>

          {/* Body */}
          <form onSubmit={deleteAccount}>
            <div className="px-5 py-4 space-y-4">
              <p className="text-sm leading-relaxed text-[var(--muted-foreground)]">
                Your profile, posts, stories, messages and all associated data
                will be permanently removed from Nova.
              </p>

              {/* Password input */}
              <div className="space-y-1.5">
                <label
                  htmlFor="delete-password"
                  className="text-xs font-medium text-[var(--foreground)]"
                >
                  Confirm with your password
                </label>
                <div className="relative group">
                  <Lock
                    className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--muted-foreground)] group-focus-within:text-[var(--danger)] transition-colors pointer-events-none"
                    strokeWidth={1.8}
                  />
                  <Input
                    id="delete-password"
                    type={showPassword ? "text" : "password"}
                    autoComplete="current-password"
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    placeholder="Enter your password"
                    required
                    disabled={deleting}
                    className="pl-10 pr-11"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((s) => !s)}
                    tabIndex={-1}
                    aria-label={
                      showPassword ? "Hide password" : "Show password"
                    }
                    className="
                      absolute right-3 top-1/2 -translate-y-1/2
                      w-7 h-7 rounded-md
                      flex items-center justify-center
                      text-[var(--muted-foreground)]
                      hover:text-[var(--foreground)] hover:bg-[var(--surface-2)]
                      transition-colors
                    "
                  >
                    {showPassword ? (
                      <EyeOff className="w-4 h-4" strokeWidth={1.8} />
                    ) : (
                      <Eye className="w-4 h-4" strokeWidth={1.8} />
                    )}
                  </button>
                </div>
              </div>

              {/* Forgot password shortcut */}
              <button
                type="button"
                onClick={focusReset}
                disabled={deleting}
                className="
                  inline-flex items-center gap-1.5
                  text-xs font-medium
                  text-[var(--primary)] hover:underline
                  transition-colors
                  disabled:opacity-50
                "
              >
                <KeyRound className="h-3.5 w-3.5" strokeWidth={2} />
                Forgot your password? Reset it first
              </button>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-end gap-2 border-t border-[var(--border)] px-5 py-4">
              <button
                type="button"
                onClick={closeDeleteModal}
                disabled={deleting}
                className="
                  text-xs font-medium
                  px-4 py-2 rounded-full
                  text-[var(--muted-foreground)]
                  hover:text-[var(--foreground)] hover:bg-[var(--surface-2)]
                  transition-colors
                  disabled:opacity-50
                "
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={deleting || !password.trim()}
                className="
                  inline-flex items-center justify-center gap-1.5
                  min-w-[140px]
                  text-xs font-semibold
                  px-4 py-2 rounded-full
                  bg-[var(--danger)] text-white
                  hover:opacity-90
                  active:scale-95
                  transition-all
                  disabled:opacity-50 disabled:cursor-not-allowed
                "
              >
                {deleting ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    Deleting...
                  </>
                ) : (
                  <>
                    <Trash2 className="h-3.5 w-3.5" strokeWidth={2.2} />
                    Delete permanently
                  </>
                )}
              </button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </main>
  );
};

export default AccountSecurity;
