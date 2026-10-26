import React, { useState, useEffect, useRef, useCallback, useMemo } from "react";
import {
  Loader2,
  Inbox,
  Calendar,
} from "lucide-react";
import {
  BellRingIcon,
  HeartIcon,
  MessageCircleIcon,
  Repeat2Icon,
  UserPlusIcon,
  Trash2Icon,
  CheckCheckIcon,
  SparklesIcon,
  SendIcon,
} from "@animateicons/react/lucide";
import AnimatedIcon from "@/components/common/AnimatedIcon";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import axios from "axios";
import { apiUrl } from "@/lib/api";
import { toast } from "sonner";
import {
  markNotificationsRead,
  removeNotification,
  clearNotifications,
} from "@/redux/rtnSlice";
import { setSelectedPost } from "@/redux/postSlice";
import { formatTimeAgo, getDisplayName } from "@/lib/utils";
import CommentDialog from "@/components/comments/CommentDialog";

const PAGE_LIMIT = 20;
const MAX_CENTER_CAPACITY = 500;

// Helper to categorize notification by relative date
const getDateCategory = (isoDate) => {
  if (!isoDate) return "Earlier";
  const date = new Date(isoDate);
  const now = new Date();

  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const startOfYesterday = startOfToday - 86400000;
  const startOfWeek = startOfToday - 6 * 86400000;
  const timestamp = date.getTime();

  if (timestamp >= startOfToday) return "Today";
  if (timestamp >= startOfYesterday) return "Yesterday";
  if (timestamp >= startOfWeek) return "This Week";
  return "Earlier";
};

