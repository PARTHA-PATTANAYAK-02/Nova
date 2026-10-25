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
import { getDisplayName, getErrorMessage } from "@/lib/utils";
import { isSoundEnabled, setSoundEnabled, playMessageSound } from "@/lib/sound";
import { useTheme } from "@/hooks/useTheme";
import PasswordResetForm from "@/components/auth/PasswordResetForm";
import NovaQRCodeModal from "@/components/common/NovaQRCodeModal";

const TABS = [
  { id: "profile", label: "Edit Profile", icon: User, desc: "Name, bio & photos" },
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
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const location = useLocation();
  const { dark, toggleTheme } = useTheme();

  const currentDevice = detectDevice();

  // Active tab state (can be initialized from location.state?.tab)
  const [activeTab, setActiveTab] = useState(location.state?.tab || "profile");

  /* ═══════════════════════════════════════════════
     TAB 1: EDIT PROFILE STATE & HANDLERS
     ═══════════════════════════════════════════════ */
  const imageRef = useRef(null);
  const [profileLoading, setProfileLoading] = useState(false);
  const [profileInput, setProfileInput] = useState({
    username: user?.username || "",
    fullName: user?.fullName || "",
    bio: user?.bio || "",
    gender: user?.gender || "male",
    website: user?.website || "",
    profilePhoto: null,
  });
  const [photoPreview, setPhotoPreview] = useState(user?.profilePicture || "");

  useEffect(() => {
    if (user) {
      setProfileInput({
        username: user?.username || "",
        fullName: user?.fullName || "",
        bio: user?.bio || "",
        gender: user?.gender || "male",
        website: user?.website || "",
        profilePhoto: null,
      });
      setPhotoPreview(user?.profilePicture || "");
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

  const handleProfileSubmit = async (e) => {
    e.preventDefault();
    setProfileLoading(true);
    const formData = new FormData();
    formData.append("username", profileInput.username);
    formData.append("fullName", profileInput.fullName);
    formData.append("bio", profileInput.bio);
    formData.append("gender", profileInput.gender);
    formData.append("website", profileInput.website);
    if (profileInput.profilePhoto) {
      formData.append("profilePhoto", profileInput.profilePhoto);
    }

    try {
      const res = await axios.post(apiUrl("/api/v1/user/profile/edit"), formData, {
        withCredentials: true,
      });
      if (res.data.success) {
        dispatch(setAuthUser({ ...user, ...res.data.user }));
        toast.success("Profile updated successfully!");
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
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`
                    shrink-0 flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all
                    ${
                      isActive
                        ? "bg-primary text-primary-foreground shadow-md shadow-primary/25"
                        : "bg-[var(--surface-2)] text-[var(--muted-foreground)] border border-[var(--border)]"
                    }
                  `}
                >
                  <Icon className="size-3.5" />
                  <span>{tab.label}</span>
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
                      p-2 rounded-lg transition-colors
                      ${isActive ? "bg-white/20 text-white" : "bg-[var(--surface-2)] text-[var(--muted-foreground)] group-hover:text-primary"}
                    `}
                  >
                    <Icon className="size-4" />
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs sm:text-sm font-semibold truncate leading-tight">
                      {tab.label}
                    </p>
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
          {/* ═══════════ 1. EDIT PROFILE ═══════════ */}
          {activeTab === "profile" && (
            <div className="space-y-6">
              <div>
                <h2 className="text-lg font-bold text-[var(--foreground)]">Edit Profile</h2>
                <p className="text-xs text-[var(--muted-foreground)]">
                  Update your public avatar, name, and bio displayed to other users.
                </p>
              </div>

              <form onSubmit={handleProfileSubmit} className="space-y-5">
                {/* Photo Preview & Upload */}
                <div className="flex items-center gap-4 p-4 rounded-2xl bg-[var(--surface-2)]/60 border border-[var(--border)]/60">
                  <div className="relative group">
                    <Avatar className="size-16 sm:size-20 border-2 border-primary/40 shadow-lg">
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
                      <Camera className="size-5" />
                    </button>
                  </div>

                  <div>
                    <input
                      ref={imageRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={handleProfilePhotoChange}
                    />
                    <button
                      type="button"
                      onClick={() => imageRef.current?.click()}
                      className="px-3.5 py-1.5 rounded-xl bg-primary text-primary-foreground text-xs font-semibold hover:brightness-110 active:scale-95 transition-all shadow-md shadow-primary/20"
                    >
                      Change Photo
                    </button>
                    <p className="text-[11px] text-[var(--muted-foreground)] mt-1.5">
                      JPG, PNG or WebP (Max 5 MB)
                    </p>
                  </div>
                </div>

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
                    <Label className="text-xs font-semibold">Username</Label>
                    <Input
                      value={profileInput.username}
                      onChange={(e) =>
                        setProfileInput({ ...profileInput, username: e.target.value })
                      }
                      placeholder="e.g. iampartha"
                      className="bg-[var(--surface-2)]/60"
                    />
                  </div>
                </div>

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

                <div className="pt-2 flex justify-end">
                  <button
                    type="submit"
                    disabled={profileLoading}
                    className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-primary text-primary-foreground text-xs sm:text-sm font-semibold hover:brightness-110 active:scale-95 transition-all shadow-lg shadow-primary/25 disabled:opacity-50"
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
            <div className="space-y-6">
              <div>
                <h2 className="text-lg font-bold text-[var(--foreground)]">
                  Appearance & Display
                </h2>
                <p className="text-xs text-[var(--muted-foreground)]">
                  Customize the theme aesthetic and upload data compression.
                </p>
              </div>

              <div className="space-y-4">
                {/* Theme Switcher */}
                <div className="p-4 rounded-2xl bg-[var(--surface-2)]/50 border border-[var(--border)] flex items-center justify-between">
                  <div className="space-y-0.5">
                    <p className="text-sm font-bold text-[var(--foreground)]">
                      Theme Mode
                    </p>
                    <p className="text-xs text-[var(--muted-foreground)]">
                      {dark ? "Currently using Cyberpunk Dark" : "Currently using Clean Light Mode"}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={toggleTheme}
                    className="flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-primary-foreground text-xs font-semibold hover:brightness-110 active:scale-95 transition-all shadow-md shadow-primary/20"
                  >
                    {dark ? <Sun className="size-4" /> : <Moon className="size-4" />}
                    <span>Switch to {dark ? "Light" : "Dark"}</span>
                  </button>
                </div>

                {/* Media Quality */}
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
          )}
        </div>
      </div>
    </div>
  );
};

export default SettingsPage;
