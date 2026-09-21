import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  Heart,
  Home,
  LogOut,
  MessageCircle,
  PlusSquare,
  Bookmark,
  Search,
  X,
  Sparkles,
} from "lucide-react";
import React, { useState } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import { toast } from "sonner";
import axios from "axios";
import { useDispatch, useSelector } from "react-redux";
import { setAuthUser } from "@/redux/authSlice";
import CreatePost from "./CreatePost";
import { setPosts, setSelectedPost } from "@/redux/postSlice";
import { Popover, PopoverContent, PopoverTrigger } from "./ui/popover";
import {
  clearNotifications,
  markNotificationsRead,
  removeNotification,
} from "@/redux/rtnSlice";
import { apiUrl } from "@/lib/api";

const LeftSidebar = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useSelector((store) => store.auth);
  const { likeNotification, unreadCount } = useSelector(
    (store) => store.realTimeNotification,
  );
  const dispatch = useDispatch();
  const [open, setOpen] = useState(false);
  const [expanded, setExpanded] = useState(false);

  /* ---------- LOGIC (UNCHANGED) ---------- */
  const logoutHandler = async () => {
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
        error.response?.data?.message || "Unable to log out. Please try again.",
      );
    }
  };

  const handleRemoveNotification = (notificationId) => {
    dispatch(removeNotification(notificationId));
    axios
      .delete(apiUrl(`/api/v1/user/notifications/${notificationId}`), {
        withCredentials: true,
      })
      .catch(() => undefined);
  };

  const handleClearAllNotifications = () => {
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
      navigate("/chat", { state: { user: notification.userDetails } });
    } else if (notification.type === "comment") {
      navigate("/", {
        state: { notificationPostId: notification.postId },
      });
    } else {
      navigate("/");
    }
  };

  /* ---------- NAV ITEMS ---------- */
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
      text: "Discover",
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
      path: `/profile/${user?._id}`,
      action: () =>
        navigate(`/profile/${user?._id}`, { state: { tab: "saved" } }),
    },
    { type: "profile" },
  ];

  const labelCls = `font-medium whitespace-nowrap text-sm transition-all duration-300 ${
    expanded
      ? "opacity-100 translate-x-0"
      : "opacity-0 -translate-x-4 pointer-events-none"
  }`;

  return (
    <aside
      onMouseEnter={() => setExpanded(true)}
      onMouseLeave={() => setExpanded(false)}
      className={`
        hidden md:flex fixed left-4 top-4 bottom-4 z-40 flex-col
        glass-strong rounded-[28px] overflow-hidden
        shadow-[0_8px_40px_rgba(0,0,0,0.45)]
        transition-[width] duration-500 ease-[cubic-bezier(0.22,1,0.36,1)]
        ${expanded ? "w-[248px]" : "w-[80px]"}
      `}
    >
      {/* ---------- LOGO ---------- */}
      <Link to="/" className="flex items-center gap-3 px-4 pt-5 pb-4 shrink-0">
        <div className="relative w-12 h-12 shrink-0 flex items-center justify-center">
          <div className="w-11 h-11 rounded-full bg-gradient-to-br from-violet-500 via-fuchsia-500 to-cyan-400 flex items-center justify-center glow-primary">
            <Sparkles className="w-5 h-5 text-white" />
          </div>
          <span className="absolute inset-0 rounded-full bg-violet-500/25 animate-glow-pulse pointer-events-none" />
        </div>
        <h1
          className={`font-display font-bold text-2xl text-gradient whitespace-nowrap transition-all duration-300 ${
            expanded
              ? "opacity-100 translate-x-0"
              : "opacity-0 -translate-x-3 pointer-events-none"
          }`}
        >
          Nova
        </h1>
      </Link>

      {/* ---------- NAV ---------- */}
      <nav className="flex-1 flex flex-col gap-1 px-2.5 py-2 overflow-y-auto overflow-x-hidden">
        {navItems.map((item, i) => {
          /* --- NOTIFICATIONS --- */
          if (item.type === "notifications") {
            return (
              <Popover key="notif" onOpenChange={handleNotificationsOpen}>
                <PopoverTrigger asChild>
                  <button className="group relative flex items-center gap-4 rounded-2xl px-3.5 py-3 text-white/60 hover:text-white hover:bg-white/5 transition-all duration-300 w-full">
                    <div className="relative shrink-0 w-6 h-6 flex items-center justify-center">
                      <Heart className="w-5 h-5" />
                      {unreadCount > 0 && (
                        <span className="absolute -top-1.5 -right-2 flex h-4 min-w-4 items-center justify-center rounded-full bg-gradient-to-br from-rose-500 to-fuchsia-500 px-1 text-[9px] font-bold text-white shadow-lg shadow-rose-500/50">
                          {unreadCount > 9 ? "9+" : unreadCount}
                        </span>
                      )}
                    </div>
                    <span className={labelCls}>Notifications</span>
                  </button>
                </PopoverTrigger>

                <PopoverContent
                  side="right"
                  align="end"
                  sideOffset={14}
                  className="w-80 p-0 glass-strong !rounded-3xl !border-white/10 overflow-hidden"
                >
                  <div className="flex items-center justify-between px-4 py-3 border-b border-white/5">
                    <h3 className="font-display font-semibold text-sm text-white">
                      Notifications
                    </h3>
                    {likeNotification.length > 0 && (
                      <button
                        onClick={handleClearAllNotifications}
                        className="text-xs text-white/40 hover:text-white transition-colors"
                      >
                        Clear all
                      </button>
                    )}
                  </div>

                  <div className="max-h-96 overflow-y-auto">
                    {likeNotification.length === 0 ? (
                      <div className="py-10 text-center">
                        <p className="text-sm text-white/40">
                          No notifications yet
                        </p>
                      </div>
                    ) : (
                      likeNotification.map((n) => (
                        <div
                          key={n._id}
                          onClick={() => handleNotificationClick(n)}
                          className="group flex items-start gap-3 px-4 py-3 hover:bg-white/5 transition-colors cursor-pointer relative"
                        >
                          <Avatar className="h-9 w-9 shrink-0 ring-2 ring-white/10">
                            <AvatarImage src={n.userDetails?.profilePicture} />
                            <AvatarFallback className="text-xs bg-gradient-to-br from-violet-500 to-cyan-500 text-white">
                              {(
                                n.userDetails?.fullName ||
                                n.userDetails?.username
                              )
                                ?.charAt(0)
                                .toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm text-white/90 leading-snug">
                              <span className="font-semibold">
                                {n.userDetails?.username}
                              </span>{" "}
                              <span className="text-white/60">
                                {getNotificationText(n)}
                              </span>
                            </p>
                          </div>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleRemoveNotification(n._id);
                            }}
                            className="opacity-0 group-hover:opacity-100 text-white/40 hover:text-white transition-all shrink-0"
                          >
                            <X className="h-4 w-4" />
                          </button>
                        </div>
                      ))
                    )}
                  </div>
                </PopoverContent>
              </Popover>
            );
          }

          /* --- PROFILE --- */
          if (item.type === "profile") {
            const isActive = location.pathname === `/profile/${user?._id}`;
            return (
              <button
                key="profile"
                onClick={() => navigate(`/profile/${user?._id}`)}
                className={`group relative flex items-center gap-4 rounded-2xl px-3 py-2.5 transition-all duration-300 w-full ${
                  isActive
                    ? "bg-white/8 text-white"
                    : "text-white/60 hover:text-white hover:bg-white/5"
                }`}
              >
                <Avatar className="w-7 h-7 shrink-0 ring-2 ring-white/15">
                  <AvatarImage src={user?.profilePicture} />
                  <AvatarFallback className="text-[10px] bg-gradient-to-br from-violet-500 to-cyan-500 text-white">
                    {user?.username?.charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <span className={labelCls}>Profile</span>
              </button>
            );
          }

          /* --- REGULAR ITEMS --- */
          const Icon = item.icon;
          const isActive = item.path && location.pathname === item.path;
          return (
            <button
              key={i}
              onClick={item.action}
              className={`group relative flex items-center gap-4 rounded-2xl px-3.5 py-3 transition-all duration-300 w-full ${
                isActive
                  ? "text-white bg-white/8"
                  : "text-white/60 hover:text-white hover:bg-white/5"
              }`}
            >
              {isActive && (
                <span className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 rounded-r-full bg-gradient-to-b from-violet-400 to-cyan-400 glow-primary" />
              )}
              <div className="relative shrink-0 w-6 h-6 flex items-center justify-center">
                <Icon className="w-5 h-5" />
              </div>
              <span className={labelCls}>{item.text}</span>
            </button>
          );
        })}
      </nav>

      {/* ---------- BOTTOM ---------- */}
      <div className="shrink-0 p-2.5 space-y-1 border-t border-white/5">
        <button
          onClick={logoutHandler}
          className="group flex items-center gap-4 w-full rounded-2xl px-3.5 py-3 text-white/60 hover:text-rose-300 hover:bg-rose-500/10 transition-all duration-300"
        >
          <LogOut className="w-5 h-5 shrink-0" />
          <span className={labelCls}>Logout</span>
        </button>
      </div>

      <CreatePost open={open} setOpen={setOpen} />
    </aside>
  );
};

export default LeftSidebar;
