/* eslint-disable react-hooks/exhaustive-deps */
import React, { useEffect, useRef, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Link, useNavigate } from "react-router-dom";
import { Loader2, Heart as LucideHeart } from "lucide-react";
import {
  HeartIcon,
  MessageCircleIcon,
  BookmarkIcon,
  SendIcon,
  Repeat2Icon,
  XIcon,
} from "@animateicons/react/lucide";
import AnimatedIcon from "@/components/common/AnimatedIcon";
import { useDispatch, useSelector } from "react-redux";
import Comment from "@/components/comments/Comment";
import ShareDialog from "@/components/feed/ShareDialog";
import SaveToCollectionModal from "@/components/feed/SaveToCollectionModal";
import axios from "axios";
import { toast } from "sonner";
import { setPosts } from "@/redux/postSlice";
import { updateBookmarks } from "@/redux/authSlice";
import { Textarea } from "@/components/ui/textarea";
import { getErrorMessage, getDisplayName } from "@/lib/utils";
import { apiUrl } from "@/lib/api";
import { playLikeSound, playCommentSound } from "@/lib/sound";

/* ═══════════════════════════════════════════════════════════
   SKELETON
   ═══════════════════════════════════════════════════════════ */
const CommentsPanelSkeleton = () => (
  <>
    <div className="nova-comment-skel-caption">
      <div className="nova-comment-skel-avatar" />
      <div className="nova-comment-skel-lines">
        <div className="nova-comment-skel-line" style={{ width: "60%" }} />
        <div className="nova-comment-skel-line" style={{ width: "40%" }} />
      </div>
    </div>
    <div className="nova-comment-skel-list">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="nova-comment-skel-row">
          <div className="nova-comment-skel-avatar" />
          <div className="nova-comment-skel-lines">
            <div className="nova-comment-skel-line" style={{ width: "50%" }} />
            <div className="nova-comment-skel-line" style={{ width: "80%" }} />
          </div>
        </div>
      ))}
    </div>
  </>
);

