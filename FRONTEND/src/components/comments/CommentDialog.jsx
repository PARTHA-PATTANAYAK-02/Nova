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
import { Loader2, Heart as LucideHeart, Bookmark as LucideBookmark, ChevronLeft, ChevronRight, Play, Pause, Volume2, VolumeX, RotateCcw } from "lucide-react";
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
import AiCommentSuggestions from "@/components/comments/AiCommentSuggestions";
import ShareDialog from "@/components/feed/ShareDialog";
import SaveToCollectionModal from "@/components/feed/SaveToCollectionModal";
import axios from "axios";
import { toast } from "sonner";
import { setPosts } from "@/redux/postSlice";
import { updateBookmarks } from "@/redux/authSlice";
import { Textarea } from "@/components/ui/textarea";
import { getErrorMessage, getDisplayName, fmtCount } from "@/lib/utils";
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
  const { user } = useSelector((store) => store.auth);
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

  // Video states
  const dialogVideoRef = useRef(null);
  const [videoPlaying, setVideoPlaying] = useState(false);
  const [videoTime, setVideoTime] = useState(0);
  const [videoDuration, setVideoDuration] = useState(0);
  const [isVideoMuted, setIsVideoMuted] = useState(false);
  const [videoEnded, setVideoEnded] = useState(false);
  const [activeSlide, setActiveSlide] = useState(0);

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
      setVideoPlaying(false);
      setVideoTime(0);
      setVideoEnded(false);
    }
  }, [open]);

  useEffect(() => {
    setVideoPlaying(false);
    setVideoTime(0);
    setVideoEnded(false);
  }, [activeSlide]);

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

  const mediaItems =
    Array.isArray(post?.media) && post.media.length > 0
      ? post.media
      : post?.image
      ? [{ url: post.image, mediaType: post.mediaType || "image" }]
      : [];

  useEffect(() => {
    setActiveSlide(0);
    setVideoPlaying(false);
    setVideoTime(0);
    setVideoEnded(false);
    if (dialogVideoRef.current) dialogVideoRef.current.pause();
  }, [post?._id, open]);

  useEffect(() => {
    setVideoPlaying(false);
    setVideoTime(0);
    setVideoEnded(false);
    if (dialogVideoRef.current) dialogVideoRef.current.pause();
  }, [activeSlide]);

  const currentMedia = mediaItems[activeSlide] || mediaItems[0] || {};
  const currentUrl = currentMedia.url || post?.image;
  const isCurrentVideo = (() => {
    if (currentMedia?.mediaType === "video" || currentMedia?.type === "video") return true;
    if (currentMedia?.mediaType === "image" || currentMedia?.type === "image") return false;
    const targetUrl = (typeof currentMedia === "string" ? currentMedia : "") || currentUrl || currentMedia?.url || "";
    if (typeof targetUrl === "string") {
      const lower = targetUrl.toLowerCase();
      if (
        lower.includes("/video/upload/") ||
        lower.endsWith(".mp4") ||
        lower.endsWith(".webm") ||
        lower.endsWith(".mov") ||
        lower.endsWith(".mkv")
      ) return true;
      if (
        lower.includes("/image/upload/") ||
        lower.endsWith(".jpg") ||
        lower.endsWith(".jpeg") ||
        lower.endsWith(".png") ||
        lower.endsWith(".webp") ||
        lower.endsWith(".gif")
      ) return false;
    }
    if (mediaItems.length <= 1 && post?.mediaType === "video") return true;
    return false;
  })();

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
      const deltaX = t.clientX - touchStartCoordsRef.current.x;
      const deltaY = t.clientY - touchStartCoordsRef.current.y;
      const dist = Math.hypot(deltaX, deltaY);

      if (
        mediaItems.length > 1 &&
        Math.abs(deltaX) > 40 &&
        Math.abs(deltaX) > Math.abs(deltaY) * 1.3
      ) {
        if (deltaX < 0 && activeSlide < mediaItems.length - 1) {
          setActiveSlide((prev) => prev + 1);
          return;
        } else if (deltaX > 0 && activeSlide > 0) {
          setActiveSlide((prev) => prev - 1);
          return;
        }
      }

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

  // Collaborators on this post (excluding the main author)
  const collaborators = (post?.collaborators || []).filter(
    (c) =>
      c &&
      (c._id || c).toString() !== (author?._id || author)?.toString()
  );

  const postAuthorId = (author?._id || author)?.toString();
  const isCollab = (post?.collaborators || []).length > 0;
  const isAuthorOrCollab = Boolean(
    user?._id && (
      postAuthorId === user._id.toString() ||
      (post?.collaborators || []).some((c) => (c?._id || c)?.toString() === user._id.toString())
    )
  );

  // Collab posts or author/collaborator posts must NEVER show repost banner!
  const reposter =
    !isCollab &&
    !isAuthorOrCollab &&
    (post?.repostAuthor || post?.repostedBy)
      ? (post.repostAuthor || post.repostedBy)
      : null;

  return (
    <>
      <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent
        className="nova-comment-dialog !flex flex-col md:flex-row max-w-[96vw] sm:max-w-xl md:max-w-5xl p-0 h-[92dvh] md:h-[84vh] overflow-hidden !gap-0 !rounded-3xl"
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

          <div className="nova-comment-dialog__media-frame relative select-none">
            {currentUrl && !showSkeleton ? (
              isCurrentVideo ? (
                <div className="relative size-full flex items-center justify-center bg-black overflow-hidden select-none">
                  <video
                    key={currentUrl}
                    ref={dialogVideoRef}
                    src={currentUrl}
                    className="nova-comment-dialog__video size-full object-contain cursor-pointer"
                    playsInline
                    muted={isVideoMuted}
                    preload="metadata"
                    aria-label="Post video"
                    onContextMenu={(event) => event.preventDefault()}
                    onClick={(e) => {
                      e.stopPropagation();
                      const v = dialogVideoRef.current;
                      if (!v) return;
                      if (v.ended) {
                        v.currentTime = 0;
                        setVideoTime(0);
                        setVideoEnded(false);
                      }
                      if (v.paused) {
                        v.play().catch(() => {});
                      } else {
                        v.pause();
                      }
                    }}
                    onLoadedMetadata={(e) => setVideoDuration(e.currentTarget.duration || 0)}
                    onTimeUpdate={(e) => setVideoTime(e.currentTarget.currentTime || 0)}
                    onPlay={() => {
                      setVideoPlaying(true);
                      setVideoEnded(false);
                    }}
                    onPause={() => setVideoPlaying(false)}
                    onEnded={() => {
                      setVideoPlaying(false);
                      setVideoEnded(true);
                    }}
                  />

                  {/* Center Play / Replay button when paused */}
                  {!videoPlaying && (
                    <button
                      type="button"
                      aria-label={videoEnded ? "Replay video" : "Play video"}
                      onClick={(e) => {
                        e.stopPropagation();
                        const v = dialogVideoRef.current;
                        if (!v) return;
                        if (v.ended || videoEnded) {
                          v.currentTime = 0;
                          setVideoTime(0);
                          setVideoEnded(false);
                        }
                        v.play().catch(() => {});
                      }}
                      className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-20 size-14 rounded-full flex items-center justify-center bg-black/45 hover:bg-black/65 backdrop-blur-md border border-white/20 text-white shadow-2xl hover:scale-110 active:scale-95 transition-all cursor-pointer"
                    >
                      {videoEnded ? (
                        <RotateCcw size={22} strokeWidth={2} />
                      ) : (
                        <Play size={22} fill="currentColor" className="ml-1" />
                      )}
                    </button>
                  )}

                  {/* Top-Left Mute / Unmute Button */}
                  <button
                    type="button"
                    aria-label={isVideoMuted ? "Unmute" : "Mute"}
                    onClick={(e) => {
                      e.stopPropagation();
                      const next = !isVideoMuted;
                      setIsVideoMuted(next);
                      if (dialogVideoRef.current) dialogVideoRef.current.muted = next;
                    }}
                    className="absolute top-3 left-3 z-20 size-8 rounded-full bg-black/50 hover:bg-black/75 backdrop-blur-md border border-white/20 text-white flex items-center justify-center transition-all hover:scale-110 active:scale-95 cursor-pointer shadow-md"
                  >
                    {isVideoMuted ? <VolumeX size={15} /> : <Volume2 size={15} />}
                  </button>

                  {/* Sleek Minimal Progress Line (Normal line, NO black box!) */}
                  <div
                    className="absolute bottom-0 left-0 right-0 z-30 h-1 hover:h-2 bg-white/25 transition-all cursor-pointer group/line"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <div
                      className="h-full bg-white transition-all duration-75 relative shadow-[0_0_8px_rgba(255,255,255,0.8)]"
                      style={{
                        width: `${videoDuration ? Math.min(100, (videoTime / videoDuration) * 100) : 0}%`,
                      }}
                    />
                    <input
                      type="range"
                      min="0"
                      max={videoDuration || 1}
                      step="0.05"
                      value={Math.min(videoTime, videoDuration || 0)}
                      onChange={(e) => {
                        const t = Number(e.target.value);
                        setVideoTime(t);
                        if (dialogVideoRef.current) dialogVideoRef.current.currentTime = t;
                      }}
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                      aria-label="Seek video"
                    />
                  </div>
                </div>
              ) : (
                <img
                  key={currentUrl}
                  src={currentUrl}
                  alt={post.caption || `Post media ${activeSlide + 1}`}
                  className="nova-comment-dialog__image"
                  draggable={false}
                />
              )
            ) : (
              <div className="nova-comment-dialog__media-skeleton" />
            )}

            {/* Slide counter */}
            {mediaItems.length > 1 && (
              <div className="absolute top-3 right-3 z-20 px-2.5 py-1 rounded-full bg-black/60 backdrop-blur-md border border-white/15 text-white text-[11px] font-semibold tracking-wide pointer-events-none select-none whitespace-nowrap">
                {activeSlide + 1} / {mediaItems.length}
              </div>
            )}

            {/* Left & Right Chevrons */}
            {mediaItems.length > 1 && activeSlide > 0 && (
              <button
                type="button"
                aria-label="Previous slide"
                onClick={(e) => {
                  e.stopPropagation();
                  setActiveSlide((prev) => Math.max(0, prev - 1));
                }}
                className="absolute left-2.5 top-1/2 -translate-y-1/2 z-20 size-8 sm:size-9 rounded-full bg-black/60 hover:bg-black/85 backdrop-blur-md border border-white/20 text-white flex items-center justify-center shadow-lg transition-all active:scale-90 cursor-pointer"
              >
                <ChevronLeft size={18} />
              </button>
            )}
            {mediaItems.length > 1 && activeSlide < mediaItems.length - 1 && (
              <button
                type="button"
                aria-label="Next slide"
                onClick={(e) => {
                  e.stopPropagation();
                  setActiveSlide((prev) => Math.min(mediaItems.length - 1, prev + 1));
                }}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 z-20 size-8 sm:size-9 rounded-full bg-black/60 hover:bg-black/85 backdrop-blur-md border border-white/20 text-white flex items-center justify-center shadow-lg transition-all active:scale-90 cursor-pointer"
              >
                <ChevronRight size={18} />
              </button>
            )}

            {/* Pagination dots */}
            {mediaItems.length > 1 && (
              <div className="absolute bottom-3 left-1/2 -translate-x-1/2 z-20 flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-black/40 backdrop-blur-md pointer-events-none">
                {mediaItems.map((_, idx) => (
                  <span
                    key={idx}
                    className={`transition-all duration-300 rounded-full ${
                      idx === activeSlide
                        ? "w-2.5 h-1.5 bg-white shadow-sm"
                        : "w-1.5 h-1.5 bg-white/45"
                    }`}
                  />
                ))}
              </div>
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
                {collaborators.length > 0 ? (
                  <div className="relative size-10 shrink-0 select-none">
                    {/* Author Avatar (top-left) */}
                    <Link
                      to={`/profile/${author.username || author._id}`}
                      className="absolute top-0 left-0 size-7 rounded-full border-2 border-[var(--surface)] ring-1 ring-[var(--border)] overflow-hidden z-10 transition-transform hover:scale-110 hover:z-30 block bg-[var(--surface)] shadow-sm"
                      title={author.fullName || author.username}
                      aria-label={`${author.fullName || author.username} profile`}
                    >
                      <Avatar className="size-full">
                        <AvatarImage
                          src={authorAvatar}
                          alt={author.fullName || author.username}
                          className="object-cover size-full"
                        />
                        <AvatarFallback className="text-[10px] font-bold">
                          {authorInitial}
                        </AvatarFallback>
                      </Avatar>
                    </Link>
                    {/* Collaborator Avatar (bottom-right) */}
                    <Link
                      to={`/profile/${collaborators[0]?.username || collaborators[0]?._id}`}
                      className="absolute bottom-0 right-0 size-7 rounded-full border-2 border-[var(--surface)] ring-1 ring-[var(--border)] overflow-hidden z-20 transition-transform hover:scale-110 hover:z-30 block bg-[var(--surface)] shadow-sm"
                      title={collaborators[0]?.fullName || collaborators[0]?.username}
                      aria-label={`${collaborators[0]?.fullName || collaborators[0]?.username} profile`}
                    >
                      <Avatar className="size-full">
                        <AvatarImage
                          src={collaborators[0]?.profilePicture}
                          alt={collaborators[0]?.fullName || collaborators[0]?.username}
                          className="object-cover size-full"
                        />
                        <AvatarFallback className="text-[10px] font-bold">
                          {(collaborators[0]?.fullName || collaborators[0]?.username || "U").charAt(0).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                    </Link>
                  </div>
                ) : (
                  <Link
                    to={`/profile/${author.username || author._id}`}
                    className="nova-comment-dialog__header-avatar"
                  >
                    <Avatar className="size-9 border border-[var(--border)]">
                      <AvatarImage src={authorAvatar} />
                      <AvatarFallback>{authorInitial}</AvatarFallback>
                    </Avatar>
                  </Link>
                )}
                <div className="nova-comment-dialog__header-meta min-w-0 flex-1">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <Link
                      to={`/profile/${author.username || author._id}`}
                      className="nova-comment-dialog__header-name hover:text-[var(--primary)] transition-colors"
                    >
                      {authorName}
                    </Link>
                    {collaborators.length > 0 && (
                      <>
                        <span className="text-[12px] text-[var(--muted-foreground)] font-normal">and</span>
                        <Link
                          to={`/profile/${collaborators[0]?.username || collaborators[0]?._id}`}
                          className="nova-comment-dialog__header-name hover:text-[var(--primary)] transition-colors"
                        >
                          {collaborators[0]?.fullName || collaborators[0]?.username}
                        </Link>
                        {collaborators.length > 1 && (
                          <span className="text-[11px] font-medium text-[var(--muted-foreground)]">
                            +{collaborators.length - 1} more
                          </span>
                        )}
                      </>
                    )}
                  </div>
                  <span className="nova-comment-dialog__header-sub">
                    {post?.repostOf ? (
                      <span className="text-cyan-400 font-medium">Quoted a post 💬</span>
                    ) : post?.location ? (
                      post.location
                    ) : collaborators.length > 0 ? (
                      "Authors"
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
                    {collaborators.length > 0 ? (
                      <div className="relative size-8 shrink-0 select-none mr-2">
                        <Link
                          to={`/profile/${author.username || author._id}`}
                          className="absolute top-0 left-0 size-6 rounded-full border-2 border-[var(--surface)] ring-1 ring-[var(--border)] overflow-hidden z-10 block"
                          title={authorName}
                        >
                          <Avatar className="size-full">
                            <AvatarImage src={authorAvatar} />
                            <AvatarFallback className="text-[9px] font-bold">{authorInitial}</AvatarFallback>
                          </Avatar>
                        </Link>
                        <Link
                          to={`/profile/${collaborators[0]?.username || collaborators[0]?._id}`}
                          className="absolute bottom-0 right-0 size-6 rounded-full border-2 border-[var(--surface)] ring-1 ring-[var(--border)] overflow-hidden z-20 block"
                          title={collaborators[0]?.fullName || collaborators[0]?.username}
                        >
                          <Avatar className="size-full">
                            <AvatarImage src={collaborators[0]?.profilePicture} />
                            <AvatarFallback className="text-[9px] font-bold">
                              {(collaborators[0]?.fullName || collaborators[0]?.username || "U").charAt(0).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                        </Link>
                      </div>
                    ) : (
                      <Link
                        to={`/profile/${author.username || author._id}`}
                        className="nova-comment-caption__avatar"
                      >
                        <Avatar className="nova-comment__avatar-img">
                          <AvatarImage src={authorAvatar} />
                          <AvatarFallback>{authorInitial}</AvatarFallback>
                        </Avatar>
                      </Link>
                    )}
                    <div className="nova-comment-caption__content">
                      <p className="nova-comment__line">
                        <Link
                          to={`/profile/${author.username || author._id}`}
                          className="nova-comment-caption__author"
                        >
                          {authorName}
                        </Link>{" "}
                        {collaborators.length > 0 && (
                          <>
                            <span className="text-[12px] text-[var(--muted-foreground)] font-normal mx-1">and</span>
                            <Link
                              to={`/profile/${collaborators[0]?.username || collaborators[0]?._id}`}
                              className="nova-comment-caption__author"
                            >
                              {collaborators[0]?.fullName || collaborators[0]?.username}
                            </Link>{" "}
                          </>
                        )}
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
                          <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                            {(() => {
                              const quoteCollabs = (post.repostOf.collaborators || []).filter(
                                (c) => c && (c._id || c).toString() !== (post.repostOf.author?._id || post.repostOf.author)?.toString()
                              );
                              return (
                                <>
                                  {quoteCollabs.length > 0 ? (
                                    <div className="relative size-6 shrink-0 select-none mr-0.5">
                                      <Avatar className="absolute top-0 left-0 size-4 border border-[var(--surface)] shadow-sm">
                                        <AvatarImage src={post.repostOf.author?.profilePicture} />
                                        <AvatarFallback className="text-[7px] font-bold">
                                          {getDisplayName(post.repostOf.author, "U").charAt(0).toUpperCase()}
                                        </AvatarFallback>
                                      </Avatar>
                                      <Avatar className="absolute bottom-0 right-0 size-4 border border-[var(--surface)] shadow-sm">
                                        <AvatarImage src={quoteCollabs[0]?.profilePicture} />
                                        <AvatarFallback className="text-[7px] font-bold">
                                          {(quoteCollabs[0]?.fullName || quoteCollabs[0]?.username || "U").charAt(0).toUpperCase()}
                                        </AvatarFallback>
                                      </Avatar>
                                    </div>
                                  ) : (
                                    <Avatar className="size-5 border border-[var(--border)]">
                                      <AvatarImage src={post.repostOf.author?.profilePicture} />
                                      <AvatarFallback className="text-[9px] font-bold">
                                        {getDisplayName(post.repostOf.author, "U").charAt(0).toUpperCase()}
                                      </AvatarFallback>
                                    </Avatar>
                                  )}
                                  <span className="text-xs font-semibold text-[var(--foreground)] group-hover/quote:text-[var(--primary)] transition-colors">
                                    {getDisplayName(post.repostOf.author)}
                                  </span>
                                  {quoteCollabs.length > 0 && (
                                    <>
                                      <span className="text-[11px] text-[var(--muted-foreground)] font-normal">and</span>
                                      <span className="text-xs font-semibold text-[var(--foreground)] group-hover/quote:text-[var(--primary)] transition-colors">
                                        {quoteCollabs[0]?.fullName || quoteCollabs[0]?.username}
                                      </span>
                                    </>
                                  )}
                                  {quoteCollabs.length === 0 && post.repostOf.author?.username && (
                                    <span className="text-[11px] text-[var(--muted-foreground)]">
                                      @{post.repostOf.author.username}
                                    </span>
                                  )}
                                </>
                              );
                            })()}
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
                <div className="nova-comment-dialog__stats flex items-center justify-between select-none px-3.5 py-2 border-t border-[var(--border)]/40">
                  {/* Left group */}
                  <div className="flex items-center gap-2 sm:gap-3">
                    {/* Like */}
                    <button
                      type="button"
                      onClick={handleLikeToggle}
                      disabled={liking}
                      aria-label={isLikedByMe ? "Unlike" : "Like"}
                      className={`px-2.5 py-1.5 rounded-full flex items-center gap-1.5 transition-all duration-200 outline-none active:scale-90 cursor-pointer select-none ${
                        isLikedByMe
                          ? "text-[#ff315d] hover:bg-[#ff315d]/10"
                          : "text-[var(--foreground)] hover:text-[#ff315d] hover:bg-[#ff315d]/10"
                      }`}
                    >
                      <div className="relative flex items-center justify-center">
                        {isLikedByMe ? (
                          <LucideHeart
                            size={20}
                            strokeWidth={2.1}
                            fill="#ff315d"
                            color="#ff315d"
                            className={`transition-transform duration-200 ${
                              heartPulse ? "scale-125" : "scale-105"
                            }`}
                          />
                        ) : (
                          <AnimatedIcon
                            icon={HeartIcon}
                            size={20}
                            className={`transition-transform duration-200 ${
                              heartPulse ? "scale-125" : ""
                            }`}
                            strokeWidth={2.1}
                          />
                        )}
                        {heartPulse && (
                          <span
                            className="absolute -inset-1 rounded-full border-2 border-[#ff315d] animate-ping opacity-75 pointer-events-none"
                            aria-hidden
                          />
                        )}
                      </div>
                      {likeCount > 0 && (
                        <span className="text-[13px] sm:text-[13.5px] font-semibold tabular-nums tracking-tight">
                          {fmtCount(likeCount)}
                        </span>
                      )}
                    </button>

                    {/* Comment */}
                    <div className="px-2.5 py-1.5 rounded-full flex items-center gap-1.5 text-[var(--foreground)] hover:bg-[var(--primary)]/10 transition-colors select-none">
                      <AnimatedIcon icon={MessageCircleIcon} size={20} strokeWidth={2.1} />
                      {comments.length > 0 && (
                        <span className="text-[13px] sm:text-[13.5px] font-semibold tabular-nums tracking-tight">
                          {fmtCount(comments.length)}
                        </span>
                      )}
                    </div>

                    {/* Share button */}
                    <button
                      type="button"
                      onClick={() => setShareOpen(true)}
                      aria-label="Share post"
                      title="Share post"
                      className="p-2 rounded-full flex items-center justify-center text-[var(--foreground)] hover:text-[var(--primary)] hover:bg-[var(--primary)]/10 active:scale-90 transition-all duration-200 outline-none cursor-pointer"
                    >
                      <AnimatedIcon
                        icon={SendIcon}
                        size={20}
                        strokeWidth={2.1}
                      />
                    </button>
                  </div>

                  {/* Bookmark / Save (Right side) */}
                  <button
                    type="button"
                    onClick={handleSaveToggle}
                    disabled={saving || !user?._id}
                    aria-label={isSaved ? "Unsave" : "Save"}
                    aria-pressed={isSaved}
                    className={`p-2 rounded-full flex items-center justify-center transition-all duration-200 outline-none active:scale-90 cursor-pointer ${
                      isSaved ? "text-[var(--primary)] hover:bg-[var(--primary)]/10" : "text-[var(--foreground)] hover:text-[var(--primary)] hover:bg-[var(--primary)]/10"
                    }`}
                  >
                    {saving ? (
                      <Loader2 className="size-4 animate-spin" />
                    ) : isSaved ? (
                      <LucideBookmark
                        size={20}
                        strokeWidth={2.1}
                        fill="currentColor"
                        color="currentColor"
                        className="scale-105"
                      />
                    ) : (
                      <AnimatedIcon
                        icon={BookmarkIcon}
                        size={20}
                        strokeWidth={2.1}
                      />
                    )}
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
                    <div className="flex items-center gap-1 shrink-0">
                      <AiCommentSuggestions
                        post={selectedPost}
                        onSelectComment={(val) => setText(val)}
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
