import React, { useState, useEffect, useRef } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate, useLocation } from "react-router-dom";
import {
  User,
  Shield,
  Lock,
  MessageCircle,
  Bell,
  Palette,
  QrCode,
  Activity,
  Trash2,
  Camera,
  Save,
  Loader2,
  Check,
  AlertTriangle,
  ExternalLink,
  Volume2,
  VolumeX,
  Eye,
  EyeOff,
  Sun,
  Moon,
  Sparkles,
  RefreshCw,
  LogOut,
  Info,
  Clock,
  Heart,
  Bookmark,
  Share2,
  Laptop,
  Smartphone,
  ShieldCheck,
  Calendar,
  Globe,
  MapPin,
  Pencil,
  ImagePlus,
  KeyRound,
  Instagram,
  Github,
  Twitter,
  Youtube,
  Linkedin,
  CheckCircle2,
  XCircle,
  AlertCircle,
} from "lucide-react";
import axios from "axios";
import { toast } from "sonner";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { setAuthUser } from "@/redux/authSlice";
import { setPosts, setSelectedPost } from "@/redux/postSlice";
import { apiUrl } from "@/lib/api";
import { getDisplayName, getErrorMessage, getProfileCompletion } from "@/lib/utils";
import { isSoundEnabled, setSoundEnabled, playMessageSound } from "@/lib/sound";
import { useTheme } from "@/hooks/useTheme";
import PasswordResetForm from "@/components/auth/PasswordResetForm";
import NovaQRCodeModal from "@/components/common/NovaQRCodeModal";

const TABS = [
  { id: "profile", label: "Profile Info", icon: User, desc: "Personal identity & details" },
  { id: "security", label: "Account & Security", icon: Lock, desc: "Password & sessions" },
  { id: "privacy", label: "Privacy & Safety", icon: Shield, desc: "Visibility & account controls" },
  { id: "chat", label: "Chat & Messaging", icon: MessageCircle, desc: "DMs, receipts & audio" },
  { id: "notifications", label: "Notifications", icon: Bell, desc: "Alert preferences" },
  { id: "appearance", label: "Appearance & Theme", icon: Palette, desc: "Display & media quality" },
  { id: "qrcode", label: "Nova QR Code", icon: QrCode, desc: "Share your profile card" },
  { id: "activity", label: "Your Activity", icon: Activity, desc: "Time spent & insights" },
  { id: "account", label: "Account & About", icon: Trash2, desc: "Data cache, about & danger" },
];

const detectDevice = () => {
  if (typeof window === "undefined" || !navigator?.userAgent) {
    return { os: "Desktop Device", browser: "Web Browser", isMobile: false };
  }
  const ua = navigator.userAgent;
  let os = "Desktop PC";
  if (/Windows NT 10.0/i.test(ua)) os = "Windows 11 / 10 PC";
  else if (/Windows/i.test(ua)) os = "Windows PC";
  else if (/Macintosh|Mac OS X/i.test(ua)) os = "macOS";
  else if (/Android/i.test(ua)) os = "Android Device";
  else if (/iPhone/i.test(ua)) os = "Apple iPhone";
  else if (/iPad/i.test(ua)) os = "Apple iPad";
  else if (/Linux/i.test(ua)) os = "Linux PC";

  let browser = "Web Browser";
  if (/Chrome/i.test(ua) && !/Edg|OPR/i.test(ua)) browser = "Google Chrome";
  else if (/Edg/i.test(ua)) browser = "Microsoft Edge";
  else if (/Firefox/i.test(ua)) browser = "Mozilla Firefox";
  else if (/Safari/i.test(ua) && !/Chrome/i.test(ua)) browser = "Apple Safari";
  else if (/OPR|Opera/i.test(ua)) browser = "Opera";

  const isMobile = /Android|iPhone|iPad|Mobile/i.test(ua);
  return { os, browser, isMobile };
};