const CommentDialog = ({ open, setOpen }) => {
  const [text, setText] = useState("");
  const navigate = useNavigate();
  const { selectedPost, posts } = useSelector((store) => store.post);
  const { user, userProfile } = useSelector((store) => store.auth);
  const [postDetail, setPostDetail] = useState(null);
  const [loading, setLoading] = useState(false);
  const [comments, setComments] = useState([]);
  const [visibleCount, setVisibleCount] = useState(25);
  const [submitting, setSubmitting] = useState(false);
  const [liking, setLiking] = useState(false);
  const [saving, setSaving] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [heartPulse, setHeartPulse] = useState(false);
  const [mediaBurst, setMediaBurst] = useState(false);
  const [replyingTo, setReplyingTo] = useState(null);
  const dispatch = useDispatch();

  const mediaBurstTimeoutRef = useRef(null);
  const lastTapRef = useRef(0);
  const touchStartCoordsRef = useRef({ x: 0, y: 0 });
  const sentinelRef = useRef(null);

  /* ─── RESET ON CLOSE ─── */
  useEffect(() => {
    if (!open) {
      setPostDetail(null);
      setComments([]);
      setText("");
      setReplyingTo(null);
      setLoading(false);
      setLiking(false);
      setSaving(false);
      setMediaBurst(false);
      setVisibleCount(25);
    }
  }, [open]);

  /* ─── FETCH FULL POST ─── */
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

  useEffect(() => {
    const saved =
      user?.bookmarks?.some((item) => (item?._id || item) === post?._id) ||
      false;
    setIsSaved(saved);
  }, [user?.bookmarks, post?._id]);

  useEffect(() => () => window.clearTimeout(mediaBurstTimeoutRef.current), []);

  /* ─── SAVE TOGGLE ─── */
  const [collectionModalOpen, setCollectionModalOpen] = useState(false);

  const handleSaveToggle = async () => {
    if (!post?._id || !user?._id || saving) return;
    if (isSaved) {
      setCollectionModalOpen(true);
      return;
    }

    try {
      setSaving(true);
      const response = await axios.get(
        apiUrl(`/api/v1/post/${post._id}/bookmark`),
        { withCredentials: true },
      );
      if (!response.data.success)
        throw new Error("Unable to update saved posts.");
      setIsSaved(true);
      dispatch(updateBookmarks({ postId: post._id }));
      setCollectionModalOpen(true);
    } catch (error) {
      toast.error(getErrorMessage(error, "Unable to save post."));
    } finally {
      setSaving(false);
    }
  };

  /* ─── SHARE DIALOG STATE ─── */
  const [shareOpen, setShareOpen] = useState(false);



  /* ─── COMMENTS SORT ─── */
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

  /* ─── VIRTUALIZED COMMENTS SCROLL SENTINEL ─── */
  useEffect(() => {
    if (!sentinelRef.current || visibleCount >= comments.length) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          setVisibleCount((prev) => Math.min(prev + 25, comments.length));
        }
      },
      { root: null, rootMargin: "150px" },
    );
    observer.observe(sentinelRef.current);
    return () => observer.disconnect();
  }, [comments.length, visibleCount]);

  /* ─── LIKE ─── */
  const likeCount = Array.isArray(post?.likes) ? post.likes.length : 0;
  const isLikedByMe =
    user && Array.isArray(post?.likes) && post.likes.includes(user._id);

  const handleLikeToggle = async () => {
    if (!post?._id || !user?._id || liking) return;
    setHeartPulse(true);
    window.setTimeout(() => setHeartPulse(false), 700);

    const wasLiked = isLikedByMe;
    const nowLiked = !wasLiked;
    playLikeSound(nowLiked);

    setPostDetail((prev) => {
      if (!prev) return prev;
      const currentLikes = Array.isArray(prev.likes) ? prev.likes : [];
      const nextLikes = nowLiked
        ? [...currentLikes, user._id]
        : currentLikes.filter((id) => id !== user._id);
      return { ...prev, likes: nextLikes };
    });

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

    try {
      setLiking(true);
      const action = nowLiked ? "like" : "dislike";
      const res = await axios.get(
        apiUrl(`/api/v1/post/${post._id}/${action}`),
        { withCredentials: true },
      );
      if (!res.data.success) throw new Error("Failed");
    } catch (error) {
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

  /* ─── DOUBLE-TAP MEDIA → LIKE ─── */
  const triggerMediaBurst = () => {
    setMediaBurst(true);
    window.clearTimeout(mediaBurstTimeoutRef.current);
    mediaBurstTimeoutRef.current = window.setTimeout(
      () => setMediaBurst(false),
      950,
    );
  };

  const handleMediaDoubleClick = () => {
    triggerMediaBurst();
    if (!isLikedByMe) handleLikeToggle();
  };

  const handleMediaTouchStart = (e) => {
    const t = e.touches?.[0];
    if (t) touchStartCoordsRef.current = { x: t.clientX, y: t.clientY };
  };

  const handleMediaTouchEnd = (e) => {
    const now = Date.now();
    const t = e.changedTouches?.[0];
    if (t) {
      const dist = Math.hypot(
        t.clientX - touchStartCoordsRef.current.x,
        t.clientY - touchStartCoordsRef.current.y,
      );
      if (dist > 10) return; // Scrolled/dragged, not a tap
    }
    if (now - lastTapRef.current < 280) {
      e.preventDefault();
      handleMediaDoubleClick();
    }
    lastTapRef.current = now;
  };

  const handleReplyTo = (targetComment) => {
    const targetUsername =
      targetComment?.author?.username || targetComment?.user?.username || "";
    setReplyingTo({
      id: targetComment?.parentId || targetComment?._id,
      username: targetUsername,
    });
    setText((prev) => (prev ? prev : `@${targetUsername} `));
  };

  /* ─── ADD COMMENT ─── */
  const sendMessageHandler = async () => {
    if (typeof navigator !== "undefined" && !navigator.onLine) {
      toast.error("You're offline. Reconnect to internet to post comments.");
      return;
    }
    if (!text.trim() || !post?._id || submitting) return;
    const commentText = text.trim();
    const parentId = replyingTo?.id;

    try {
      setSubmitting(true);
      const res = await axios.post(
        apiUrl(`/api/v1/post/${post._id}/comment`),
        { text: commentText, parentCommentId: parentId || undefined },
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
          parentId: parentId || null,
          replies: [],
        };

        if (parentId) {
          // Add as reply into target comment
          const updatedComments = comments.map((c) => {
            if (c._id === parentId) {
              return {
                ...c,
                replies: [...(c.replies || []), newComment],
              };
            }
            return c;
          });
          setComments(updatedComments);
          setPostDetail((prev) =>
            prev ? { ...prev, comments: updatedComments } : prev,
          );
        } else {
          const updatedComments = [newComment, ...comments];
          setComments(updatedComments);
          setVisibleCount((prev) => prev + 1);
          setPostDetail((prev) =>
            prev ? { ...prev, comments: updatedComments } : prev,
          );

          const updatedPosts = posts.map((p) =>
            p._id === post._id ? { ...p, comments: updatedComments } : p,
          );
          dispatch(setPosts(updatedPosts));
        }

        toast.success(parentId ? "Reply added" : "Comment added");
        playCommentSound();
        setText("");
        setReplyingTo(null);

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

  /* ─── DERIVED ─── */
  const author = post?.author || post?.user || {};
  const authorName = getDisplayName(author, "Unknown");
  const authorAvatar = author.profilePicture || "";
  const authorInitial = authorName.charAt(0).toUpperCase();
  const showSkeleton = loading && !postDetail;

  const postAuthorId = (author?._id || author)?.toString();
  const reposter =
    userProfile && postAuthorId && postAuthorId !== userProfile._id?.toString()
      ? userProfile
      : user && post?.reposts?.some((id) => (id?._id || id)?.toString() === user._id?.toString())
      ? user
      : null;

  return (
    <>
      <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent
        className="nova-comment-dialog !flex flex-col md:flex-row max-w-[96vw] md:max-w-5xl p-0 h-[92vh] md:h-[84vh] overflow-hidden !gap-0 !rounded-3xl"
        onOpenAutoFocus={(e) => e.preventDefault()}
      >
        <DialogTitle className="sr-only">Comments</DialogTitle>
        <DialogDescription className="sr-only">
          View and add comments on this post
        </DialogDescription>

        {/* ═══════════ MEDIA PANEL ═══════════ */}
        <div
          className="nova-comment-dialog__media"
          onDoubleClick={handleMediaDoubleClick}
          onTouchStart={handleMediaTouchStart} onTouchEnd={handleMediaTouchEnd}
        >
          <div className="nova-comment-dialog__media-glow" aria-hidden />

          <div className="nova-comment-dialog__media-frame">
            {post?.image && !showSkeleton ? (
              post.mediaType === "video" ? (
                <video
                  key={post._id}
                  src={post.image}
                  className="nova-comment-dialog__video"
                  controls
                  playsInline
                  disablePictureInPicture
                  controlsList="nodownload noplaybackrate"
                  preload="metadata"
                  aria-label="Post video"
                  onContextMenu={(event) => event.preventDefault()}
                  onDoubleClick={(event) => event.preventDefault()}
                />
              ) : (
                <img
                  src={post.image}
                  alt="Post"
                  className="nova-comment-dialog__image"
                  draggable={false}
                />
              )
            ) : (
              <div className="nova-comment-dialog__media-skeleton" />
            )}
          </div>

          {mediaBurst && (
            <div
              className="nova-comment-dialog__media-heart"
              aria-hidden="true"
            >
              <LucideHeart
                size={140}
                strokeWidth={2}
                fill="#ff315d"
                color="#ff315d"
              />
            </div>
          )}
        </div>

        {/* ═══════════ COMMENTS PANEL ═══════════ */}
        <div className="nova-comment-dialog__panel">
          {/* REPOST BANNER */}
          {reposter && (
            <div className="flex items-center gap-1.5 px-4 py-2 bg-emerald-500/10 border-b border-emerald-500/20 text-xs font-semibold text-emerald-400">
              <AnimatedIcon icon={Repeat2Icon} size={14} className="stroke-[2.5]" />
              <span>{reposter._id === user?._id ? "You" : (reposter.fullName || reposter.username)} reposted</span>
            </div>
          )}

          {/* HEADER */}
          <div className="nova-comment-dialog__header">
            {showSkeleton ? (
              <div className="nova-comment-dialog__header-skeleton">
                <div className="nova-comment-skel-avatar" />
                <div className="nova-comment-skel-lines">
                  <div
                    className="nova-comment-skel-line"
                    style={{ width: "40%" }}
                  />
                  <div
                    className="nova-comment-skel-line"
                    style={{ width: "25%" }}
                  />
                </div>
              </div>
            ) : (
              <div className="nova-comment-dialog__header-inner">
                <Link
                  to={`/profile/${author.username || author._id}`}
                  className="nova-comment-dialog__header-avatar"
                >
                  <Avatar className="size-9 border border-[var(--border)]">
                    <AvatarImage src={authorAvatar} />
                    <AvatarFallback>{authorInitial}</AvatarFallback>
                  </Avatar>
                </Link>
                <div className="nova-comment-dialog__header-meta">
                  <Link
                    to={`/profile/${author.username || author._id}`}
                    className="nova-comment-dialog__header-name"
                  >
                    {authorName}
                  </Link>
                  <span className="nova-comment-dialog__header-sub">
                    {post?.repostOf ? (
                      <span className="text-cyan-400 font-medium">Quoted a post 💬</span>
                    ) : (
                      "Post author"
                    )}
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* SCROLL BODY */}
          <div className="nova-comment-dialog__scroll">
            {showSkeleton ? (
              <CommentsPanelSkeleton />
            ) : (
              <>
                {post?.caption && (
                  <article className="nova-comment-caption">
                    <Link
                      to={`/profile/${author.username || author._id}`}
                      className="nova-comment-caption__avatar"
                    >
                      <Avatar className="nova-comment__avatar-img">
                        <AvatarImage src={authorAvatar} />
                        <AvatarFallback>{authorInitial}</AvatarFallback>
                      </Avatar>
                    </Link>
                    <div className="nova-comment-caption__content">
                      <p className="nova-comment__line">
                        <Link
                          to={`/profile/${author.username || author._id}`}
                          className="nova-comment-caption__author"
                        >
                          {authorName}
                        </Link>{" "}
                        <span className="nova-comment-caption__text">
                          {post.caption}
                        </span>
                      </p>

                      {/* Quoted post embedded card */}
                      {post?.repostOf && (
                        <div
                          onClick={() => {
                            setOpen(false);
                            navigate(`/post/${post.repostOf?._id}`);
                          }}
                          className="mt-3 rounded-xl border border-[var(--border)] bg-[var(--surface-2)]/60 hover:bg-[var(--surface-2)] hover:border-[var(--primary)]/40 transition-all p-3 cursor-pointer group/quote select-none"
                        >
                          <div className="flex items-center gap-2 mb-1.5">
                            <Avatar className="size-5 border border-[var(--border)]">
                              <AvatarImage src={post.repostOf.author?.profilePicture} />
                              <AvatarFallback className="text-[9px] font-bold">
                                {getDisplayName(post.repostOf.author, "U").charAt(0).toUpperCase()}
                              </AvatarFallback>
                            </Avatar>
                            <span className="text-xs font-semibold text-[var(--foreground)] group-hover/quote:text-[var(--primary)] transition-colors">
                              {getDisplayName(post.repostOf.author)}
                            </span>
                            {post.repostOf.author?.username && (
                              <span className="text-[11px] text-[var(--muted-foreground)]">
                                @{post.repostOf.author.username}
                              </span>
                            )}
                          </div>
                          {post.repostOf.caption && (
                            <p className="text-xs text-[var(--foreground)]/90 leading-relaxed line-clamp-3">
                              {post.repostOf.caption}
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                  </article>
                )}

                {comments.length > 0 && (
                  <div className="nova-comment-dialog__section">
                    <span className="nova-comment-dialog__section-line" />
                    <span className="nova-comment-dialog__section-text">
                      {comments.length}{" "}
                      {comments.length === 1 ? "comment" : "comments"}
                    </span>
                    <span className="nova-comment-dialog__section-line" />
                  </div>
                )}

                <div className="nova-comment-dialog__list">
                  {comments.length > 0 ? (
                    <>
                      {comments.slice(0, visibleCount).map((comment, i) => (
                        <div
                          key={comment._id}
                          className="nova-comment-dialog__item"
                          style={{ animationDelay: `${Math.min(i * 20, 200)}ms` }}
                        >
                          <Comment
                            comment={comment}
                            currentUserId={user?._id}
                            onReply={handleReplyTo}
                          />
                        </div>
                      ))}

                      {visibleCount < comments.length && (
                        <div
                          ref={sentinelRef}
                          className="py-3 flex flex-col items-center justify-center gap-1.5"
                        >
                          <button
                            type="button"
                            onClick={() =>
                              setVisibleCount((prev) =>
                                Math.min(prev + 25, comments.length),
                              )
                            }
                            className="text-xs font-semibold text-[var(--primary)] hover:underline px-3 py-1.5 rounded-full bg-[var(--surface-2)]/80 hover:bg-[var(--surface-2)] transition-all cursor-pointer"
                          >
                            Load more comments ({comments.length - visibleCount} remaining)
                          </button>
                        </div>
                      )}
                    </>
                  ) : (
                    <div className="nova-comment-dialog__empty">
                      <div className="nova-comment-dialog__empty-orb">
                        <AnimatedIcon
                          icon={MessageCircleIcon}
                          size={20}
                          className="text-[var(--muted-foreground)]"
                          strokeWidth={1.8}
                        />
                      </div>
                      <p className="nova-comment-dialog__empty-title">
                        No comments yet
                      </p>
                      <p className="nova-comment-dialog__empty-sub">
                        Be the first to say something.
                      </p>
                    </div>
                  )}
                </div>
              </>
            )}
          </div>

          {/* FOOTER */}
          <div className="nova-comment-dialog__footer">
            {showSkeleton ? (
              <div className="nova-comment-dialog__footer-skeleton">
                <div
                  className="nova-comment-skel-line"
                  style={{ width: "45%" }}
                />
                <div className="nova-comment-skel-input" />
              </div>
            ) : (
              <>
                <div className="nova-comment-dialog__stats">
                  <button
                    type="button"
                    onClick={handleLikeToggle}
                    disabled={liking}
                    aria-label={isLikedByMe ? "Unlike" : "Like"}
                    className={`nova-comment-dialog__stat relative cursor-pointer ${
                      isLikedByMe ? "is-liked" : ""
                    } ${heartPulse ? "is-pulsing nova-like-pop" : ""}`}
                  >
                    <AnimatedIcon
                      icon={HeartIcon}
                      size={18}
                      className={`transition-transform duration-200 ${
                        heartPulse ? "scale-125" : ""
                      }`}
                      strokeWidth={2}
                      fill={isLikedByMe ? "currentColor" : "none"}
                    />
                    {heartPulse && (
                      <span
                        className="absolute inset-0 rounded-full border-2 border-[#ff315d] animate-ping opacity-75 pointer-events-none"
                        aria-hidden
                      />
                    )}
                    <span className="nova-comment-dialog__stat-count">
                      {likeCount}
                    </span>
                  </button>

                  <div className="nova-comment-dialog__stat is-static">
                    <AnimatedIcon icon={MessageCircleIcon} size={18} strokeWidth={2} />
                    <span className="nova-comment-dialog__stat-count">
                      {comments.length}
                    </span>
                  </div>

                  {/* Share button (matches feed post, opens ShareDialog) */}
                  <button
                    type="button"
                    onClick={() => setShareOpen(true)}
                    aria-label="Share post"
                    title="Share post"
                    className="nova-comment-dialog__stat hover:text-[var(--primary)] transition-colors cursor-pointer group/share"
                  >
                    <AnimatedIcon
                      icon={SendIcon}
                      size={18}
                      className="group-hover/share:scale-110 transition-transform"
                      strokeWidth={2}
                    />
                    <span className="nova-comment-dialog__stat-count text-xs">
                      Share
                    </span>
                  </button>


                  <button
                    type="button"
                    onClick={handleSaveToggle}
                    disabled={saving || !user?._id}
                    aria-label={isSaved ? "Unsave" : "Save"}
                    aria-pressed={isSaved}
                    className={`nova-comment-dialog__save cursor-pointer ${
                      isSaved ? "is-saved" : ""
                    }`}
                  >
                    {saving ? (
                      <Loader2 className="size-4 animate-spin" />
                    ) : (
                      <AnimatedIcon
                        icon={BookmarkIcon}
                        size={16}
                        fill={isSaved ? "currentColor" : "none"}
                        strokeWidth={2}
                      />
                    )}
                    <span>{isSaved ? "Saved" : "Save"}</span>
                  </button>
                </div>

                <div className="nova-comment-dialog__composer-wrap flex flex-col gap-1">
                  {replyingTo && (
                    <div className="flex items-center justify-between px-3 py-1.5 rounded-xl bg-[var(--surface-2)] border border-[var(--border)] text-xs text-[var(--muted-foreground)]">
                      <span>
                        Replying to{" "}
                        <span className="font-semibold text-[var(--primary)]">
                          @{replyingTo.username}
                        </span>
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          setReplyingTo(null);
                          setText("");
                        }}
                        className="p-0.5 hover:text-[var(--foreground)] transition-colors cursor-pointer"
                        aria-label="Cancel reply"
                      >
                        <AnimatedIcon icon={XIcon} size={14} />
                      </button>
                    </div>
                  )}
                  <div className="nova-comment-dialog__composer">
                    <Textarea
                      value={text}
                      onChange={(e) => setText(e.target.value)}
                      placeholder={
                        replyingTo
                           ? `Reply to @${replyingTo.username}…`
                           : "Add a comment…"
                      }
                      rows={1}
                      className="nova-flat-inputvnova-comment-dialog__textarea min-h-[42px] max-h-32 resize-none !rounded-2xl !border-0 !bg-transparent !shadow-none !ring-0 !px-1 focus-visible:!ring-0"
                    />
                    <button
                      type="button"
                      onClick={sendMessageHandler}
                      disabled={!text.trim() || submitting}
                      aria-label="Send comment"
                      className="nova-comment-dialog__send cursor-pointer"
                    >
                      {submitting ? (
                        <Loader2 className="size-4 animate-spin" />
                      ) : (
                        <AnimatedIcon icon={SendIcon} size={16} strokeWidth={2.2} />
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

    {/* Share Dialog (Share to Story, Send to Friends, Copy Link) */}
    <ShareDialog
      open={shareOpen}
      onOpenChange={setShareOpen}
      post={post}
    />

    {/* Save to Collection Modal */}
    <SaveToCollectionModal
      isOpen={collectionModalOpen}
      onClose={() => setCollectionModalOpen(false)}
      post={post}
      onSaved={() => setIsSaved(true)}
      onUnsaved={() => setIsSaved(false)}
    />
  </>
);
};

export default CommentDialog;
