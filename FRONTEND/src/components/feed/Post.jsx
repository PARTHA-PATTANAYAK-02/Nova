import React, { useState, useEffect, useRef } from "react";
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
  MessageCircle,
  MoreHorizontal,
  Send,
  Heart,
  Play,
  Pause,
  RotateCcw,
  Volume2,
  VolumeX,
} from "lucide-react";
import CommentDialog from "@/components/comments/CommentDialog";
import { useDispatch, useSelector } from "react-redux";
import axios from "axios";
import { toast } from "sonner";
import { setPosts, setSelectedPost } from "@/redux/postSlice";
import { Link, useNavigate } from "react-router-dom";
import { updateBookmarks, updateFollowing } from "@/redux/authSlice";
import { getErrorMessage } from "@/lib/utils";
import { apiUrl } from "@/lib/api";
import { getDisplayName } from "@/lib/utils";

const Post = ({ post }) => {
  const [text, setText] = useState("");
  const [open, setOpen] = useState(false);
  const [imageDimensions, setImageDimensions] = useState({
    width: 0,
    height: 0,
  });
  const { user } = useSelector((store) => store.auth);
  const { posts, selectedPost } = useSelector((store) => store.post);
  const isFollowing = user?.following?.includes(post.author._id);
  const [bookmarked, setBookmarked] = useState(
    user?.bookmarks?.some(
      (bookmark) => (bookmark?._id || bookmark) === post._id,
    ) || false,
  );

  const [liked, setLiked] = useState(post.likes.includes(user?._id) || false);
  const [postLike, setPostLike] = useState(post.likes.length);
  const [comment, setComment] = useState(post.comments);
  const [actionLoading, setActionLoading] = useState(null);
  const [videoPlaying, setVideoPlaying] = useState(false);
  const [videoEnded, setVideoEnded] = useState(false);
  const [videoTime, setVideoTime] = useState(0);
  const [videoDuration, setVideoDuration] = useState(0);
  const [videoVolume, setVideoVolume] = useState(1);
  const [controlsVisible, setControlsVisible] = useState(true);

  const dispatch = useDispatch();
  const navigate = useNavigate();

  const likeRef = useRef(null);
  const commentRef = useRef(null);
  const bookmarkRef = useRef(null);
  const videoRef = useRef(null);
  const controlsTimeoutRef = useRef(null);

  /* ---------- IMAGE DIMENSIONS ---------- */
  useEffect(() => {
    if (post.mediaType === "video") return;
    const img = new Image();
    img.src = post.image;
    img.onload = () => {
      setImageDimensions({ width: img.width, height: img.height });
    };
  }, [post.image, post.mediaType]);

  /* ============================================================
     VIDEO SYNC — only the CENTERED video auto-plays.
     Plays once. After end → replay button. Scroll away → pause.
     Tab hidden → pause.
     ============================================================ */
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return undefined;

    const syncPlayback = () => {
      const videos = [...document.querySelectorAll("video[data-feed-video]")];
      const viewportCenter = window.innerHeight / 2;
      const maxCenterDistance = window.innerHeight * 0.28; // ~28% of viewport

      let activeVideo = null;
      let closestDistance = Infinity;

      // 1) Find the video that is MOST centered AND mostly visible
      videos.forEach((candidate) => {
        const rect = candidate.getBoundingClientRect();

        // Visibility: at least 75% of video must be in viewport
        const visibleHeight = Math.max(
          0,
          Math.min(rect.bottom, window.innerHeight) - Math.max(rect.top, 0),
        );
        const visibleRatio = visibleHeight / Math.max(rect.height, 1);
        if (visibleRatio < 0.75) return;

        // Must be near the viewport center
        const videoCenter = rect.top + rect.height / 2;
        const distance = Math.abs(videoCenter - viewportCenter);
        if (distance > maxCenterDistance) return;

        if (distance < closestDistance) {
          closestDistance = distance;
          activeVideo = candidate;
        }
      });

      // 2) Apply state
      const tabVisible = document.visibilityState === "visible";

      videos.forEach((candidate) => {
        const shouldPlay =
          candidate === activeVideo &&
          tabVisible &&
          candidate.dataset.userPaused !== "true" &&
          !candidate.ended;

        if (shouldPlay) {
          // don't spam play() — only if paused
          if (candidate.paused) {
            candidate.play().catch(() => {});
          }
        } else if (!candidate.paused) {
          // Auto-pause (from scroll or tab switch). Mark as auto so we don't
          // treat it as a user pause.
          candidate.dataset.autoPause = "true";
          candidate.pause();
        }
      });
    };

    const observer = new IntersectionObserver(syncPlayback, {
      threshold: [0, 0.5, 0.75, 0.9, 1],
    });
    observer.observe(video);
    window.addEventListener("scroll", syncPlayback, { passive: true });
    window.addEventListener("resize", syncPlayback);
    document.addEventListener("visibilitychange", syncPlayback);
    syncPlayback();

    return () => {
      observer.disconnect();
      window.removeEventListener("scroll", syncPlayback);
      window.removeEventListener("resize", syncPlayback);
      document.removeEventListener("visibilitychange", syncPlayback);
      video.pause();
    };
  }, [post._id, post.mediaType]);

  useEffect(() => {
    if (selectedPost?._id === post._id) {
      setOpen(true);
    }
  }, [selectedPost, post._id]);

  /* ---------- AUTO-HIDE CONTROLS ---------- */
  const showControls = () => {
    setControlsVisible(true);
    clearTimeout(controlsTimeoutRef.current);
    if (videoPlaying) {
      controlsTimeoutRef.current = setTimeout(() => {
        setControlsVisible(false);
      }, 2500);
    }
  };

  useEffect(() => {
    return () => clearTimeout(controlsTimeoutRef.current);
  }, []);

  const changeEventHandler = (e) => setText(e.target.value);

  const triggerAnimation = (ref, cls) => {
    if (!ref.current) return;
    const el = ref.current;
    el.classList.remove(cls);
    void el.offsetWidth;
    el.classList.add(cls);
    setTimeout(() => el.classList.remove(cls), 700);
  };

  /* ---------- LIKE ---------- */
  const likeOrDislikeHandler = async () => {
    if (actionLoading === "like") return;

    const wasLiked = liked;
    const nowLiked = !wasLiked;
    const newCount = wasLiked ? postLike - 1 : postLike + 1;

    setLiked(nowLiked);
    setPostLike(newCount);
    triggerAnimation(likeRef, "animate-like");

    const updatedPostData = posts.map((p) =>
      p._id === post._id
        ? {
            ...p,
            likes: wasLiked
              ? p.likes.filter((id) => id !== user._id)
              : [...p.likes, user._id],
          }
        : p,
    );
    dispatch(setPosts(updatedPostData));
    toast.success(nowLiked ? "Post liked" : "Post unliked");

    try {
      setActionLoading("like");
      const action = nowLiked ? "like" : "dislike";
      const res = await axios.get(
        apiUrl(`/api/v1/post/${post._id}/${action}`),
        { withCredentials: true },
      );
      if (!res.data.success) {
        setLiked(wasLiked);
        setPostLike(wasLiked ? newCount + 1 : newCount - 1);
        dispatch(setPosts(posts));
      }
    } catch (error) {
      setLiked(wasLiked);
      setPostLike(wasLiked ? newCount + 1 : newCount - 1);
      dispatch(setPosts(posts));
      toast.error(getErrorMessage(error, "Unable to update the like."));
    } finally {
      setActionLoading(null);
    }
  };

  const commentHandler = async () => {
    if (!text.trim() || actionLoading) return;
    try {
      setActionLoading("comment");
      const res = await axios.post(
        apiUrl(`/api/v1/post/${post._id}/comment`),
        { text },
        {
          headers: { "Content-Type": "application/json" },
          withCredentials: true,
        },
      );
      if (res.data.success) {
        triggerAnimation(commentRef, "animate-comment");
        const updatedCommentData = [...comment, res.data.comment];
        setComment(updatedCommentData);
        const updatedPostData = posts.map((p) =>
          p._id === post._id ? { ...p, comments: updatedCommentData } : p,
        );
        dispatch(setPosts(updatedPostData));
        toast.success(res.data.message);
        setText("");
      }
    } catch (error) {
      toast.error(getErrorMessage(error, "Unable to add your comment."));
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
        const updatedPostData = posts.filter(
          (postItem) => postItem?._id !== post?._id,
        );
        dispatch(setPosts(updatedPostData));
        toast.success(res.data.message);
      }
    } catch (error) {
      toast.error(getErrorMessage(error, "Unable to delete this post."));
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
        triggerAnimation(bookmarkRef, "animate-bookmark");
        toast.success(res.data.message);
        setBookmarked(res.data.type === "saved");
        dispatch(updateBookmarks({ postId: post._id }));
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
        toast.success(res.data.message);
        dispatch(updateFollowing(post.author._id));
      }
    } catch (error) {
      toast.error(getErrorMessage(error, "Unable to update follow status."));
    } finally {
      setActionLoading(null);
    }
  };

  const openChatWithAuthor = () => {
    navigate("/chat", { state: { user: post.author } });
  };

  const formatTime = (time) => {
    if (!Number.isFinite(time)) return "0:00";
    const m = Math.floor(time / 60);
    const s = String(Math.floor(time % 60)).padStart(2, "0");
    return `${m}:${s}`;
  };

  const progressPercent = videoDuration ? (videoTime / videoDuration) * 100 : 0;

  /* ---------- UI ---------- */
  return (
    <article className="card card-hover overflow-hidden">
      {/* ============ HEADER ============ */}
      <header className="flex items-center justify-between px-3 py-2.5">
        <div className="flex items-center gap-2.5 min-w-0">
          <Link to={`/profile/${post.author._id}`} className="shrink-0">
            <Avatar className="h-9 w-9">
              <AvatarImage src={post.author?.profilePicture} alt="post_image" />
              <AvatarFallback>
                {getDisplayName(post.author, "U").charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
          </Link>

          <div className="flex items-center gap-1.5 min-w-0">
            <Link
              to={`/profile/${post.author._id}`}
              className="font-semibold text-sm text-[var(--foreground)] hover:opacity-80 transition-opacity truncate"
            >
              {getDisplayName(post.author)}
            </Link>
            {user?._id === post.author._id && (
              <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-[var(--surface-2)] text-[var(--muted-foreground)] font-medium">
                You
              </span>
            )}
          </div>
        </div>

        <Dialog>
          <DialogTrigger asChild>
            <button className="shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-[var(--muted-foreground)] hover:text-[var(--foreground)] hover:bg-[var(--surface-2)] transition-colors">
              <MoreHorizontal className="h-5 w-5" strokeWidth={1.8} />
            </button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[380px] p-2">
            <DialogTitle className="sr-only">Post options</DialogTitle>
            <DialogDescription className="sr-only">
              Actions you can take on this post
            </DialogDescription>
            <div className="space-y-0.5 p-1">
              {post?.author?._id !== user?._id && (
                <button
                  onClick={handleFollow}
                  disabled={actionLoading !== null}
                  className={`w-full text-left px-3 py-2.5 rounded-lg text-sm font-medium transition-colors disabled:opacity-50 ${
                    isFollowing
                      ? "text-[var(--danger)] hover:bg-[var(--surface-2)]"
                      : "text-[var(--primary)] hover:bg-[var(--surface-2)]"
                  }`}
                >
                  {isFollowing ? "Unfollow" : "Follow"}
                </button>
              )}
              <button
                onClick={bookmarkHandler}
                disabled={actionLoading !== null}
                className="w-full text-left px-3 py-2.5 rounded-lg text-sm font-medium text-[var(--foreground)] hover:bg-[var(--surface-2)] transition-colors disabled:opacity-50"
              >
                {bookmarked ? "Remove from saved" : "Save post"}
              </button>
              {user && user?._id === post?.author._id && (
                <button
                  onClick={deletePostHandler}
                  disabled={actionLoading !== null}
                  className="w-full text-left px-3 py-2.5 rounded-lg text-sm font-medium text-[var(--danger)] hover:bg-[var(--surface-2)] transition-colors disabled:opacity-50"
                >
                  Delete post
                </button>
              )}
            </div>
          </DialogContent>
        </Dialog>
      </header>

      {/* ============ MEDIA ============ */}
      <div
        className="relative flex w-full items-center justify-center overflow-hidden bg-black"
        onDoubleClick={() => {
          if (!liked) likeOrDislikeHandler();
        }}
        onMouseMove={post.mediaType === "video" ? showControls : undefined}
        onMouseLeave={() => {
          if (post.mediaType === "video" && videoPlaying) {
            clearTimeout(controlsTimeoutRef.current);
            controlsTimeoutRef.current = setTimeout(
              () => setControlsVisible(false),
              400,
            );
          }
        }}
      >
        {post.mediaType === "video" ? (
          <>
            <video
              ref={videoRef}
              data-feed-video
              src={post.image}
              className="block h-auto w-full max-h-[80vh] cursor-pointer object-contain"
              controls={false}
              muted={false}
              playsInline
              preload="metadata"
              disablePictureInPicture
              controlsList="nodownload noplaybackrate nofullscreen"
              aria-label="Post video"
              onContextMenu={(event) => event.preventDefault()}
              onClick={(event) => {
                event.stopPropagation();
                const video = event.currentTarget;
                if (video.ended) {
                  video.currentTime = 0;
                  setVideoEnded(false);
                  video.dataset.userPaused = "false";
                  video.play().catch(() => {});
                  return;
                }
                if (video.paused) {
                  video.dataset.userPaused = "false";
                  video.play().catch(() => {});
                  showControls();
                } else {
                  video.dataset.userPaused = "true";
                  video.pause();
                  setControlsVisible(true);
                }
              }}
              onLoadedMetadata={(event) => {
                const video = event.currentTarget;
                setVideoDuration(video.duration || 0);
                setImageDimensions({
                  width: video.videoWidth,
                  height: video.videoHeight,
                });
                video.volume = videoVolume;
              }}
              onTimeUpdate={(event) =>
                setVideoTime(event.currentTarget.currentTime)
              }
              onPlay={(event) => {
                event.currentTarget.dataset.userPaused = "false";
                setVideoPlaying(true);
                setVideoEnded(false);
                showControls();
              }}
              onEnded={(event) => {
                // Do NOT auto-replay. Show replay button.
                event.currentTarget.dataset.userPaused = "true";
                setVideoPlaying(false);
                setVideoEnded(true);
                setControlsVisible(true);
              }}
              onPause={(event) => {
                const currentVideo = event.currentTarget;
                setVideoPlaying(false);
                if (currentVideo.dataset.autoPause === "true") {
                  delete currentVideo.dataset.autoPause;
                } else if (!currentVideo.ended) {
                  currentVideo.dataset.userPaused = "true";
                }
                setControlsVisible(true);
              }}
              onDoubleClick={(event) => event.stopPropagation()}
            />

            {/* ============ CENTER PLAY / REPLAY BUTTON ============ */}
            {!videoPlaying && (
              <button
                type="button"
                aria-label={videoEnded ? "Replay video" : "Play video"}
                onClick={(event) => {
                  event.stopPropagation();
                  if (!videoRef.current) return;
                  if (videoRef.current.ended || videoEnded) {
                    videoRef.current.currentTime = 0;
                    setVideoTime(0);
                  }
                  videoRef.current.dataset.userPaused = "false";
                  setVideoEnded(false);
                  videoRef.current.play().catch(() => {});
                  showControls();
                }}
                className="
                  absolute left-1/2 top-1/2 z-20
                  flex h-16 w-16 -translate-x-1/2 -translate-y-1/2
                  items-center justify-center rounded-full
                  bg-black/55 backdrop-blur-md
                  text-white ring-1 ring-white/20
                  shadow-[0_8px_32px_rgba(0,0,0,0.5)]
                  transition-all duration-300
                  hover:scale-110 hover:bg-black/70 hover:ring-white/40
                  active:scale-95
                  animate-video-play-pulse
                "
              >
                {videoEnded ? (
                  <RotateCcw className="h-7 w-7" strokeWidth={2.2} />
                ) : (
                  <Play className="ml-1 h-7 w-7 fill-current" strokeWidth={0} />
                )}
              </button>
            )}

            {/* ============ BOTTOM CONTROLS (auto-hide) ============ */}
            <div
              className={`
                absolute inset-x-0 bottom-0 z-20
                px-3 pb-3 pt-10
                bg-gradient-to-t from-black/85 via-black/40 to-transparent
                transition-all duration-300
                ${
                  controlsVisible
                    ? "opacity-100 translate-y-0"
                    : "opacity-0 translate-y-3 pointer-events-none"
                }
              `}
              onClick={(event) => event.stopPropagation()}
            >
              {/* Progress bar */}
              <div className="relative mb-2 group/progress">
                <div className="h-1 w-full rounded-full bg-white/20 overflow-hidden">
                  <div
                    className="h-full rounded-full bg-white transition-[width] duration-150 ease-out"
                    style={{ width: `${progressPercent}%` }}
                  />
                </div>
                <span
                  className="
                    absolute top-1/2 -translate-y-1/2
                    h-3 w-3 rounded-full bg-white
                    shadow-[0_2px_8px_rgba(0,0,0,0.5)]
                    opacity-0 group-hover/progress:opacity-100
                    transition-opacity duration-200
                    pointer-events-none
                  "
                  style={{
                    left: `calc(${progressPercent}% - 6px)`,
                  }}
                />
                <input
                  type="range"
                  aria-label="Seek video"
                  min="0"
                  max={videoDuration || 1}
                  step="0.1"
                  value={Math.min(videoTime, videoDuration || 0)}
                  onChange={(event) => {
                    const time = Number(event.target.value);
                    setVideoTime(time);
                    if (videoRef.current) videoRef.current.currentTime = time;
                  }}
                  className="
                    absolute inset-0 w-full h-full
                    cursor-pointer opacity-0
                  "
                />
              </div>

              {/* Controls row */}
              <div className="flex items-center gap-3 text-white">
                {/* Play / Pause */}
                <button
                  type="button"
                  aria-label={videoPlaying ? "Pause video" : "Play video"}
                  onClick={() => {
                    if (!videoRef.current) return;
                    if (videoRef.current.ended) {
                      videoRef.current.currentTime = 0;
                      setVideoTime(0);
                      setVideoEnded(false);
                    }
                    if (videoRef.current.paused) {
                      videoRef.current.dataset.userPaused = "false";
                      videoRef.current.play().catch(() => {});
                      showControls();
                    } else {
                      videoRef.current.dataset.userPaused = "true";
                      videoRef.current.pause();
                    }
                  }}
                  className="
                    flex h-9 w-9 shrink-0 items-center justify-center
                    rounded-full
                    bg-white/15 backdrop-blur-md
                    ring-1 ring-white/20
                    transition-all duration-200
                    hover:bg-white/25 hover:scale-105
                    active:scale-95
                  "
                >
                  {videoPlaying ? (
                    <Pause className="h-4 w-4 fill-current" strokeWidth={0} />
                  ) : (
                    <Play
                      className="ml-0.5 h-4 w-4 fill-current"
                      strokeWidth={0}
                    />
                  )}
                </button>

                {/* Time */}
                <span className="shrink-0 text-[11px] tabular-nums font-medium tracking-wide">
                  <span className="text-white">{formatTime(videoTime)}</span>
                  <span className="text-white/50 mx-0.5">/</span>
                  <span className="text-white/70">
                    {formatTime(videoDuration)}
                  </span>
                </span>

                {/* Spacer */}
                <div className="flex-1" />

                {/* Volume (desktop) */}
                <div className="hidden sm:flex items-center gap-2 group/volume">
                  <button
                    type="button"
                    aria-label={videoVolume === 0 ? "Unmute" : "Mute"}
                    onClick={() => {
                      const nextVolume = videoVolume === 0 ? 1 : 0;
                      setVideoVolume(nextVolume);
                      if (videoRef.current)
                        videoRef.current.volume = nextVolume;
                    }}
                    className="
                      flex h-8 w-8 shrink-0 items-center justify-center
                      rounded-full
                      bg-white/10 backdrop-blur-md
                      ring-1 ring-white/15
                      transition-all duration-200
                      hover:bg-white/20 hover:scale-105
                      active:scale-95
                    "
                  >
                    {videoVolume === 0 ? (
                      <VolumeX className="h-3.5 w-3.5" strokeWidth={2.2} />
                    ) : (
                      <Volume2 className="h-3.5 w-3.5" strokeWidth={2.2} />
                    )}
                  </button>
                  <div className="relative w-20 h-1 rounded-full bg-white/20 group-hover/volume:h-1.5 transition-all">
                    <div
                      className="absolute inset-y-0 left-0 rounded-full bg-white"
                      style={{ width: `${videoVolume * 100}%` }}
                    />
                    <input
                      type="range"
                      aria-label="Video volume"
                      min="0"
                      max="1"
                      step="0.05"
                      value={videoVolume}
                      onChange={(event) => {
                        const volume = Number(event.target.value);
                        setVideoVolume(volume);
                        if (videoRef.current) videoRef.current.volume = volume;
                      }}
                      className="absolute inset-0 w-full h-full cursor-pointer opacity-0"
                    />
                  </div>
                </div>
              </div>
            </div>
          </>
        ) : (
          <img
            className="block h-auto w-full max-h-[80vh] object-contain select-none"
            src={post.image}
            alt="post_img"
            draggable={false}
            onLoad={(e) => {
              if (imageDimensions.width === 0) {
                setImageDimensions({
                  width: e.target.naturalWidth,
                  height: e.target.naturalHeight,
                });
              }
            }}
          />
        )}
      </div>

      {/* ============ ACTIONS ============ */}
      <div className="px-3 pt-2 pb-3">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-0.5">
            <button
              ref={likeRef}
              onClick={likeOrDislikeHandler}
              className="relative w-9 h-9 rounded-full flex items-center justify-center text-[var(--foreground)] hover:bg-[var(--surface-2)] transition-colors"
            >
              <Heart
                className={`h-[22px] w-[22px] like-heart ${
                  liked ? "is-liked" : ""
                }`}
                strokeWidth={liked ? 0 : 1.8}
                fill={liked ? "var(--danger)" : "none"}
              />
            </button>

            <button
              ref={commentRef}
              onClick={() => {
                dispatch(setSelectedPost(post));
                setOpen(true);
              }}
              className="w-9 h-9 rounded-full flex items-center justify-center text-[var(--foreground)] hover:bg-[var(--surface-2)] transition-colors"
            >
              <MessageCircle className="h-[22px] w-[22px]" strokeWidth={1.8} />
            </button>

            <button
              onClick={openChatWithAuthor}
              aria-label={`Message ${getDisplayName(post.author)}`}
              className="w-9 h-9 rounded-full flex items-center justify-center text-[var(--foreground)] hover:bg-[var(--surface-2)] transition-colors"
            >
              <Send className="h-[22px] w-[22px]" strokeWidth={1.8} />
            </button>
          </div>

          <button
            ref={bookmarkRef}
            onClick={bookmarkHandler}
            className="w-9 h-9 rounded-full flex items-center justify-center text-[var(--foreground)] hover:bg-[var(--surface-2)] transition-colors"
          >
            <Bookmark
              className={`h-[22px] w-[22px] transition-all duration-200 ${
                bookmarked ? "fill-[var(--gold)] text-[var(--gold)]" : ""
              }`}
              strokeWidth={1.8}
            />
          </button>
        </div>

        <div className="mb-1 text-sm font-semibold text-[var(--foreground)]">
          {postLike}{" "}
          <span className="font-medium text-[var(--muted-foreground)]">
            {postLike === 1 ? "like" : "likes"}
          </span>
        </div>

        <div className="mb-1 text-sm leading-relaxed">
          <Link
            to={`/profile/${post.author._id}`}
            className="font-semibold text-[var(--foreground)] mr-1.5 hover:opacity-80 transition-opacity"
          >
            {getDisplayName(post.author)}
          </Link>
          <span className="text-[var(--foreground)]">{post.caption}</span>
        </div>

        {comment.length > 0 && (
          <button
            onClick={() => {
              dispatch(setSelectedPost(post));
              setOpen(true);
            }}
            className="text-xs text-[var(--muted-foreground)] hover:text-[var(--foreground)] transition-colors mt-0.5"
          >
            View all {comment.length}{" "}
            {comment.length === 1 ? "comment" : "comments"}
          </button>
        )}

        <div className="flex items-center gap-2 mt-2.5 pt-2.5 border-t border-[var(--border)]">
          <input
            type="text"
            placeholder="Add a comment..."
            value={text}
            onChange={changeEventHandler}
            className="flex-1 bg-transparent outline-none text-sm placeholder:text-[var(--muted-foreground)] text-[var(--foreground)] py-1"
          />
          {text && (
            <button
              onClick={commentHandler}
              disabled={actionLoading !== null}
              className="text-xs font-semibold px-3 py-1.5 rounded-full transition-opacity disabled:opacity-50"
              style={{
                background: "var(--primary)",
                color: "var(--primary-foreground)",
              }}
            >
              {actionLoading === "comment" ? "Posting…" : "Post"}
            </button>
          )}
        </div>
      </div>

      <CommentDialog
        open={open}
        setOpen={(nextOpen) => {
          setOpen(nextOpen);
          if (!nextOpen) dispatch(setSelectedPost(null));
        }}
      />
    </article>
  );
};

export default Post;
