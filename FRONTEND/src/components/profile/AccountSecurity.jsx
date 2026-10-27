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
  Tag,
} from "lucide-react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { setAuthUser } from "@/redux/authSlice";
import { setPosts, setSelectedPost } from "@/redux/postSlice";
import { apiUrl } from "@/lib/api";
import { getErrorMessage } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
  const [taggingPrivacy, setTaggingPrivacy] = useState(user?.taggingPrivacy || "everyone");
  const [tagPrivacyLoading, setTagPrivacyLoading] = useState(false);

  const handleUpdateTaggingPrivacy = async (val) => {
    setTaggingPrivacy(val);
    setTagPrivacyLoading(true);
    try {
      const formData = new FormData();
      formData.append("taggingPrivacy", val);
      const res = await axios.post(apiUrl("/api/v1/user/profile/edit"), formData, {
        withCredentials: true,
      });
      if (res.data?.success) {
        dispatch(setAuthUser({ ...user, taggingPrivacy: val }));
        toast.success("Tagging privacy updated!");
      }
    } catch (err) {
      toast.error(getErrorMessage(err, "Failed to update tagging privacy"));
    } finally {
      setTagPrivacyLoading(false);
    }
  };

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
    <main className="nova-page">
      <button
        type="button"
        onClick={() => navigate(`/profile/${user?.username || user?._id}`)}
        className="nova-sec__back"
      >
        <ArrowLeft className="size-4" strokeWidth={1.8} />
        Back to profile
      </button>

      <header className="nova-sec__head">
        <p className="nova-sec__eyebrow">Settings</p>
        <h1 className="nova-sec__title">Account & security</h1>
        <p className="nova-sec__sub">
          Manage your password and account safety.
        </p>
      </header>

      <section id="password-reset" className="nova-sec__card scroll-mt-20">
        <div className="nova-sec__card-head">
          <span className="nova-sec__card-orb nova-sec__card-orb--primary">
            <ShieldCheck className="size-5" strokeWidth={2} />
          </span>
          <div className="nova-sec__card-meta">
            <h2 className="nova-sec__card-title">Password</h2>
            <p className="nova-sec__card-sub">
              Verify with a one-time code sent to your email, then choose a new
              password.
            </p>
          </div>
        </div>
        <div className="nova-sec__card-body">
          <PasswordResetForm email={user?.email} emailLocked />
        </div>
      </section>

      <section className="nova-sec__card">
        <div className="nova-sec__card-head">
          <span className="nova-sec__card-orb nova-sec__card-orb--primary">
            <Tag className="size-5" strokeWidth={2} />
          </span>
          <div className="nova-sec__card-meta">
            <h2 className="nova-sec__card-title">Who can tag you in posts</h2>
            <p className="nova-sec__card-sub">
              Control whether everyone, only people you follow, or no one can tag your profile.
            </p>
          </div>
        </div>
        <div className="nova-sec__card-body pt-1">
          <div className="flex items-center gap-2.5 flex-wrap">
            <button
              type="button"
              disabled={tagPrivacyLoading}
              onClick={() => handleUpdateTaggingPrivacy("everyone")}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold border transition-all cursor-pointer ${
                taggingPrivacy === "everyone"
                  ? "bg-primary text-primary-foreground border-primary shadow-sm"
                  : "bg-[var(--surface-2)] text-[var(--muted-foreground)] border-[var(--border)] hover:text-[var(--foreground)]"
              }`}
            >
              Everyone
            </button>
            <button
              type="button"
              disabled={tagPrivacyLoading}
              onClick={() => handleUpdateTaggingPrivacy("following")}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold border transition-all cursor-pointer ${
                taggingPrivacy === "following"
                  ? "bg-primary text-primary-foreground border-primary shadow-sm"
                  : "bg-[var(--surface-2)] text-[var(--muted-foreground)] border-[var(--border)] hover:text-[var(--foreground)]"
              }`}
            >
              People You Follow Only
            </button>
            <button
              type="button"
              disabled={tagPrivacyLoading}
              onClick={() => handleUpdateTaggingPrivacy("no_one")}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold border transition-all cursor-pointer ${
                taggingPrivacy === "no_one"
                  ? "bg-primary text-primary-foreground border-primary shadow-sm"
                  : "bg-[var(--surface-2)] text-[var(--muted-foreground)] border-[var(--border)] hover:text-[var(--foreground)]"
              }`}
            >
              No One (Disallow Tagging)
            </button>
          </div>
        </div>
      </section>

      <section className="nova-sec__danger">
        <div className="nova-sec__danger-glow" aria-hidden />
        <div className="nova-sec__danger-head">
          <span className="nova-sec__card-orb nova-sec__card-orb--danger">
            <AlertTriangle className="size-5" strokeWidth={2} />
          </span>
          <div className="nova-sec__card-meta">
            <h2 className="nova-sec__danger-title">Danger zone</h2>
            <p className="nova-sec__card-sub">
              Permanently delete your profile, posts, stories, likes, comments,
              saved posts, messages, and notifications.
            </p>
          </div>
        </div>

        <div className="nova-sec__danger-actions">
          <p className="nova-sec__danger-hint">
            Password required to continue.
          </p>
          <button
            type="button"
            onClick={() => {
              setPassword("");
              setShowPassword(false);
              setDeleteOpen(true);
            }}
            className="nova-btn-danger"
          >
            <Trash2 className="size-3.5" strokeWidth={2.2} />
            Delete account
          </button>
        </div>
      </section>

      <Dialog open={deleteOpen} onOpenChange={(v) => !v && closeDeleteModal()}>
        <DialogContent
          showCloseButton={false}
          className="max-w-[min(94vw,460px)] p-0 overflow-hidden !gap-0 !rounded-3xl"
        >
          <DialogHeader className="relative px-5 pt-5 pb-4 border-b border-[var(--border)]/60">
            <div className="flex items-start gap-3">
              <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-[var(--danger)]/12 text-[var(--danger)]">
                <AlertTriangle className="size-5" strokeWidth={2.2} />
              </span>
              <div className="flex-1 min-w-0">
                <DialogTitle className="nova-del-dialog__title">
                  Delete account?
                </DialogTitle>
                <p className="nova-del-dialog__sub">
                  This action cannot be undone.
                </p>
              </div>
              <button
                type="button"
                onClick={closeDeleteModal}
                disabled={deleting}
                aria-label="Close"
                className="nova-del-dialog__close"
              >
                <X className="size-4" strokeWidth={2.2} />
              </button>
            </div>
          </DialogHeader>

          <form onSubmit={deleteAccount}>
            <div className="px-5 py-4 space-y-4">
              <p className="text-sm leading-relaxed text-[var(--muted-foreground)]">
                Your profile, posts, stories, messages and all associated data
                will be permanently removed from Nova.
              </p>

              <div className="space-y-1.5">
                <label
                  htmlFor="delete-password"
                  className="text-xs font-medium text-[var(--foreground)]"
                >
                  Confirm with your password
                </label>
                <div className="relative group">
                  <Lock
                    className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-[var(--muted-foreground)] group-focus-within:text-[var(--danger)] transition-colors pointer-events-none"
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
                    className="absolute right-3 top-1/2 -translate-y-1/2 size-7 rounded-md flex items-center justify-center text-[var(--muted-foreground)] hover:text-[var(--foreground)] hover:bg-[var(--surface-2)] transition-colors outline-none"
                  >
                    {showPassword ? (
                      <EyeOff className="size-4" strokeWidth={1.8} />
                    ) : (
                      <Eye className="size-4" strokeWidth={1.8} />
                    )}
                  </button>
                </div>
              </div>

              <button
                type="button"
                onClick={focusReset}
                disabled={deleting}
                className="inline-flex items-center gap-1.5 text-xs font-medium text-[var(--primary)] hover:underline transition-colors disabled:opacity-50 outline-none"
              >
                <KeyRound className="size-3.5" strokeWidth={2} />
                Forgot your password? Reset it first
              </button>
            </div>

            <div className="flex items-center justify-end gap-2 border-t border-[var(--border)]/60 px-5 py-4">
              <button
                type="button"
                onClick={closeDeleteModal}
                disabled={deleting}
                className="nova-btn-ghost"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={deleting || !password.trim()}
                className="nova-btn-danger"
              >
                {deleting ? (
                  <>
                    <Loader2 className="size-3.5 animate-spin" />
                    Deleting…
                  </>
                ) : (
                  <>
                    <Trash2 className="size-3.5" strokeWidth={2.2} />
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
