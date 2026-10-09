import React, { useEffect, useState } from "react";
import {
  Heart,
  Home,
  MessageCircle,
  PlusSquare,
  LogOut,
  Search,
  X,
  User,
  Trash2,
} from "lucide-react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useSelector, useDispatch } from "react-redux";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import CreatePost from "@/components/feed/CreatePost";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { toast } from "sonner";
import axios from "axios";
import { setAuthUser } from "@/redux/authSlice";
import { setPosts, setSelectedPost } from "@/redux/postSlice";
import {
  markNotificationsRead,
  removeNotification,
  clearNotifications,
} from "@/redux/rtnSlice";
import { getDisplayName, getErrorMessage } from "@/lib/utils";
import { apiUrl } from "@/lib/api";

const MobileBottomNav = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch();

  const { user } = useSelector((store) => store.auth);
  const { likeNotification, unreadCount } = useSelector(
    (store) => store.realTimeNotification,
  );

  const location = useLocation();

  const [open, setOpen] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);

  const [profileMenuMounted, setProfileMenuMounted] = useState(false);

  /* ---------- PROFILE MENU ANIMATION ---------- */

  useEffect(() => {
    if (showProfileMenu) {
      requestAnimationFrame(() => {
        setProfileMenuMounted(true);
      });
    } else {
      setProfileMenuMounted(false);
    }
  }, [showProfileMenu]);

  /* ---------- NOTIFICATION TEXT ---------- */

  const getNotificationText = (notification) =>
    notification.type === "comment"
      ? "commented on your post"
      : notification.type === "message"
        ? "sent you a message"
        : notification.type === "follow"
          ? "started following you"
          : "liked your post";

  /* ---------- NOTIFICATION CLICK ---------- */

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

  /* ---------- REMOVE ONE NOTIFICATION ---------- */

  const handleRemoveNotification = (notificationId) => {
    dispatch(removeNotification(notificationId));

    axios
      .delete(apiUrl(`/api/v1/user/notifications/${notificationId}`), {
        withCredentials: true,
      })
      .catch(() => undefined);
  };

  /* ---------- CLEAR ALL NOTIFICATIONS ---------- */

  const handleClearAllNotifications = () => {
    if (likeNotification.length === 0) return;

    dispatch(clearNotifications());

    axios
      .delete(apiUrl("/api/v1/user/notifications/clear"), {
        withCredentials: true,
      })
      .catch(() => undefined);
  };

  /* ---------- NOTIFICATION OPEN ---------- */

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

  /* ---------- LOGOUT ---------- */

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
      toast.error(
        getErrorMessage(error, "Unable to log out. Please try again."),
      );
    }
  };

  /* ---------- ACTIVE ---------- */

  const isActive = (path) => location.pathname === path;

  /* ---------- NAV ITEM ---------- */

  const itemCls = (active) =>
    `
      relative flex-1 flex items-center justify-center
      py-2.5 rounded-xl
      transition-all duration-300 ease-out
      active:scale-90
      ${active ? "text-[var(--primary)]" : "text-[var(--muted-foreground)]"}
    `;

  return (
    <>
      {/* =========================================================
          MOBILE BOTTOM NAV
      ========================================================= */}

      <nav
        className="
          md:hidden fixed bottom-3 left-3 right-3 z-50
          bg-[var(--surface)]/95 backdrop-blur-xl
          border border-[var(--border)]
          rounded-[22px]
          shadow-[0_12px_40px_rgba(0,0,0,0.16)]
          px-2 py-1.5
          transition-all duration-300
        "
      >
        <div className="flex items-center justify-between gap-1">
          {/* HOME */}

          <Link
            to="/"
            onClick={() => dispatch(setSelectedPost(null))}
            className={itemCls(isActive("/"))}
          >
            {isActive("/") && (
              <span
                className="
                  absolute inset-x-2 inset-y-1
                  rounded-xl
                  bg-[var(--primary)]/10
                  scale-100
                  transition-transform duration-300
                "
              />
            )}

            <Home
              className={`
                relative z-10 h-5 w-5
                transition-all duration-300
                ${isActive("/") ? "scale-110 -translate-y-0.5" : ""}
              `}
              strokeWidth={isActive("/") ? 2.2 : 1.8}
            />
          </Link>

          {/* SEARCH */}

          <Link to="/search" className={itemCls(isActive("/search"))}>
            {isActive("/search") && (
              <span
                className="
                  absolute inset-x-2 inset-y-1
                  rounded-xl
                  bg-[var(--primary)]/10
                "
              />
            )}

            <Search
              className={`
                relative z-10 h-5 w-5
                transition-all duration-300
                ${isActive("/search") ? "scale-110 -translate-y-0.5" : ""}
              `}
              strokeWidth={isActive("/search") ? 2.2 : 1.8}
            />
          </Link>

          {/* CREATE */}

          <button
            onClick={() => setOpen(true)}
            aria-label="Create post"
            className="
              relative
              w-11 h-11
              rounded-full
              flex items-center justify-center
              shrink-0
              text-[var(--primary-foreground)]
              active:scale-90
              transition-all duration-300
              hover:scale-105
            "
            style={{
              background: "var(--primary)",
              boxShadow:
                "0 6px 18px color-mix(in srgb, var(--primary) 35%, transparent)",
            }}
          >
            {/* outer glow */}

            <span
              className="
                absolute inset-0
                rounded-full
                bg-[var(--primary)]
                opacity-20
                blur-md
                scale-110
              "
            />

            <PlusSquare
              className="
                relative z-10
                h-5 w-5
                transition-transform duration-300
                hover:rotate-90
              "
              strokeWidth={2}
            />
          </button>

          {/* CHAT */}

          <Link to="/chat" className={itemCls(isActive("/chat"))}>
            {isActive("/chat") && (
              <span
                className="
                  absolute inset-x-2 inset-y-1
                  rounded-xl
                  bg-[var(--primary)]/10
                "
              />
            )}

            <MessageCircle
              className={`
                relative z-10 h-5 w-5
                transition-all duration-300
                ${isActive("/chat") ? "scale-110 -translate-y-0.5" : ""}
              `}
              strokeWidth={isActive("/chat") ? 2.2 : 1.8}
            />
          </Link>

          {/* =====================================================
              NOTIFICATIONS
          ===================================================== */}

          <Popover onOpenChange={handleNotificationsOpen}>
            <PopoverTrigger asChild>
              <button
                aria-label="Notifications"
                className="
                  relative
                  flex-1 flex items-center justify-center
                  py-2.5 rounded-xl
                  text-[var(--muted-foreground)]
                  hover:text-[var(--foreground)]
                  active:scale-90
                  transition-all duration-300
                "
              >
                <div className="relative">
                  <Heart
                    className={`
                      h-5 w-5
                      transition-all duration-300
                      ${unreadCount > 0 ? "scale-105" : ""}
                    `}
                    strokeWidth={1.8}
                  />

                  {/* notification pulse */}

                  {unreadCount > 0 && (
                    <>
                      <span
                        className="
                          absolute -top-1 -right-1
                          h-3.5 w-3.5
                          rounded-full
                          bg-[var(--accent)]
                          opacity-30
                          animate-ping
                        "
                      />

                      <span
                        className="
                          absolute -top-1 -right-1
                          flex h-3.5 min-w-3.5
                          items-center justify-center
                          rounded-full
                          px-1
                          text-[8px]
                          font-bold
                          bg-[var(--accent)]
                          text-[var(--accent-foreground)]
                          border-2 border-[var(--surface)]
                          animate-[bounce_1.8s_ease-in-out_infinite]
                        "
                      >
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
              sideOffset={12}
              className="
                w-[calc(100vw-24px)]
                max-w-[380px]
                p-0
                mb-1
                overflow-hidden
                rounded-2xl
                border-[var(--border)]
                bg-[var(--surface)]/95
                backdrop-blur-xl
                shadow-[0_20px_60px_rgba(0,0,0,0.18)]
                animate-in
                fade-in-0
                zoom-in-95
                slide-in-from-bottom-2
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
                    <p className="text-[10px] mt-0.5 text-[var(--muted-foreground)]">
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
                      group
                      inline-flex items-center gap-1.5
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
                        transition-transform duration-200
                        group-hover:scale-110
                      "
                      strokeWidth={1.8}
                    />
                    Clear all
                  </button>
                )}
              </div>

              {/* NOTIFICATION LIST */}

              <div className="max-h-[55vh] overflow-y-auto">
                {likeNotification.length === 0 ? (
                  <div
                    className="
                      py-10 px-5
                      flex flex-col items-center
                      text-center
                      animate-in
                      fade-in-0
                      duration-200
                    "
                  >
                    <div
                      className="
                        h-11 w-11
                        rounded-full
                        bg-[var(--surface-2)]
                        flex items-center justify-center
                        mb-3
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
                        group
                        flex items-center gap-3
                        px-4 py-3
                        cursor-pointer
                        hover:bg-[var(--surface-2)]
                        active:bg-[var(--surface-2)]
                        transition-all duration-200
                        animate-in
                        fade-in-0
                        slide-in-from-bottom-1
                      "
                      style={{
                        animationDelay: `${index * 35}ms`,
                      }}
                    >
                      {/* AVATAR */}

                      <Avatar className="h-9 w-9 shrink-0">
                        <AvatarImage src={n.userDetails?.profilePicture} />

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
                            text-xs
                            text-[var(--foreground)]
                            leading-relaxed
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
                          group-hover:opacity-100
                          hover:text-[var(--danger)]
                          hover:bg-[var(--danger)]/8
                          active:scale-90
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

          {/* =====================================================
              PROFILE
          ===================================================== */}

          <button
            onClick={() => setShowProfileMenu((current) => !current)}
            aria-label="Profile menu"
            className={`
              flex-1 flex items-center justify-center
              py-1.5 rounded-xl
              transition-all duration-300
              active:scale-90
              ${showProfileMenu ? "bg-[var(--surface-2)]" : ""}
            `}
          >
            <Avatar
              className={`
                h-7 w-7
                transition-all duration-300
                ${
                  showProfileMenu
                    ? "scale-110 ring-2 ring-[var(--primary)]/30"
                    : ""
                }
              `}
            >
              <AvatarImage src={user?.profilePicture} />

              <AvatarFallback>
                {getDisplayName(user, "U").charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
          </button>
        </div>
      </nav>

      {/* =========================================================
          PROFILE MENU BACKDROP
      ========================================================= */}

      {showProfileMenu && (
        <>
          <div
            className="
              md:hidden
              fixed inset-0 z-40
              bg-black/10
              backdrop-blur-[2px]
              transition-opacity duration-300
            "
            onClick={() => setShowProfileMenu(false)}
          />

          {/* =====================================================
              PROFILE FLOATING MENU
          ===================================================== */}

          <div
            className={`
              md:hidden
              fixed
              bottom-[78px]
              right-3
              z-50
              w-[210px]
              overflow-hidden
              rounded-[20px]
              border border-[var(--border)]
              bg-[var(--surface)]/95
              backdrop-blur-xl
              shadow-[0_20px_60px_rgba(0,0,0,0.22)]
              origin-bottom-right
              transition-all duration-300
              ease-[cubic-bezier(0.34,1.56,0.64,1)]
              ${
                profileMenuMounted
                  ? "opacity-100 scale-100 translate-y-0"
                  : "opacity-0 scale-90 translate-y-3"
              }
            `}
          >
            {/* USER HEADER */}

            <div
              className="
                px-4 py-3.5
                border-b border-[var(--border)]
              "
            >
              <div className="flex items-center gap-3">
                <Avatar className="h-10 w-10 shrink-0">
                  <AvatarImage src={user?.profilePicture} />

                  <AvatarFallback>
                    {getDisplayName(user, "U").charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>

                <div className="min-w-0">
                  <p className="text-sm font-semibold text-[var(--foreground)] truncate">
                    {getDisplayName(user)}
                  </p>
                </div>
              </div>
            </div>

            {/* PROFILE */}

            <button
              onClick={() => {
                navigate(`/profile/${user?._id}`);
                setShowProfileMenu(false);
              }}
              className="
                group
                w-full
                flex items-center gap-3
                px-4 py-3
                text-sm
                text-[var(--foreground)]
                hover:bg-[var(--surface-2)]
                transition-all duration-200
              "
            >
              <span
                className="
                  h-8 w-8
                  rounded-lg
                  flex items-center justify-center
                  bg-[var(--surface-2)]
                  group-hover:bg-[var(--primary)]/10
                  transition-colors duration-200
                "
              >
                <User
                  className="
                    h-4 w-4
                    group-hover:scale-110
                    transition-transform duration-200
                  "
                  strokeWidth={1.8}
                />
              </span>

              <span className="flex-1 text-left font-medium">
                {user?.username ? "View profile" : "Complete your profile"}
              </span>
              {!user?.username && (
                <span className="h-2 w-2 rounded-full bg-[var(--danger)]" />
              )}
            </button>

            {/* LOGOUT */}

            <div className="border-t border-[var(--border)] p-1.5">
              <button
                onClick={() => {
                  setShowProfileMenu(false);
                  handleLogout();
                }}
                className="
                  group
                  w-full
                  flex items-center gap-3
                  px-3 py-2.5
                  rounded-xl
                  text-sm
                  text-[var(--danger)]
                  hover:bg-[var(--danger)]/8
                  transition-all duration-200
                  active:scale-[0.98]
                "
              >
                <span
                  className="
                    h-8 w-8
                    rounded-lg
                    flex items-center justify-center
                    bg-[var(--danger)]/8
                    group-hover:bg-[var(--danger)]/12
                    transition-colors duration-200
                  "
                >
                  <LogOut
                    className="
                      h-4 w-4
                      group-hover:translate-x-0.5
                      transition-transform duration-200
                    "
                    strokeWidth={1.8}
                  />
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

export default MobileBottomNav;
