import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  Heart,
  Home,
  MessageCircle,
  PlusSquare,
  Bookmark,
  Compass,
  Search,
  X,
  Trash2,
} from "lucide-react";
import React, { useState } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import axios from "axios";
import { useDispatch, useSelector } from "react-redux";
import CreatePost from "@/components/feed/CreatePost";
import { setSelectedPost } from "@/redux/postSlice";
import {
  clearNotifications,
  markNotificationsRead,
  removeNotification,
} from "@/redux/rtnSlice";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { apiUrl } from "@/lib/api";
import { getDisplayName } from "@/lib/utils";

const LeftSidebar = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useSelector((store) => store.auth);
  const { likeNotification, unreadCount } = useSelector(
    (store) => store.realTimeNotification,
  );
  const dispatch = useDispatch();
  const [open, setOpen] = useState(false);

  /* ---------- NOTIFICATIONS ---------- */
  const handleRemoveNotification = (notificationId) => {
    dispatch(removeNotification(notificationId));
    axios
      .delete(apiUrl(`/api/v1/user/notifications/${notificationId}`), {
        withCredentials: true,
      })
      .catch(() => undefined);
  };

  const handleClearAllNotifications = () => {
    if (likeNotification.length === 0) return;
    dispatch(clearNotifications());
    axios
      .delete(apiUrl("/api/v1/user/notifications/clear"), {
        withCredentials: true,
      })
      .catch(() => undefined);
  };

  const handleNotificationsOpen = (isOpen) => {
    if (isOpen) {
      dispatch(markNotificationsRead());
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
      icon: Home,
      text: "Home",
      path: "/",
      action: () => {
        dispatch(setSelectedPost(null));
        navigate("/");
      },
    },
    {
      kind: "explore",
      icon: Compass,
      text: "Explore",
      path: "/explore",
      isActiveOverride: () =>
        location.pathname === "/explore" || location.pathname === "/search",
      action: () => navigate("/explore"),
    },
    {
      kind: "chat",
      icon: MessageCircle,
      text: "Messages",
      path: "/chat",
      action: () => navigate("/chat"),
    },
    { type: "notifications", kind: "notif" },
    {
      kind: "saved",
      icon: Bookmark,
      text: "Saved",
      isActiveOverride: () =>
        (location.pathname === `/profile/${user?.username}` || location.pathname === `/profile/${user?._id}`) &&
        location.state?.tab === "saved",
      action: () =>
        navigate(`/profile/${user?.username || user?._id}`, { state: { tab: "saved" } }),
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
          className="relative z-10 flex items-center gap-3 px-5 h-20 shrink-0 group"
        >
          <span className="nvs2-logo-orb shrink-0">
            <span className="nvs2-logo-halo" aria-hidden="true" />
            <img src="/logo.gif" alt="Nova" className="nvs2-logo-img" />
          </span>
          <span className="text-grad font-display text-[26px] font-semibold tracking-[-.02em] leading-none">
            Nova
          </span>
        </Link>

        {/* ── NAV ──────────────────────────────── */}
        <nav className="relative z-10 flex-1 min-h-0 flex flex-col gap-1 px-3 py-2 overflow-y-auto scroll-hide">
          {navItems.map((item, i) => {
            /* NOTIFICATIONS */
            if (item.type === "notifications") {
              return (
                <Popover key="notif" onOpenChange={handleNotificationsOpen}>
                  <PopoverTrigger asChild>
                    <button
                      data-kind="notif"
                      data-active={location.pathname === "/notifications"}
                      className="nvs2-nav-item group"
                    >
                      <span className="nvs2-nav-icon">
                        <Heart className="size-[18px]" strokeWidth={1.8} />
                        {unreadCount > 0 && (
                          <>
                            <span className="nvs2-nav-ping" aria-hidden />
                            <span className="nvs2-nav-badge">
                              {unreadCount > 9 ? "9+" : unreadCount}
                            </span>
                          </>
                        )}
                      </span>
                      <span className="nvs2-nav-label">Notifications</span>
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
                          <Trash2 className="h-3.5 w-3.5" strokeWidth={1.8} />
                          Clear all
                        </button>
                      )}
                    </div>

                    {/* LIST */}
                    <div className="max-h-96 overflow-y-auto">
                      {likeNotification.length === 0 ? (
                        <div className="py-12 flex flex-col items-center justify-center text-center">
                          <div className="size-12 rounded-full bg-[var(--surface-2)] flex items-center justify-center mb-3">
                            <Heart
                              className="h-5 w-5 text-[var(--muted-foreground)]"
                              strokeWidth={1.6}
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
              );
            }

            /* REGULAR ITEMS */
            const Icon = item.icon;
            const isActive = checkActive(item);

            return (
              <button
                key={i}
                data-kind={item.kind}
                data-active={isActive}
                onClick={item.action}
                className="nvs2-nav-item group"
              >
                <span className="nvs2-nav-icon">
                  <Icon
                    className="size-[18px]"
                    strokeWidth={isActive ? 2.2 : 1.8}
                  />
                </span>
                <span className="nvs2-nav-label">{item.text}</span>
              </button>
            );
          })}
        </nav>

        {/* ── BOTTOM: CREATE + PROFILE ────────── */}
        <div className="relative z-10 p-3 space-y-2 border-t border-[var(--border)]/60">
          <button
            onClick={() => setOpen(true)}
            className="
              w-full h-11 rounded-2xl
              bg-grad-btn text-white
              text-sm font-semibold
              flex items-center justify-center gap-2
              shadow-[0_8px_20px_-8px_var(--glow-strong)]
              hover:-translate-y-[2px] hover:brightness-[1.06]
              hover:shadow-[0_14px_32px_-12px_var(--glow-strong)]
              active:scale-[.97]
              transition-all duration-250 ease-[cubic-bezier(.2,.8,.2,1)]
              outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)]/45
              focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--background)]
            "
          >
            <PlusSquare className="size-4" strokeWidth={2.2} />
            New post
          </button>

          <button
            onClick={() => navigate(`/profile/${user?.username || user?._id}`)}
            data-active={profileActive}
            className="
              group w-full flex items-center gap-3
              px-2 py-2 rounded-2xl
              transition-all duration-200
              hover:bg-[var(--surface-2)]/70
              data-[active=true]:bg-[var(--surface-2)]
              active:scale-[.98]
              outline-none
            "
          >
            <span className="relative shrink-0 size-9">
              <Avatar className="size-9">
                <AvatarImage src={user?.profilePicture} />
                <AvatarFallback>{initial}</AvatarFallback>
              </Avatar>
              {!user?.username && (
                <span className="absolute -right-0.5 -top-0.5 size-2.5 rounded-full bg-[var(--danger)] border-2 border-[var(--background)]" />
              )}
            </span>
            <div className="flex-1 min-w-0 text-left">
              <p className="text-[13px] font-semibold text-[var(--foreground)] truncate leading-tight">
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