const NotificationsPage = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { unreadCount = 0 } = useSelector(
    (store) => store.realTimeNotification || {}
  );

  const [filter, setFilter] = useState("all");
  const [centerNotifications, setCenterNotifications] = useState([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [totalCount, setTotalCount] = useState(0);
  const [initialLoading, setInitialLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [commentDialogOpen, setCommentDialogOpen] = useState(false);

  const observerRef = useRef(null);

  // Fetch notifications for the center with pagination & type filter
  const fetchCenterNotifications = useCallback(
    async (pageToLoad = 1, append = false) => {
      try {
        if (pageToLoad === 1) {
          setInitialLoading(true);
        } else {
          setLoadingMore(true);
        }

        const typeParam = filter === "all" ? "" : `&type=${filter}`;
        const res = await axios.get(
          apiUrl(
            `/api/v1/user/notifications?source=center&page=${pageToLoad}&limit=${PAGE_LIMIT}${typeParam}`
          ),
          { withCredentials: true }
        );

        if (res.data?.success) {
          const list = res.data.notifications || [];
          setCenterNotifications((prev) => (append ? [...prev, ...list] : list));
          setHasMore(Boolean(res.data.hasMore));
          setTotalCount(res.data.total || 0);
          setPage(pageToLoad);
        }
      } catch (err) {
        console.error("Failed to load center notifications:", err);
        toast.error("Failed to load notifications.");
      } finally {
        setInitialLoading(false);
        setLoadingMore(false);
      }
    },
    [filter]
  );

  // Reset and fetch when filter changes
  useEffect(() => {
    fetchCenterNotifications(1, false);
  }, [fetchCenterNotifications]);

  // Mark all as read when opening Notification Center
  useEffect(() => {
    axios
      .patch(apiUrl("/api/v1/user/notifications/read"), {}, { withCredentials: true })
      .then(() => dispatch(markNotificationsRead()))
      .catch(() => undefined);
  }, [dispatch]);

  // Infinite scroll trigger when reaching bottom
  const lastElementRef = useCallback(
    (node) => {
      if (initialLoading || loadingMore) return;
      if (observerRef.current) observerRef.current.disconnect();

      observerRef.current = new IntersectionObserver((entries) => {
        if (entries[0].isIntersecting && hasMore) {
          fetchCenterNotifications(page + 1, true);
        }
      });

      if (node) observerRef.current.observe(node);
    },
    [initialLoading, loadingMore, hasMore, page, fetchCenterNotifications]
  );

  const handleMarkAllRead = async () => {
    try {
      await axios.patch(
        apiUrl("/api/v1/user/notifications/read"),
        {},
        { withCredentials: true }
      );
      dispatch(markNotificationsRead());
      setCenterNotifications((prev) =>
        prev.map((n) => ({ ...n, read: true }))
      );
      toast.success("All notifications marked as read");
    } catch {
      toast.error("Failed to mark notifications read.");
    }
  };

  // Permanent clear from database & Center
  const handleClearAll = async () => {
    try {
      await axios.delete(apiUrl("/api/v1/user/notifications/clear"), {
        withCredentials: true,
      });
      dispatch(clearNotifications());
      setCenterNotifications([]);
      setTotalCount(0);
      setHasMore(false);
      toast.success("All notifications permanently cleared");
    } catch {
      toast.error("Failed to clear notifications.");
    }
  };

  // Permanent single delete from database & Center
  const handleRemoveSingle = async (id, e) => {
    e.stopPropagation();
    try {
      await axios.delete(apiUrl(`/api/v1/user/notifications/${id}`), {
        withCredentials: true,
      });
      dispatch(removeNotification(id));
      setCenterNotifications((prev) => prev.filter((n) => n._id !== id));
      setTotalCount((prev) => Math.max(0, prev - 1));
      toast.success("Notification deleted");
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
        return (
          <AnimatedIcon
            icon={HeartIcon}
            size={13}
            fill="#ff315d"
            className="text-[#ff315d]"
          />
        );
      case "comment":
        return (
          <AnimatedIcon
            icon={MessageCircleIcon}
            size={13}
            fill="currentColor"
            className="text-cyan-400"
          />
        );
      case "repost":
        return (
          <AnimatedIcon
            icon={Repeat2Icon}
            size={13}
            className="text-emerald-400 stroke-[2.5]"
          />
        );
      case "follow":
        return (
          <AnimatedIcon
            icon={UserPlusIcon}
            size={13}
            className="text-indigo-400 stroke-[2.5]"
          />
        );
      case "message":
        return (
          <AnimatedIcon
            icon={SendIcon}
            size={13}
            className="text-purple-400"
          />
        );
      default:
        return (
          <AnimatedIcon
            icon={BellRingIcon}
            size={13}
            className="text-amber-400"
          />
        );
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

  // Group notifications into Date categories (Today, Yesterday, This Week, Earlier)
  const groupedNotifications = useMemo(() => {
    const groups = {
      Today: [],
      Yesterday: [],
      "This Week": [],
      Earlier: [],
    };

    centerNotifications.forEach((n) => {
      const cat = getDateCategory(n.createdAt);
      if (groups[cat]) {
        groups[cat].push(n);
      } else {
        groups.Earlier.push(n);
      }
    });

    return Object.entries(groups).filter(([_, items]) => items.length > 0);
  }, [centerNotifications]);

  const FILTER_TABS = [
    { id: "all", label: "All" },
    { id: "like", label: "Likes", icon: HeartIcon, color: "text-[#ff315d]" },
    { id: "comment", label: "Comments", icon: MessageCircleIcon, color: "text-cyan-400" },
    { id: "repost", label: "Reposts", icon: Repeat2Icon, color: "text-emerald-400" },
    { id: "follow", label: "Follows", icon: UserPlusIcon, color: "text-indigo-400" },
    { id: "message", label: "Messages", icon: SendIcon, color: "text-purple-400" },
  ];

  return (
    <div className="w-full max-w-2xl mx-auto px-3 sm:px-4 py-6 md:py-10 space-y-6 select-none">
      {/* ═══════════ HEADER ═══════════ */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[var(--border)]">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 group">
              <AnimatedIcon icon={SparklesIcon} size={12} />
              Notification Center
            </span>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-white/5 border border-white/10 text-[var(--muted-foreground)]">
              {totalCount} / {MAX_CENTER_CAPACITY} max
            </span>
            {unreadCount > 0 && (
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#ff315d] text-white animate-pulse">
                {unreadCount} new
              </span>
            )}
          </div>
          <h1 className="text-2xl font-bold text-[var(--foreground)] tracking-tight">
            Activity & Notifications
          </h1>
          <p className="text-xs text-[var(--muted-foreground)]">
            Full chronological archive of your post activity, followers, and chats.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2">
          {unreadCount > 0 && (
            <button
              type="button"
              onClick={handleMarkAllRead}
              className="px-3 py-1.5 rounded-xl bg-[var(--surface-2)] hover:bg-[var(--surface-3)] border border-[var(--border)] text-xs font-semibold text-[var(--foreground)] transition-all cursor-pointer flex items-center gap-1.5 active:scale-95 group"
            >
              <AnimatedIcon icon={CheckCheckIcon} size={14} className="text-emerald-400" />
              <span>Mark all read</span>
            </button>
          )}
          {centerNotifications.length > 0 && (
            <button
              type="button"
              onClick={handleClearAll}
              title="Permanently clear notifications"
              className="px-3 py-1.5 rounded-xl bg-[var(--surface-2)] hover:bg-red-500/10 border border-[var(--border)] hover:border-red-500/30 text-xs font-semibold text-[var(--muted-foreground)] hover:text-red-400 transition-all cursor-pointer flex items-center gap-1.5 active:scale-95 group"
            >
              <AnimatedIcon icon={Trash2Icon} size={14} />
              <span>Clear Center</span>
            </button>
          )}
        </div>
      </div>

      {/* ═══════════ FILTER PILLS (TYPE-WISE) ═══════════ */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 scroll-hide">
        {FILTER_TABS.map((tab) => {
          const isActive = filter === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setFilter(tab.id)}
              className={`px-3.5 py-1.5 rounded-full text-xs font-semibold shrink-0 transition-all cursor-pointer flex items-center gap-1.5 group ${
                isActive
                  ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/30 ring-1 ring-indigo-400/40"
                  : "bg-[var(--surface-2)]/80 hover:bg-[var(--surface-2)] text-[var(--foreground)]/70 hover:text-[var(--foreground)] border border-[var(--border)]/70"
              }`}
            >
              {tab.icon && (
                <AnimatedIcon
                  icon={tab.icon}
                  size={14}
                  className={tab.color || ""}
                />
              )}
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* ═══════════ DATE-GROUPED NOTIFICATION LIST ═══════════ */}
      {initialLoading ? (
        <div className="py-20 flex flex-col items-center justify-center text-[var(--muted-foreground)] gap-3">
          <Loader2 className="size-6 animate-spin text-indigo-400" />
          <p className="text-xs">Loading notifications archive…</p>
        </div>
      ) : centerNotifications.length === 0 ? (
        <div className="py-20 text-center rounded-3xl bg-[var(--surface-2)]/30 border border-[var(--border)] p-6">
          <div className="size-14 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center mx-auto mb-3 text-indigo-400">
            <Inbox className="size-7 opacity-50" />
          </div>
          <h3 className="text-sm font-semibold text-[var(--foreground)]">All caught up!</h3>
          <p className="text-xs text-[var(--muted-foreground)] mt-1 max-w-xs mx-auto">
            No {filter !== "all" ? filter : ""} notifications in your archive right now.
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {groupedNotifications.map(([dateCategory, items]) => (
            <section key={dateCategory} className="space-y-2">
              {/* Date Header Pill */}
              <div className="flex items-center gap-2 px-1 pt-1">
                <span className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-indigo-400">
                  <Calendar className="size-3" />
                  {dateCategory}
                </span>
                <div className="flex-1 h-[1px] bg-[var(--border)]/60" />
                <span className="text-[10px] font-semibold text-[var(--muted-foreground)]">
                  {items.length}
                </span>
              </div>

              {/* Items in this date category */}
              <div className="space-y-2">
                {items.map((n, idx) => {
                  const actor = n.userDetails || {};
                  const displayName = getDisplayName(actor, "A user");
                  const avatarUrl = actor.profilePicture || "";
                  const postData = n.post || (typeof n.postId === "object" ? n.postId : null);
                  const postThumb = postData?.image || "";
                  const isUnread = !n.read;

                  return (
                    <article
                      key={n._id}
                      onClick={() => handleItemClick(n)}
                      className={`group relative flex items-center justify-between p-3.5 sm:p-4 rounded-2xl border transition-all cursor-pointer ${
                        isUnread
                          ? "bg-indigo-950/20 border-indigo-500/30 hover:bg-indigo-900/30 hover:border-indigo-500/50"
                          : "bg-[var(--surface)] border-[var(--border)] hover:bg-[var(--surface-2)]/80 hover:border-white/10"
                      }`}
                    >
                      {/* Left: Avatar with type badge + text */}
                      <div className="flex items-center gap-3.5 min-w-0 flex-1 mr-3">
                        <div className="relative shrink-0">
                          <Avatar className="size-11 border border-[var(--border)]">
                            <AvatarImage src={avatarUrl} />
                            <AvatarFallback className="text-xs font-bold">
                              {displayName.charAt(0).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <div className="absolute -bottom-1 -right-1 size-5 rounded-full bg-[var(--surface-2)] border border-[var(--border)] flex items-center justify-center shadow-md">
                            {getNotificationIcon(n.type)}
                          </div>
                        </div>

                        <div className="min-w-0 flex-1 text-left">
                          <p className="text-xs sm:text-sm text-[var(--foreground)] leading-snug">
                            <span className="font-bold text-[var(--foreground)] hover:underline">
                              {displayName}
                            </span>{" "}
                            <span className="text-[var(--muted-foreground)]">
                              {getActionText(n)}
                            </span>
                          </p>
                          <p className="text-[11px] text-[var(--muted-foreground)]/80 mt-0.5">
                            {formatTimeAgo(n.createdAt)}
                          </p>
                        </div>
                      </div>

                      {/* Right: Post Thumbnail or Follow indicator + Remove button */}
                      <div className="flex items-center gap-2.5 shrink-0">
                        {postThumb && (
                          <div className="size-11 sm:size-12 rounded-xl overflow-hidden bg-black/40 border border-[var(--border)] shrink-0 shadow-inner">
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

                        {/* Permanent Delete Button */}
                        <button
                          type="button"
                          onClick={(e) => handleRemoveSingle(n._id, e)}
                          className="p-1.5 rounded-lg text-[var(--muted-foreground)] hover:text-red-400 hover:bg-red-500/10 opacity-0 group-hover:opacity-100 transition-all cursor-pointer group/del"
                          title="Delete from Center"
                          aria-label="Delete notification"
                        >
                          <AnimatedIcon icon={Trash2Icon} size={14} />
                        </button>
                      </div>
                    </article>
                  );
                })}
              </div>
            </section>
          ))}

          {/* Sentinel element for infinite scroll */}
          <div ref={lastElementRef} className="h-4" />

          {/* Load More Spinner / Notice */}
          {loadingMore && (
            <div className="py-4 flex items-center justify-center gap-2 text-xs text-indigo-400">
              <Loader2 className="size-4 animate-spin" />
              <span>Loading more notifications…</span>
            </div>
          )}

          {!hasMore && centerNotifications.length > 0 && (
            <div className="py-4 text-center">
              <p className="text-[11px] text-[var(--muted-foreground)]">
                ✓ Reached the end of your notifications archive.
              </p>
            </div>
          )}
        </div>
      )}

      {/* Global CommentDialog for viewing post if clicked */}
      <CommentDialog
        open={commentDialogOpen}
        setOpen={setCommentDialogOpen}
      />
    </div>
  );
};

export default NotificationsPage;
