import React from "react";
import {
  Heart,
  Home,
  MessageCircle,
  PlusSquare,
  LogOut,
  Search,
  X,
} from "lucide-react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useSelector, useDispatch } from "react-redux";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import CreatePost from "./CreatePost";
import { Popover, PopoverContent, PopoverTrigger } from "./ui/popover";
import { toast } from "sonner";
import axios from "axios";
import { setAuthUser } from "@/redux/authSlice";
import { setPosts, setSelectedPost } from "@/redux/postSlice";
import { markNotificationsRead, removeNotification } from "@/redux/rtnSlice";
import { getErrorMessage } from "@/lib/utils";
import { apiUrl } from "@/lib/api";

const MobileBottomNav = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { user } = useSelector((store) => store.auth);
  const { likeNotification, unreadCount } = useSelector(
    (store) => store.realTimeNotification,
  );
  const location = useLocation();
  const [open, setOpen] = React.useState(false);
  const [showProfileMenu, setShowProfileMenu] = React.useState(false);

  /* ---------- LOGIC (UNCHANGED) ---------- */
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

  const isActive = (path) => location.pathname === path;

  const itemCls = (active) =>
    `flex-1 flex items-center justify-center py-2 rounded-2xl transition-all duration-300 ${
      active ? "bg-white/10 text-white" : "text-white/50 hover:text-white/80"
    }`;

  return (
    <>
      {/* ---------- FLOATING DOCK ---------- */}
      <nav className="md:hidden fixed bottom-3 left-3 right-3 z-50 glass-strong rounded-[26px] shadow-[0_8px_40px_rgba(0,0,0,0.55)]">
        <div className="flex items-center justify-between px-2.5 py-2 gap-1">
          <Link
            to="/"
            onClick={() => dispatch(setSelectedPost(null))}
            className={itemCls(isActive("/"))}
          >
            <Home className="h-5 w-5" />
          </Link>

          <Link to="/search" className={itemCls(isActive("/search"))}>
            <Search className="h-5 w-5" />
          </Link>

          {/* Center create button */}
          <button
            onClick={() => setOpen(true)}
            className="w-12 h-12 rounded-full bg-gradient-to-br from-violet-500 via-fuchsia-500 to-cyan-400 flex items-center justify-center glow-primary shrink-0 hover:scale-105 active:scale-95 transition-transform"
          >
            <PlusSquare className="h-5 w-5 text-white" />
          </button>

          <Link to="/chat" className={itemCls(isActive("/chat"))}>
            <MessageCircle className="h-5 w-5" />
          </Link>

          {/* Notifications */}
          <Popover
            onOpenChange={(isOpen) => {
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
            }}
          >
            <PopoverTrigger asChild>
              <button className="flex-1 flex items-center justify-center py-2 rounded-2xl text-white/50 hover:text-white/80 transition-colors relative">
                <div className="relative">
                  <Heart className="h-5 w-5" />
                  {unreadCount > 0 && (
                    <span className="absolute -top-1.5 -right-2 flex h-4 min-w-4 items-center justify-center rounded-full bg-gradient-to-br from-rose-500 to-fuchsia-500 px-1 text-[9px] font-bold text-white shadow-lg shadow-rose-500/50">
                      {unreadCount > 9 ? "9+" : unreadCount}
                    </span>
                  )}
                </div>
              </button>
            </PopoverTrigger>

            <PopoverContent
              side="top"
              align="center"
              sideOffset={14}
              className="w-72 p-0 glass-strong !rounded-3xl !border-white/10 overflow-hidden mb-1"
            >
              <div className="flex items-center justify-between px-4 py-3 border-b border-white/5">
                <h3 className="font-display font-semibold text-sm text-white">
                  Notifications
                </h3>
              </div>
              <div className="max-h-80 overflow-y-auto">
                {likeNotification.length === 0 ? (
                  <div className="py-8 text-center">
                    <p className="text-sm text-white/40">
                      No notifications yet
                    </p>
                  </div>
                ) : (
                  likeNotification.map((n) => (
                    <div
                      key={n._id}
                      onClick={() => handleNotificationClick(n)}
                      className="group flex items-start gap-3 px-4 py-3 hover:bg-white/5 transition-colors cursor-pointer"
                    >
                      <Avatar className="h-8 w-8 shrink-0 ring-2 ring-white/10">
                        <AvatarImage src={n.userDetails?.profilePicture} />
                        <AvatarFallback className="text-xs bg-gradient-to-br from-violet-500 to-cyan-500 text-white">
                          {(n.userDetails?.fullName || n.userDetails?.username)
                            ?.charAt(0)
                            .toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <p className="text-sm text-white/80 leading-snug flex-1">
                        <span className="font-semibold text-white">
                          {n.userDetails?.username}
                        </span>{" "}
                        {getNotificationText(n)}
                      </p>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          dispatch(removeNotification(n._id));
                        }}
                        className="opacity-0 group-hover:opacity-100 text-white/40 hover:text-white transition-all shrink-0"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ))
                )}
              </div>
            </PopoverContent>
          </Popover>

          {/* Profile avatar button */}
          <button
            onClick={() => setShowProfileMenu((s) => !s)}
            className={`flex-1 flex items-center justify-center py-1.5 rounded-2xl transition-all duration-300 ${
              showProfileMenu ? "bg-white/10" : ""
            }`}
          >
            <Avatar className="h-7 w-7 ring-2 ring-white/15">
              <AvatarImage src={user?.profilePicture} />
              <AvatarFallback className="text-[10px] bg-gradient-to-br from-violet-500 to-cyan-500 text-white">
                {user?.username?.charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
          </button>
        </div>
      </nav>

      {/* ---------- PROFILE MENU ---------- */}
      {showProfileMenu && (
        <>
          <div
            className="md:hidden fixed inset-0 z-40"
            onClick={() => setShowProfileMenu(false)}
          />
          <div className="md:hidden fixed bottom-24 right-3 z-50 w-52 glass-strong rounded-2xl !border-white/10 overflow-hidden shadow-[0_8px_40px_rgba(0,0,0,0.55)]">
            <button
              onClick={() => {
                navigate(`/profile/${user?._id}`);
                setShowProfileMenu(false);
              }}
              className="w-full flex items-center gap-3 px-4 py-3 text-sm text-white/80 hover:bg-white/5 transition-colors"
            >
              <Avatar className="h-6 w-6">
                <AvatarImage src={user?.profilePicture} />
                <AvatarFallback className="text-[10px] bg-gradient-to-br from-violet-500 to-cyan-500 text-white">
                  {user?.username?.charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              Profile
            </button>

            <button
              onClick={handleLogout}
              className="w-full flex items-center gap-3 px-4 py-3 text-sm text-rose-300 hover:bg-rose-500/10 transition-colors border-t border-white/5"
            >
              <LogOut className="h-4 w-4" />
              Logout
            </button>
          </div>
        </>
      )}

      <CreatePost open={open} setOpen={setOpen} />
    </>
  );
};

export default MobileBottomNav;
