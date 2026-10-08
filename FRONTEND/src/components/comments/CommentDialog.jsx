/* eslint-disable react-hooks/exhaustive-deps */
import React, { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Link } from "react-router-dom";
import { Send, MessageCircle, Loader2, Heart } from "lucide-react";
import { useDispatch, useSelector } from "react-redux";
import Comment from "@/components/comments/Comment";
import axios from "axios";
import { toast } from "sonner";
import { setPosts } from "@/redux/postSlice";
import { Textarea } from "@/components/ui/textarea";
import { getErrorMessage } from "@/lib/utils";
import { apiUrl } from "@/lib/api";
import { getDisplayName } from "@/lib/utils";

/* ============================================================
   SKELETON
   ============================================================ */
const CommentsPanelSkeleton = () => (
  <>
    <div className="mx-4 my-3 space-y-2">
      <div className="h-3.5 w-full max-w-md rounded bg-[var(--surface-2)] animate-pulse" />
      <div className="h-3.5 w-3/4 max-w-sm rounded bg-[var(--surface-2)] animate-pulse" />
    </div>

    <div className="px-4 space-y-3 pt-2">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="flex items-start gap-2.5">
          <div className="h-8 w-8 rounded-full bg-[var(--surface-2)] animate-pulse shrink-0" />
          <div className="flex-1 space-y-2 pt-0.5">
            <div className="h-3 w-24 rounded bg-[var(--surface-2)] animate-pulse" />
            <div className="h-3 w-2/3 rounded bg-[var(--surface-2)] animate-pulse" />
          </div>
        </div>
      ))}
    </div>
  </>
);

