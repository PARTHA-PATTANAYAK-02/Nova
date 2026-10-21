import React, { useCallback, useEffect, useRef, useState } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Bookmark,
  Check,
  EllipsisVertical,
  Heart,
  MessageCircle,
  Pause,
  Play,
  RotateCcw,
  SendHorizontal,
  Volume1,
  Volume2,
  VolumeX,
  UserMinus,
  UserPlus,
  Trash2,
} from "lucide-react";
import CommentDialog from "@/components/comments/CommentDialog";
import ShareDialog from "@/components/feed/ShareDialog";
import { useDispatch, useSelector } from "react-redux";
import axios from "axios";
import { toast } from "sonner";
import { setPosts, setSelectedPost } from "@/redux/postSlice";
import { Link, useNavigate } from "react-router-dom";
import { updateBookmarks, updateFollowing } from "@/redux/authSlice";
import { getDisplayName, getErrorMessage } from "@/lib/utils";
import { apiUrl } from "@/lib/api";
import { playLikeSound, playCommentSound } from "@/lib/sound";

const MINI_HEARTS = [
  { id: 1, tx: "-26px", ty: "-70px", scale: 0.9, rot: "-18deg", delay: "0ms" },
  { id: 2, tx: "0px", ty: "-84px", scale: 1.15, rot: "8deg", delay: "35ms" },
  { id: 3, tx: "24px", ty: "-66px", scale: 0.85, rot: "22deg", delay: "70ms" },
  { id: 4, tx: "-12px", ty: "-52px", scale: 0.75, rot: "-12deg", delay: "105ms" },
  { id: 5, tx: "16px", ty: "-56px", scale: 0.8, rot: "15deg", delay: "140ms" },
];

const formatTime = (seconds) => {
  if (!Number.isFinite(seconds)) return "0:00";
  const m = Math.floor(seconds / 60);
  const s = String(Math.floor(seconds % 60)).padStart(2, "0");
  return `${m}:${s}`;
};

/* clamp extreme ratios so no post is absurdly tall/wide */
const clampAspect = (r) => Math.max(0.55, Math.min(2.4, r));