const SettingsPage = () => {
  const { user } = useSelector((store) => store.auth);
  const profileComp = getProfileCompletion(user);
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const {
    theme,
    dark,
    setTheme,
    toggleTheme,
    darkShade,
    setDarkShade,
    lightShade,
    setLightShade,
    activeShade,
    accent,
    setAccent,
    shadesDark,
    shadesLight,
    accents,
    accentsGradient,
    accentsSolid,
  } = useTheme();

  const [accentTab, setAccentTab] = useState("all");

  const currentDevice = detectDevice();

  // Active tab state (can be initialized from location.state?.tab)
  const [activeTab, setActiveTab] = useState(location.state?.tab || "profile");

  /* ═══════════════════════════════════════════════
     TAB 1: PROFILE INFO & UNLOCK LOGIC
     ═══════════════════════════════════════════════ */
  const imageRef = useRef(null);
  const coverRef = useRef(null);

  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [unlockModalOpen, setUnlockModalOpen] = useState(false);
  const [unlockPassword, setUnlockPassword] = useState("");
  const [unlockLoading, setUnlockLoading] = useState(false);
  const [showUnlockPassword, setShowUnlockPassword] = useState(false);

  const [profileLoading, setProfileLoading] = useState(false);
  const [profileInput, setProfileInput] = useState({
    username: user?.username || "",
    fullName: user?.fullName || "",
    bio: user?.bio || "",
    gender: user?.gender || "male",
    dateOfBirth: user?.dateOfBirth ? new Date(user.dateOfBirth).toISOString().split("T")[0] : "",
    country: user?.country || "",
    website: user?.website || "",
    profilePhoto: null,
    coverPhoto: null,
    socialLinks: {
      instagram: user?.socialLinks?.instagram || "",
      github: user?.socialLinks?.github || "",
      twitter: user?.socialLinks?.twitter || "",
      youtube: user?.socialLinks?.youtube || "",
      linkedin: user?.socialLinks?.linkedin || "",
    },
    featuredSocialPlatforms: user?.featuredSocialPlatforms || [],
  });
  const [photoPreview, setPhotoPreview] = useState(user?.profilePicture || "");
  const [coverPreview, setCoverPreview] = useState(user?.coverPicture || "");

  // Real-time username availability state
  const [usernameCheckState, setUsernameCheckState] = useState("idle"); // "idle" | "checking" | "available" | "taken" | "current" | "invalid"
  const [usernameFeedback, setUsernameFeedback] = useState("");

  useEffect(() => {
    const raw = profileInput.username?.trim();
    if (!raw) {
      setUsernameCheckState("idle");
      setUsernameFeedback("");
      return;
    }
    const normalized = raw.toLowerCase();
    if (normalized === user?.username?.toLowerCase()) {
      setUsernameCheckState("current");
      setUsernameFeedback("This is your current username");
      return;
    }
    if (normalized.length < 3 || normalized.length > 30) {
      setUsernameCheckState("invalid");
      setUsernameFeedback("Username must be 3–30 characters");
      return;
    }
    if (!/^[a-zA-Z0-9._]+$/.test(normalized)) {
      setUsernameCheckState("invalid");
      setUsernameFeedback("Only letters, numbers, dots, and underscores allowed");
      return;
    }

    setUsernameCheckState("checking");
    setUsernameFeedback("Checking availability...");

    const timer = setTimeout(async () => {
      try {
        const res = await axios.get(apiUrl("/api/v1/user/username/availability"), {
          params: { username: normalized },
          withCredentials: true,
        });
        if (res.data?.available) {
          setUsernameCheckState("available");
          setUsernameFeedback("Username is available!");
        } else {
          setUsernameCheckState("taken");
          setUsernameFeedback("Username is already taken");
        }
      } catch {
        setUsernameCheckState("idle");
        setUsernameFeedback("");
      }
    }, 350);

    return () => clearTimeout(timer);
  }, [profileInput.username, user?.username]);

  useEffect(() => {
    if (user) {
      setProfileInput({
        username: user?.username || "",
        fullName: user?.fullName || "",
        bio: user?.bio || "",
        gender: user?.gender || "male",
        dateOfBirth: user?.dateOfBirth ? new Date(user.dateOfBirth).toISOString().split("T")[0] : "",
        country: user?.country || "",
        website: user?.website || "",
        profilePhoto: null,
        coverPhoto: null,
        socialLinks: {
          instagram: user?.socialLinks?.instagram || "",
          github: user?.socialLinks?.github || "",
          twitter: user?.socialLinks?.twitter || "",
          youtube: user?.socialLinks?.youtube || "",
          linkedin: user?.socialLinks?.linkedin || "",
        },
        featuredSocialPlatforms: user?.featuredSocialPlatforms || [],
      });
      setPhotoPreview(user?.profilePicture || "");
      setCoverPreview(user?.coverPicture || "");
    }
  }, [user]);

  const handleProfilePhotoChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error("Please choose a valid image file.");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Photo must be smaller than 5 MB.");
      return;
    }
    setProfileInput((prev) => ({ ...prev, profilePhoto: file }));
    setPhotoPreview(URL.createObjectURL(file));
  };

  const handleCoverPhotoChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error("Please choose a valid image file.");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Cover image must be smaller than 5 MB.");
      return;
    }
    setProfileInput((prev) => ({ ...prev, coverPhoto: file }));
    setCoverPreview(URL.createObjectURL(file));
  };

  const handleVerifyPasswordToEdit = async (e) => {
    e.preventDefault();
    if (!unlockPassword.trim()) {
      toast.error("Please enter your password.");
      return;
    }
    try {
      setUnlockLoading(true);
      const res = await axios.post(
        apiUrl("/api/v1/user/verify-password"),
        { password: unlockPassword },
        { withCredentials: true }
      );
      if (res.data.success) {
        setIsEditingProfile(true);
        setUnlockModalOpen(false);
        setUnlockPassword("");
        toast.success("Profile unlocked! You can now edit your details.");
      }
    } catch (err) {
      toast.error(getErrorMessage(err, "Incorrect password. Please try again."));
    } finally {
      setUnlockLoading(false);
    }
  };

  const toggleFeaturedPlatform = (platform) => {
    setProfileInput((prev) => {
      const current = prev.featuredSocialPlatforms || [];
      if (current.includes(platform)) {
        return {
          ...prev,
          featuredSocialPlatforms: current.filter((p) => p !== platform),
        };
      }
      if (current.length >= 2) {
        toast.info("You can choose up to 2 social links to feature on your profile.");
        return prev;
      }
      return {
        ...prev,
        featuredSocialPlatforms: [...current, platform],
      };
    });
  };

  const handleProfileSubmit = async (e) => {
    e.preventDefault();
    if (usernameCheckState === "taken") {
      toast.error("That username is already taken. Please choose another username.");
      return;
    }
    if (usernameCheckState === "checking") {
      toast.info("Please wait while username availability is being checked.");
      return;
    }
    if (usernameCheckState === "invalid") {
      toast.error(usernameFeedback || "Please enter a valid username.");
      return;
    }

    setProfileLoading(true);
    const formData = new FormData();
    formData.append("username", profileInput.username);
    formData.append("fullName", profileInput.fullName);
    formData.append("bio", profileInput.bio);
    formData.append("gender", profileInput.gender);
    if (profileInput.dateOfBirth) formData.append("dateOfBirth", profileInput.dateOfBirth);
    if (profileInput.country) formData.append("country", profileInput.country);
    formData.append("website", profileInput.website);
    formData.append("socialLinks", JSON.stringify(profileInput.socialLinks));
    formData.append("featuredSocialPlatforms", JSON.stringify(profileInput.featuredSocialPlatforms));
    if (profileInput.profilePhoto) {
      formData.append("profilePhoto", profileInput.profilePhoto);
    }
    if (profileInput.coverPhoto) {
      formData.append("coverPhoto", profileInput.coverPhoto);
    }

    try {
      const res = await axios.post(apiUrl("/api/v1/user/profile/edit"), formData, {
        withCredentials: true,
      });
      if (res.data.success) {
        dispatch(setAuthUser({ ...user, ...res.data.user }));
        setIsEditingProfile(false);
        toast.success("Profile info updated successfully!");
      }
    } catch (err) {
      toast.error(getErrorMessage(err, "Failed to update profile"));
    } finally {
      setProfileLoading(false);
    }
  };

  /* ═══════════════════════════════════════════════
     TAB 3: PRIVACY & SAFETY STATE
     ═══════════════════════════════════════════════ */
  const [isPrivate, setIsPrivate] = useState(!!user?.isPrivate);
  const [showLastSeen, setShowLastSeen] = useState(user?.showLastSeen !== false);
  const [whoCanMessage, setWhoCanMessage] = useState(user?.whoCanMessage || "everyone");
  const [privacySaving, setPrivacySaving] = useState(false);

  const handleSavePrivacy = async () => {
    setPrivacySaving(true);
    try {
      const formData = new FormData();
      formData.append("isPrivate", isPrivate ? "true" : "false");
      formData.append("showLastSeen", showLastSeen ? "true" : "false");
      formData.append("whoCanMessage", whoCanMessage);

      const res = await axios.post(apiUrl("/api/v1/user/profile/edit"), formData, {
        withCredentials: true,
      });
      if (res.data.success) {
        dispatch(setAuthUser({ ...user, ...res.data.user }));
        toast.success("Privacy preferences saved!");
      }
    } catch (err) {
      toast.error(getErrorMessage(err, "Failed to save privacy settings"));
    } finally {
      setPrivacySaving(false);
    }
  };

  /* ═══════════════════════════════════════════════
     TAB 4: CHAT & SOUNDS STATE
     ═══════════════════════════════════════════════ */
  const [soundEnabled, setSoundEnabledState] = useState(isSoundEnabled());
  const [readReceipts, setReadReceipts] = useState(() => {
    return localStorage.getItem("nova_read_receipts") !== "false";
  });

  const toggleSound = () => {
    const next = !soundEnabled;
    setSoundEnabledState(next);
    setSoundEnabled(next);
    if (next) playMessageSound();
    toast.success(next ? "In-app sounds enabled" : "In-app sounds muted");
  };

  const toggleReadReceipts = () => {
    const next = !readReceipts;
    setReadReceipts(next);
    localStorage.setItem("nova_read_receipts", next ? "true" : "false");
    toast.success(next ? "Read receipts (Blue ticks) enabled" : "Read receipts hidden");
  };

  /* ═══════════════════════════════════════════════
     TAB 5: NOTIFICATIONS PREFERENCES
     ═══════════════════════════════════════════════ */
  const [notifMessages, setNotifMessages] = useState(() => localStorage.getItem("nova_notif_messages") !== "false");
  const [notifLikes, setNotifLikes] = useState(() => localStorage.getItem("nova_notif_likes") !== "false");
  const [notifComments, setNotifComments] = useState(() => localStorage.getItem("nova_notif_comments") !== "false");
  const [notifReposts, setNotifReposts] = useState(() => localStorage.getItem("nova_notif_reposts") !== "false");
  const [notifFollows, setNotifFollows] = useState(() => localStorage.getItem("nova_notif_follows") !== "false");

  const saveNotifPref = (key, val, setter) => {
    setter(val);
    localStorage.setItem(key, val ? "true" : "false");
    window.dispatchEvent(
      new CustomEvent("nova:notif-pref-changed", { detail: { key, value: val } })
    );
    toast.success("Notification preference updated");
  };

  /* ═══════════════════════════════════════════════
     TAB 6: APPEARANCE & MEDIA QUALITY
     ═══════════════════════════════════════════════ */
  const [highQualityUpload, setHighQualityUpload] = useState(() => {
    return localStorage.getItem("nova_high_quality_upload") !== "false";
  });

  const toggleHighQuality = () => {
    const next = !highQualityUpload;
    setHighQualityUpload(next);
    localStorage.setItem("nova_high_quality_upload", next ? "true" : "false");
    toast.success(next ? "Uploading in Full Resolution HD" : "Data Saver compression enabled");
  };

  /* ═══════════════════════════════════════════════
     TAB 7: QR CODE STATE
     ═══════════════════════════════════════════════ */
  const [qrModalOpen, setQrModalOpen] = useState(false);

  /* ═══════════════════════════════════════════════
     TAB 2: SECURITY MODALS
     ═══════════════════════════════════════════════ */
  const [logoutOthersModalOpen, setLogoutOthersModalOpen] = useState(false);
  const [logoutOthersPassword, setLogoutOthersPassword] = useState("");
  const [logoutOthersLoading, setLogoutOthersLoading] = useState(false);
  const [showLogoutPassword, setShowLogoutPassword] = useState(false);

  const handleLogoutOtherSessions = async (e) => {
    e.preventDefault();
    if (!logoutOthersPassword.trim()) {
      toast.error("Please enter your password to confirm");
      return;
    }
    setLogoutOthersLoading(true);
    try {
      const res = await axios.post(
        apiUrl("/api/v1/user/sessions/logout-others"),
        { password: logoutOthersPassword },
        { withCredentials: true }
      );
      if (res.data?.success) {
        toast.success(res.data.message || "All other sessions have been logged out!");
        setLogoutOthersModalOpen(false);
        setLogoutOthersPassword("");
      }
    } catch (err) {
      toast.error(getErrorMessage(err, "Incorrect password. Could not log out other sessions."));
    } finally {
      setLogoutOthersLoading(false);
    }
  };

  /* ═══════════════════════════════════════════════
     TAB 8: YOUR ACTIVITY (LOCAL TIME TRACKING)
     ═══════════════════════════════════════════════ */
  const [timeSpentMins, setTimeSpentMins] = useState(38);

  useEffect(() => {
    const stored = parseInt(localStorage.getItem("nova_session_minutes") || "35", 10);
    setTimeSpentMins(stored);
  }, []);

  /* ═══════════════════════════════════════════════
     LOGOUT MODAL & HANDLER
     ═══════════════════════════════════════════════ */
  const [logoutModalOpen, setLogoutModalOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  const handleLogout = async () => {
    try {
      setLoggingOut(true);
      const res = await axios.get(apiUrl("/api/v1/user/logout"), {
        withCredentials: true,
      });
      if (res.data?.success) {
        dispatch(setAuthUser(null));
        dispatch(setSelectedPost(null));
        dispatch(setPosts([]));
        navigate("/login");
        toast.success(res.data.message || "Logged out successfully");
      }
    } catch (error) {
      toast.error(getErrorMessage(error, "Unable to log out. Please try again."));
    } finally {
      setLoggingOut(false);
      setLogoutModalOpen(false);
    }
  };

  /* ═══════════════════════════════════════════════
     TAB 9: ACCOUNT & DANGER MODAL
     ═══════════════════════════════════════════════ */
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [deletePassword, setDeletePassword] = useState("");
  const [deletingAccount, setDeletingAccount] = useState(false);

  const handleClearSearchHistory = () => {
    localStorage.removeItem("nova_recent_searches");
    toast.success("Search history cleared!");
  };

  const handleClearCache = () => {
    sessionStorage.clear();
    toast.success("Application temporary cache refreshed!");
  };

  const handleDeleteAccount = async (e) => {
    e.preventDefault();
    if (!deletePassword.trim()) {
      toast.error("Please enter your password to confirm");
      return;
    }

    setDeletingAccount(true);
    try {
      const res = await axios.delete(apiUrl("/api/v1/user/account"), {
        data: { password: deletePassword },
        withCredentials: true,
      });
      if (res.data.success) {
        dispatch(setAuthUser(null));
        dispatch(setSelectedPost(null));
        dispatch(setPosts([]));
        toast.success("Account deleted successfully.");
        navigate("/login", { replace: true });
      }
    } catch (err) {
      toast.error(getErrorMessage(err, "Failed to delete account. Incorrect password?"));
    } finally {
      setDeletingAccount(false);
    }
  };

  const profileUrl = typeof window !== "undefined"
    ? `${window.location.origin}/profile/${user?.username || user?._id}`
    : "";

  return (
    <div className="min-h-screen pb-24 px-4 sm:px-6 lg:px-8 max-w-6xl mx-auto pt-4 select-none">
      {/* ═══════════ TOP HEADER ═══════════ */}
      <div className="flex items-center justify-between mb-6 pb-4 border-b border-[var(--border)]">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="p-1.5 rounded-lg bg-primary/10 text-primary">
              <Shield className="size-4" />
            </span>
            <span className="text-xs font-semibold uppercase tracking-wider text-primary">
              Nova Control Center
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-display font-bold text-[var(--foreground)]">
            Settings & Preferences
          </h1>
          <p className="text-xs sm:text-sm text-[var(--muted-foreground)]">
            Manage your account security, privacy controls, alerts, and display.
          </p>
        </div>

        <button
          onClick={() => navigate(`/profile/${user?.username || user?._id}`)}
          className="hidden sm:flex items-center gap-2 px-4 py-2 rounded-xl bg-[var(--surface-2)] hover:bg-[var(--surface-3)] text-xs font-semibold text-[var(--foreground)] border border-[var(--border)] transition-all active:scale-95"
        >
          View Public Profile
          <ExternalLink className="size-3.5" />
        </button>
      </div>

      {/* ═══════════ MAIN CONTENT GRID ═══════════ */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
        {/* ─── LEFT: TABS SIDEBAR ─── */}
        <div className="md:col-span-4 lg:col-span-3.5 space-y-1">
          {/* Mobile horizontal scroller */}
          <div className="flex md:hidden overflow-x-auto gap-2 pb-3 mb-2 scroll-hide">
            {TABS.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              const isIncomplete = tab.id === "profile" && !profileComp.isComplete;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`
                    shrink-0 flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all relative
                    ${
                      isActive
                        ? "bg-primary text-primary-foreground shadow-md shadow-primary/25"
                        : "bg-[var(--surface-2)] text-[var(--muted-foreground)] border border-[var(--border)]"
                    }
                  `}
                >
                  <Icon className="size-3.5" />
                  <span>{tab.label}</span>
                  {isIncomplete && (
                    <span className="size-2 rounded-full bg-rose-500 animate-pulse ml-0.5" />
                  )}
                </button>
              );
            })}

            <button
              type="button"
              onClick={() => setLogoutModalOpen(true)}
              className="shrink-0 flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold bg-red-500/15 text-red-400 border border-red-500/30 transition-all cursor-pointer"
            >
              <LogOut className="size-3.5" />
              <span>Log Out</span>
            </button>
          </div>

          {/* Desktop vertical sidebar */}
          <div className="hidden md:flex flex-col gap-1.5 p-2 rounded-2xl bg-[var(--surface)]/70 backdrop-blur-xl border border-[var(--border)] shadow-lg shadow-black/10">
            {TABS.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              const isIncomplete = tab.id === "profile" && !profileComp.isComplete;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`
                    w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-left transition-all duration-200 group cursor-pointer
                    ${
                      isActive
                        ? "bg-primary text-primary-foreground font-semibold shadow-md shadow-primary/20"
                        : "text-[var(--foreground)]/80 hover:text-[var(--foreground)] hover:bg-[var(--surface-2)]"
                    }
                  `}
                >
                  <span
                    className={`
                      p-2 rounded-lg transition-colors relative
                      ${isActive ? "bg-white/20 text-white" : "bg-[var(--surface-2)] text-[var(--muted-foreground)] group-hover:text-primary"}
                    `}
                  >
                    <Icon className="size-4" />
                    {isIncomplete && (
                      <span className="absolute -top-0.5 -right-0.5 size-2 rounded-full bg-rose-500 ring-2 ring-[var(--surface)] animate-pulse" />
                    )}
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-1">
                      <p className="text-xs sm:text-sm font-semibold truncate leading-tight">
                        {tab.label}
                      </p>
                      {isIncomplete && (
                        <span className="size-2 rounded-full bg-rose-500 animate-pulse shrink-0" />
                      )}
                    </div>
                    <p
                      className={`text-[10px] truncate ${
                        isActive ? "text-white/80" : "text-[var(--muted-foreground)]"
                      }`}
                    >
                      {tab.desc}
                    </p>
                  </div>
                </button>
              );
            })}

            <div className="my-1 h-px bg-[var(--border)]/60" />

            <button
              type="button"
              onClick={() => setLogoutModalOpen(true)}
              className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-left text-red-400 hover:text-red-300 hover:bg-red-500/10 transition-all duration-200 group cursor-pointer"
            >
              <span className="p-2 rounded-lg bg-red-500/15 text-red-400 group-hover:scale-110 transition-transform">
                <LogOut className="size-4" />
              </span>
              <div className="flex-1 min-w-0">
                <p className="text-xs sm:text-sm font-semibold truncate leading-tight">
                  Log Out
                </p>
                <p className="text-[10px] text-red-300/70 truncate">
                  Sign out of your account
                </p>
              </div>
            </button>
          </div>
        </div>

        {/* ─── RIGHT: TAB CONTENT PANEL ─── */}
        <div className="md:col-span-8 lg:col-span-8.5 rounded-3xl bg-[var(--surface)]/80 backdrop-blur-2xl border border-[var(--border)] p-5 sm:p-7 shadow-xl shadow-black/15">
          {/* ═══════════ 1. PROFILE INFO ═══════════ */}
          {activeTab === "profile" && (
            <div className="space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h2 className="text-lg font-bold text-[var(--foreground)] flex items-center gap-2">
                    <User className="size-5 text-[var(--primary)]" />
                    Profile Info
                  </h2>
                  <p className="text-xs text-[var(--muted-foreground)]">
                    Overview of your identity, profile photos, contact links, and account details.
                  </p>
                </div>
                {!isEditingProfile ? (
                  <button
                    type="button"
                    onClick={() => setUnlockModalOpen(true)}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-primary text-primary-foreground text-xs font-semibold hover:brightness-110 active:scale-95 transition-all shadow-md shadow-primary/20 shrink-0 self-start sm:self-auto cursor-pointer"
                  >
                    <Lock className="size-3.5" />
                    <span>Edit Profile Info</span>
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => setIsEditingProfile(false)}
                    className="px-3.5 py-1.5 rounded-xl bg-[var(--surface-2)] hover:bg-[var(--surface-3)] text-[var(--foreground)] text-xs font-semibold transition-colors shrink-0 self-start sm:self-auto cursor-pointer"
                  >
                    Back to Overview
                  </button>
                )}
              </div>

              {/* Profile Completion Nudge Banner */}
              {!profileComp.isComplete && (
                <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-amber-500/10 via-rose-500/10 to-primary/10 border border-amber-500/30 shadow-sm relative overflow-hidden select-none">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="p-1.5 rounded-lg bg-amber-500/20 text-amber-400">
                          <Sparkles className="size-4" />
                        </span>
                        <h3 className="text-sm font-bold text-[var(--foreground)]">
                          Complete Your Profile ({profileComp.percentage}%)
                        </h3>
                        <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-rose-500/20 text-rose-400 border border-rose-500/30">
                          {profileComp.doneCount}/{profileComp.totalCount} completed
                        </span>
                      </div>
                      <p className="text-xs text-[var(--muted-foreground)] mt-1">
                        Add your missing details so other members can discover and connect with you.
                      </p>
                    </div>

                    {!isEditingProfile ? (
                      <button
                        type="button"
                        onClick={() => setUnlockModalOpen(true)}
                        className="px-3.5 py-1.5 rounded-xl bg-primary text-primary-foreground text-xs font-semibold hover:brightness-110 active:scale-95 transition-all shadow-md shadow-primary/25 shrink-0 self-start sm:self-auto cursor-pointer flex items-center gap-1.5"
                      >
                        <Pencil className="size-3" />
                        <span>Complete Info</span>
                      </button>
                    ) : null}
                  </div>

                  {/* Progress Bar */}
                  <div className="h-2 w-full bg-[var(--surface-3)]/90 rounded-full overflow-hidden mb-3">
                    <div
                      className="h-full bg-gradient-to-r from-amber-400 via-rose-400 to-primary rounded-full transition-all duration-500 shadow-sm"
                      style={{ width: `${profileComp.percentage}%` }}
                    />
                  </div>

                  {/* Checklist Pills */}
                  <div className="flex flex-wrap gap-2">
                    {profileComp.items.map((item) => (
                      <span
                        key={item.key}
                        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium border transition-colors ${
                          item.done
                            ? "bg-emerald-500/15 border-emerald-500/30 text-emerald-400"
                            : "bg-[var(--surface-3)]/80 border-amber-500/30 text-amber-300"
                        }`}
                      >
                        {item.done ? (
                          <CheckCircle2 className="size-3.5 text-emerald-400 shrink-0" />
                        ) : (
                          <AlertCircle className="size-3.5 text-amber-400 shrink-0" />
                        )}
                        <span>{item.label}</span>
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {!isEditingProfile ? (
                /* ─── READ-ONLY PROFILE OVERVIEW (Summary Mode) ─── */
                <div className="space-y-5">
                  {/* Banner & Avatar Card */}
                  <div className="relative rounded-2xl overflow-hidden border border-[var(--border)] bg-[var(--surface-2)]/40 shadow-sm">
                    {/* Cover Banner */}
                    <div
                      className="h-32 sm:h-40 w-full bg-cover bg-center bg-gradient-to-r from-purple-900/40 via-indigo-900/30 to-slate-900/40 relative"
                      style={
                        user?.coverPicture
                          ? { backgroundImage: `url(${user.coverPicture})` }
                          : undefined
                      }
                    >
                      <div className="absolute inset-0 bg-black/25" />
                    </div>

                    {/* Avatar & Key details */}
                    <div className="px-5 pb-5 pt-0 relative flex flex-col sm:flex-row sm:items-end justify-between gap-4 -mt-12 sm:-mt-14">
                      <div className="flex items-end gap-3.5">
                        <Avatar className="size-20 sm:size-24 border-4 border-[var(--surface)] shadow-xl ring-2 ring-primary/30">
                          <AvatarImage src={user?.profilePicture} className="object-cover" />
                          <AvatarFallback className="text-xl font-bold bg-primary/20 text-primary">
                            {getDisplayName(user, "U").charAt(0).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div className="mb-1">
                          <h3 className="text-base sm:text-lg font-bold text-[var(--foreground)] leading-tight">
                            {user?.fullName || "Nova User"}
                          </h3>
                          <p className="text-xs text-[var(--muted-foreground)]">
                            @{user?.username || "no_username"}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 self-start sm:self-end">
                        <span className="text-[11px] font-semibold px-2.5 py-1 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/20 flex items-center gap-1">
                          <ShieldCheck className="size-3" /> Active Account
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Details Grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                    <div className="p-3.5 rounded-xl bg-[var(--surface-2)]/50 border border-[var(--border)] space-y-1">
                      <p className="text-[10.5px] uppercase tracking-wider font-semibold text-[var(--muted-foreground)]">Email Address</p>
                      <p className="text-xs font-semibold text-[var(--foreground)]">{user?.email || "—"}</p>
                    </div>

                    <div className="p-3.5 rounded-xl bg-[var(--surface-2)]/50 border border-[var(--border)] space-y-1">
                      <p className="text-[10.5px] uppercase tracking-wider font-semibold text-[var(--muted-foreground)]">Location / Country</p>
                      <p className="text-xs font-semibold text-[var(--foreground)] flex items-center gap-1">
                        <MapPin className="size-3 text-red-400 shrink-0" />
                        <span>{user?.country || "Not specified"}</span>
                      </p>
                    </div>

                    <div className="p-3.5 rounded-xl bg-[var(--surface-2)]/50 border border-[var(--border)] space-y-1">
                      <p className="text-[10.5px] uppercase tracking-wider font-semibold text-[var(--muted-foreground)]">Birthday</p>
                      <p className="text-xs font-semibold text-[var(--foreground)] flex items-center gap-1">
                        <Calendar className="size-3 text-indigo-400 shrink-0" />
                        <span>{user?.dateOfBirth ? new Date(user.dateOfBirth).toLocaleDateString() : "Not specified"}</span>
                      </p>
                    </div>

                    <div className="p-3.5 rounded-xl bg-[var(--surface-2)]/50 border border-[var(--border)] space-y-1">
                      <p className="text-[10.5px] uppercase tracking-wider font-semibold text-[var(--muted-foreground)]">Gender</p>
                      <p className="text-xs font-semibold text-[var(--foreground)] capitalize">{user?.gender || "Not specified"}</p>
                    </div>

                    <div className="p-3.5 rounded-xl bg-[var(--surface-2)]/50 border border-[var(--border)] space-y-1 sm:col-span-2">
                      <p className="text-[10.5px] uppercase tracking-wider font-semibold text-[var(--muted-foreground)]">Bio</p>
                      <p className="text-xs text-[var(--foreground)] whitespace-pre-wrap leading-relaxed">{user?.bio || "No bio added yet."}</p>
                    </div>

                    <div className="p-3.5 rounded-xl bg-[var(--surface-2)]/50 border border-[var(--border)] space-y-1 sm:col-span-2">
                      <p className="text-[10.5px] uppercase tracking-wider font-semibold text-[var(--muted-foreground)]">Website / Portfolio</p>
                      {user?.website ? (
                        <a
                          href={user.website.startsWith("http") ? user.website : `https://${user.website}`}
                          target="_blank"
                          rel="noreferrer"
                          className="text-xs font-semibold text-primary hover:underline flex items-center gap-1"
                        >
                          <ExternalLink className="size-3 shrink-0" />
                          <span>{user.website}</span>
                        </a>
                      ) : (
                        <p className="text-xs text-[var(--muted-foreground)]">No website linked</p>
                      )}
                    </div>
                  </div>

                  {/* Social Links Summary */}
                  <div className="p-4 rounded-xl bg-[var(--surface-2)]/40 border border-[var(--border)] space-y-2.5">
                    <div className="flex items-center justify-between">
                      <p className="text-xs font-bold text-[var(--foreground)]">Connected Social Profiles</p>
                      <span className="text-[10px] text-[var(--muted-foreground)]">
                        {user?.featuredSocialPlatforms?.length || 0}/2 featured on profile
                      </span>
                    </div>

                    <div className="flex flex-wrap gap-2 pt-1">
                      {["instagram", "github", "twitter", "youtube", "linkedin"].map((platform) => {
                        const link = user?.socialLinks?.[platform];
                        const isFeatured = user?.featuredSocialPlatforms?.includes(platform);
                        if (!link) return null;
                        return (
                          <div
                            key={platform}
                            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs ${
                              isFeatured
                                ? "bg-primary/10 border-primary/40 text-[var(--foreground)]"
                                : "bg-[var(--surface-3)] border-[var(--border)] text-[var(--muted-foreground)]"
                            }`}
                          >
                            {platform === "instagram" && <Instagram className="size-3.5 text-pink-400 shrink-0" />}
                            {platform === "github" && <Github className="size-3.5 text-zinc-300 shrink-0" />}
                            {platform === "twitter" && <Twitter className="size-3.5 text-cyan-400 shrink-0" />}
                            {platform === "youtube" && <Youtube className="size-3.5 text-red-500 shrink-0" />}
                            {platform === "linkedin" && <Linkedin className="size-3.5 text-blue-400 shrink-0" />}
                            <span className="capitalize font-semibold">{platform}</span>
                            {isFeatured && (
                              <span className="text-[9px] px-1 py-0.2 rounded bg-primary/20 text-primary font-bold">
                                Featured
                              </span>
                            )}
                          </div>
                        );
                      })}
                      {!user?.socialLinks?.instagram &&
                        !user?.socialLinks?.github &&
                        !user?.socialLinks?.twitter &&
                        !user?.socialLinks?.youtube &&
                        !user?.socialLinks?.linkedin && (
                          <p className="text-xs text-[var(--muted-foreground)]">No social accounts connected yet.</p>
                        )}
                    </div>
                  </div>

                  {/* Unlock Edit CTA Bar */}
                  <div className="p-4 rounded-2xl bg-gradient-to-r from-primary/10 via-[var(--surface-2)] to-primary/5 border border-primary/20 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="space-y-0.5">
                      <p className="text-xs sm:text-sm font-bold text-[var(--foreground)] flex items-center gap-1.5">
                        <Lock className="size-3.5 text-primary" /> Want to update these details?
                      </p>
                      <p className="text-[11px] text-[var(--muted-foreground)]">
                        To protect your account security, enter your password to edit your profile info.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setUnlockModalOpen(true)}
                      className="px-4 py-2 rounded-xl bg-primary text-primary-foreground text-xs font-semibold hover:brightness-110 active:scale-95 transition-all shadow-md shadow-primary/20 shrink-0 self-start sm:self-auto cursor-pointer flex items-center gap-1.5"
                    >
                      <Pencil className="size-3.5" />
                      <span>Edit This</span>
                    </button>
                  </div>
                </div>
              ) : (
                /* ─── EDITABLE FORM (Unlocked via Password) ─── */
                <form onSubmit={handleProfileSubmit} className="space-y-5">
                  {/* Photo & Banner Uploaders */}
                  <div className="p-4 rounded-2xl bg-[var(--surface-2)]/60 border border-[var(--border)] space-y-4">
                    <div className="flex items-center justify-between">
                      <p className="text-xs font-bold text-[var(--foreground)]">Profile & Cover Imagery</p>
                      <span className="text-[10px] text-[var(--muted-foreground)]">JPG, PNG, WebP (Max 5 MB)</span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {/* Avatar preview & change */}
                      <div className="flex items-center gap-3.5 p-3 rounded-xl bg-[var(--surface-3)]/60 border border-[var(--border)]">
                        <div className="relative group shrink-0">
                          <Avatar className="size-14 border-2 border-primary/40 shadow-md">
                            <AvatarImage src={photoPreview} />
                            <AvatarFallback>
                              {getDisplayName(user, "U").charAt(0).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <button
                            type="button"
                            onClick={() => imageRef.current?.click()}
                            className="absolute inset-0 rounded-full bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white transition-opacity cursor-pointer"
                          >
                            <Camera className="size-4" />
                          </button>
                        </div>
                        <div className="space-y-1 min-w-0">
                          <p className="text-xs font-semibold truncate text-[var(--foreground)]">Avatar Photo</p>
                          <button
                            type="button"
                            onClick={() => imageRef.current?.click()}
                            className="px-2.5 py-1 rounded-lg bg-primary/15 text-primary text-[11px] font-semibold hover:bg-primary/25 transition-colors cursor-pointer"
                          >
                            Upload Photo
                          </button>
                          <input
                            ref={imageRef}
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={handleProfilePhotoChange}
                          />
                        </div>
                      </div>

                      {/* Cover preview & change */}
                      <div className="flex items-center gap-3.5 p-3 rounded-xl bg-[var(--surface-3)]/60 border border-[var(--border)]">
                        <div
                          className="size-14 rounded-xl bg-cover bg-center border border-[var(--border)] relative group shrink-0 bg-slate-800"
                          style={coverPreview ? { backgroundImage: `url(${coverPreview})` } : undefined}
                        >
                          <button
                            type="button"
                            onClick={() => coverRef.current?.click()}
                            className="absolute inset-0 rounded-xl bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white transition-opacity cursor-pointer"
                          >
                            <ImagePlus className="size-4" />
                          </button>
                        </div>
                        <div className="space-y-1 min-w-0">
                          <p className="text-xs font-semibold truncate text-[var(--foreground)]">Cover Banner</p>
                          <button
                            type="button"
                            onClick={() => coverRef.current?.click()}
                            className="px-2.5 py-1 rounded-lg bg-primary/15 text-primary text-[11px] font-semibold hover:bg-primary/25 transition-colors cursor-pointer"
                          >
                            Upload Banner
                          </button>
                          <input
                            ref={coverRef}
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={handleCoverPhotoChange}
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Core Identity Fields */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold">Full Name</Label>
                      <Input
                        value={profileInput.fullName}
                        onChange={(e) =>
                          setProfileInput({ ...profileInput, fullName: e.target.value })
                        }
                        placeholder="e.g. Partha Pattanayak"
                        className="bg-[var(--surface-2)]/60"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <Label className="text-xs font-semibold">Username</Label>
                        {usernameFeedback && (
                          <span
                            className={`text-[11px] font-medium transition-colors ${
                              usernameCheckState === "available"
                                ? "text-emerald-400 font-semibold"
                                : usernameCheckState === "current"
                                  ? "text-primary/90"
                                  : usernameCheckState === "taken"
                                    ? "text-rose-400 font-semibold"
                                    : usernameCheckState === "invalid"
                                      ? "text-amber-400"
                                      : "text-[var(--muted-foreground)]"
                            }`}
                          >
                            {usernameFeedback}
                          </span>
                        )}
                      </div>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-mono text-[var(--muted-foreground)] select-none">
                          @
                        </span>
                        <Input
                          value={profileInput.username}
                          onChange={(e) =>
                            setProfileInput({
                              ...profileInput,
                              username: e.target.value.toLowerCase().trim(),
                            })
                          }
                          placeholder="your_unique_handle"
                          className={`bg-[var(--surface-2)]/60 pl-7 pr-9 font-mono text-xs transition-colors ${
                            usernameCheckState === "available"
                              ? "border-emerald-500/50 focus-visible:ring-emerald-500/30"
                              : usernameCheckState === "taken"
                                ? "border-rose-500/60 focus-visible:ring-rose-500/30"
                                : ""
                          }`}
                        />
                        <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
                          {usernameCheckState === "checking" && (
                            <Loader2 className="size-4 animate-spin text-[var(--muted-foreground)]" />
                          )}
                          {usernameCheckState === "available" && (
                            <CheckCircle2 className="size-4 text-emerald-500" />
                          )}
                          {usernameCheckState === "current" && (
                            <Check className="size-4 text-primary" />
                          )}
                          {usernameCheckState === "taken" && (
                            <XCircle className="size-4 text-rose-500" />
                          )}
                          {usernameCheckState === "invalid" && (
                            <AlertCircle className="size-4 text-amber-500" />
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Location Country & Birthday */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold flex items-center gap-1">
                        <MapPin className="size-3 text-red-400" /> Location / Country
                      </Label>
                      <Input
                        value={profileInput.country}
                        onChange={(e) =>
                          setProfileInput({ ...profileInput, country: e.target.value })
                        }
                        placeholder="e.g. India, United States, UK"
                        className="bg-[var(--surface-2)]/60"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold flex items-center gap-1">
                        <Calendar className="size-3 text-indigo-400" /> Date of Birth
                      </Label>
                      <Input
                        type="date"
                        value={profileInput.dateOfBirth}
                        onChange={(e) =>
                          setProfileInput({ ...profileInput, dateOfBirth: e.target.value })
                        }
                        className="bg-[var(--surface-2)]/60"
                      />
                    </div>
                  </div>

                  {/* Gender & Website */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold">Gender</Label>
                      <Select
                        value={profileInput.gender}
                        onValueChange={(val) =>
                          setProfileInput({ ...profileInput, gender: val })
                        }
                      >
                        <SelectTrigger className="bg-[var(--surface-2)]/60">
                          <SelectValue placeholder="Select gender" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="male">Male</SelectItem>
                          <SelectItem value="female">Female</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold">Website / Portfolio</Label>
                      <Input
                        value={profileInput.website}
                        onChange={(e) =>
                          setProfileInput({ ...profileInput, website: e.target.value })
                        }
                        placeholder="https://yourportfolio.dev"
                        className="bg-[var(--surface-2)]/60"
                      />
                    </div>
                  </div>

                  {/* Bio */}
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold">Bio</Label>
                    <Textarea
                      value={profileInput.bio}
                      onChange={(e) =>
                        setProfileInput({ ...profileInput, bio: e.target.value })
                      }
                      placeholder="Tell the community about yourself…"
                      rows={3}
                      maxLength={300}
                      className="bg-[var(--surface-2)]/60 resize-none"
                    />
                    <span className="text-[10px] text-[var(--muted-foreground)] block text-right">
                      {profileInput.bio.length} / 300
                    </span>
                  </div>

                  {/* Social Media Links Section */}
                  <div className="p-4 rounded-2xl bg-[var(--surface-2)]/60 border border-[var(--border)] space-y-3.5">
                    <div>
                      <p className="text-xs font-bold text-[var(--foreground)]">Social Media Links</p>
                      <p className="text-[11px] text-[var(--muted-foreground)] mt-0.5">
                        Add your links and select up to <strong>2 platforms</strong> to feature prominently on your profile banner.
                      </p>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {/* Instagram */}
                      <div className="space-y-1">
                        <Label className="text-[11px] flex items-center justify-between">
                          <span className="flex items-center gap-1 font-semibold">
                            <Instagram className="size-3 text-pink-400" /> Instagram
                          </span>
                          <button
                            type="button"
                            onClick={() => toggleFeaturedPlatform("instagram")}
                            className={`text-[10px] px-2 py-0.5 rounded-full border transition-colors ${
                              profileInput.featuredSocialPlatforms?.includes("instagram")
                                ? "bg-primary text-primary-foreground border-primary"
                                : "bg-[var(--surface-3)] text-[var(--muted-foreground)] border-[var(--border)]"
                            }`}
                          >
                            {profileInput.featuredSocialPlatforms?.includes("instagram") ? "Featured ★" : "+ Feature"}
                          </button>
                        </Label>
                        <Input
                          value={profileInput.socialLinks?.instagram || ""}
                          onChange={(e) =>
                            setProfileInput({
                              ...profileInput,
                              socialLinks: { ...profileInput.socialLinks, instagram: e.target.value },
                            })
                          }
                          placeholder="username or URL"
                          className="bg-[var(--surface-3)]/60 text-xs"
                        />
                      </div>

                      {/* GitHub */}
                      <div className="space-y-1">
                        <Label className="text-[11px] flex items-center justify-between">
                          <span className="flex items-center gap-1 font-semibold">
                            <Github className="size-3 text-zinc-300" /> GitHub
                          </span>
                          <button
                            type="button"
                            onClick={() => toggleFeaturedPlatform("github")}
                            className={`text-[10px] px-2 py-0.5 rounded-full border transition-colors ${
                              profileInput.featuredSocialPlatforms?.includes("github")
                                ? "bg-primary text-primary-foreground border-primary"
                                : "bg-[var(--surface-3)] text-[var(--muted-foreground)] border-[var(--border)]"
                            }`}
                          >
                            {profileInput.featuredSocialPlatforms?.includes("github") ? "Featured ★" : "+ Feature"}
                          </button>
                        </Label>
                        <Input
                          value={profileInput.socialLinks?.github || ""}
                          onChange={(e) =>
                            setProfileInput({
                              ...profileInput,
                              socialLinks: { ...profileInput.socialLinks, github: e.target.value },
                            })
                          }
                          placeholder="username or URL"
                          className="bg-[var(--surface-3)]/60 text-xs"
                        />
                      </div>

                      {/* Twitter / X */}
                      <div className="space-y-1">
                        <Label className="text-[11px] flex items-center justify-between">
                          <span className="flex items-center gap-1 font-semibold">
                            <Twitter className="size-3 text-cyan-400" /> Twitter / X
                          </span>
                          <button
                            type="button"
                            onClick={() => toggleFeaturedPlatform("twitter")}
                            className={`text-[10px] px-2 py-0.5 rounded-full border transition-colors ${
                              profileInput.featuredSocialPlatforms?.includes("twitter")
                                ? "bg-primary text-primary-foreground border-primary"
                                : "bg-[var(--surface-3)] text-[var(--muted-foreground)] border-[var(--border)]"
                            }`}
                          >
                            {profileInput.featuredSocialPlatforms?.includes("twitter") ? "Featured ★" : "+ Feature"}
                          </button>
                        </Label>
                        <Input
                          value={profileInput.socialLinks?.twitter || ""}
                          onChange={(e) =>
                            setProfileInput({
                              ...profileInput,
                              socialLinks: { ...profileInput.socialLinks, twitter: e.target.value },
                            })
                          }
                          placeholder="handle or URL"
                          className="bg-[var(--surface-3)]/60 text-xs"
                        />
                      </div>

                      {/* YouTube */}
                      <div className="space-y-1">
                        <Label className="text-[11px] flex items-center justify-between">
                          <span className="flex items-center gap-1 font-semibold">
                            <Youtube className="size-3 text-red-500" /> YouTube
                          </span>
                          <button
                            type="button"
                            onClick={() => toggleFeaturedPlatform("youtube")}
                            className={`text-[10px] px-2 py-0.5 rounded-full border transition-colors ${
                              profileInput.featuredSocialPlatforms?.includes("youtube")
                                ? "bg-primary text-primary-foreground border-primary"
                                : "bg-[var(--surface-3)] text-[var(--muted-foreground)] border-[var(--border)]"
                            }`}
                          >
                            {profileInput.featuredSocialPlatforms?.includes("youtube") ? "Featured ★" : "+ Feature"}
                          </button>
                        </Label>
                        <Input
                          value={profileInput.socialLinks?.youtube || ""}
                          onChange={(e) =>
                            setProfileInput({
                              ...profileInput,
                              socialLinks: { ...profileInput.socialLinks, youtube: e.target.value },
                            })
                          }
                          placeholder="@channel or URL"
                          className="bg-[var(--surface-3)]/60 text-xs"
                        />
                      </div>

                      {/* LinkedIn */}
                      <div className="space-y-1 sm:col-span-2">
                        <Label className="text-[11px] flex items-center justify-between">
                          <span className="flex items-center gap-1 font-semibold">
                            <Linkedin className="size-3 text-blue-400" /> LinkedIn
                          </span>
                          <button
                            type="button"
                            onClick={() => toggleFeaturedPlatform("linkedin")}
                            className={`text-[10px] px-2 py-0.5 rounded-full border transition-colors ${
                              profileInput.featuredSocialPlatforms?.includes("linkedin")
                                ? "bg-primary text-primary-foreground border-primary"
                                : "bg-[var(--surface-3)] text-[var(--muted-foreground)] border-[var(--border)]"
                            }`}
                          >
                            {profileInput.featuredSocialPlatforms?.includes("linkedin") ? "Featured ★" : "+ Feature"}
                          </button>
                        </Label>
                        <Input
                          value={profileInput.socialLinks?.linkedin || ""}
                          onChange={(e) =>
                            setProfileInput({
                              ...profileInput,
                              socialLinks: { ...profileInput.socialLinks, linkedin: e.target.value },
                            })
                          }
                          placeholder="in/username or profile URL"
                          className="bg-[var(--surface-3)]/60 text-xs"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="pt-2 flex items-center justify-end gap-3">
                    <button
                      type="button"
                      onClick={() => setIsEditingProfile(false)}
                      className="px-4 py-2.5 rounded-xl text-xs font-semibold bg-[var(--surface-2)] hover:bg-[var(--surface-3)] transition-colors cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={profileLoading}
                      className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-primary text-primary-foreground text-xs sm:text-sm font-semibold hover:brightness-110 active:scale-95 transition-all shadow-lg shadow-primary/25 disabled:opacity-50 cursor-pointer"
                    >
                      {profileLoading ? (
                        <Loader2 className="size-4 animate-spin" />
                      ) : (
                        <Save className="size-4" />
                      )}
                      Save Changes
                    </button>
                  </div>
                </form>
              )}
            </div>
          )}

          {/* ═══════════ 2. ACCOUNT & SECURITY ═══════════ */}
          {activeTab === "security" && (
            <div className="space-y-6">
              <div>
                <h2 className="text-lg font-bold text-[var(--foreground)]">
                  Account & Password Security
                </h2>
                <p className="text-xs text-[var(--muted-foreground)]">
                  Change your password with verified OTP and monitor active login sessions.
                </p>
              </div>

              {/* Password Reset Component Box */}
              <div className="p-5 rounded-2xl bg-[var(--surface-2)]/50 border border-[var(--border)]">
                <h3 className="text-sm font-bold mb-3 flex items-center gap-2 text-[var(--foreground)]">
                  <Lock className="size-4 text-primary" />
                  Change Password
                </h3>
                <PasswordResetForm email={user?.email} emailLocked={true} />
              </div>

              {/* Active Sessions */}
              <div className="p-5 rounded-2xl bg-[var(--surface-2)]/50 border border-[var(--border)] space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold flex items-center gap-2 text-[var(--foreground)]">
                    <ShieldCheck className="size-4 text-emerald-400" />
                    Recognized Devices & Active Sessions
                  </h3>
                  <span className="text-[11px] text-[var(--muted-foreground)]">
                    1 Active Session
                  </span>
                </div>

                <div className="flex items-center justify-between p-3.5 rounded-xl bg-[var(--surface)] border border-[var(--border)]/60">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 rounded-xl bg-primary/10 text-primary">
                      {currentDevice.isMobile ? (
                        <Smartphone className="size-5" />
                      ) : (
                        <Laptop className="size-5" />
                      )}
                    </div>
                    <div>
                      <p className="text-xs sm:text-sm font-semibold text-[var(--foreground)] flex items-center gap-2">
                        <span>{currentDevice.os} • {currentDevice.browser}</span>
                        <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                          THIS DEVICE
                        </span>
                      </p>
                      <p className="text-[11px] text-[var(--muted-foreground)] mt-0.5">
                        Active right now • Authenticated via secure HTTP-only session
                      </p>
                    </div>
                  </div>
                  <span className="size-2.5 rounded-full bg-emerald-400 animate-pulse" title="Online" />
                </div>

                <div className="pt-1 flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-t border-[var(--border)]/40">
                  <p className="text-xs text-[var(--muted-foreground)]">
                    Notice an unfamiliar device? You can sign out other sessions immediately.
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      setLogoutOthersPassword("");
                      setLogoutOthersModalOpen(true);
                    }}
                    className="self-start sm:self-auto px-3.5 py-2 rounded-xl text-xs font-semibold text-[var(--danger)] bg-[var(--danger)]/8 hover:bg-[var(--danger)]/15 border border-[var(--danger)]/20 transition-all active:scale-95"
                  >
                    Log Out of Other Sessions
                  </button>
                </div>
              </div>

              {/* Password Confirmation Modal for Logging Out Other Sessions */}
              <Dialog open={logoutOthersModalOpen} onOpenChange={setLogoutOthersModalOpen}>
                <DialogContent className="max-w-md bg-[var(--surface)] border-[var(--border)] text-[var(--foreground)]">
                  <DialogHeader>
                    <DialogTitle className="text-base sm:text-lg font-bold text-[var(--foreground)] flex items-center gap-2">
                      <Lock className="size-5 text-primary" />
                      Confirm Password to Sign Out Other Devices
                    </DialogTitle>
                  </DialogHeader>

                  <form onSubmit={handleLogoutOtherSessions} className="space-y-4 pt-2">
                    <p className="text-xs text-[var(--muted-foreground)]">
                      For your account security, please enter your Nova password to invalidate all other active sessions. Your current device will remain logged in.
                    </p>
                    <div className="relative">
                      <Input
                        type={showLogoutPassword ? "text" : "password"}
                        placeholder="Enter your current password"
                        value={logoutOthersPassword}
                        onChange={(e) => setLogoutOthersPassword(e.target.value)}
                        className="bg-[var(--surface-2)] pr-10"
                        autoFocus
                      />
                      <button
                        type="button"
                        onClick={() => setShowLogoutPassword(!showLogoutPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
                      >
                        {showLogoutPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                      </button>
                    </div>
                    <div className="flex justify-end gap-2 pt-2">
                      <button
                        type="button"
                        onClick={() => setLogoutOthersModalOpen(false)}
                        className="px-4 py-2 rounded-xl text-xs font-semibold bg-[var(--surface-2)] hover:bg-[var(--surface-3)]"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        disabled={logoutOthersLoading || !logoutOthersPassword.trim()}
                        className="px-4 py-2 rounded-xl text-xs font-semibold bg-primary text-primary-foreground hover:brightness-110 disabled:opacity-50 flex items-center gap-1.5"
                      >
                        {logoutOthersLoading && <Loader2 className="size-3.5 animate-spin" />}
                        Confirm & Sign Out Others
                      </button>
                    </div>
                  </form>
                </DialogContent>
              </Dialog>
            </div>
          )}

          {/* ═══════════ 3. PRIVACY & SAFETY ═══════════ */}
          {activeTab === "privacy" && (
            <div className="space-y-6">
              <div>
                <h2 className="text-lg font-bold text-[var(--foreground)]">
                  Privacy & Safety Controls
                </h2>
                <p className="text-xs text-[var(--muted-foreground)]">
                  Control who sees your posts, presence, and status.
                </p>
              </div>

              <div className="space-y-4">
                {/* Private Account */}
                <div className="flex items-center justify-between p-4 rounded-2xl bg-[var(--surface-2)]/50 border border-[var(--border)]">
                  <div className="space-y-0.5 max-w-[80%]">
                    <p className="text-sm font-bold text-[var(--foreground)]">
                      Private Account
                    </p>
                    <p className="text-xs text-[var(--muted-foreground)]">
                      When your account is private, only people you approve can see your photos, videos, and profile details.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsPrivate(!isPrivate)}
                    className={`
                      relative w-11 h-6 rounded-full transition-colors duration-200 outline-none
                      ${isPrivate ? "bg-primary" : "bg-[var(--surface-3)]"}
                    `}
                  >
                    <span
                      className={`
                        block size-4 rounded-full bg-white transition-transform duration-200 shadow-md
                        ${isPrivate ? "translate-x-6" : "translate-x-1"}
                      `}
                    />
                  </button>
                </div>

                {/* Show Last Seen / Online Status */}
                <div className="flex items-center justify-between p-4 rounded-2xl bg-[var(--surface-2)]/50 border border-[var(--border)]">
                  <div className="space-y-0.5 max-w-[80%]">
                    <p className="text-sm font-bold text-[var(--foreground)]">
                      Show Online & Last Seen Status
                    </p>
                    <p className="text-xs text-[var(--muted-foreground)]">
                      Allow accounts you follow and anyone you message to see when you were last active or currently online.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowLastSeen(!showLastSeen)}
                    className={`
                      relative w-11 h-6 rounded-full transition-colors duration-200 outline-none
                      ${showLastSeen ? "bg-primary" : "bg-[var(--surface-3)]"}
                    `}
                  >
                    <span
                      className={`
                        block size-4 rounded-full bg-white transition-transform duration-200 shadow-md
                        ${showLastSeen ? "translate-x-6" : "translate-x-1"}
                      `}
                    />
                  </button>
                </div>

                {/* Who Can Message */}
                <div className="p-4 rounded-2xl bg-[var(--surface-2)]/50 border border-[var(--border)] space-y-2">
                  <p className="text-sm font-bold text-[var(--foreground)]">
                    Direct Message Permissions
                  </p>
                  <p className="text-xs text-[var(--muted-foreground)]">
                    Choose who is allowed to send you direct chat messages.
                  </p>
                  <div className="flex items-center gap-3 pt-1">
                    <button
                      type="button"
                      onClick={() => setWhoCanMessage("everyone")}
                      className={`
                        px-3.5 py-1.5 rounded-xl text-xs font-semibold border transition-all
                        ${
                          whoCanMessage === "everyone"
                            ? "bg-primary text-primary-foreground border-primary"
                            : "bg-[var(--surface)] text-[var(--muted-foreground)] border-[var(--border)]"
                        }
                      `}
                    >
                      Everyone
                    </button>
                    <button
                      type="button"
                      onClick={() => setWhoCanMessage("followers")}
                      className={`
                        px-3.5 py-1.5 rounded-xl text-xs font-semibold border transition-all
                        ${
                          whoCanMessage === "followers"
                            ? "bg-primary text-primary-foreground border-primary"
                            : "bg-[var(--surface)] text-[var(--muted-foreground)] border-[var(--border)]"
                        }
                      `}
                    >
                      Followers Only
                    </button>
                  </div>
                </div>

                <div className="pt-2 flex justify-end">
                  <button
                    type="button"
                    onClick={handleSavePrivacy}
                    disabled={privacySaving}
                    className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-primary text-primary-foreground text-xs sm:text-sm font-semibold hover:brightness-110 active:scale-95 transition-all shadow-lg shadow-primary/25 disabled:opacity-50"
                  >
                    {privacySaving ? (
                      <Loader2 className="size-4 animate-spin" />
                    ) : (
                      <Save className="size-4" />
                    )}
                    Save Privacy Settings
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ═══════════ 4. CHAT & MESSAGING ═══════════ */}
          {activeTab === "chat" && (
            <div className="space-y-6">
              <div>
                <h2 className="text-lg font-bold text-[var(--foreground)]">
                  Chat & Direct Messaging Preferences
                </h2>
                <p className="text-xs text-[var(--muted-foreground)]">
                  Configure message audio feedback, read receipts, and delivery tags.
                </p>
              </div>

              <div className="space-y-4">
                {/* Read Receipts */}
                <div className="flex items-center justify-between p-4 rounded-2xl bg-[var(--surface-2)]/50 border border-[var(--border)]">
                  <div className="space-y-0.5 max-w-[80%]">
                    <p className="text-sm font-bold text-[var(--foreground)]">
                      Read Receipts (Double Blue Ticks)
                    </p>
                    <p className="text-xs text-[var(--muted-foreground)]">
                      If turned off, you won't send or see read receipts when messages are opened.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={toggleReadReceipts}
                    className={`
                      relative w-11 h-6 rounded-full transition-colors duration-200 outline-none
                      ${readReceipts ? "bg-primary" : "bg-[var(--surface-3)]"}
                    `}
                  >
                    <span
                      className={`
                        block size-4 rounded-full bg-white transition-transform duration-200 shadow-md
                        ${readReceipts ? "translate-x-6" : "translate-x-1"}
                      `}
                    />
                  </button>
                </div>

                {/* In-app Message Sounds */}
                <div className="flex items-center justify-between p-4 rounded-2xl bg-[var(--surface-2)]/50 border border-[var(--border)]">
                  <div className="space-y-0.5 max-w-[80%]">
                    <p className="text-sm font-bold text-[var(--foreground)] flex items-center gap-2">
                      {soundEnabled ? (
                        <Volume2 className="size-4 text-primary" />
                      ) : (
                        <VolumeX className="size-4 text-[var(--muted-foreground)]" />
                      )}
                      In-App Sound Effects
                    </p>
                    <p className="text-xs text-[var(--muted-foreground)]">
                      Play audio pops and chimes when sending and receiving live chat messages or reactions.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={toggleSound}
                    className={`
                      relative w-11 h-6 rounded-full transition-colors duration-200 outline-none
                      ${soundEnabled ? "bg-primary" : "bg-[var(--surface-3)]"}
                    `}
                  >
                    <span
                      className={`
                        block size-4 rounded-full bg-white transition-transform duration-200 shadow-md
                        ${soundEnabled ? "translate-x-6" : "translate-x-1"}
                      `}
                    />
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ═══════════ 5. NOTIFICATIONS ═══════════ */}
          {activeTab === "notifications" && (
            <div className="space-y-6">
              <div>
                <h2 className="text-lg font-bold text-[var(--foreground)]">
                  Notification Alerts & Push Preferences
                </h2>
                <p className="text-xs text-[var(--muted-foreground)]">
                  Choose which activities trigger real-time notifications on your device.
                </p>
              </div>

              <div className="space-y-3">
                {[
                  {
                    id: "messages",
                    label: "Direct & Chat Messages",
                    desc: "Real-time notifications and alerts for incoming messages from all users",
                    val: notifMessages,
                    setter: setNotifMessages,
                    key: "nova_notif_messages",
                  },
                  {
                    id: "likes",
                    label: "Likes on your posts",
                    desc: "When someone hearts your photos or videos",
                    val: notifLikes,
                    setter: setNotifLikes,
                    key: "nova_notif_likes",
                  },
                  {
                    id: "comments",
                    label: "Comments & Replies",
                    desc: "When someone comments on your post or replies to your comment",
                    val: notifComments,
                    setter: setNotifComments,
                    key: "nova_notif_comments",
                  },
                  {
                    id: "reposts",
                    label: "Reposts & Quotes",
                    desc: "When another user re-shares your post to their profile",
                    val: notifReposts,
                    setter: setNotifReposts,
                    key: "nova_notif_reposts",
                  },
                  {
                    id: "follows",
                    label: "New Followers",
                    desc: "When someone begins following your profile",
                    val: notifFollows,
                    setter: setNotifFollows,
                    key: "nova_notif_follows",
                  },
                ].map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between p-4 rounded-2xl bg-[var(--surface-2)]/50 border border-[var(--border)]"
                  >
                    <div>
                      <p className="text-sm font-semibold text-[var(--foreground)]">
                        {item.label}
                      </p>
                      <p className="text-xs text-[var(--muted-foreground)]">
                        {item.desc}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => saveNotifPref(item.key, !item.val, item.setter)}
                      className={`
                        relative w-11 h-6 rounded-full transition-colors duration-200 outline-none
                        ${item.val ? "bg-primary" : "bg-[var(--surface-3)]"}
                      `}
                    >
                      <span
                        className={`
                          block size-4 rounded-full bg-white transition-transform duration-200 shadow-md
                          ${item.val ? "translate-x-6" : "translate-x-1"}
                        `}
                      />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ═══════════ 6. APPEARANCE & DISPLAY ═══════════ */}
          {activeTab === "appearance" && (
            <div className="space-y-8">
              <div>
                <h2 className="text-lg font-bold text-[var(--foreground)] flex items-center gap-2">
                  <Palette className="size-5 text-[var(--primary)]" />
                  Appearance & Theme Studio
                </h2>
                <p className="text-xs text-[var(--muted-foreground)]">
                  Personalize your entire Nova experience with custom dark & light ambient palettes and vibrant gradient buttons.
                </p>
              </div>

              {/* ── 1. MODE SELECTOR (Light vs Dark) ── */}
              <div className="space-y-3">
                <label className="text-xs font-bold uppercase tracking-wider text-[var(--muted-foreground)]">
                  Display Mode
                </label>
                <div className="grid grid-cols-2 gap-3">
                  {/* Light Mode Card */}
                  <button
                    type="button"
                    onClick={() => setTheme("light")}
                    className={`
                      relative p-4 rounded-2xl border text-left transition-all duration-200
                      ${
                        !dark
                          ? "bg-[var(--surface-2)] border-[var(--primary)] shadow-lg shadow-[var(--glow)]"
                          : "bg-[var(--surface-2)]/40 border-[var(--border)] hover:border-[var(--primary)]/50"
                      }
                    `}
                  >
                    <div className="flex items-center justify-between mb-3">
                      <div className="size-9 rounded-xl bg-amber-500/10 text-amber-500 flex items-center justify-center">
                        <Sun className="size-5" />
                      </div>
                      {!dark && (
                        <span className="size-5 rounded-full bg-[var(--primary)] text-[var(--primary-foreground)] flex items-center justify-center">
                          <Check className="size-3 stroke-[3]" />
                        </span>
                      )}
                    </div>
                    <p className="text-sm font-bold text-[var(--foreground)]">
                      Light Mode
                    </p>
                    <p className="text-[11px] text-[var(--muted-foreground)] mt-0.5">
                      Clean, refreshing daylight ambiance
                    </p>
                  </button>

                  {/* Dark Mode Card */}
                  <button
                    type="button"
                    onClick={() => setTheme("dark")}
                    className={`
                      relative p-4 rounded-2xl border text-left transition-all duration-200
                      ${
                        dark
                          ? "bg-[var(--surface-2)] border-[var(--primary)] shadow-lg shadow-[var(--glow)]"
                          : "bg-[var(--surface-2)]/40 border-[var(--border)] hover:border-[var(--primary)]/50"
                      }
                    `}
                  >
                    <div className="flex items-center justify-between mb-3">
                      <div className="size-9 rounded-xl bg-indigo-500/10 text-[var(--primary)] flex items-center justify-center">
                        <Moon className="size-5" />
                      </div>
                      {dark && (
                        <span className="size-5 rounded-full bg-[var(--primary)] text-[var(--primary-foreground)] flex items-center justify-center">
                          <Check className="size-3 stroke-[3]" />
                        </span>
                      )}
                    </div>
                    <p className="text-sm font-bold text-[var(--foreground)]">
                      Dark Mode
                    </p>
                    <p className="text-[11px] text-[var(--muted-foreground)] mt-0.5">
                      Sleek midnight & OLED ambient shades
                    </p>
                  </button>
                </div>
              </div>

              {/* ── 2. BASE THEME SHADES (Palette) ── */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <label className="text-xs font-bold uppercase tracking-wider text-[var(--muted-foreground)]">
                      {dark ? "Dark Mode Atmosphere" : "Light Mode Atmosphere"}
                    </label>
                    <p className="text-[11px] text-[var(--muted-foreground)] mt-0.5">
                      Select your preferred background and card depth palette.
                    </p>
                  </div>
                  <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-[var(--primary)]/15 text-[var(--primary)]">
                    {dark ? `${shadesDark.length} Palettes` : `${shadesLight.length} Palettes`}
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {(dark ? shadesDark : shadesLight).map((shade) => {
                    const isSelected = activeShade === shade.id;
                    return (
                      <button
                        key={shade.id}
                        type="button"
                        onClick={() => {
                          if (dark) setDarkShade(shade.id);
                          else setLightShade(shade.id);
                          toast.success(`Theme switched to ${shade.name}`);
                        }}
                        className={`
                          group relative p-3.5 rounded-2xl border text-left transition-all duration-200 flex flex-col justify-between
                          ${
                            isSelected
                              ? "bg-[var(--surface-2)] border-[var(--primary)] shadow-md shadow-[var(--glow)]"
                              : "bg-[var(--surface-2)]/40 border-[var(--border)] hover:border-[var(--primary)]/40 hover:bg-[var(--surface-2)]/70"
                          }
                        `}
                      >
                        {/* Mini UI Swatch Preview Box */}
                        <div
                          className="w-full h-16 rounded-xl p-2 mb-3 border relative overflow-hidden flex flex-col justify-between"
                          style={{
                            backgroundColor: shade.bg,
                            borderColor: isSelected ? "var(--primary)" : "rgba(128,128,128,0.2)",
                          }}
                        >
                          {/* Mini header bar */}
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-1">
                              <div
                                className="size-2 rounded-full"
                                style={{ backgroundColor: shade.accent }}
                              />
                              <div
                                className="w-8 h-1.5 rounded-full opacity-40"
                                style={{ backgroundColor: shade.accent }}
                              />
                            </div>
                            <div
                              className="size-2 rounded-full opacity-30"
                              style={{ backgroundColor: shade.accent }}
                            />
                          </div>

                          {/* Mini surface card */}
                          <div
                            className="w-full h-7 rounded-lg p-1.5 flex items-center justify-between shadow-xs border"
                            style={{
                              backgroundColor: shade.surface,
                              borderColor: "rgba(128,128,128,0.15)",
                            }}
                          >
                            <div
                              className="w-12 h-1.5 rounded-full opacity-60"
                              style={{ backgroundColor: shade.accent }}
                            />
                            <div
                              className="w-4 h-3 rounded-md"
                              style={{ backgroundColor: shade.accent }}
                            />
                          </div>
                        </div>

                        {/* Title, Badge & Description */}
                        <div>
                          <div className="flex items-center justify-between gap-1 mb-1">
                            <span className="text-xs font-bold text-[var(--foreground)] truncate">
                              {shade.name}
                            </span>
                            <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded-md bg-[var(--surface-3)] text-[var(--muted-foreground)] shrink-0">
                              {shade.badge}
                            </span>
                          </div>
                          <p className="text-[10.5px] text-[var(--muted-foreground)] line-clamp-1">
                            {shade.desc}
                          </p>
                        </div>

                        {/* Selected Checkmark Badge */}
                        {isSelected && (
                          <div className="absolute top-2.5 right-2.5 size-5 rounded-full bg-[var(--primary)] text-[var(--primary-foreground)] flex items-center justify-center shadow-md">
                            <Check className="size-3 stroke-[3]" />
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* ── 3. BUTTON & ACCENT COLORS (Gradients + Normal Solid Vibrants) ── */}
              <div className="space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <label className="text-xs font-bold uppercase tracking-wider text-[var(--muted-foreground)] flex items-center gap-1.5">
                      <Sparkles className="size-3.5 text-amber-400" />
                      Button & Accent Colors
                    </label>
                    <p className="text-[11px] text-[var(--muted-foreground)] mt-0.5">
                      Customizes action buttons, glows, badges, and active menu highlights across Nova.
                    </p>
                  </div>

                  {/* Filter Sub-Tabs */}
                  <div className="flex items-center gap-1 p-1 rounded-xl bg-[var(--surface-3)] border border-[var(--border)] shrink-0 self-start sm:self-auto">
                    <button
                      type="button"
                      onClick={() => setAccentTab("all")}
                      className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all ${
                        accentTab === "all"
                          ? "bg-[var(--primary)] text-[var(--primary-foreground)] shadow-xs"
                          : "text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
                      }`}
                    >
                      All ({accents.length})
                    </button>
                    <button
                      type="button"
                      onClick={() => setAccentTab("gradient")}
                      className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all ${
                        accentTab === "gradient"
                          ? "bg-[var(--primary)] text-[var(--primary-foreground)] shadow-xs"
                          : "text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
                      }`}
                    >
                      🌈 Gradients ({accentsGradient?.length || 8})
                    </button>
                    <button
                      type="button"
                      onClick={() => setAccentTab("solid")}
                      className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all ${
                        accentTab === "solid"
                          ? "bg-[var(--primary)] text-[var(--primary-foreground)] shadow-xs"
                          : "text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
                      }`}
                    >
                      🎨 Solid ({accentsSolid?.length || 8})
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                  {(accentTab === "gradient"
                    ? accentsGradient || []
                    : accentTab === "solid"
                    ? accentsSolid || []
                    : accents
                  ).map((acc) => {
                    const isSelected = accent === acc.id;
                    const isSolid = acc.isSolid;
                    return (
                      <button
                        key={acc.id}
                        type="button"
                        onClick={() => {
                          setAccent(acc.id);
                          toast.success(`Theme accent set to ${acc.name}`);
                        }}
                        className={`
                          group relative p-3 rounded-2xl border text-left transition-all duration-200
                          ${
                            isSelected
                              ? "bg-[var(--surface-2)] border-[var(--primary)] shadow-md shadow-[var(--glow)]"
                              : "bg-[var(--surface-2)]/40 border-[var(--border)] hover:border-[var(--primary)]/40 hover:bg-[var(--surface-2)]/70"
                          }
                        `}
                      >
                        {/* Preview bar */}
                        <div
                          className="w-full h-8 rounded-xl mb-2.5 shadow-sm transition-transform duration-200 group-hover:scale-[1.02] flex items-center justify-between px-2.5"
                          style={{ background: acc.grad }}
                        >
                          <span className="text-[10px] font-bold text-white drop-shadow-sm opacity-95">
                            Button
                          </span>
                          <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded-full bg-black/25 text-white/90 backdrop-blur-xs">
                            {isSolid ? "Solid" : "Gradient"}
                          </span>
                        </div>

                        <div className="flex items-center justify-between">
                          <span className="text-xs font-semibold text-[var(--foreground)] truncate">
                            {acc.name}
                          </span>
                          {isSelected && (
                            <span className="size-4 rounded-full bg-[var(--primary)] text-[var(--primary-foreground)] flex items-center justify-center shrink-0">
                              <Check className="size-2.5 stroke-[3]" />
                            </span>
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* ── 4. LIVE INTERACTIVE PREVIEW WIDGET ── */}
              <div className="p-4 rounded-2xl bg-[var(--surface-2)]/60 border border-[var(--border)] space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-[var(--muted-foreground)]">
                    Live UI Preview
                  </span>
                  <span className="text-[10px] text-[var(--muted-foreground)]">
                    Instant changes across Nova
                  </span>
                </div>

                <div className="p-4 rounded-xl bg-[var(--surface)] border border-[var(--border)] space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className="size-8 rounded-full bg-gradient-to-tr from-[var(--primary)] to-indigo-400 flex items-center justify-center text-white font-bold text-xs">
                        N
                      </div>
                      <div>
                        <p className="text-xs font-bold text-[var(--foreground)] leading-none">
                          Nova Social
                        </p>
                        <p className="text-[10px] text-[var(--muted-foreground)] mt-0.5">
                          @novaofficial · Live Theme Active
                        </p>
                      </div>
                    </div>

                    <button
                      type="button"
                      className="px-3 py-1.5 rounded-lg text-xs font-bold text-white shadow-sm transition-all active:scale-95"
                      style={{ background: "var(--grad-btn)" }}
                    >
                      Follow
                    </button>
                  </div>

                  <p className="text-xs text-[var(--foreground)]">
                    This is how posts, profiles, chats, and buttons look with your active theme and gradient! ✨
                  </p>

                  <div className="flex items-center gap-4 text-xs text-[var(--muted-foreground)] pt-1 border-t border-[var(--border)]">
                    <span className="flex items-center gap-1 text-[var(--primary)] font-semibold">
                      <Heart className="size-3.5 fill-[var(--primary)]" /> 1.2k Likes
                    </span>
                    <span className="flex items-center gap-1">
                      <MessageCircle className="size-3.5" /> 84 Comments
                    </span>
                    <span className="flex items-center gap-1">
                      <Share2 className="size-3.5" /> Share
                    </span>
                  </div>
                </div>
              </div>

              {/* ── 5. MEDIA QUALITY SETTING ── */}
              <div className="space-y-4 pt-2 border-t border-[var(--border)]">
                <div className="p-4 rounded-2xl bg-[var(--surface-2)]/50 border border-[var(--border)] flex items-center justify-between">
                  <div className="space-y-0.5 max-w-[80%]">
                    <p className="text-sm font-bold text-[var(--foreground)]">
                      High Quality Media Uploads
                    </p>
                    <p className="text-xs text-[var(--muted-foreground)]">
                      Always upload photos and videos in highest available resolution (uses more mobile data).
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={toggleHighQuality}
                    className={`
                      relative w-11 h-6 rounded-full transition-colors duration-200 outline-none
                      ${highQualityUpload ? "bg-primary" : "bg-[var(--surface-3)]"}
                    `}
                  >
                    <span
                      className={`
                        block size-4 rounded-full bg-white transition-transform duration-200 shadow-md
                        ${highQualityUpload ? "translate-x-6" : "translate-x-1"}
                      `}
                    />
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ═══════════ 7. NOVA QR CODE ═══════════ */}
          {activeTab === "qrcode" && (
            <div className="space-y-6">
              <div>
                <h2 className="text-lg font-bold text-[var(--foreground)]">
                  Nova Profile QR Code
                </h2>
                <p className="text-xs text-[var(--muted-foreground)]">
                  Share your personal QR code so friends can scan and instantly follow your profile.
                </p>
              </div>

              <div className="p-8 rounded-3xl bg-[var(--surface-2)]/60 border border-[var(--border)] flex flex-col items-center justify-center text-center gap-4">
                <div className="size-16 rounded-2xl bg-gradient-to-tr from-cyan-500 to-indigo-600 flex items-center justify-center text-white shadow-xl shadow-cyan-500/25">
                  <QrCode className="size-8" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-[var(--foreground)]">
                    @{user?.username || "yourprofile"}
                  </h3>
                  <p className="text-xs text-[var(--muted-foreground)] max-w-sm">
                    Generate, customize neon color themes, download PNG, or copy your link.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => setQrModalOpen(true)}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary text-primary-foreground text-xs font-semibold hover:brightness-110 active:scale-95 transition-all shadow-lg shadow-primary/25"
                >
                  <Sparkles className="size-4" />
                  Open QR Code Studio
                </button>
              </div>

              <NovaQRCodeModal
                isOpen={qrModalOpen}
                onClose={() => setQrModalOpen(false)}
                url={profileUrl}
                title={user?.fullName || user?.username}
                subtitle={`@${user?.username || "nova"}`}
                avatar={user?.profilePicture}
                type="profile"
              />
            </div>
          )}

          {/* ═══════════ 8. YOUR ACTIVITY ═══════════ */}
          {activeTab === "activity" && (
            <div className="space-y-6">
              <div>
                <h2 className="text-lg font-bold text-[var(--foreground)]">
                  Your Activity & Insights
                </h2>
                <p className="text-xs text-[var(--muted-foreground)]">
                  Review time spent on Nova and account stats.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="p-4 rounded-2xl bg-[var(--surface-2)]/50 border border-[var(--border)] space-y-1">
                  <div className="flex items-center justify-between text-[var(--muted-foreground)]">
                    <span className="text-xs font-medium">Time Today</span>
                    <Clock className="size-4 text-primary" />
                  </div>
                  <p className="text-2xl font-bold text-[var(--foreground)]">
                    {timeSpentMins}m
                  </p>
                  <p className="text-[10px] text-emerald-400">Daily average: ~42m</p>
                </div>

                <div className="p-4 rounded-2xl bg-[var(--surface-2)]/50 border border-[var(--border)] space-y-1">
                  <div className="flex items-center justify-between text-[var(--muted-foreground)]">
                    <span className="text-xs font-medium">Posts Shared</span>
                    <Heart className="size-4 text-rose-400" />
                  </div>
                  <p className="text-2xl font-bold text-[var(--foreground)]">
                    {user?.posts?.length || 0}
                  </p>
                  <p className="text-[10px] text-[var(--muted-foreground)]">Total creations</p>
                </div>

                <div className="p-4 rounded-2xl bg-[var(--surface-2)]/50 border border-[var(--border)] space-y-1">
                  <div className="flex items-center justify-between text-[var(--muted-foreground)]">
                    <span className="text-xs font-medium">Bookmarks</span>
                    <Bookmark className="size-4 text-amber-400" />
                  </div>
                  <p className="text-2xl font-bold text-[var(--foreground)]">
                    {user?.bookmarks?.length || 0}
                  </p>
                  <p className="text-[10px] text-[var(--muted-foreground)]">Saved to collections</p>
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-[var(--surface-2)]/40 border border-[var(--border)] flex items-center justify-between">
                <div>
                  <p className="text-xs sm:text-sm font-semibold text-[var(--foreground)]">
                    Quick Access to Saved Collections
                  </p>
                  <p className="text-[11px] text-[var(--muted-foreground)]">
                    Organize, manage, or export your saved posts
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() =>
                    navigate(`/profile/${user?.username || user?._id}`, {
                      state: { tab: "saved" },
                    })
                  }
                  className="px-3 py-1.5 rounded-lg bg-[var(--surface-3)] hover:bg-primary/20 text-xs font-semibold text-primary transition-all"
                >
                  Go to Saved →
                </button>
              </div>
            </div>
          )}

          {/* ═══════════ 9. ACCOUNT MANAGEMENT & ABOUT ═══════════ */}
          {activeTab === "account" && (
            <div className="space-y-6">
              <div>
                <h2 className="text-lg font-bold text-[var(--foreground)]">
                  Account Management & Data
                </h2>
                <p className="text-xs text-[var(--muted-foreground)]">
                  Clear local cache, inspect application version, or delete your account.
                </p>
              </div>

              {/* Data & Cache purge */}
              <div className="p-4 rounded-2xl bg-[var(--surface-2)]/50 border border-[var(--border)] space-y-3">
                <p className="text-sm font-bold text-[var(--foreground)]">
                  Local Storage & Search History
                </p>
                <div className="flex flex-wrap items-center gap-3">
                  <button
                    type="button"
                    onClick={handleClearSearchHistory}
                    className="px-3.5 py-1.5 rounded-xl bg-[var(--surface-3)] hover:bg-[var(--surface-4)] text-xs font-semibold text-[var(--foreground)] transition-all"
                  >
                    Clear Search History
                  </button>
                  <button
                    type="button"
                    onClick={handleClearCache}
                    className="px-3.5 py-1.5 rounded-xl bg-[var(--surface-3)] hover:bg-[var(--surface-4)] text-xs font-semibold text-[var(--foreground)] transition-all"
                  >
                    Purge Temporary Cache
                  </button>
                </div>
              </div>

              {/* About Nova Info */}
              <div className="p-4 rounded-2xl bg-[var(--surface-2)]/50 border border-[var(--border)] space-y-1.5">
                <div className="flex items-center gap-2">
                  <Info className="size-4 text-primary" />
                  <p className="text-sm font-bold text-[var(--foreground)]">
                    About Nova Social
                  </p>
                </div>
                <p className="text-xs text-[var(--muted-foreground)] leading-relaxed">
                  Version <strong>Nova v2.4 (Pro)</strong>. High-performance social network with real-time WebSockets, WebRTC video/photo compression, encrypted private messaging, and interactive community feeds.
                </p>
              </div>

              {/* Account Session & Sign Out */}
              <div className="p-4 rounded-2xl bg-[var(--surface-2)]/50 border border-[var(--border)] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-bold text-[var(--foreground)]">Sign Out of Nova</p>
                  <p className="text-xs text-[var(--muted-foreground)]">
                    Log out of your active account session on this device.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setLogoutModalOpen(true)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold bg-red-500/15 text-red-400 hover:bg-red-500/25 border border-red-500/30 transition-all active:scale-95 flex items-center gap-2 self-start sm:self-auto cursor-pointer"
                >
                  <LogOut className="size-4" />
                  <span>Log Out</span>
                </button>
              </div>

              {/* Danger Zone: Delete Account */}
              <div className="p-5 rounded-2xl bg-red-500/10 border border-red-500/20 space-y-3">
                <div className="flex items-center gap-2 text-red-400">
                  <AlertTriangle className="size-4" />
                  <p className="text-sm font-bold">Danger Zone</p>
                </div>
                <p className="text-xs text-red-300/80 leading-relaxed">
                  Permanently delete your Nova profile, stories, messages, and uploaded photos. This action is irreversible.
                </p>
                <button
                  type="button"
                  onClick={() => setDeleteModalOpen(true)}
                  className="px-4 py-2 rounded-xl bg-red-500 text-white text-xs font-bold hover:bg-red-600 transition-all active:scale-95 shadow-md shadow-red-500/20"
                >
                  Delete Account
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Password Verification Modal to Unlock Profile Edit */}
      <Dialog open={unlockModalOpen} onOpenChange={setUnlockModalOpen}>
        <DialogContent className="max-w-md bg-[var(--surface)] border-[var(--border)] text-[var(--foreground)] p-6 rounded-3xl shadow-2xl">
          <DialogHeader>
            <div className="flex items-center gap-3">
              <div className="size-10 rounded-2xl bg-primary/15 text-primary ring-1 ring-primary/30 flex items-center justify-center shrink-0">
                <Lock className="size-5" />
              </div>
              <div>
                <DialogTitle className="text-base sm:text-lg font-bold text-[var(--foreground)]">
                  Verify Your Password
                </DialogTitle>
                <p className="text-xs text-[var(--muted-foreground)] mt-0.5">
                  Confirm your identity to unlock and edit your profile info.
                </p>
              </div>
            </div>
          </DialogHeader>

          <form onSubmit={handleVerifyPasswordToEdit} className="space-y-4 pt-3">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-[var(--foreground)]">Current Password</Label>
              <div className="relative">
                <Input
                  type={showUnlockPassword ? "text" : "password"}
                  placeholder="Enter your password"
                  value={unlockPassword}
                  onChange={(e) => setUnlockPassword(e.target.value)}
                  className="bg-[var(--surface-2)] pr-10"
                  autoFocus
                />
                <button
                  type="button"
                  onClick={() => setShowUnlockPassword(!showUnlockPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
                >
                  {showUnlockPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => {
                  setUnlockModalOpen(false);
                  setUnlockPassword("");
                }}
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-[var(--surface-2)] hover:bg-[var(--surface-3)] text-[var(--foreground)] transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={unlockLoading || !unlockPassword.trim()}
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-primary text-primary-foreground hover:brightness-110 active:scale-95 transition-all shadow-md shadow-primary/20 flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
              >
                {unlockLoading ? <Loader2 className="size-3.5 animate-spin" /> : <KeyRound className="size-3.5" />}
                <span>Verify & Edit</span>
              </button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Modal */}
      <Dialog open={deleteModalOpen} onOpenChange={setDeleteModalOpen}>
        <DialogContent className="max-w-md bg-[var(--surface)] border-[var(--border)] text-[var(--foreground)]">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-red-400 flex items-center gap-2">
              <AlertTriangle className="size-5" />
              Delete Your Nova Account?
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleDeleteAccount} className="space-y-4 pt-2">
            <p className="text-xs text-[var(--muted-foreground)]">
              Please enter your current account password to confirm permanent deletion.
            </p>
            <Input
              type="password"
              placeholder="Enter your password"
              value={deletePassword}
              onChange={(e) => setDeletePassword(e.target.value)}
              className="bg-[var(--surface-2)]"
            />
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setDeleteModalOpen(false)}
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-[var(--surface-2)] hover:bg-[var(--surface-3)]"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={deletingAccount || !deletePassword.trim()}
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-red-500 text-white hover:bg-red-600 disabled:opacity-50 flex items-center gap-1.5"
              >
                {deletingAccount && <Loader2 className="size-3.5 animate-spin" />}
                Confirm Delete
              </button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Log Out Confirmation Dialog */}
      <Dialog open={logoutModalOpen} onOpenChange={setLogoutModalOpen}>
        <DialogContent className="max-w-sm bg-[var(--surface)] border-[var(--border)] text-[var(--foreground)] p-6 rounded-3xl shadow-2xl">
          <DialogHeader>
            <div className="flex items-center gap-3">
              <div className="size-10 rounded-2xl bg-red-500/20 text-red-400 ring-1 ring-red-500/30 flex items-center justify-center shrink-0">
                <LogOut className="size-5" />
              </div>
              <DialogTitle className="text-base sm:text-lg font-bold text-[var(--foreground)]">
                Log Out of Nova?
              </DialogTitle>
            </div>
          </DialogHeader>

          <p className="text-xs text-[var(--muted-foreground)] pt-2 leading-relaxed">
            Are you sure you want to log out? You will need to log back in to access your messages, stories, and community feed.
          </p>

          <div className="flex items-center justify-end gap-2 pt-4">
            <button
              type="button"
              disabled={loggingOut}
              onClick={() => setLogoutModalOpen(false)}
              className="px-4 py-2 rounded-xl text-xs font-semibold bg-[var(--surface-2)] hover:bg-[var(--surface-3)] text-[var(--foreground)] transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={loggingOut}
              onClick={handleLogout}
              className="px-4 py-2 rounded-xl text-xs font-semibold bg-red-600 hover:bg-red-500 text-white transition-colors flex items-center gap-1.5 shadow-lg shadow-red-600/20 cursor-pointer disabled:opacity-50"
            >
              {loggingOut ? <Loader2 className="size-3.5 animate-spin" /> : <LogOut className="size-3.5" />}
              <span>Log Out</span>
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default SettingsPage;