const CommentDialog = ({ open, setOpen }) => {
  const [text, setText] = useState("");
  const { selectedPost, posts } = useSelector((store) => store.post);
  const { user } = useSelector((store) => store.auth);
  const [postDetail, setPostDetail] = useState(null);
  const [loading, setLoading] = useState(false);
  const [comments, setComments] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [liking, setLiking] = useState(false);
  const dispatch = useDispatch();

  /* ============================================================
     RESET when dialog closes
     ============================================================ */
  useEffect(() => {
    if (!open) {
      setPostDetail(null);
      setComments([]);
      setText("");
      setLoading(false);
      setLiking(false);
    }
  }, [open]);

  /* ---------- FETCH FULL POST DETAIL ---------- */
  useEffect(() => {
    if (!open || !selectedPost?._id) return;

    let cancelled = false;
    setLoading(true);
    setPostDetail(null);

    axios
      .get(apiUrl(`/api/v1/post/${selectedPost._id}/detail`), {
        withCredentials: true,
      })
      .then((res) => {
        if (cancelled) return;
        if (res.data.success && res.data.post) {
          setPostDetail(res.data.post);
        } else {
          setPostDetail(selectedPost);
        }
      })
      .catch(() => {
        if (cancelled) return;
        setPostDetail(selectedPost);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [open, selectedPost?._id]);

  const post = postDetail || selectedPost;

  /* ---------- COMMENTS — NEWEST FIRST ---------- */
  useEffect(() => {
    const raw = Array.isArray(post?.comments) ? post.comments : [];

    const valid = raw.filter(
      (c) => c && (c.text || c.comment) && (c.author || c.user),
    );

    const sorted = [...valid].sort((a, b) => {
      const da = new Date(a.createdAt || 0).getTime();
      const db = new Date(b.createdAt || 0).getTime();
      return db - da;
    });

    setComments(sorted);
  }, [post]);

  /* ============================================================
     LIKE / UNLIKE — OPTIMISTIC
     - instant UI update
     - background API
     - rollback on error
     ============================================================ */
  const likeCount = Array.isArray(post?.likes) ? post.likes.length : 0;
  const isLikedByMe =
    user && Array.isArray(post?.likes) && post.likes.includes(user._id);

  const handleLikeToggle = async () => {
    if (!post?._id || !user?._id || liking) return;

    const wasLiked = isLikedByMe;
    const nowLiked = !wasLiked;

    // 1) INSTANT — local postDetail update
    setPostDetail((prev) => {
      if (!prev) return prev;
      const currentLikes = Array.isArray(prev.likes) ? prev.likes : [];
      const nextLikes = nowLiked
        ? [...currentLikes, user._id]
        : currentLikes.filter((id) => id !== user._id);
      return { ...prev, likes: nextLikes };
    });

    // 2) INSTANT — redux posts list update
    const updatedPosts = posts.map((p) =>
      p._id === post._id
        ? {
            ...p,
            likes: nowLiked
              ? [...(p.likes || []), user._id]
              : (p.likes || []).filter((id) => id !== user._id),
          }
        : p,
    );
    dispatch(setPosts(updatedPosts));

    // 3) Background API
    try {
      setLiking(true);
      const action = nowLiked ? "like" : "dislike";
      const res = await axios.get(
        apiUrl(`/api/v1/post/${post._id}/${action}`),
        { withCredentials: true },
      );

      if (!res.data.success) {
        // rollback
        setPostDetail((prev) => {
          if (!prev) return prev;
          const currentLikes = Array.isArray(prev.likes) ? prev.likes : [];
          const rollbackLikes = wasLiked
            ? [...currentLikes, user._id]
            : currentLikes.filter((id) => id !== user._id);
          return { ...prev, likes: rollbackLikes };
        });
        dispatch(setPosts(posts));
        toast.error("Something went wrong");
      }
    } catch (error) {
      // rollback
      setPostDetail((prev) => {
        if (!prev) return prev;
        const currentLikes = Array.isArray(prev.likes) ? prev.likes : [];
        const rollbackLikes = wasLiked
          ? [...currentLikes, user._id]
          : currentLikes.filter((id) => id !== user._id);
        return { ...prev, likes: rollbackLikes };
      });
      dispatch(setPosts(posts));
      toast.error(getErrorMessage(error, "Unable to update the like."));
    } finally {
      setLiking(false);
    }
  };

  /* ---------- ADD COMMENT ---------- */
  const sendMessageHandler = async () => {
    if (!text.trim() || !post?._id || submitting) return;

    const commentText = text.trim();

    try {
      setSubmitting(true);
      const res = await axios.post(
        apiUrl(`/api/v1/post/${post._id}/comment`),
        { text: commentText },
        { withCredentials: true },
      );

      if (res.data.success) {
        const newComment = res.data.comment || {
          _id: `temp-${Date.now()}`,
          text: commentText,
          author: {
            _id: user?._id,
            username: user?.username,
            fullName: user?.fullName,
            profilePicture: user?.profilePicture,
          },
          createdAt: new Date().toISOString(),
        };

        const updatedComments = [newComment, ...comments];
        setComments(updatedComments);
        setPostDetail((prev) =>
          prev ? { ...prev, comments: updatedComments } : prev,
        );

        const updatedPosts = posts.map((p) =>
          p._id === post._id ? { ...p, comments: updatedComments } : p,
        );
        dispatch(setPosts(updatedPosts));

        toast.success("Comment added");
        setText("");

        axios
          .get(apiUrl(`/api/v1/post/${post._id}/detail`), {
            withCredentials: true,
          })
          .then((r) => {
            if (r.data.success && r.data.post) {
              setPostDetail(r.data.post);
            }
          })
          .catch(() => undefined);
      }
    } catch (error) {
      toast.error(getErrorMessage(error, "Unable to add your comment."));
    } finally {
      setSubmitting(false);
    }
  };

  /* ---------- Derived ---------- */
  const author = post?.author || post?.user || {};
  const authorName = getDisplayName(author, "Unknown");
  const authorAvatar = author.profilePicture || "";

  const showSkeleton = loading && !postDetail;

  /* ---------- UI ---------- */
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent
        className="!flex flex-col md:flex-row max-w-[95vw] md:max-w-4xl p-0 h-[90vh] md:h-[80vh] overflow-hidden !gap-0"
        onOpenAutoFocus={(e) => e.preventDefault()}
      >
        <DialogTitle className="sr-only">Comments</DialogTitle>
        <DialogDescription className="sr-only">
          View and add comments on this post
        </DialogDescription>

        {/* ============ MEDIA PANEL ============ */}
        <div className="w-full md:w-1/2 md:h-full h-[32vh] shrink-0 bg-black flex items-center justify-center overflow-hidden border-b md:border-b-0 md:border-r border-[var(--border)]">
          {post?.image && !showSkeleton ? (
            post.mediaType === "video" ? (
              <video
                key={post._id}
                src={post.image}
                className="block h-full w-full object-contain"
                controls
                playsInline
                disablePictureInPicture
                controlsList="nodownload noplaybackrate"
                preload="metadata"
                aria-label="Post video"
                onContextMenu={(event) => event.preventDefault()}
              />
            ) : (
              <img
                src={post.image}
                alt="Post"
                className="block h-full w-full object-contain"
              />
            )
          ) : (
            <div className="w-full h-full bg-[var(--surface-2)] animate-pulse" />
          )}
        </div>

        {/* ============ COMMENTS PANEL ============ */}
        <div className="w-full md:w-1/2 flex-1 flex flex-col min-h-0 bg-[var(--surface)]">
          {/* ---- Header ---- */}
          <div className="shrink-0 px-4 py-3 border-b border-[var(--border)]">
            {showSkeleton ? (
              <div className="flex items-center gap-3">
                <div className="h-9 w-9 rounded-full bg-[var(--surface-2)] animate-pulse shrink-0" />
                <div className="flex-1 space-y-1.5">
                  <div className="h-3.5 w-32 rounded bg-[var(--surface-2)] animate-pulse" />
                  <div className="h-3 w-20 rounded bg-[var(--surface-2)] animate-pulse" />
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-3">
                <Link to={`/profile/${author._id}`} className="shrink-0">
                  <Avatar className="h-9 w-9">
                    <AvatarImage src={authorAvatar} />
                    <AvatarFallback>
                      {authorName.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                </Link>

                <div className="flex-1 min-w-0">
                  <Link
                    to={`/profile/${author._id}`}
                    className="font-semibold text-sm text-[var(--foreground)] hover:opacity-80 transition-opacity truncate block"
                  >
                    {authorName}
                  </Link>
                </div>
              </div>
            )}
          </div>

          {/* ---- Scrollable content ---- */}
          <div className="flex-1 min-h-0 overflow-y-auto">
            {showSkeleton ? (
              <CommentsPanelSkeleton />
            ) : (
              <>
                {/* ===== CAPTION ===== */}
                {post?.caption && (
                  <div className="mx-4 mt-3 mb-2 px-3.5 py-2.5 rounded-lg bg-[var(--surface-2)]">
                    <p className="text-[13px] text-[var(--foreground)] leading-relaxed">
                      {post.caption}
                    </p>
                  </div>
                )}

                {/* ===== Section label ===== */}
                {comments.length > 0 && (
                  <div className="px-4 pt-2 pb-1.5 flex items-center gap-2">
                    <div className="h-px flex-1 bg-[var(--border)]" />
                    <span className="text-[10px] uppercase tracking-wider text-[var(--muted-foreground)]">
                      Comments
                    </span>
                    <div className="h-px flex-1 bg-[var(--border)]" />
                  </div>
                )}

                {/* ===== Comments list ===== */}
                <div className="px-2 py-1 space-y-0.5">
                  {comments.length > 0 ? (
                    comments.map((comment) => (
                      <Comment key={comment._id} comment={comment} />
                    ))
                  ) : (
                    <div className="flex flex-col items-center justify-center text-center py-10 px-4">
                      <div className="w-12 h-12 rounded-full bg-[var(--surface-2)] flex items-center justify-center mb-3">
                        <MessageCircle
                          className="w-5 h-5 text-[var(--muted-foreground)]"
                          strokeWidth={1.8}
                        />
                      </div>
                      <p className="text-sm font-semibold text-[var(--foreground)]">
                        No comments yet
                      </p>
                      <p className="text-xs text-[var(--muted-foreground)] mt-1">
                        Be the first to say something.
                      </p>
                    </div>
                  )}
                </div>
              </>
            )}
          </div>

          {/* ---- Stats + Input ---- */}
          <div className="shrink-0 border-t border-[var(--border)]">
            {showSkeleton ? (
              <div className="px-4 pt-3 pb-3 space-y-2">
                <div className="h-3.5 w-40 rounded bg-[var(--surface-2)] animate-pulse" />
                <div className="h-10 w-full rounded-lg bg-[var(--surface-2)] animate-pulse" />
              </div>
            ) : (
              <>
                <div className="flex items-center gap-4 px-4 pt-3 pb-2">
                  {/* LIKE — interactive */}
                  <button
                    type="button"
                    onClick={handleLikeToggle}
                    disabled={liking}
                    aria-label={isLikedByMe ? "Unlike" : "Like"}
                    className="
                      group inline-flex items-center gap-1.5 text-sm
                      rounded-full px-1 -mx-1 py-0.5
                      hover:bg-[var(--surface-2)] transition-colors
                      active:scale-95 disabled:cursor-not-allowed
                    "
                  >
                    <Heart
                      className={`h-4 w-4 transition-all duration-200 ${
                        isLikedByMe
                          ? "fill-[var(--danger)] text-[var(--danger)]"
                          : "text-[var(--foreground)] group-hover:text-[var(--danger)]"
                      } ${liking ? "opacity-60" : ""}`}
                      strokeWidth={1.8}
                    />
                    <span className="font-semibold text-[var(--foreground)] tabular-nums">
                      {likeCount}
                    </span>
                    <span className="text-[var(--muted-foreground)]">
                      {likeCount === 1 ? "like" : "likes"}
                    </span>
                  </button>

                  {/* Comment count (static) */}
                  <div className="flex items-center gap-1.5 text-sm text-[var(--muted-foreground)]">
                    <MessageCircle className="h-4 w-4" strokeWidth={1.8} />
                    <span className="font-semibold text-[var(--foreground)] tabular-nums">
                      {comments.length}
                    </span>
                    <span>
                      {comments.length === 1 ? "comment" : "comments"}
                    </span>
                  </div>
                </div>

                <div className="px-3 pb-3">
                  <div className="flex items-end gap-2">
                    <Textarea
                      value={text}
                      onChange={(e) => setText(e.target.value)}
                      placeholder="Add a comment..."
                      rows={1}
                      className="min-h-[40px] max-h-28 resize-none rounded-lg py-2.5"
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && !e.shiftKey && !submitting) {
                          e.preventDefault();
                          sendMessageHandler();
                        }
                      }}
                    />
                    <button
                      onClick={sendMessageHandler}
                      disabled={!text.trim() || submitting}
                      className="shrink-0 w-10 h-10 rounded-full flex items-center justify-center transition-all active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed"
                      style={{
                        background: "var(--primary)",
                        color: "var(--primary-foreground)",
                      }}
                    >
                      {submitting ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Send className="h-4 w-4" strokeWidth={2} />
                      )}
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default CommentDialog;
