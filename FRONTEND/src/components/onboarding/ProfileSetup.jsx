import { useEffect, useRef, useState } from "react";
import axios from "axios";
import {
  ArrowRight,
  CalendarDays,
  CheckCircle2,
  ImagePlus,
  Loader2,
  Sparkles,
  UserRound,
} from "lucide-react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { setAuthUser } from "@/redux/authSlice";
import { apiUrl } from "@/lib/api";
import { getErrorMessage } from "@/lib/utils";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import WelcomeScreen from "@/components/onboarding/WelcomeScreen";

const MAX_IMAGE_SIZE = 5 * 1024 * 1024;
const WELCOME_DURATION_MS = 4400;
const today = new Date();
const todayDate = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;

const ProfileSetup = () => {
  const { user } = useSelector((store) => store.auth);
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const profileInputRef = useRef(null);
  const coverInputRef = useRef(null);
  const [username, setUsername] = useState("");
  const [bio, setBio] = useState("");
  const [dateOfBirth, setDateOfBirth] = useState("");
  const [profilePhoto, setProfilePhoto] = useState(null);
  const [coverPhoto, setCoverPhoto] = useState(null);
  const [profilePreview, setProfilePreview] = useState("");
  const [coverPreview, setCoverPreview] = useState("");
  const [usernameState, setUsernameState] = useState("idle");
  const [saving, setSaving] = useState(false);
  const [screen, setScreen] = useState("intro");

  useEffect(() => {
    if (!user) navigate("/signup", { replace: true });
  }, [navigate, user]);

  useEffect(() => {
    if (profilePhoto) {
      const url = URL.createObjectURL(profilePhoto);
      setProfilePreview(url);
      return () => URL.revokeObjectURL(url);
    }
    setProfilePreview("");
  }, [profilePhoto]);

  useEffect(() => {
    if (coverPhoto) {
      const url = URL.createObjectURL(coverPhoto);
      setCoverPreview(url);
      return () => URL.revokeObjectURL(url);
    }
    setCoverPreview("");
  }, [coverPhoto]);

  useEffect(() => {
    if (screen === "setup") return undefined;
    const timeout = setTimeout(() => {
      if (screen === "intro") {
        setScreen("setup");
      } else {
        navigate("/", { replace: true });
      }
    }, WELCOME_DURATION_MS);
    return () => clearTimeout(timeout);
  }, [navigate, screen]);

  const selectImage = (event, setImage) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error("Please choose an image file.");
      return;
    }
    if (file.size > MAX_IMAGE_SIZE) {
      toast.error("Images must be smaller than 5 MB.");
      return;
    }
    setImage(file);
  };

  const checkUsername = async () => {
    const value = username.trim();
    if (!value) {
      setUsernameState("idle");
      return;
    }
    if (value.length < 3 || value.length > 30) {
      setUsernameState("invalid");
      return;
    }

    setUsernameState("checking");
    try {
      const response = await axios.get(
        apiUrl("/api/v1/user/username/availability"),
        { params: { username: value }, withCredentials: true },
      );
      setUsernameState(response.data.available ? "available" : "taken");
    } catch {
      setUsernameState("error");
    }
  };

  const finishSetup = async (event) => {
    event?.preventDefault();
    const normalizedUsername = username.trim();
    if (normalizedUsername && (normalizedUsername.length < 3 || normalizedUsername.length > 30)) {
      toast.error("Username must be 3–30 characters.");
      return;
    }
    if (normalizedUsername && !/^[a-zA-Z0-9._]+$/.test(normalizedUsername)) {
      toast.error("Use only letters, numbers, dots, and underscores in your username.");
      return;
    }

    const formData = new FormData();
    if (normalizedUsername) formData.append("username", normalizedUsername);
    if (bio.trim()) formData.append("bio", bio.trim());
    if (dateOfBirth) formData.append("dateOfBirth", dateOfBirth);
    if (profilePhoto) formData.append("profilePhoto", profilePhoto);
    if (coverPhoto) formData.append("coverPhoto", coverPhoto);

    try {
      setSaving(true);
      if (
        normalizedUsername ||
        bio.trim() ||
        dateOfBirth ||
        profilePhoto ||
        coverPhoto
      ) {
        const response = await axios.post(
          apiUrl("/api/v1/user/profile/edit"),
          formData,
          { withCredentials: true },
        );
        dispatch(setAuthUser({ ...user, ...response.data.user }));
      }
      setScreen("complete");
    } catch (error) {
      toast.error(getErrorMessage(error, "Unable to save your profile details."));
    } finally {
      setSaving(false);
    }
  };

  if (screen !== "setup") {
    if (screen === "complete") {
      return (
        <WelcomeScreen
          greeting={`Welcome to Nova, ${user?.fullName?.split(/\s+/)[0] || "friend"}`}
        />
      );
    }

    return (
      <main className="fixed inset-0 z-[100] flex flex-col items-center justify-center overflow-hidden bg-[#050914] text-center">
        <div
          className="absolute inset-0"
          style={{
            background:
              "radial-gradient(circle at center, rgba(34,64,138,0.38), transparent 62%)",
          }}
        />
        <div className="relative z-10 flex flex-col items-center px-5">
          <img
            src="/logo.gif"
            alt="Nova"
            className="nova-welcome-logo h-auto max-h-[62vh] w-[min(82vw,620px)] object-contain"
            style={{
              animation:
                "nova-welcome-zoom 4.4s cubic-bezier(0.2,0.7,0.25,1) forwards",
            }}
          />
          <div className="nova-welcome-message mt-1 text-white">
            <p className="flex items-center justify-center gap-2 text-xs font-medium tracking-[0.18em] text-white/65 sm:text-sm">
              <Sparkles className="h-4 w-4" /> YOUR ORBIT STARTS HERE
            </p>
            <h1 className="mt-2 text-2xl font-bold sm:text-3xl" style={{ fontFamily: "var(--font-display)" }}>
              Welcome to Nova, {user?.fullName?.split(/\s+/)[0] || "friend"}
            </h1>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[var(--background)] px-4 py-8">
      <div className="pointer-events-none absolute -left-20 top-10 h-64 w-64 rounded-full bg-[var(--primary)]/10 blur-3xl" />
      <div className="pointer-events-none absolute -right-16 bottom-0 h-72 w-72 rounded-full bg-[var(--accent)]/10 blur-3xl" />

      <section className="card relative z-10 w-full max-w-2xl overflow-hidden animate-fade-in">
        <div className="border-b border-[var(--border)] px-5 py-5 sm:px-7">
          <div className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-[var(--primary)]">
            <Sparkles className="h-4 w-4" /> One last thing
          </div>
          <h1 className="text-2xl font-bold text-[var(--foreground)] sm:text-3xl" style={{ fontFamily: "var(--font-display)" }}>
            Make Nova feel like you
          </h1>
          <p className="mt-1.5 text-sm text-[var(--muted-foreground)]">
            Add a few details to your profile. Everything here is optional, and you can update it later.
          </p>
        </div>

        <form onSubmit={finishSetup} className="space-y-6 p-5 sm:p-7">
          <div className="overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface-2)]">
            <button
              type="button"
              onClick={() => coverInputRef.current?.click()}
              className="group relative flex h-36 w-full items-center justify-center overflow-hidden sm:h-44"
              style={
                coverPreview
                  ? { backgroundImage: `url(${coverPreview})`, backgroundSize: "cover", backgroundPosition: "center" }
                  : { background: "linear-gradient(125deg, var(--primary) 0%, var(--primary-hover) 55%, var(--accent) 100%)" }
              }
            >
              <div className="absolute inset-0 bg-black/20 transition-colors group-hover:bg-black/35" />
              <span className="relative inline-flex items-center gap-2 rounded-full border border-white/30 bg-black/30 px-3.5 py-2 text-xs font-semibold text-white backdrop-blur-sm">
                <ImagePlus className="h-4 w-4" />
                {coverPreview ? "Change cover photo" : "Add a cover photo"}
              </span>
            </button>
            <div className="flex items-center gap-4 px-4 py-4">
              <button
                type="button"
                onClick={() => profileInputRef.current?.click()}
                className="relative -mt-12 shrink-0 rounded-full ring-4 ring-[var(--surface)]"
                aria-label="Choose profile photo"
              >
                <Avatar className="h-20 w-20 border border-[var(--border)] sm:h-24 sm:w-24">
                  <AvatarImage src={profilePreview} className="object-cover" />
                  <AvatarFallback className="bg-[var(--primary)]/10 text-[var(--primary)]">
                    <UserRound className="h-8 w-8" />
                  </AvatarFallback>
                </Avatar>
                <span className="absolute bottom-0 right-0 flex h-7 w-7 items-center justify-center rounded-full border-2 border-[var(--surface)] bg-[var(--primary)] text-white">
                  <ImagePlus className="h-3.5 w-3.5" />
                </span>
              </button>
              <div className="min-w-0 pt-1">
                <p className="truncate text-sm font-semibold text-[var(--foreground)]">{user?.fullName}</p>
                <p className="text-xs text-[var(--muted-foreground)]">Add a profile photo</p>
              </div>
            </div>
            <input
              ref={coverInputRef}
              type="file"
              accept="image/*"
              onChange={(event) => selectImage(event, setCoverPhoto)}
              className="hidden"
            />
            <input
              ref={profileInputRef}
              type="file"
              accept="image/*"
              onChange={(event) => selectImage(event, setProfilePhoto)}
              className="hidden"
            />
            <p className="px-4 pb-3 text-[11px] text-[var(--muted-foreground)]">
              Profile and cover photos · JPG, PNG or WEBP · max 5 MB each
            </p>
          </div>

          <div className="grid gap-5 sm:grid-cols-2">
            <div className="space-y-1.5">
              <label htmlFor="setup-username" className="text-xs font-medium text-[var(--foreground)]">
                Username <span className="text-[var(--muted-foreground)]">(optional)</span>
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-[var(--muted-foreground)]">@</span>
                <Input
                  id="setup-username"
                  value={username}
                  onChange={(event) => {
                    setUsername(event.target.value.toLowerCase());
                    setUsernameState("idle");
                  }}
                  onBlur={checkUsername}
                  placeholder="yourname"
                  minLength={3}
                  maxLength={30}
                  className="pl-8"
                  autoComplete="username"
                />
              </div>
              {usernameState !== "idle" && (
                <p className={`flex items-center gap-1 text-[11px] ${
                  usernameState === "available"
                    ? "text-[var(--success)]"
                    : usernameState === "checking"
                      ? "text-[var(--muted-foreground)]"
                      : "text-[var(--danger)]"
                }`}>
                  {usernameState === "available" && <CheckCircle2 className="h-3 w-3" />}
                  {usernameState === "checking"
                    ? "Checking username…"
                    : usernameState === "available"
                      ? "Username is available"
                      : usernameState === "taken"
                        ? "That username is already taken"
                        : usernameState === "invalid"
                          ? "Username must be 3–30 characters"
                          : "Couldn't check right now. It will be checked when you save."}
                </p>
              )}
            </div>

            <div className="space-y-1.5">
              <label htmlFor="setup-dob" className="text-xs font-medium text-[var(--foreground)]">
                Date of birth <span className="text-[var(--muted-foreground)]">(optional)</span>
              </label>
              <div className="relative">
                <CalendarDays className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--muted-foreground)]" />
                <Input
                  id="setup-dob"
                  type="date"
                  value={dateOfBirth}
                  max={todayDate}
                  onChange={(event) => setDateOfBirth(event.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
          </div>

          <div className="space-y-1.5">
            <label htmlFor="setup-bio" className="text-xs font-medium text-[var(--foreground)]">
              About you <span className="text-[var(--muted-foreground)]">(optional)</span>
            </label>
            <Textarea
              id="setup-bio"
              value={bio}
              onChange={(event) => setBio(event.target.value)}
              placeholder="A little about yourself…"
              maxLength={300}
              rows={3}
              className="resize-none"
            />
            <p className="text-right text-[11px] text-[var(--muted-foreground)]">{bio.length}/300</p>
          </div>

          <div className="flex flex-col-reverse gap-3 border-t border-[var(--border)] pt-5 sm:flex-row sm:justify-between">
            <button
              type="button"
              onClick={() => setScreen("complete")}
              disabled={saving}
              className="rounded-full px-4 py-2.5 text-sm font-medium text-[var(--muted-foreground)] transition-colors hover:bg-[var(--surface-2)] hover:text-[var(--foreground)] disabled:opacity-50"
            >
              Skip for now
            </button>
            <button
              type="submit"
              disabled={saving}
              className="inline-flex items-center justify-center gap-2 rounded-full px-5 py-2.5 text-sm font-semibold transition-all active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
              style={{ background: "var(--primary)", color: "var(--primary-foreground)" }}
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              {saving ? "Saving…" : "Continue to Nova"}
              {!saving && <ArrowRight className="h-4 w-4" />}
            </button>
          </div>
        </form>
      </section>
    </main>
  );
};

export default ProfileSetup;
