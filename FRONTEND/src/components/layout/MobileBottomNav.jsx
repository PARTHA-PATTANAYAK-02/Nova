import React, { useEffect, useState } from "react";
import {
  Heart, Home, MessageCircle, PlusSquare, LogOut, Search, Compass, Settings, X, User, Trash2,
} from "lucide-react";
import {
  HouseIcon,
  CompassIcon,
  SquarePlusIcon,
  MessageCircleIcon,
  BellRingIcon,
  UserIcon,
  SettingsIcon,
  LogOutIcon,
} from "@animateicons/react/lucide";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useSelector, useDispatch } from "react-redux";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import CreatePost from "@/components/feed/CreatePost";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { toast } from "sonner";
import axios from "axios";
import { setAuthUser } from "@/redux/authSlice";
import { setPosts, setSelectedPost } from "@/redux/postSlice";
import {
  markNotificationsRead,
  dismissModalNotification,
  dismissAllModalNotifications,
  setNotifications,
} from "@/redux/rtnSlice";
import { getDisplayName, getErrorMessage, getProfileCompletion } from "@/lib/utils";
import { apiUrl } from "@/lib/api";

const MobileBottomNav = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { user } = useSelector((store) => store.auth);
  const profileComp = getProfileCompletion(user);
  const { likeNotification, unreadCount } = useSelector(
    (store) => store.realTimeNotification,
  );
  const location = useLocation();
  const [open, setOpen] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [profileMenuMounted, setProfileMenuMounted] = useState(false);

  const [keyboardOpen, setKeyboardOpen] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;

    // Detect virtual keyboard via VisualViewport API
    const handleViewportChange = () => {
      if (window.visualViewport) {
        // If visualViewport height is substantially smaller than window.innerHeight, keyboard is open
        const isKeyboard =
          window.visualViewport.height < window.innerHeight * 0.75;
        setKeyboardOpen(isKeyboard);
      }
    };

    if (window.visualViewport) {
      window.visualViewport.addEventListener("resize", handleViewportChange);
      window.visualViewport.addEventListener("scroll", handleViewportChange);
    }

    // Also listen to focusin/focusout for input elements on mobile
    const onFocusIn = (e) => {
      if (
        e.target &&
        (e.target.tagName === "INPUT" || e.target.tagName === "TEXTAREA")
      ) {
        setKeyboardOpen(true);
      }
    };
    const onFocusOut = () => {
      // Small timeout to allow keyboard dismiss transition
      setTimeout(() => {
        if (
          !document.activeElement ||
          (document.activeElement.tagName !== "INPUT" &&
            document.activeElement.tagName !== "TEXTAREA")
        ) {
          setKeyboardOpen(false);
        }
      }, 150);
    };

    window.addEventListener("focusin", onFocusIn);
    window.addEventListener("focusout", onFocusOut);

    return () => {
      if (window.visualViewport) {
        window.visualViewport.removeEventListener("resize", handleViewportChange);
        window.visualViewport.removeEventListener("scroll", handleViewportChange);
      }
      window.removeEventListener("focusin", onFocusIn);
      window.removeEventListener("focusout", onFocusOut);
    };
  }, []);

  useEffect(() => {
    if (showProfileMenu) {
      requestAnimationFrame(() => setProfileMenuMounted(true));
    } else {
      setProfileMenuMounted(false);
    }
  }, [showProfileMenu]);

  const getNotificationText = (n) =>
    n.type === "comment"
      ? "commented on your post"
      : n.type === "message"
        ? "sent you a message"
        : n.type === "follow"
          ? "started following you"
          : "liked your post";

  const handleNotificationClick = (n) => {
    if (n.type === "message") {
      navigate("/chat", { state: { user: n.userDetails } });
    } else if (n.type === "comment" || n.type === "like") {
      navigate("/", { state: { notificationPostId: n.postId } });
    } else if (n.type === "follow" && n.userId) {
      navigate(`/profile/${n.userId}`);
    } else {
      navigate("/");
    }
  };

  const handleRemoveNotification = (id) => {
    dispatch(dismissModalNotification(id));
    axios
      .patch(apiUrl(`/api/v1/user/notifications/${id}/dismiss-modal`), {}, { withCredentials: true })
      .catch(() => undefined);
  };

  const handleClearAllNotifications = () => {
    if (likeNotification.length === 0) return;
    dispatch(dismissAllModalNotifications());
    axios
      .patch(apiUrl("/api/v1/user/notifications/dismiss-modal-all"), {}, { withCredentials: true })
      .catch(() => undefined);
  };

  const handleNotificationsOpen = (isOpen) => {
    if (isOpen) {
      dispatch(markNotificationsRead());
      axios
        .get(apiUrl("/api/v1/user/notifications?source=modal"), { withCredentials: true })
        .then((res) => {
          if (res.data?.success) {
            dispatch(setNotifications({ notifications: res.data.notifications || [] }));
          }
        })
        .catch(() => undefined);

      axios
        .patch(apiUrl("/api/v1/user/notifications/read"), {}, { withCredentials: true })
        .catch(() => undefined);
    }
  };

  const handleLogout = async () => {
    try {
      const res = await axios.get(apiUrl("/api/v1/user/logout"), {
        withCredentials: true,
      });
      if (res.data.success) {
        dispatch(setAuthUser(null));
        dispatch(setSelectedPost(null));
        dispatch(setPosts([]));
        navigate("/login");
        toast.success(res.data.message);
      }
    } catch (error) {
      toast.error(getErrorMessage(error, "Unable to log out. Please try again."));
    }
  };

  const isActive = (path) => location.pathname === path;
  const initial = getDisplayName(user, "U").charAt(0).toUpperCase();

  return (
    <>
      {/* ── FLOATING PILL NAV ─────────────────── */}
      <nav
        className={`
          md:hidden fixed bottom-3 left-1/2 -translate-x-1/2
          w-[calc(100%-24px)] max-w-[460px] z-50
          rounded-[26px]
          bg-[var(--surface)]/85 backdrop-blur-2xl
          border border-[var(--border)]/65
          shadow-[0_20px_60px_-20px_rgba(0,0,0,.35),0_4px_12px_-4px_rgba(0,0,0,.1)]
          px-2 py-2
          transition-all duration-200
          ${
            keyboardOpen
              ? "opacity-0 pointer-events-none translate-y-10"
              : "opacity-100 translate-y-0"
          }
        `}
        style={{ paddingBottom: "max(0.5rem, env(safe-area-inset-bottom))" }}
      >
        <div className="flex items-center justify-between gap-0.5">
          {/* HOME */}
          <NavBtn
            to="/"
            active={isActive("/")}
            icon={<HouseIcon size={20} />}
            label="Home"
            onClick={() => dispatch(setSelectedPost(null))}
          />

          {/* EXPLORE */}
          <NavBtn
            to="/explore"
            active={isActive("/explore") || isActive("/search")}
            icon={<CompassIcon size={20} />}
            label="Explore"
          />

          {/* CREATE — balanced button */}
          <button
            onClick={() => setOpen(true)}
            aria-label="Create post"
            className="
              relative shrink-0
              w-[42px] h-[42px] mx-1
              rounded-[14px]
              bg-grad-btn text-white
              flex items-center justify-center
              shadow-[0_8px_18px_-6px_var(--glow-strong)]
              active:scale-[.92]
              hover:brightness-[1.08]
              transition-all duration-200 ease-[cubic-bezier(.2,.8,.2,1)]
              outline-none
            "
          >
            <SquarePlusIcon size={20} />
          </button>

          {/* CHAT */}
          <NavBtn
            to="/chat"
            active={isActive("/chat")}
            icon={<MessageCircleIcon size={20} />}
            label="Chat"
          />

          {/* NOTIFICATIONS */}
          <Popover onOpenChange={handleNotificationsOpen}>
            <PopoverTrigger asChild>
              <button
                aria-label="Notifications"
                className="
                  relative flex-1 flex items-center justify-center
                  py-2 rounded-xl
                  text-[var(--muted-foreground)]
                  hover:text-[var(--foreground)]
                  active:scale-90
                  transition-all duration-250
                  outline-none
                "
              >
                <div className="relative flex items-center justify-center">
                  <BellRingIcon
                    size={20}
                    className={`transition-transform duration-250 ${
                      unreadCount > 0 ? "scale-105" : ""
                    }`}
                  />
                  {unreadCount > 0 && (
                    <>
                      <span className="absolute -top-1 -right-1 size-3.5 rounded-full bg-[var(--accent)] opacity-40 animate-ping" />
                      <span className="
                        absolute -top-1 -right-1 flex h-3.5 min-w-3.5 items-center justify-center
                        rounded-full px-1 text-[8px] font-bold
                        bg-[var(--accent)] text-[var(--accent-foreground)]
                        border-2 border-[var(--surface)]
                      ">
                        {unreadCount > 9 ? "9+" : unreadCount}
                      </span>
                    </>
                  )}
                </div>
              </button>
            </PopoverTrigger>

            <PopoverContent
              side="top"
              align="center"
              sideOffset={14}
              className="
                w-[calc(100vw-24px)] max-w-[380px] p-0 mb-1 overflow-hidden
                rounded-2xl border-[var(--border)]
                bg-[var(--surface)]/95 backdrop-blur-xl
                shadow-[0_24px_64px_-16px_rgba(0,0,0,.28),0_8px_24px_-12px_var(--glow)]
                animate-in fade-in-0 zoom-in-95 slide-in-from-bottom-2 duration-200
              "
            >
              <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--border)]">
                <div>
                  <h3 className="font-display text-sm font-semibold text-[var(--foreground)]">
                    Notifications
                  </h3>
                  {likeNotification.length > 0 && (
                    <p className="text-[10px] mt-0.5 text-[var(--muted-foreground)]">
                      {likeNotification.length}{" "}
                      {likeNotification.length === 1 ? "notification" : "notifications"}
                    </p>
                  )}
                </div>
                {likeNotification.length > 0 && (
                  <button
                    onClick={handleClearAllNotifications}
                    className="
                      inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg
                      text-[11px] font-medium text-[var(--muted-foreground)]
                      hover:text-[var(--danger)] hover:bg-[var(--danger)]/8
                      active:scale-95 transition-all duration-200 outline-none
                    "
                  >
                    <Trash2 className="h-3.5 w-3.5" strokeWidth={1.8} />
                    Clear all
                  </button>
                )}
              </div>

              <div className="max-h-[55vh] overflow-y-auto">
                {likeNotification.length === 0 ? (
                  <div className="py-10 px-5 flex flex-col items-center text-center">
                    <div className="size-11 rounded-full bg-[var(--surface-2)] flex items-center justify-center mb-3">
                      <Heart className="size-5 text-[var(--muted-foreground)]" strokeWidth={1.6} />
                    </div>
                    <p className="text-sm font-medium text-[var(--foreground)]">
                      All caught up
                    </p>
                    <p className="text-xs mt-1 text-[var(--muted-foreground)]">
                      No notifications yet
                    </p>
                  </div>
                ) : (
                  likeNotification.map((n, index) => (
                    <div
                      key={n._id}
                      onClick={() => handleNotificationClick(n)}
                      className="
                        group flex items-center gap-3 px-4 py-3 cursor-pointer
                        hover:bg-[var(--surface-2)] transition-all duration-200
                        animate-in fade-in-0 slide-in-from-bottom-1
                      "
                      style={{ animationDelay: `${index * 35}ms` }}
                    >
                      <Avatar className="h-9 w-9 shrink-0">
                        <AvatarImage src={n.userDetails?.profilePicture} />
                        <AvatarFallback>
                          {getDisplayName(n.userDetails, "U").charAt(0).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs text-[var(--foreground)] leading-relaxed">
                          <span className="font-semibold">
                            {getDisplayName(n.userDetails, "A user")}
                          </span>{" "}
                          <span className="text-[var(--muted-foreground)]">
                            {getNotificationText(n)}
                          </span>
                        </p>
                      </div>
                      <button
                        aria-label="Remove notification"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleRemoveNotification(n._id);
                        }}
                        className="
                          shrink-0 h-7 w-7 rounded-full
                          flex items-center justify-center
                          text-[var(--muted-foreground)] opacity-0 group-hover:opacity-100
                          hover:text-[var(--danger)] hover:bg-[var(--danger)]/8
                          active:scale-90 transition-all duration-200 outline-none
                        "
                      >
                        <X className="h-3.5 w-3.5" strokeWidth={2} />
                      </button>
                    </div>
                  ))
                )}
              </div>

              <div className="p-2 border-t border-[var(--border)] bg-[var(--surface-2)]/60">
                <button
                  onClick={() => navigate("/notifications")}
                  className="w-full py-2 px-3 text-xs font-semibold text-center rounded-xl bg-primary/10 text-primary hover:bg-primary/20 transition-all active:scale-[0.98]"
                >
                  Open Notification Center →
                </button>
              </div>
            </PopoverContent>
          </Popover>

          {/* PROFILE */}
          <button
            onClick={() => setShowProfileMenu((v) => !v)}
            aria-label="Profile menu"
            className={`
              relative flex-1 flex items-center justify-center
              py-1.5 rounded-xl transition-all duration-250
              active:scale-90 outline-none
              ${showProfileMenu ? "bg-[var(--surface-2)]" : ""}
            `}
          >
            <span className="relative size-7 flex items-center justify-center">
              <Avatar
                className={`size-7 transition-all ${
                  showProfileMenu
                    ? "border-2 border-[var(--primary)]"
                    : "border border-[var(--border)]"
                }`}
              >
                <AvatarImage src={user?.profilePicture} />
                <AvatarFallback>{initial}</AvatarFallback>
              </Avatar>
              {user?.showLastSeen !== false && (
                <span className="absolute -bottom-0.5 -right-0.5 size-2 rounded-full bg-emerald-500 ring-2 ring-[var(--surface)]" />
              )}
            </span>
          </button>
        </div>
      </nav>

      {/* ── PROFILE FLOATING MENU ─────────────── */}
      {showProfileMenu && (
        <>
          <div
            className="md:hidden fixed inset-0 z-40 bg-black/20 backdrop-blur-[2px]"
            onClick={() => setShowProfileMenu(false)}
          />

          <div
            className={`
              md:hidden fixed bottom-[88px] right-3 sm:right-auto sm:left-1/2 sm:translate-x-[6px] z-50
              w-[220px] overflow-hidden rounded-[22px]
              border border-[var(--border)]/60
              bg-[var(--surface)]/90 backdrop-blur-2xl
              shadow-[0_24px_64px_-16px_rgba(0,0,0,.3),0_8px_24px_-12px_var(--glow)]
              origin-bottom-right
              transition-all duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)]
              ${
                profileMenuMounted
                  ? "opacity-100 scale-100 translate-y-0"
                  : "opacity-0 scale-90 translate-y-3"
              }
            `}
          >
            <div className="px-4 py-3.5 border-b border-[var(--border)]/60">
              <div className="flex items-center gap-3">
                <Avatar className="size-10">
                  <AvatarImage src={user?.profilePicture} />
                  <AvatarFallback>{initial}</AvatarFallback>
                </Avatar>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-[var(--foreground)] truncate">
                    {getDisplayName(user)}
                  </p>
                  <p className="text-[11px] text-[var(--muted-foreground)] truncate">
                    {user?.username ? `@${user.username}` : "Set username"}
                  </p>
                </div>
              </div>
            </div>

            <button
              onClick={() => {
                navigate(`/profile/${user?.username || user?._id}`);
                setShowProfileMenu(false);
              }}
              className="
                group w-full flex items-center gap-3 px-4 py-3
                text-sm text-[var(--foreground)]
                hover:bg-[var(--surface-2)] transition-all duration-200 outline-none
              "
            >
              <span className="size-8 rounded-lg flex items-center justify-center bg-[var(--surface-2)] group-hover:bg-[var(--primary)]/12 transition-colors duration-200">
                <UserIcon size={16} />
              </span>
              <span className="flex-1 text-left font-medium">View Profile</span>
            </button>

            <button
              onClick={() => {
                navigate("/settings");
                setShowProfileMenu(false);
              }}
              className="
                group w-full flex items-center gap-3 px-4 py-3
                text-sm text-[var(--foreground)]
                hover:bg-[var(--surface-2)] transition-all duration-200 outline-none
              "
            >
              <span className="size-8 rounded-lg flex items-center justify-center bg-[var(--surface-2)] group-hover:bg-[var(--primary)]/12 transition-colors duration-200">
                <SettingsIcon size={16} />
              </span>
              <span className="flex-1 text-left font-medium">Settings</span>
              {!profileComp.isComplete && (
                <span className="size-2 rounded-full bg-rose-500 animate-pulse ml-auto" />
              )}
            </button>

            <div className="border-t border-[var(--border)]/60 p-1.5">
              <button
                onClick={() => {
                  setShowProfileMenu(false);
                  handleLogout();
                }}
                className="
                  group w-full flex items-center gap-3 px-3 py-2.5
                  rounded-xl text-sm text-[var(--danger)]
                  hover:bg-[var(--danger)]/8
                  transition-all duration-200 active:scale-[.98] outline-none
                "
              >
                <span className="size-8 rounded-lg flex items-center justify-center bg-[var(--danger)]/8 group-hover:bg-[var(--danger)]/12 transition-colors duration-200">
                  <LogOutIcon size={16} />
                </span>
                <span className="font-medium">Logout</span>
              </button>
            </div>
          </div>
        </>
      )}

      <CreatePost open={open} setOpen={setOpen} />
    </>
  );
};

/* ── Small nav button helper ───────────────────── */
const NavBtn = ({ to, active, icon, label, onClick }) => {
  return (
    <Link
      to={to}
      onClick={onClick}
      aria-label={label}
      className={`
        relative flex-1 flex flex-col items-center justify-center gap-0.5
        py-1.5 rounded-xl transition-all duration-250 active:scale-90
        outline-none
        ${active ? "text-[var(--primary)]" : "text-[var(--muted-foreground)] hover:text-[var(--foreground)]"}
      `}
    >
      <span className={`relative transition-transform duration-250 ${active ? "scale-110 -translate-y-0.5" : ""}`}>
        {icon}
      </span>
      <span className={`text-[9px] font-medium transition-opacity duration-250 ${active ? "opacity-100" : "opacity-70"}`}>
        {label}
      </span>
      {active && (
        <span className="absolute -bottom-0.5 h-[3px] w-4 rounded-full bg-grad-btn" />
      )}
    </Link>
  );
};

export default MobileBottomNav;