import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  HouseIcon,
  SearchIcon,
  MessageCircleIcon,
  BellRingIcon,
  BookmarkIcon,
  SettingsIcon,
  SquarePlusIcon,
  ExternalLinkIcon,
  Trash2Icon,
  XIcon,
  ArrowRightIcon,
} from "@animateicons/react/lucide";
import AnimatedIcon from "@/components/common/AnimatedIcon";
import React, { useState, useEffect, useRef } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import axios from "axios";
import { useDispatch, useSelector } from "react-redux";
import CreatePost from "@/components/feed/CreatePost";
import { setSelectedPost } from "@/redux/postSlice";
import {
  dismissAllModalNotifications,
  dismissModalNotification,
  markNotificationsRead,
  setNotifications,
} from "@/redux/rtnSlice";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { apiUrl } from "@/lib/api";
import { getDisplayName, getProfileCompletion } from "@/lib/utils";

const LeftSidebar = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useSelector((store) => store.auth);
  const profileComp = getProfileCompletion(user);
  const { likeNotification, unreadCount } = useSelector(
    (store) => store.realTimeNotification,
  );
  const dispatch = useDispatch();
  const [open, setOpen] = useState(false);

  // Animated icon refs for hover & automatic trigger
  const homeIconRef = useRef(null);
  const exploreIconRef = useRef(null);
  const chatIconRef = useRef(null);
  const bellIconRef = useRef(null);
  const savedIconRef = useRef(null);
  const settingsIconRef = useRef(null);
  const newPostIconRef = useRef(null);

  // Automatic animation when a new notification arrives or unread notifications exist
  const prevUnreadRef = useRef(unreadCount);
  const prevNotifLenRef = useRef(likeNotification?.length || 0);

  useEffect(() => {
    const prevCount = prevUnreadRef.current;
    const prevLen = prevNotifLenRef.current;
    const currCount = unreadCount || 0;
    const currLen = likeNotification?.length || 0;

    // Trigger animation when count increases or a new notification arrives
    if (currCount > prevCount || currLen > prevLen) {
      bellIconRef.current?.startAnimation?.();
    }

    prevUnreadRef.current = currCount;
    prevNotifLenRef.current = currLen;
  }, [unreadCount, likeNotification]);

  // Initial bell chime animation if user has unread notifications on mount
  useEffect(() => {
    if (unreadCount > 0) {
      const timer = setTimeout(() => {
        bellIconRef.current?.startAnimation?.();
      }, 700);
      return () => clearTimeout(timer);
    }
  }, []);

  // Automatic animation for Settings icon when profile is incomplete
  useEffect(() => {
    if (!profileComp.isComplete) {
      const initialTimer = setTimeout(() => {
        settingsIconRef.current?.startAnimation?.();
      }, 1200);

      const interval = setInterval(() => {
        settingsIconRef.current?.startAnimation?.();
      }, 16000);

      return () => {
        clearTimeout(initialTimer);
        clearInterval(interval);
      };
    }
  }, [profileComp.isComplete]);

  /* ---------- NOTIFICATIONS ---------- */
  const handleRemoveNotification = (notificationId) => {
    dispatch(dismissModalNotification(notificationId));
    axios
      .patch(
        apiUrl(`/api/v1/user/notifications/${notificationId}/dismiss-modal`),
        {},
        { withCredentials: true },
      )
      .catch(() => undefined);
  };

  const handleClearAllNotifications = () => {
    if (likeNotification.length === 0) return;
    dispatch(dismissAllModalNotifications());
    axios
      .patch(
        apiUrl("/api/v1/user/notifications/dismiss-modal-all"),
        {},
        { withCredentials: true },
      )
      .catch(() => undefined);
  };

  const handleNotificationsOpen = (isOpen) => {
    if (isOpen) {
      dispatch(markNotificationsRead());
      axios
        .get(apiUrl("/api/v1/user/notifications?source=modal"), {
          withCredentials: true,
        })
        .then((res) => {
          if (res.data?.success) {
            dispatch(
              setNotifications({
                notifications: res.data.notifications || [],
              }),
            );
          }
        })
        .catch(() => undefined);

      axios
        .patch(
          apiUrl("/api/v1/user/notifications/read"),
          {},
          { withCredentials: true },
        )
        .catch(() => undefined);
    }
  };

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

  /* ---------- NAV ITEMS ---------- */
  const navItems = [
    {
      kind: "home",
      icon: HouseIcon,
      iconRef: homeIconRef,
      text: "Home",
      path: "/",
      action: () => {
        dispatch(setSelectedPost(null));
        navigate("/");
      },
    },
    {
      kind: "explore",
      icon: SearchIcon,
      iconRef: exploreIconRef,
      text: "Explore",
      path: "/explore",
      isActiveOverride: () =>
        location.pathname === "/explore" || location.pathname === "/search",
      action: () => navigate("/explore"),
    },
    {
      kind: "chat",
      icon: MessageCircleIcon,
      iconRef: chatIconRef,
      text: "Messages",
      path: "/chat",
      action: () => navigate("/chat"),
    },
    {
      type: "notifications",
      kind: "notif",
      icon: BellRingIcon,
      iconRef: bellIconRef,
    },
    {
      kind: "saved",
      icon: BookmarkIcon,
      iconRef: savedIconRef,
      text: "Saved",
      isActiveOverride: () =>
        (location.pathname === `/profile/${user?.username}` ||
          location.pathname === `/profile/${user?._id}`) &&
        location.state?.tab === "saved",
      action: () =>
        navigate(`/profile/${user?.username || user?._id}`, {
          state: { tab: "saved" },
        }),
    },
    {
      kind: "settings",
      icon: SettingsIcon,
      iconRef: settingsIconRef,
      text: "Settings",
      path: "/settings",
      action: () => navigate("/settings"),
    },
  ];

  const checkActive = (item) =>
    item.isActiveOverride
      ? item.isActiveOverride()
      : !!item.path && location.pathname === item.path;

  const profileActive =
    (location.pathname === `/profile/${user?.username}` || location.pathname === `/profile/${user?._id}`) &&
    location.state?.tab !== "saved";

  const initial = getDisplayName(user, "U").charAt(0).toUpperCase();

  return (
    <>
      <aside
        className="
          nvs2-aside hidden md:flex flex-col
          fixed left-3 top-3 bottom-3 z-40 w-64
          rounded-3xl overflow-hidden
          bg-[var(--surface)]/72 backdrop-blur-2xl
          border border-[var(--border)]/60
          shadow-[0_24px_64px_-32px_rgba(0,0,0,.35),0_2px_8px_-2px_rgba(0,0,0,.06)]
        "
      >
        {/* aurora background */}
        <div className="nvs2-aurora" aria-hidden="true" />

        {/* ── LOGO ─────────────────────────────── */}
        <Link
          to="/"
          className="relative z-10 flex items-center justify-between px-5 h-16 shrink-0 group border-b border-[var(--border)]/40"
        >
          <div className="flex items-center gap-3">
            <span className="nvs2-logo-orb shrink-0">
              <img src="/logo.gif" alt="Nova" className="nvs2-logo-img" />
            </span>
            <span className="text-grad font-display text-[23px] font-bold tracking-[-.02em] leading-none">
              Nova
            </span>
          </div>
        </Link>

        {/* ── NAV (BALANCED VERTICAL DISTRIBUTION - NO CLIPPING) ──── */}
        <nav className="relative z-10 flex-1 flex flex-col justify-evenly px-3 py-2 min-h-0 select-none">
          {navItems.map((item, i) => {
            /* NOTIFICATIONS */
            if (item.type === "notifications") {
              return (
                <Popover key="notif" onOpenChange={handleNotificationsOpen}>
                  <PopoverTrigger asChild>
                    <button
                      data-kind="notif"
                      data-active={location.pathname === "/notifications"}
                      onMouseEnter={() => bellIconRef.current?.startAnimation?.()}
                      className="nvs2-nav-item group"
                    >
                      <span className="nvs2-nav-icon relative">
                        <BellRingIcon ref={bellIconRef} size={18} />
                        {unreadCount > 0 && (
                          <span className="absolute -top-1 -right-1 size-2 rounded-full bg-rose-500 ring-2 ring-[var(--surface)] animate-pulse" />
                        )}
                      </span>
                      <span className="nvs2-nav-label">Notifications</span>
                      {unreadCount > 0 && (
                        <span className="ml-auto px-2 py-0.5 rounded-full text-[10px] font-bold bg-pink-500/20 text-pink-400 border border-pink-500/30">
                          {unreadCount > 9 ? "9+" : unreadCount}
                        </span>
                      )}
                    </button>
                  </PopoverTrigger>

                  <PopoverContent
                    side="right"
                    align="start"
                    sideOffset={14}
                    className="
                      w-[340px] p-0 overflow-hidden
                      rounded-2xl
                      bg-[var(--surface)]/95 backdrop-blur-xl
                      border-[var(--border)]
                      shadow-[0_24px_64px_-16px_rgba(0,0,0,.28),0_8px_24px_-12px_var(--glow)]
                    "
                  >
                    {/* HEADER */}
                    <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--border)]">
                      <div>
                        <h3 className="font-display text-sm font-semibold text-[var(--foreground)]">
                          Notifications
                        </h3>
                        {likeNotification.length > 0 && (
                          <p className="text-[10px] mt-0.5 text-[var(--muted-foreground)]">
                            {likeNotification.length}{" "}
                            {likeNotification.length === 1
                              ? "notification"
                              : "notifications"}
                          </p>
                        )}
                      </div>
                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => navigate("/notifications")}
                          title="Open full Notification Center"
                          className="
                            inline-flex items-center gap-1
                            px-2.5 py-1.5 rounded-lg
                            text-[11px] font-semibold
                            text-primary bg-primary/10 hover:bg-primary/20
                            transition-colors duration-200 active:scale-[.95]
                            outline-none
                          "
                        >
                          <AnimatedIcon icon={ExternalLinkIcon} size={12} />
                          <span>Full View</span>
                        </button>
                        {likeNotification.length > 0 && (
                          <button
                            onClick={handleClearAllNotifications}
                            className="
                              inline-flex items-center gap-1.5
                              px-2.5 py-1.5 rounded-lg
                              text-[11px] font-medium
                              text-[var(--muted-foreground)]
                              hover:text-[var(--danger)] hover:bg-[var(--danger)]/8
                              transition-colors duration-200 active:scale-[.95]
                              outline-none
                            "
                          >
                            <AnimatedIcon icon={Trash2Icon} size={13} />
                            Clear all
                          </button>
                        )}
                      </div>
                    </div>

                    {/* LIST */}
                    <div className="max-h-96 overflow-y-auto">
                      {likeNotification.length === 0 ? (
                        <div className="py-12 flex flex-col items-center justify-center text-center">
                          <div className="size-12 rounded-full bg-[var(--surface-2)] flex items-center justify-center mb-3">
                            <BellRingIcon
                              size={20}
                              className="text-[var(--muted-foreground)]"
                            />
                          </div>
                          <p className="text-sm font-medium text-[var(--foreground)]">
                            All caught up
                          </p>
                          <p className="text-xs mt-1 text-[var(--muted-foreground)]">
                            No notifications yet
                          </p>
                        </div>
                      ) : (
                        likeNotification.map((n) => (
                          <div
                            key={n._id}
                            onClick={() => handleNotificationClick(n)}
                            className="
                              group/notif flex items-center gap-3
                              px-4 py-3 cursor-pointer
                              hover:bg-[var(--surface-2)]
                              transition-colors duration-200
                            "
                          >
                            <Avatar className="h-9 w-9 shrink-0">
                              <AvatarImage
                                src={n.userDetails?.profilePicture}
                              />
                              <AvatarFallback>
                                {getDisplayName(n.userDetails, "U")
                                  .charAt(0)
                                  .toUpperCase()}
                              </AvatarFallback>
                            </Avatar>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm text-[var(--foreground)] leading-snug">
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
                                text-[var(--muted-foreground)]
                                opacity-0 group-hover/notif:opacity-100
                                hover:text-[var(--danger)] hover:bg-[var(--danger)]/8
                                transition-all duration-200 active:scale-90
                                outline-none
                              "
                            >
                              <AnimatedIcon icon={XIcon} size={13} />
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
              );
            }

            /* REGULAR ITEMS */
            const Icon = item.icon;
            const isActive = checkActive(item);
            const isSettingsIncomplete = item.kind === "settings" && !profileComp.isComplete;

            return (
              <button
                key={i}
                data-kind={item.kind}
                data-active={isActive}
                onClick={item.action}
                onMouseEnter={() => item.iconRef?.current?.startAnimation?.()}
                className="nvs2-nav-item group"
              >
                <span className="nvs2-nav-icon relative">
                  <Icon
                    ref={item.iconRef}
                    size={18}
                  />
                  {isSettingsIncomplete && (
                    <span className="absolute -top-1 -right-1 size-2 rounded-full bg-rose-500 ring-2 ring-[var(--surface)] animate-pulse" />
                  )}
                </span>
                <span className="nvs2-nav-label flex-1">{item.text}</span>
              </button>
            );
          })}
        </nav>

        {/* ── BOTTOM: CREATE + PROFILE ────────── */}
        <div className="relative z-10 p-3 shrink-0 space-y-2 border-t border-[var(--border)]/50 bg-[var(--surface-2)]/30 backdrop-blur-md">
          <button
            onClick={() => setOpen(true)}
            onMouseEnter={() => newPostIconRef.current?.startAnimation?.()}
            className="
              w-full h-10 rounded-xl
              bg-grad-btn text-white
              text-xs sm:text-sm font-bold tracking-wide
              flex items-center justify-center gap-2
              shadow-[0_8px_20px_-6px_var(--glow-strong)]
              hover:-translate-y-[1px] hover:brightness-[1.08]
              active:scale-[.97]
              transition-all duration-200 ease-[cubic-bezier(.2,.8,.2,1)]
              border border-transparent
              outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)]/45
            "
          >
            <SquarePlusIcon ref={newPostIconRef} size={18} />
            New post
          </button>

          <button
            onClick={() => navigate(`/profile/${user?.username || user?._id}`)}
            data-active={profileActive}
            className="
              group w-full flex items-center gap-2.5
              px-2.5 py-1.5 rounded-xl
              transition-all duration-200
              hover:bg-[var(--surface-2)]/80
              data-[active=true]:bg-[var(--surface-2)]
              border border-transparent hover:border-[var(--border)]/60
              active:scale-[.98]
              outline-none cursor-pointer
            "
          >
            <span className="relative shrink-0 size-8">
              <Avatar className="size-8 ring-1 ring-white/10">
                <AvatarImage src={user?.profilePicture} />
                <AvatarFallback>{initial}</AvatarFallback>
              </Avatar>
              {user?.showLastSeen !== false && (
                <span className="absolute -bottom-0.5 -right-0.5 size-2.5 rounded-full bg-emerald-500 ring-2 ring-[var(--surface)]" />
              )}
            </span>
            <div className="flex-1 min-w-0 text-left">
              <p className="text-[13px] font-semibold text-[var(--foreground)] truncate leading-tight group-hover:text-primary transition-colors">
                {getDisplayName(user)}
              </p>
              <p className="text-[11px] text-[var(--muted-foreground)] truncate mt-0.5">
                {user?.username ? `@${user.username}` : "Set username"}
              </p>
            </div>
          </button>
        </div>
      </aside>

      <CreatePost open={open} setOpen={setOpen} />
    </>
  );
};

export default LeftSidebar;