const Post = ({ post }) => {
  const [text, setText] = useState("");
  const [open, setOpen] = useState(false);
  const [liked, setLiked] = useState(false);
  const [postLike, setPostLike] = useState(post?.likes?.length || 0);
  const [comment, setComment] = useState(post?.comments || []);
  const [actionLoading, setActionLoading] = useState(null);
  const [bookmarked, setBookmarked] = useState(false);
  const [videoPlaying, setVideoPlaying] = useState(false);
  const [videoEnded, setVideoEnded] = useState(false);
  const [videoTime, setVideoTime] = useState(0);
  const [videoDuration, setVideoDuration] = useState(0);
  const [videoVolume, setVideoVolume] = useState(1);
  const [controlsVisible, setControlsVisible] = useState(true);
  const [heartBurst, setHeartBurst] = useState(false);
  const [isLikeAnimating, setIsLikeAnimating] = useState(false);
  const [isBookmarkAnimating, setIsBookmarkAnimating] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [showVolumeSlider, setShowVolumeSlider] = useState(false);

  /* ── ADAPTIVE MEDIA ASPECT ───────────────────── */
  const [mediaAspect, setMediaAspect] = useState(4 / 5);
  const [mediaReady, setMediaReady] = useState(false);

  const { user } = useSelector((s) => s.auth);
  const { posts, selectedPost } = useSelector((s) => s.post);
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const likeRef = useRef(null);
  const commentRef = useRef(null);
  const bookmarkRef = useRef(null);
  const videoRef = useRef(null);
  const controlsTimeoutRef = useRef(null);
  const heartTimeoutRef = useRef(null);
  const likeAnimTimeoutRef = useRef(null);
  const bookmarkAnimTimeoutRef = useRef(null);
  const lastTouchRef = useRef(0);

  const isOwnPost = user?._id === post?.author?._id;
  const isFollowing = user?.following?.some(
    (i) => (i?._id || i) === post?.author?._id,
  );

  /* reset aspect when post changes */
  useEffect(() => {
    setMediaAspect(4 / 5);
    setMediaReady(false);
  }, [post?._id]);

  useEffect(() => {
    setLiked(post?.likes?.some((i) => (i?._id || i) === user?._id) || false);
    setPostLike(post?.likes?.length || 0);
    setComment(post?.comments || []);
  }, [post?._id, post?.likes, post?.comments, user?._id]);

  useEffect(() => {
    setBookmarked(
      user?.bookmarks?.some((i) => (i?._id || i) === post?._id) || false,
    );
  }, [user?.bookmarks, post?._id]);

  useEffect(() => {
    if (selectedPost?._id === post?._id) setOpen(true);
  }, [selectedPost, post?._id]);

  const triggerAnimation = useCallback((ref, cls) => {
    const el = ref.current;
    if (!el) return;
    el.classList.remove(cls);
    void el.offsetWidth;
    el.classList.add(cls);
    window.setTimeout(() => el.classList.remove(cls), 850);
  }, []);

  const showControls = useCallback(() => {
    setControlsVisible(true);
    window.clearTimeout(controlsTimeoutRef.current);
    if (videoRef.current && !videoRef.current.paused) {
      controlsTimeoutRef.current = window.setTimeout(
        () => setControlsVisible(false),
        2600,
      );
    }
  }, []);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || post?.mediaType !== "video") return undefined;

    const syncPlayback = () => {
      const videos = [...document.querySelectorAll("video[data-feed-video]")];
      const center = window.innerHeight / 2;
      let activeVideo = null;
      let closest = Infinity;

      videos.forEach((v) => {
        const rect = v.getBoundingClientRect();
        const visible = Math.max(
          0,
          Math.min(rect.bottom, window.innerHeight) - Math.max(rect.top, 0),
        );
        const ratio = visible / Math.max(rect.height, 1);
        const dist = Math.abs(rect.top + rect.height / 2 - center);
        if (
          ratio >= 0.72 &&
          dist < window.innerHeight * 0.3 &&
          dist < closest
        ) {
          closest = dist;
          activeVideo = v;
        }
      });

      const tabVisible = document.visibilityState === "visible";
      videos.forEach((v) => {
        const shouldPlay =
          v === activeVideo &&
          tabVisible &&
          v.dataset.userPaused !== "true" &&
          !v.ended;
        if (shouldPlay && v.paused) v.play().catch(() => {});
        else if (!shouldPlay && !v.paused) {
          v.dataset.autoPause = "true";
          v.pause();
        }
      });
    };

    const io = new IntersectionObserver(syncPlayback, {
      threshold: [0, 0.5, 0.72, 0.9, 1],
    });
    io.observe(video);
    window.addEventListener("scroll", syncPlayback, { passive: true });
    window.addEventListener("resize", syncPlayback);
    document.addEventListener("visibilitychange", syncPlayback);
    syncPlayback();

    return () => {
      io.disconnect();
      window.removeEventListener("scroll", syncPlayback);
      window.removeEventListener("resize", syncPlayback);
      document.removeEventListener("visibilitychange", syncPlayback);
      video.pause();
    };
  }, [post?._id, post?.mediaType]);

  useEffect(
    () => () => {
      window.clearTimeout(controlsTimeoutRef.current);
      window.clearTimeout(heartTimeoutRef.current);
      window.clearTimeout(likeAnimTimeoutRef.current);
      window.clearTimeout(bookmarkAnimTimeoutRef.current);
    },
    [],
  );

  /* ── IMAGE ASPECT ON LOAD ────────────────────── */
  const handleImageLoad = (e) => {
    const { naturalWidth: w, naturalHeight: h } = e.currentTarget;
    if (w && h) setMediaAspect(clampAspect(w / h));
    setMediaReady(true);
  };

  /* ── VIDEO ASPECT ON METADATA ────────────────── */
  const handleVideoMetadata = (e) => {
    const { videoWidth: w, videoHeight: h } = e.currentTarget;
    if (w && h) setMediaAspect(clampAspect(w / h));
    setVideoDuration(e.currentTarget.duration || 0);
    e.currentTarget.volume = videoVolume;
    setMediaReady(true);
  };

  const likeOrDislikeHandler = async () => {
    if (actionLoading === "like" || !user?._id) return;
    const wasLiked = liked;
    const nextLiked = !wasLiked;
    const prevPosts = posts;
    const nextCount = Math.max(0, postLike + (nextLiked ? 1 : -1));

    setLiked(nextLiked);
    setPostLike(nextCount);
    setIsLikeAnimating(true);
    window.clearTimeout(likeAnimTimeoutRef.current);
    likeAnimTimeoutRef.current = window.setTimeout(
      () => setIsLikeAnimating(false),
      650,
    );
    playLikeSound(nextLiked);
    const updated = posts.map((item) =>
      item._id === post._id
        ? {
            ...item,
            likes: nextLiked
              ? [
                  ...(item.likes || []).filter(
                    (id) => (id?._id || id) !== user._id,
                  ),
                  user._id,
                ]
              : (item.likes || []).filter((id) => (id?._id || id) !== user._id),
          }
        : item,
    );
    dispatch(setPosts(updated));

    try {
      setActionLoading("like");
      const action = nextLiked ? "like" : "dislike";
      const res = await axios.get(
        apiUrl(`/api/v1/post/${post._id}/${action}`),
        { withCredentials: true },
      );
      if (!res.data.success) throw new Error("Unable to update the like.");
    } catch (error) {
      setLiked(wasLiked);
      setPostLike(postLike);
      dispatch(setPosts(prevPosts));
      toast.error(getErrorMessage(error, "Unable to update the like."));
    } finally {
      setActionLoading(null);
    }
  };

  const handleMediaDoubleClick = () => {
    setHeartBurst(true);
    window.clearTimeout(heartTimeoutRef.current);
    heartTimeoutRef.current = window.setTimeout(
      () => setHeartBurst(false),
      950,
    );
    if (!liked) likeOrDislikeHandler();
  };

  const handleMediaTouchEnd = (e) => {
    const now = Date.now();
    if (now - lastTouchRef.current < 280) {
      e.preventDefault();
      handleMediaDoubleClick();
    }
    lastTouchRef.current = now;
  };

  const commentHandler = async (e) => {
    e?.preventDefault?.();
    if (!text.trim() || actionLoading) return;
    try {
      setActionLoading("comment");
      const res = await axios.post(
        apiUrl(`/api/v1/post/${post._id}/comment`),
        { text: text.trim() },
        {
          headers: { "Content-Type": "application/json" },
          withCredentials: true,
        },
      );
      if (res.data.success) {
        triggerAnimation(commentRef, "nova-pop");
        playCommentSound();
        const next = [...comment, res.data.comment];
        setComment(next);
        dispatch(
          setPosts(
            posts.map((i) =>
              i._id === post._id ? { ...i, comments: next } : i,
            ),
          ),
        );
        setText("");
        toast.success(res.data.message || "Comment added");
      }
    } catch (error) {
      toast.error(getErrorMessage(error, "Unable to add your comment."));
    } finally {
      setActionLoading(null);
    }
  };

  const bookmarkHandler = async () => {
    if (actionLoading) return;
    try {
      setActionLoading("bookmark");
      const res = await axios.get(
        apiUrl(`/api/v1/post/${post?._id}/bookmark`),
        { withCredentials: true },
      );
      if (res.data.success) {
        const isSaved = res.data.type === "saved";
        setBookmarked(isSaved);
        setIsBookmarkAnimating(true);
        window.clearTimeout(bookmarkAnimTimeoutRef.current);
        bookmarkAnimTimeoutRef.current = window.setTimeout(
          () => setIsBookmarkAnimating(false),
          650,
        );
        dispatch(updateBookmarks({ postId: post._id }));
        toast.success(
          res.data.message || (isSaved ? "Post saved" : "Post removed"),
        );
      }
    } catch (error) {
      toast.error(getErrorMessage(error, "Unable to update saved posts."));
    } finally {
      setActionLoading(null);
    }
  };

  const handleFollow = async () => {
    if (actionLoading) return;
    try {
      setActionLoading("follow");
      const res = await axios.post(
        apiUrl(`/api/v1/user/followorunfollow/${post.author._id}`),
        {},
        { withCredentials: true },
      );
      if (res.data.success) {
        dispatch(updateFollowing(post.author._id));
        toast.success(res.data.message);
      }
    } catch (error) {
      toast.error(getErrorMessage(error, "Unable to update follow status."));
    } finally {
      setActionLoading(null);
    }
  };

  const deletePostHandler = async () => {
    if (actionLoading) return;
    try {
      setActionLoading("delete");
      const res = await axios.delete(
        apiUrl(`/api/v1/post/delete/${post?._id}`),
        { withCredentials: true },
      );
      if (res.data.success) {
        dispatch(setPosts(posts.filter((i) => i?._id !== post?._id)));
        toast.success(res.data.message);
      }
    } catch (error) {
      toast.error(getErrorMessage(error, "Unable to delete this post."));
    } finally {
      setActionLoading(null);
    }
  };

  const openChatWithAuthor = () =>
    navigate("/chat", { state: { user: post.author } });

  const openComments = () => {
    dispatch(setSelectedPost(post));
    setOpen(true);
    triggerAnimation(commentRef, "nova-pop");
  };

  const progressPercent = videoDuration
    ? Math.min(100, (videoTime / videoDuration) * 100)
    : 0;

  const mediaStyle = {
    aspectRatio: String(mediaAspect),
    maxHeight: "min(85vh, 880px)",
  };

  return (
    <article
      className="
        nova-post-card
        relative overflow-hidden rounded-3xl
        bg-[var(--surface)]/70 backdrop-blur-xl
        border border-[var(--border)]/60
        shadow-[0_2px_8px_-2px_rgba(0,0,0,.05),0_12px_40px_-24px_rgba(0,0,0,.18)]
        transition-all duration-300 ease-[cubic-bezier(.2,.8,.2,1)]
      "
    >
      {/* ── HEADER ─────────────────────────────────── */}
      <header className="flex items-center gap-3 px-4 py-3">
        <Link
          to={`/profile/${post.author._id}`}
          className="relative shrink-0 size-10 flex items-center justify-center"
          aria-label={`${getDisplayName(post.author)} profile`}
        >
          <Avatar className="size-10 border border-[var(--border)] transition-transform hover:scale-105">
            <AvatarImage
              src={post.author?.profilePicture}
              alt={getDisplayName(post.author)}
            />
            <AvatarFallback>
              {getDisplayName(post.author, "U").charAt(0).toUpperCase()}
            </AvatarFallback>
          </Avatar>
        </Link>

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <Link
              to={`/profile/${post.author._id}`}
              className="text-[13.5px] font-semibold text-[var(--foreground)] truncate hover:text-[var(--primary)] transition-colors duration-200"
            >
              {getDisplayName(post.author)}
            </Link>
            {isOwnPost && (
              <span className="shrink-0 text-[9px] font-bold tracking-wider uppercase px-1.5 py-[2px] rounded-md bg-[var(--primary)]/12 text-[var(--primary)]">
                You
              </span>
            )}
          </div>
          <p className="text-[11.5px] text-[var(--muted-foreground)] truncate mt-0.5">
            {post.location ||
              (post.mediaType === "video" ? "Video" : "Shared a moment")}
          </p>
        </div>

        <Dialog>
          <DialogTrigger asChild>
            <button
              type="button"
              aria-label="Post options"
              className="
                shrink-0 size-9 rounded-full
                flex items-center justify-center
                text-[var(--muted-foreground)]
                hover:text-[var(--foreground)] hover:bg-[var(--surface-2)]
                active:scale-90 transition-all duration-200
                outline-none focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)]/40
              "
            >
              <EllipsisVertical size={20} strokeWidth={2} />
            </button>
          </DialogTrigger>

          <DialogContent className="sm:max-w-[340px] p-2 rounded-2xl">
            <DialogTitle className="sr-only">Post options</DialogTitle>
            <DialogDescription className="sr-only">
              Manage this post
            </DialogDescription>

            <div className="flex flex-col gap-0.5">
              {!isOwnPost && (
                <button
                  type="button"
                  onClick={handleFollow}
                  disabled={!!actionLoading}
                  className="
                    flex items-center gap-3 px-3 py-3 rounded-xl text-sm font-medium
                    text-[var(--foreground)] hover:bg-[var(--surface-2)]
                    active:scale-[.98] transition-all duration-200
                    outline-none disabled:opacity-50
                  "
                >
                  {isFollowing ? (
                    <UserMinus
                      className="size-4 text-[var(--danger)]"
                      strokeWidth={2}
                    />
                  ) : (
                    <UserPlus
                      className="size-4 text-[var(--primary)]"
                      strokeWidth={2}
                    />
                  )}
                  {isFollowing ? "Unfollow account" : "Follow account"}
                </button>
              )}
              <button
                type="button"
                onClick={bookmarkHandler}
                disabled={!!actionLoading}
                className="
                  flex items-center gap-3 px-3 py-3 rounded-xl text-sm font-medium
                  text-[var(--foreground)] hover:bg-[var(--surface-2)]
                  active:scale-[.98] transition-all duration-200
                  outline-none disabled:opacity-50
                "
              >
                <Bookmark
                  className={`size-4 ${bookmarked ? "text-[var(--primary)]" : "text-[var(--muted-foreground)]"}`}
                  strokeWidth={2}
                  fill={bookmarked ? "currentColor" : "none"}
                />
                {bookmarked ? "Remove from saved" : "Save post"}
              </button>
              {isOwnPost && (
                <button
                  type="button"
                  onClick={deletePostHandler}
                  disabled={!!actionLoading}
                  className="
                    flex items-center gap-3 px-3 py-3 rounded-xl text-sm font-medium
                    text-[var(--danger)] hover:bg-[var(--danger)]/8
                    active:scale-[.98] transition-all duration-200
                    outline-none disabled:opacity-50
                  "
                >
                  <Trash2 className="size-4" strokeWidth={2} />
                  Delete post
                </button>
              )}
            </div>
          </DialogContent>
        </Dialog>
      </header>

      {/* ── MEDIA (adaptive aspect) ─────────────────── */}
      <div
        className="relative bg-[var(--surface-2)]/40 overflow-hidden w-full"
        style={mediaStyle}
        onDoubleClick={handleMediaDoubleClick}
        onTouchEnd={handleMediaTouchEnd}
        onMouseMove={post.mediaType === "video" ? showControls : undefined}
        onTouchStart={post.mediaType === "video" ? showControls : undefined}
        onMouseLeave={() => {
          if (videoPlaying) {
            window.clearTimeout(controlsTimeoutRef.current);
            controlsTimeoutRef.current = window.setTimeout(
              () => setControlsVisible(false),
              500,
            );
          }
        }}
      >
        {/* shimmer while loading */}
        {!mediaReady && (
          <div className="absolute inset-0 skeleton" aria-hidden="true" />
        )}

        {post.mediaType === "video" ? (
          <>
            <video
              ref={videoRef}
              data-feed-video
              src={post.image}
              className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-500 ${
                mediaReady ? "opacity-100" : "opacity-0"
              }`}
              controls={false}
              playsInline
              preload="metadata"
              disablePictureInPicture
              controlsList="nodownload noplaybackrate nofullscreen"
              aria-label="Post video"
              onContextMenu={(e) => e.preventDefault()}
              onClick={(e) => {
                e.stopPropagation();
                const v = e.currentTarget;
                if (v.ended) {
                  v.currentTime = 0;
                  setVideoTime(0);
                  setVideoEnded(false);
                }
                if (v.paused) {
                  v.dataset.userPaused = "false";
                  v.play().catch(() => {});
                  showControls();
                } else {
                  v.dataset.userPaused = "true";
                  v.pause();
                  setControlsVisible(true);
                }
              }}
              onLoadedMetadata={handleVideoMetadata}
              onTimeUpdate={(e) => setVideoTime(e.currentTarget.currentTime)}
              onPlay={(e) => {
                e.currentTarget.dataset.userPaused = "false";
                setVideoPlaying(true);
                setVideoEnded(false);
                showControls();
              }}
              onEnded={(e) => {
                e.currentTarget.dataset.userPaused = "true";
                setVideoPlaying(false);
                setVideoEnded(true);
                setControlsVisible(true);
              }}
              onPause={(e) => {
                const v = e.currentTarget;
                setVideoPlaying(false);
                if (v.dataset.autoPause === "true") delete v.dataset.autoPause;
                else if (!v.ended) v.dataset.userPaused = "true";
                setControlsVisible(true);
              }}
              onDoubleClick={(e) => e.preventDefault()}
            />

            {!videoPlaying && (
              <button
                type="button"
                aria-label={videoEnded ? "Replay video" : "Play video"}
                onClick={(e) => {
                  e.stopPropagation();
                  const v = videoRef.current;
                  if (!v) return;
                  if (v.ended || videoEnded) {
                    v.currentTime = 0;
                    setVideoTime(0);
                  }
                  v.dataset.userPaused = "false";
                  setVideoEnded(false);
                  v.play().catch(() => {});
                  showControls();
                }}
                className="
                  absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-10
                  size-16 rounded-full flex items-center justify-center
                  bg-white/15 backdrop-blur-xl border border-white/25
                  text-white shadow-2xl
                  hover:scale-110 hover:bg-white/25 active:scale-95
                  transition-all duration-300
                "
              >
                {videoEnded ? (
                  <RotateCcw size={26} strokeWidth={2} />
                ) : (
                  <Play
                    size={26}
                    fill="currentColor"
                    strokeWidth={0}
                    className="ml-1"
                  />
                )}
              </button>
            )}

            {/* video controls overlay */}
            <div
              className={`
                absolute left-3 right-3 bottom-3 z-20
                rounded-2xl px-3 py-2.5
                bg-black/55 backdrop-blur-xl border border-white/10
                transition-all duration-300
                ${controlsVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-2 pointer-events-none"}
              `}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="relative mb-2">
                <div className="relative h-1 rounded-full bg-white/25 overflow-hidden">
                  <div
                    className="absolute inset-y-0 left-0 bg-grad-btn rounded-full"
                    style={{ width: `${progressPercent}%` }}
                  />
                </div>
                <input
                  type="range"
                  aria-label="Seek video"
                  min="0"
                  max={videoDuration || 1}
                  step="0.1"
                  value={Math.min(videoTime, videoDuration || 0)}
                  onChange={(e) => {
                    const t = Number(e.target.value);
                    setVideoTime(t);
                    if (videoRef.current) videoRef.current.currentTime = t;
                    showControls();
                  }}
                  className="absolute inset-0 w-full opacity-0 cursor-pointer"
                />
              </div>

              <div className="flex items-center gap-2 text-white">
                <button
                  type="button"
                  aria-label={videoPlaying ? "Pause" : "Play"}
                  onClick={() => {
                    const v = videoRef.current;
                    if (!v) return;
                    if (v.ended) {
                      v.currentTime = 0;
                      setVideoTime(0);
                      setVideoEnded(false);
                    }
                    if (v.paused) {
                      v.dataset.userPaused = "false";
                      v.play().catch(() => {});
                    } else {
                      v.dataset.userPaused = "true";
                      v.pause();
                    }
                    showControls();
                  }}
                  className="size-8 rounded-full flex items-center justify-center hover:bg-white/15 transition-colors outline-none"
                >
                  {videoPlaying ? (
                    <Pause size={15} fill="currentColor" />
                  ) : (
                    <Play size={15} fill="currentColor" className="ml-0.5" />
                  )}
                </button>

                <span className="text-[11.5px] tabular-nums font-medium tracking-tight">
                  {formatTime(videoTime)} <span className="opacity-60">/</span>{" "}
                  {formatTime(videoDuration)}
                </span>

                <span className="flex-1" />

                <div
                  className="flex items-center gap-1.5"
                  onMouseEnter={() => setShowVolumeSlider(true)}
                  onMouseLeave={() => setShowVolumeSlider(false)}
                >
                  <button
                    type="button"
                    aria-label={videoVolume === 0 ? "Unmute" : "Mute"}
                    onClick={() => {
                      const next = videoVolume === 0 ? 1 : 0;
                      setVideoVolume(next);
                      if (videoRef.current) videoRef.current.volume = next;
                      showControls();
                    }}
                    className="size-8 rounded-full flex items-center justify-center hover:bg-white/15 transition-colors outline-none"
                  >
                    {videoVolume === 0 ? (
                      <VolumeX size={16} />
                    ) : videoVolume < 0.5 ? (
                      <Volume1 size={16} />
                    ) : (
                      <Volume2 size={16} />
                    )}
                  </button>
                  <div
                    className={`overflow-hidden transition-all duration-300 ${
                      showVolumeSlider ? "w-20 opacity-100" : "w-0 opacity-0"
                    }`}
                  >
                    <input
                      type="range"
                      aria-label="Volume"
                      min="0"
                      max="1"
                      step="0.05"
                      value={videoVolume}
                      onChange={(e) => {
                        const v = Number(e.target.value);
                        setVideoVolume(v);
                        if (videoRef.current) videoRef.current.volume = v;
                      }}
                      className="w-full accent-white"
                    />
                  </div>
                </div>
              </div>
            </div>
          </>
        ) : (
          <img
            className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-500 ${
              mediaReady ? "opacity-100" : "opacity-0"
            }`}
            src={post.image}
            alt={post.caption || "Post image"}
            draggable={false}
            onLoad={handleImageLoad}
          />
        )}

        {/* heart burst */}
        {heartBurst && (
          <div
            className="nova-heart-burst absolute inset-0 flex items-center justify-center pointer-events-none z-30"
            aria-hidden="true"
          >
            <Heart
              size={130}
              strokeWidth={2.2}
              fill="#ff315d"
              color="#ff315d"
            />
          </div>
        )}
      </div>

      {/* ── BODY ───────────────────────────────────── */}
      <section className="px-4 pt-3 pb-3">
        {/* actions */}
        <div className="flex items-center gap-1.5">
          <div className="relative flex items-center gap-1">
            <button
              ref={likeRef}
              type="button"
              onClick={likeOrDislikeHandler}
              disabled={actionLoading === "like"}
              aria-label={liked ? "Unlike post" : "Like post"}
              className={`
                relative size-10 rounded-full flex items-center justify-center
                transition-all duration-200 outline-none
                active:scale-90
                ${liked ? "text-[#ff315d]" : "text-[var(--foreground)] hover:text-[#ff315d]"}
                hover:bg-[var(--danger)]/8
                ${isLikeAnimating ? "nova-like-pop" : ""}
              `}
            >
              <Heart
                size={22}
                strokeWidth={2.1}
                fill={liked ? "currentColor" : "none"}
                className={`transition-transform duration-200 ${
                  isLikeAnimating ? "scale-125" : ""
                }`}
              />
              {isLikeAnimating && (
                <span
                  className="absolute inset-0 rounded-full border-2 border-[#ff315d] animate-ping opacity-75 pointer-events-none"
                  aria-hidden
                />
              )}
            </button>

            {/* Floating mini hearts particle burst */}
            {isLikeAnimating && liked && (
              <div className="pointer-events-none absolute -top-1 left-1/2 -translate-x-1/2 z-20">
                {MINI_HEARTS.map((h) => (
                  <span
                    key={h.id}
                    className="absolute -translate-x-1/2 -translate-y-1/2 animate-floating-heart text-[#ff315d]"
                    style={{
                      "--tx": h.tx,
                      "--ty": h.ty,
                      "--scale": h.scale,
                      "--rot": h.rot,
                      animationDelay: h.delay,
                    }}
                  >
                    <Heart size={14} fill="currentColor" stroke="none" />
                  </span>
                ))}
              </div>
            )}

            <span className="text-[13px] font-semibold tabular-nums text-[var(--foreground)]">
              {postLike > 0 ? postLike.toLocaleString() : ""}
            </span>
          </div>

          <div className="flex items-center gap-1">
            <button
              ref={commentRef}
              type="button"
              onClick={openComments}
              aria-label="Comments"
              className="
                size-10 rounded-full flex items-center justify-center
                text-[var(--foreground)] hover:text-[var(--primary)]
                hover:bg-[var(--primary)]/8
                active:scale-90 transition-all duration-200 outline-none
              "
            >
              <MessageCircle size={22} strokeWidth={2.1} />
            </button>
            <span className="text-[13px] font-semibold tabular-nums text-[var(--foreground)]">
              {comment.length > 0 ? comment.length.toLocaleString() : ""}
            </span>
          </div>

          <span className="flex-1" />

          {/* Share post */}
          <button
            type="button"
            onClick={() => setShareOpen(true)}
            aria-label="Share post"
            className="
              size-10 rounded-full flex items-center justify-center
              text-[var(--foreground)] hover:text-[var(--primary)]
              hover:bg-[var(--primary)]/8
              active:scale-90 transition-all duration-200 outline-none
            "
          >
            <SendHorizontal size={21} strokeWidth={2.1} />
          </button>

          {/* Bookmark */}
          <button
            ref={bookmarkRef}
            type="button"
            onClick={bookmarkHandler}
            disabled={!!actionLoading}
            aria-label={bookmarked ? "Remove saved" : "Save"}
            className={`
              relative size-10 rounded-full flex items-center justify-center
              transition-all duration-200 outline-none active:scale-90
              ${bookmarked ? "text-[var(--primary)]" : "text-[var(--foreground)] hover:text-[var(--primary)]"}
              hover:bg-[var(--primary)]/8
              ${isBookmarkAnimating ? "nova-bookmark-spring" : ""}
            `}
          >
            <Bookmark
              size={21}
              strokeWidth={2.1}
              fill={bookmarked ? "currentColor" : "none"}
              className={`transition-transform duration-200 ${
                isBookmarkAnimating ? "scale-125" : ""
              }`}
            />
            {isBookmarkAnimating && (
              <span
                className="absolute inset-0 rounded-full border-2 border-[var(--primary)] animate-ping opacity-75 pointer-events-none"
                aria-hidden
              />
            )}
          </button>
        </div>

        {/* caption */}
        <p className="mt-2 text-[13.5px] leading-relaxed text-[var(--foreground)]">
          <Link
            to={`/profile/${post.author._id}`}
            className="font-semibold mr-1.5 hover:text-[var(--primary)] transition-colors"
          >
            {getDisplayName(post.author)}
          </Link>
          {post.caption && (
            <span className="text-[var(--foreground)]/85">{post.caption}</span>
          )}
        </p>

        {/* view comments */}
        {comment.length > 0 && (
          <button
            type="button"
            onClick={openComments}
            className="
              mt-1.5 text-[13px] text-[var(--muted-foreground)]
              hover:text-[var(--foreground)] transition-colors outline-none
            "
          >
            View all {comment.length}{" "}
            {comment.length === 1 ? "comment" : "comments"}
          </button>
        )}

        {/* inline comment form */}
        <form
          className="
            mt-3 flex items-center gap-2
            rounded-2xl bg-[var(--surface-2)]/60
            border border-[var(--border)]/50
            pl-3.5 pr-1.5 py-1.5
            transition-all duration-200
            focus-within:bg-[var(--surface-2)]
            focus-within:border-[var(--primary)]/40
            focus-within:ring-2 focus-within:ring-[var(--primary)]/12
          "
          onSubmit={commentHandler}
        >
          <input
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Add a comment…"
            aria-label="Write a comment"
            maxLength={1000}
            className="
              nova-flat-input
              flex-1 min-w-0 bg-transparent border-0 outline-none
              text-[13px] text-[var(--foreground)]
              placeholder:text-[var(--muted-foreground)]
            "
          />
          <button
            type="submit"
            disabled={!text.trim() || actionLoading === "comment"}
            className="
              shrink-0 h-8 px-3.5 rounded-xl
              text-[12.5px] font-semibold
              text-[var(--primary)] hover:bg-[var(--primary)]/10
              active:scale-95 transition-all duration-200 outline-none
              disabled:opacity-40 disabled:pointer-events-none
            "
          >
            {actionLoading === "comment" ? "…" : "Post"}
          </button>
        </form>
      </section>

      <CommentDialog
        open={open}
        setOpen={(next) => {
          setOpen(next);
          if (!next) dispatch(setSelectedPost(null));
        }}
      />

      <ShareDialog
        open={shareOpen}
        onOpenChange={setShareOpen}
        post={post}
      />
    </article>
  );
};

export default Post;
