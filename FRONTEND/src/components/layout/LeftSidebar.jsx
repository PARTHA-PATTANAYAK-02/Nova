import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  Heart,
  Home,
  MessageCircle,
  PlusSquare,
  Bookmark,
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
  const expanded = true;

  /* ============================================================
     NOTIFICATIONS
  ============================================================ */

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

  const getNotificationText = (notification) =>
    notification.type === "comment"
      ? "commented on your post"
      : notification.type === "message"
        ? "sent you a message"
        : notification.type === "follow"
          ? "started following you"
          : "liked your post";

  const handleNotificationClick = (notification) => {
    if (notification.type === "message") {
      navigate("/chat", {
        state: { user: notification.userDetails },
      });
    } else if (notification.type === "comment") {
      navigate("/", {
        state: { notificationPostId: notification.postId },
      });
    } else {
      navigate("/");
    }
  };

  /* ============================================================
     NAV ITEMS
  ============================================================ */

  const navItems = [
    {
      icon: Home,
      text: "Home",
      path: "/",
      action: () => {
        dispatch(setSelectedPost(null));
        navigate("/");
      },
    },
    {
      icon: Search,
      text: "Search",
      path: "/search",
      action: () => navigate("/search"),
    },
    {
      icon: MessageCircle,
      text: "Messages",
      path: "/chat",
      action: () => navigate("/chat"),
    },
    { type: "notifications" },
    {
      icon: PlusSquare,
      text: "Create",
      action: () => setOpen(true),
    },
    {
      icon: Bookmark,
      text: "Saved",
      isActiveOverride: () =>
        location.pathname === `/profile/${user?._id}` &&
        location.state?.tab === "saved",
      action: () =>
        navigate(`/profile/${user?._id}`, {
          state: { tab: "saved" },
        }),
    },
  ];

  /* ============================================================
     CLASSES
  ============================================================ */

  const labelCls = `
    whitespace-nowrap text-[13px] font-medium
    transition-all duration-300
    ease-[cubic-bezier(0.22,1,0.36,1)]
    ${
      expanded
        ? "opacity-100 translate-x-0"
        : "opacity-0 -translate-x-2 pointer-events-none"
    }
  `;

  const sidebarItemCls = `
    group relative
    flex items-center gap-3
    rounded-xl px-3 py-2.5
    w-full
    transition-all duration-300
    ease-out
  `;

  /* ============================================================
     UI
  ============================================================ */

  return (
    <>
      <aside
        className={`
          hidden md:flex
          fixed left-3 top-3 bottom-3
          z-40
          flex-col
          bg-[var(--surface)]/95
          backdrop-blur-xl
          border border-[var(--border)]
          rounded-[20px]
          overflow-hidden
          shadow-[var(--shadow-lg)]

          transition-[width,box-shadow,transform]
          duration-500
          ease-[cubic-bezier(0.22,1,0.36,1)]

          ${
            expanded
              ? "w-[240px] shadow-[0_18px_55px_rgba(0,0,0,0.14)]"
              : "w-[68px]"
          }
        `}
      >
        {/* ======================================================
            LOGO
        ====================================================== */}

        <Link
          to="/"
          className="
            group
            flex items-center gap-3
            px-4 h-16 shrink-0
            border-b border-[var(--border)]
          "
        >
          <span
            className="
              shrink-0
              flex items-center justify-center
              w-8 h-8
              rounded-[10px]

              transition-all duration-500
              ease-[cubic-bezier(0.34,1.56,0.64,1)]

              group-hover:scale-110
              group-hover:rotate-3
            "
            style={{
              background: "var(--primary)",
              color: "var(--primary-foreground)",
              boxShadow: expanded
                ? "0 6px 20px color-mix(in srgb, var(--primary) 25%, transparent)"
                : "none",
            }}
          >
            {/*
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="
                transition-transform duration-500
                group-hover:scale-110
              "
            >
              <path d="M12 2L2 22h20L12 2z" />
            </svg>
            */}
            <img
              src="/logo.gif"
              alt="Nova"
              className="h-8 w-8 rounded-[10px] object-cover transition-transform duration-500 group-hover:scale-110"
            />
          </span>

          <span
            className={`
              font-bold text-xl
              text-[var(--foreground)]
              tracking-tight whitespace-nowrap

              transition-all duration-400
              ease-[cubic-bezier(0.22,1,0.36,1)]

              ${
                expanded
                  ? "opacity-100 translate-x-0"
                  : "opacity-0 -translate-x-3"
              }
            `}
            style={{ fontFamily: "var(--font-display)" }}
          >
            Nova
          </span>
        </Link>

        {/* ======================================================
            NAVIGATION
        ====================================================== */}

        <nav className="flex-1 flex flex-col gap-1 p-2.5 overflow-y-auto overflow-x-hidden">
          {navItems.map((item, i) => {
            /* ==================================================
               NOTIFICATIONS
            ================================================== */

            if (item.type === "notifications") {
              return (
                <Popover key="notif" onOpenChange={handleNotificationsOpen}>
                  <PopoverTrigger asChild>
                    <button
                      className={`
                        ${sidebarItemCls}
                        text-[var(--muted-foreground)]

                        hover:text-[var(--foreground)]
                        hover:bg-[var(--surface-2)]

                        hover:translate-x-0.5
                        active:scale-[0.98]
                      `}
                    >
                      {/* ICON */}

                      <div
                        className="
                          relative shrink-0
                          w-6 h-6
                          flex items-center justify-center
                        "
                      >
                        <Heart
                          className="
                            w-[22px] h-[22px]

                            transition-all duration-300
                            ease-[cubic-bezier(0.34,1.56,0.64,1)]

                            group-hover:scale-110
                            group-hover:-translate-y-0.5
                          "
                          strokeWidth={1.8}
                        />

                        {/* UNREAD BADGE */}

                        {unreadCount > 0 && (
                          <>
                            <span
                              className="
                                absolute
                                -top-0.5 -right-0.5
                                h-4 w-4
                                rounded-full
                                bg-[var(--accent)]
                                opacity-30
                                animate-ping
                              "
                            />

                            <span
                              className="
                                absolute
                                -top-0.5 -right-0.5

                                flex h-4 min-w-4
                                items-center justify-center

                                rounded-full
                                px-1

                                text-[9px]
                                font-bold

                                bg-[var(--accent)]
                                text-[var(--accent-foreground)]

                                border-2
                                border-[var(--surface)]

                                transition-transform
                                duration-300

                                group-hover:scale-110
                              "
                            >
                              {unreadCount > 9 ? "9+" : unreadCount}
                            </span>
                          </>
                        )}
                      </div>

                      <span className={labelCls}>Notifications</span>
                    </button>
                  </PopoverTrigger>

                  {/* =================================================
                      NOTIFICATION POPUP
                  ================================================= */}

                  <PopoverContent
                    side="right"
                    align="end"
                    sideOffset={12}
                    className="
                      w-[340px]
                      p-0
                      overflow-hidden

                      rounded-2xl

                      bg-[var(--surface)]/95
                      backdrop-blur-xl

                      border border-[var(--border)]

                      shadow-[0_20px_60px_rgba(0,0,0,0.18)]

                      animate-in
                      fade-in-0
                      zoom-in-95
                      slide-in-from-left-2
                      duration-200
                    "
                  >
                    {/* HEADER */}

                    <div
                      className="
                        flex items-center justify-between
                        px-4 py-3
                        border-b border-[var(--border)]
                      "
                    >
                      <div>
                        <h3
                          className="
                            text-sm font-semibold
                            text-[var(--foreground)]
                          "
                          style={{
                            fontFamily: "var(--font-display)",
                          }}
                        >
                          Notifications
                        </h3>

                        {likeNotification.length > 0 && (
                          <p
                            className="
                              text-[10px]
                              mt-0.5
                              text-[var(--muted-foreground)]
                            "
                          >
                            {likeNotification.length}{" "}
                            {likeNotification.length === 1
                              ? "notification"
                              : "notifications"}
                          </p>
                        )}
                      </div>

                      {/* CLEAR ALL */}

                      {likeNotification.length > 0 && (
                        <button
                          onClick={handleClearAllNotifications}
                          className="
                            group/clear

                            inline-flex
                            items-center gap-1.5

                            px-2.5 py-1.5
                            rounded-lg

                            text-[11px]
                            font-medium

                            text-[var(--muted-foreground)]

                            hover:text-[var(--danger)]
                            hover:bg-[var(--danger)]/8

                            active:scale-95

                            transition-all duration-200
                          "
                        >
                          <Trash2
                            className="
                              h-3.5 w-3.5

                              transition-all duration-200
                              group-hover/clear:scale-110
                              group-hover/clear:-rotate-6
                            "
                            strokeWidth={1.8}
                          />
                          Clear all
                        </button>
                      )}
                    </div>

                    {/* LIST */}

                    <div className="max-h-96 overflow-y-auto">
                      {likeNotification.length === 0 ? (
                        <div
                          className="
                            py-12
                            flex flex-col
                            items-center
                            justify-center
                            text-center

                            animate-in
                            fade-in-0
                            zoom-in-95
                            duration-300
                          "
                        >
                          <div
                            className="
                              w-11 h-11
                              rounded-full
                              flex items-center justify-center

                              bg-[var(--surface-2)]

                              mb-3

                              transition-transform
                              duration-500

                              hover:scale-110
                            "
                          >
                            <Heart
                              className="
                                h-5 w-5
                                text-[var(--muted-foreground)]
                              "
                              strokeWidth={1.6}
                            />
                          </div>

                          <p
                            className="
                              text-sm
                              font-medium
                              text-[var(--foreground)]
                            "
                          >
                            All caught up
                          </p>

                          <p
                            className="
                              text-xs
                              mt-1
                              text-[var(--muted-foreground)]
                            "
                          >
                            No notifications yet
                          </p>
                        </div>
                      ) : (
                        likeNotification.map((n, index) => (
                          <div
                            key={n._id}
                            onClick={() => handleNotificationClick(n)}
                            className="
                              group/notif

                              flex items-center gap-3

                              px-4 py-3

                              cursor-pointer

                              hover:bg-[var(--surface-2)]

                              transition-all duration-200

                              animate-in
                              fade-in-0
                              slide-in-from-left-1
                            "
                            style={{
                              animationDelay: `${index * 35}ms`,
                              animationFillMode: "both",
                            }}
                          >
                            {/* AVATAR */}

                            <Avatar
                              className="
                                h-9 w-9 shrink-0

                                transition-transform
                                duration-300

                                group-hover/notif:scale-105
                              "
                            >
                              <AvatarImage
                                src={n.userDetails?.profilePicture}
                              />

                              <AvatarFallback>
                                {getDisplayName(n.userDetails, "U")
                                  .charAt(0)
                                  .toUpperCase()}
                              </AvatarFallback>
                            </Avatar>

                            {/* TEXT */}

                            <div className="flex-1 min-w-0">
                              <p
                                className="
                                  text-sm
                                  text-[var(--foreground)]
                                  leading-snug
                                "
                              >
                                <span className="font-semibold">
                                  {getDisplayName(n.userDetails, "A user")}
                                </span>{" "}
                                <span className="text-[var(--muted-foreground)]">
                                  {getNotificationText(n)}
                                </span>
                              </p>
                            </div>

                            {/* REMOVE */}

                            <button
                              aria-label="Remove notification"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleRemoveNotification(n._id);
                              }}
                              className="
                                shrink-0

                                h-7 w-7
                                rounded-full

                                flex items-center justify-center

                                text-[var(--muted-foreground)]

                                opacity-0
                                scale-90

                                group-hover/notif:opacity-100
                                group-hover/notif:scale-100

                                hover:text-[var(--danger)]
                                hover:bg-[var(--danger)]/8

                                active:scale-75

                                transition-all duration-200
                              "
                            >
                              <X className="h-3.5 w-3.5" strokeWidth={2} />
                            </button>
                          </div>
                        ))
                      )}
                    </div>
                  </PopoverContent>
                </Popover>
              );
            }

            /* ==================================================
               REGULAR ITEMS
            ================================================== */

            const Icon = item.icon;

            const isActive = item.isActiveOverride
              ? item.isActiveOverride()
              : item.path && location.pathname === item.path;

            return (
              <button
                key={i}
                onClick={item.action}
                style={{
                  transitionDelay: expanded ? `${i * 20}ms` : "0ms",
                }}
                className={`
                  ${sidebarItemCls}

                  ${
                    isActive
                      ? "bg-[var(--surface-2)] text-[var(--foreground)]"
                      : "text-[var(--muted-foreground)] hover:text-[var(--foreground)] hover:bg-[var(--surface-2)]"
                  }

                  ${isActive ? "shadow-[inset_0_0_0_1px_var(--border)]" : ""}
                `}
              >
                {/* ACTIVE INDICATOR */}

                <span
                  className={`
                    absolute
                    left-0
                    top-1/2
                    -translate-y-1/2

                    w-[3px]
                    rounded-r-full

                    bg-[var(--primary)]

                    transition-all duration-300
                    ease-[cubic-bezier(0.34,1.56,0.64,1)]

                    ${
                      isActive
                        ? "h-5 opacity-100 scale-y-100"
                        : "h-0 opacity-0 scale-y-0"
                    }
                  `}
                />

                {/* ICON */}

                <div
                  className="
                    relative
                    shrink-0
                    w-6 h-6
                    flex items-center justify-center
                  "
                >
                  <Icon
                    className={`
                      w-[22px] h-[22px]

                      transition-all duration-300
                      ease-[cubic-bezier(0.34,1.56,0.64,1)]

                      group-hover:scale-110
                      group-hover:-translate-y-0.5

                      ${isActive ? "scale-105" : ""}
                    `}
                    strokeWidth={isActive ? 2 : 1.8}
                  />
                </div>

                {/* LABEL */}

                <span className={labelCls}>{item.text}</span>
              </button>
            );
          })}
        </nav>

        {/* PROFILE */}

        <div
          className="
            shrink-0
            p-2.5
            border-t border-[var(--border)]
          "
        >
          {/* PROFILE */}

          <button
            onClick={() => navigate(`/profile/${user?._id}`)}
            className={`
              ${sidebarItemCls}

              ${
                location.pathname === `/profile/${user?._id}` &&
                location.state?.tab !== "saved"
                  ? "bg-[var(--surface-2)] text-[var(--foreground)]"
                  : "text-[var(--muted-foreground)] hover:text-[var(--foreground)] hover:bg-[var(--surface-2)]"
              }

              hover:translate-x-0.5
              active:scale-[0.98]
            `}
          >
            <span className="relative shrink-0">
              <Avatar
                className="
                  w-6 h-6

                  transition-all duration-300

                  group-hover:scale-110
                "
              >
                <AvatarImage src={user?.profilePicture} />

                <AvatarFallback>
                  {getDisplayName(user, "U").charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              {!user?.username && (
                <span
                  title="Set your username"
                  className="absolute -right-0.5 -top-0.5 h-2 w-2 rounded-full bg-[var(--danger)] ring-2 ring-[var(--surface)]"
                />
              )}
            </span>

            <span className={`${labelCls} relative`}>Profile</span>
          </button>
        </div>
      </aside>

      {/* ========================================================
          CREATE POST
      ======================================================== */}

      <CreatePost open={open} setOpen={setOpen} />
    </>
  );
};

export default LeftSidebar;
