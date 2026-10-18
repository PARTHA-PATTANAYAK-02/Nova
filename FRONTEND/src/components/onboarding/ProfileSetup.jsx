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
  XCircle,
} from "lucide-react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { setAuthUser } from "@/redux/authSlice";
import { apiUrl } from "@/lib/api";
import { getErrorMessage } from "@/lib/utils";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
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
      if (screen === "intro") setScreen("setup");
      else navigate("/", { replace: true });
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
    if (
      normalizedUsername &&
      (normalizedUsername.length < 3 || normalizedUsername.length > 30)
    ) {
      toast.error("Username must be 3–30 characters.");
      return;
    }
    if (normalizedUsername && !/^[a-zA-Z0-9._]+$/.test(normalizedUsername)) {
      toast.error(
        "Use only letters, numbers, dots, and underscores in your username.",
      );
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
      toast.error(
        getErrorMessage(error, "Unable to save your profile details."),
      );
    } finally {
      setSaving(false);
    }
  };

  /* ═══════ INTRO / COMPLETE ═══════ */
  if (screen !== "setup") {
    if (screen === "complete") {
      return (
        <WelcomeScreen
          greeting={`Welcome to Nova, ${user?.fullName?.split(/\s+/)[0] || "friend"}`}
        />
      );
    }

    return (
      <main className="nv-intro">
        <span className="nv-intro__aurora" aria-hidden />
        <div className="nv-intro__stage">
          <div className="nv-intro__logo-wrap">
            <img src="/logo.gif" alt="Nova" className="nv-intro__logo" />
            <span className="nv-intro__logo-glow" aria-hidden />
          </div>
          <div className="nv-intro__message">
            <p className="nv-intro__kicker">
              <Sparkles className="size-3.5" strokeWidth={2.2} />
              YOUR ORBIT STARTS HERE
            </p>
            <h1 className="nv-intro__title">
              Welcome to Nova, {user?.fullName?.split(/\s+/)[0] || "friend"}
            </h1>
          </div>
        </div>
        <div className="nv-intro__progress" aria-hidden />
      </main>
    );
  }

  const firstName = user?.fullName?.split(/\s+/)[0] || "there";

  /* ═══════ SETUP SCREEN ═══════ */
  return (
    <main className="nv-onboard">
      <section className="nv-onboard__card">
        {/* ── HERO ── */}
        <div className="nv-onboard__hero">
          <button
            type="button"
            onClick={() => coverInputRef.current?.click()}
            className="nv-onboard__cover"
            style={
              coverPreview
                ? { backgroundImage: `url(${coverPreview})` }
                : undefined
            }
            aria-label="Change cover photo"
          >
            <span className="nv-onboard__cover-scrim" aria-hidden />
            <span className="nv-onboard__cover-cta">
              <ImagePlus className="size-3.5" strokeWidth={2.2} />
              {coverPreview ? "Change cover" : "Add cover"}
            </span>
          </button>

          <div className="nv-onboard__identity">
            <button
              type="button"
              onClick={() => profileInputRef.current?.click()}
              className="nv-onboard__avatar-btn"
              aria-label="Choose profile photo"
            >
              <span className="nv-onboard__avatar-ring" aria-hidden />
              <Avatar className="nv-onboard__avatar">
                <AvatarImage src={profilePreview} className="object-cover" />
                <AvatarFallback className="nv-onboard__avatar-fallback">
                  <UserRound className="size-9" strokeWidth={1.6} />
                </AvatarFallback>
              </Avatar>
              <span className="nv-onboard__avatar-badge">
                <ImagePlus className="size-3.5" strokeWidth={2.4} />
              </span>
            </button>
            <div className="nv-onboard__identity-meta">
              <h2 className="nv-onboard__name">
                {user?.fullName || "Your name"}
              </h2>
              <p className="nv-onboard__email">{user?.email || ""}</p>
            </div>
          </div>
        </div>

        {/* ── HEADINGS ── */}
        <div className="nv-onboard__intro">
          <span className="nv-onboard__eyebrow">
            <Sparkles className="size-3.5" strokeWidth={2.2} />
            One last thing, {firstName}
          </span>
          <h1 className="nv-onboard__title">
            Make Nova <em>feel like you.</em>
          </h1>
          <p className="nv-onboard__sub">
            Everything below is optional — you can change it any time.
          </p>
        </div>

        {/* ── FIELDS ── */}
        <form onSubmit={finishSetup} className="nv-onboard__body">
          <div className="nv-onboard__grid">
            {/* username */}
            <div className="nv-field">
              <label htmlFor="setup-username" className="nv-field__label">
                Username <span className="nv-field__opt">· optional</span>
              </label>
              <div className="nv-field__control">
                <span className="nv-field__at" aria-hidden>
                  @
                </span>
                <input
                  id="setup-username"
                  value={username}
                  onChange={(e) => {
                    setUsername(e.target.value.toLowerCase());
                    setUsernameState("idle");
                  }}
                  onBlur={checkUsername}
                  placeholder="yourname"
                  minLength={3}
                  maxLength={30}
                  autoComplete="username"
                  className="nv-field__input nv-field__input--at"
                />
                {usernameState === "checking" && (
                  <Loader2 className="nv-field__spinner size-4 animate-spin" />
                )}
                {usernameState === "available" && (
                  <CheckCircle2
                    className="nv-field__check size-5"
                    strokeWidth={2.6}
                  />
                )}
                {(usernameState === "taken" || usernameState === "invalid") && (
                  <XCircle className="nv-field__x size-5" strokeWidth={2.6} />
                )}
              </div>
            </div>

            {/* dob */}
            <div className="nv-field">
              <label htmlFor="setup-dob" className="nv-field__label">
                Birthday <span className="nv-field__opt">· optional</span>
              </label>
              <div className="nv-field__control">
                <CalendarDays
                  className="nv-field__icon size-4"
                  strokeWidth={1.9}
                />
                <input
                  id="setup-dob"
                  type="date"
                  value={dateOfBirth}
                  max={todayDate}
                  onChange={(e) => setDateOfBirth(e.target.value)}
                  className="nv-field__input nv-field__input--icon"
                />
              </div>
            </div>
          </div>

          {/* bio */}
          <div className="nv-field">
            <div className="nv-field__label-row">
              <label htmlFor="setup-bio" className="nv-field__label">
                About you <span className="nv-field__opt">· optional</span>
              </label>
              <span className="nv-field__count">{bio.length}/300</span>
            </div>
            <div className="nv-field__control nv-field__control--area">
              <textarea
                id="setup-bio"
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                placeholder="A little about yourself…"
                maxLength={300}
                rows={4}
                className="nv-field__textarea"
              />
            </div>
          </div>

          {/* footer */}
          <footer className="nv-onboard__foot">
            <button
              type="button"
              onClick={() => setScreen("complete")}
              disabled={saving}
              className="nv-onboard__skip"
            >
              Skip for now
            </button>
            <button
              type="submit"
              disabled={saving}
              className="nv-onboard__continue"
            >
              {saving ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  Saving…
                </>
              ) : (
                <>
                  Continue
                  <ArrowRight className="size-4" strokeWidth={2.2} />
                </>
              )}
            </button>
          </footer>
        </form>

        <input
          ref={coverInputRef}
          type="file"
          accept="image/*"
          onChange={(e) => selectImage(e, setCoverPhoto)}
          className="hidden"
        />
        <input
          ref={profileInputRef}
          type="file"
          accept="image/*"
          onChange={(e) => selectImage(e, setProfilePhoto)}
          className="hidden"
        />
      </section>
    </main>
  );
};

export default ProfileSetup;
