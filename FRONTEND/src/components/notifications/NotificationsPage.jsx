import React, { useState, useEffect } from "react";
import {
  Bell,
  Heart,
  MessageCircle,
  Repeat2,
  UserPlus,
  Trash2,
  CheckCheck,
  Loader2,
  Sparkles,
  ArrowRight,
  Inbox,
  Filter,
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Link, useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import axios from "axios";
import { apiUrl } from "@/lib/api";
import { toast } from "sonner";
import {
  markNotificationsRead,
  clearNotifications,
  removeNotification,
  setNotifications,
} from "@/redux/rtnSlice";
import { setSelectedPost } from "@/redux/postSlice";
import { formatTimeAgo, getDisplayName } from "@/lib/utils";
import CommentDialog from "@/components/comments/CommentDialog";

const NotificationsPage = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { likeNotification = [], unreadCount = 0 } = useSelector(
    (store) => store.realTimeNotification || {}
  );
  const [filter, setFilter] = useState("all");
  const [loading, setLoading] = useState(false);
  const [commentDialogOpen, setCommentDialogOpen] = useState(false);

  // Fetch notifications on mount
  useEffect(() => {
    let active = true;
    setLoading(true);
    axios
      .get(apiUrl("/api/v1/user/notifications"), { withCredentials: true })
      .then((res) => {
        if (active && res.data?.success) {
          dispatch(setNotifications({ notifications: res.data.notifications || [] }));
        }
      })
      .catch((err) => {
        console.error("Failed to fetch notifications:", err);
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [dispatch]);

  const handleMarkAllRead = async () => {
    try {
      await axios.patch(
        apiUrl("/api/v1/user/notifications/read"),
        {},
        { withCredentials: true }
      );
      dispatch(markNotificationsRead());
      toast.success("All notifications marked as read");
    } catch {
      toast.error("Failed to mark notifications read.");
    }
  };

  const handleClearAll = async () => {
    try {
      await axios.delete(apiUrl("/api/v1/user/notifications/clear"), {
        withCredentials: true,
      });
      dispatch(clearNotifications());
      toast.success("Notifications cleared");
    } catch {
      toast.error("Failed to clear notifications.");
    }
  };

  const handleRemoveSingle = async (id, e) => {
    e.stopPropagation();
    try {
      await axios.delete(apiUrl(`/api/v1/user/notifications/${id}`), {
        withCredentials: true,
      });
      dispatch(removeNotification(id));
    } catch {
      toast.error("Failed to remove notification.");
    }
  };

  const handleItemClick = (n) => {
    if (n.type === "message") {
      navigate("/chat", { state: { user: n.userDetails } });
      return;
    }
    if (n.type === "follow") {
      const username = n.userDetails?.username || n.userId;
      if (username) navigate(`/profile/${username}`);
      return;
    }
    if (n.postId) {
      const postObj = typeof n.postId === "object" ? n.postId : n.post || { _id: n.postId };
      dispatch(setSelectedPost(postObj));
      setCommentDialogOpen(true);
    }
  };

  const getNotificationIcon = (type) => {
    switch (type) {
      case "like":
        return <Heart className="size-3.5 fill-[#ff315d] text-[#ff315d]" />;
      case "comment":
        return <MessageCircle className="size-3.5 fill-cyan-400 text-cyan-400" />;
      case "repost":
        return <Repeat2 className="size-3.5 text-emerald-400 stroke-[2.5]" />;
      case "follow":
        return <UserPlus className="size-3.5 text-indigo-400 stroke-[2.5]" />;
      default:
        return <Bell className="size-3.5 text-amber-400" />;
    }
  };

  const getActionText = (n) => {
    switch (n.type) {
      case "like":
        return "liked your post";
      case "comment":
        return "commented on your post";
      case "repost":
        return "reposted your post";
      case "follow":
        return "started following you";
      case "message":
        return "sent you a message";
      default:
        return "interacted with you";
    }
  };

  const filteredNotifications = likeNotification.filter((n) => {
    if (filter === "all") return true;
    if (filter === "likes") return n.type === "like";
    if (filter === "comments") return n.type === "comment";
    if (filter === "reposts") return n.type === "repost";
    if (filter === "follows") return n.type === "follow";
    if (filter === "messages") return n.type === "message";
    return true;
  });

  return (
    <div className="w-full max-w-2xl mx-auto px-4 py-6 md:py-10 space-y-6">
      {/* ═══════════ HEADER ═══════════ */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-white/10">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
              <Sparkles className="size-3" />
              Activity Center
            </span>
            {unreadCount > 0 && (
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#ff315d] text-white">
                {unreadCount} new
              </span>
            )}
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight">
            Notifications
          </h1>
          <p className="text-xs text-white/50">
            Real-time updates on your posts, followers, and activity
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2">
          {unreadCount > 0 && (
            <button
              type="button"
              onClick={handleMarkAllRead}
              className="px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-semibold text-white/80 hover:text-white transition-all cursor-pointer flex items-center gap-1.5 active:scale-95"
            >
              <CheckCheck className="size-3.5 text-emerald-400" />
              <span>Mark all read</span>
            </button>
          )}
          {likeNotification.length > 0 && (
            <button
              type="button"
              onClick={handleClearAll}
              className="px-3 py-1.5 rounded-xl bg-white/5 hover:bg-red-500/10 border border-white/10 hover:border-red-500/20 text-xs font-semibold text-white/60 hover:text-red-400 transition-all cursor-pointer flex items-center gap-1.5 active:scale-95"
            >
              <Trash2 className="size-3.5" />
              <span>Clear</span>
            </button>
          )}
        </div>
      </div>

      {/* ═══════════ FILTER PILLS ═══════════ */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none no-scrollbar">
        {[
          { id: "all", label: "All", count: likeNotification.length },
          {
            id: "likes",
            label: "Likes",
            icon: Heart,
            color: "text-[#ff315d]",
            count: likeNotification.filter((n) => n.type === "like").length,
          },
          {
            id: "comments",
            label: "Comments",
            icon: MessageCircle,
            color: "text-cyan-400",
            count: likeNotification.filter((n) => n.type === "comment").length,
          },
          {
            id: "reposts",
            label: "Reposts",
            icon: Repeat2,
            color: "text-emerald-400",
            count: likeNotification.filter((n) => n.type === "repost").length,
          },
          {
            id: "follows",
            label: "Follows",
            icon: UserPlus,
            color: "text-indigo-400",
            count: likeNotification.filter((n) => n.type === "follow").length,
          },
        ].map((tab) => {
          const isActive = filter === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setFilter(tab.id)}
              className={`px-3.5 py-1.5 rounded-full text-xs font-semibold shrink-0 transition-all cursor-pointer flex items-center gap-1.5 ${
                isActive
                  ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/30"
                  : "bg-white/5 hover:bg-white/10 text-white/70 hover:text-white border border-white/5"
              }`}
            >
              {tab.icon && <tab.icon className={`size-3.5 ${tab.color || ""}`} />}
              <span>{tab.label}</span>
              {tab.count > 0 && (
                <span
                  className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                    isActive ? "bg-white/20 text-white" : "bg-white/10 text-white/50"
                  }`}
                >
                  {tab.count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* ═══════════ NOTIFICATIONS LIST ═══════════ */}
      <div className="space-y-2">
        {loading && likeNotification.length === 0 ? (
          <div className="py-20 flex flex-col items-center justify-center text-white/50 gap-3">
            <Loader2 className="size-6 animate-spin text-indigo-400" />
            <p className="text-xs">Loading notifications…</p>
          </div>
        ) : filteredNotifications.length === 0 ? (
          <div className="py-20 text-center rounded-3xl bg-white/[0.02] border border-white/5 p-6">
            <div className="size-14 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center mx-auto mb-3 text-indigo-400">
              <Inbox className="size-7 opacity-50" />
            </div>
            <h3 className="text-sm font-semibold text-white">All caught up!</h3>
            <p className="text-xs text-white/40 mt-1 max-w-xs mx-auto">
              No {filter !== "all" ? filter : ""} notifications right now. When people interact with you, they will appear here.
            </p>
          </div>
        ) : (
          filteredNotifications.map((n) => {
            const actor = n.userDetails || {};
            const displayName = getDisplayName(actor, "A user");
            const avatarUrl = actor.profilePicture || "";
            const postData = n.post || (typeof n.postId === "object" ? n.postId : null);
            const postThumb = postData?.image || "";
            const isUnread = !n.read;

            return (
              <div
                key={n._id}
                onClick={() => handleItemClick(n)}
                className={`group relative flex items-center justify-between p-3.5 sm:p-4 rounded-2xl border transition-all cursor-pointer ${
                  isUnread
                    ? "bg-indigo-950/20 border-indigo-500/30 hover:bg-indigo-900/30 hover:border-indigo-500/50"
                    : "bg-white/[0.02] border-white/5 hover:bg-white/[0.05] hover:border-white/10"
                }`}
              >
                {/* Left: Avatar with type badge + text */}
                <div className="flex items-center gap-3.5 min-w-0 flex-1 mr-3">
                  <div className="relative shrink-0">
                    <Avatar className="size-11 border border-white/10">
                      <AvatarImage src={avatarUrl} />
                      <AvatarFallback className="text-xs font-bold">
                        {displayName.charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="absolute -bottom-1 -right-1 size-5 rounded-full bg-[#0e1122] border border-white/15 flex items-center justify-center shadow-md">
                      {getNotificationIcon(n.type)}
                    </div>
                  </div>

                  <div className="min-w-0 flex-1 text-left">
                    <p className="text-xs sm:text-sm text-white/90 leading-snug">
                      <span className="font-bold text-white hover:underline">
                        {displayName}
                      </span>{" "}
                      <span className="text-white/60">{getActionText(n)}</span>
                    </p>
                    <p className="text-[11px] text-white/40 mt-0.5">
                      {formatTimeAgo(n.createdAt)}
                    </p>
                  </div>
                </div>

                {/* Right: Post Thumbnail or Follow indicator + Remove button */}
                <div className="flex items-center gap-2.5 shrink-0">
                  {postThumb && (
                    <div className="size-11 sm:size-12 rounded-xl overflow-hidden bg-black/40 border border-white/10 shrink-0 shadow-inner">
                      {postData?.mediaType === "video" ? (
                        <video
                          src={postThumb}
                          className="size-full object-cover"
                          muted
                        />
                      ) : (
                        <img
                          src={postThumb}
                          alt="Post thumbnail"
                          className="size-full object-cover"
                        />
                      )}
                    </div>
                  )}

                  {isUnread && (
                    <div className="size-2 rounded-full bg-indigo-500 shadow-sm shadow-indigo-500" />
                  )}

                  <button
                    type="button"
                    onClick={(e) => handleRemoveSingle(n._id, e)}
                    className="p-1.5 rounded-lg text-white/30 hover:text-red-400 hover:bg-white/10 opacity-0 group-hover:opacity-100 transition-all cursor-pointer"
                    title="Remove notification"
                  >
                    <Trash2 className="size-3.5" />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Global CommentDialog for viewing post if clicked */}
      <CommentDialog
        open={commentDialogOpen}
        setOpen={setCommentDialogOpen}
      />
    </div>
  );
};

export default NotificationsPage;
