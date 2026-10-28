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
  Check,
  Pause,
  Play,
  RotateCcw,
  Volume1,
  Volume2,
  VolumeX,
  Heart as LucideHeart,
  Bookmark as LucideBookmark,
  ChevronLeft,
  ChevronRight,
  Tag,
  User,
} from "lucide-react";
import {
  HeartIcon,
  MessageCircleIcon,
  BookmarkIcon,
  SendIcon,
  Repeat2Icon,
  PinIcon,
  PinOffIcon,
  Trash2Icon,
  QrCodeIcon,
  UserPlusIcon,
  UserMinusIcon,
  EllipsisVerticalIcon,
  ExpandIcon,
  Maximize2Icon,
  Minimize2Icon,
  TagIcon,
} from "@animateicons/react/lucide";
import AnimatedIcon from "@/components/common/AnimatedIcon";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import CommentDialog from "@/components/comments/CommentDialog";
import AiCommentSuggestions from "@/components/comments/AiCommentSuggestions";
import ShareDialog from "@/components/feed/ShareDialog";
import NovaQRCodeModal from "@/components/common/NovaQRCodeModal";
import SaveToCollectionModal from "@/components/feed/SaveToCollectionModal";
import QuotePostModal from "@/components/feed/QuotePostModal";
import PostLightboxModal from "@/components/feed/PostLightboxModal";
import { useDispatch, useSelector } from "react-redux";
import axios from "axios";
import { toast } from "sonner";
import { setPosts, setSelectedPost } from "@/redux/postSlice";
import { Link, useNavigate } from "react-router-dom";
import { updateBookmarks, updateFollowing, updatePinnedPosts } from "@/redux/authSlice";
import { getDisplayName, getErrorMessage, fmtCount } from "@/lib/utils";
import { apiUrl } from "@/lib/api";
import { playLikeSound, playCommentSound } from "@/lib/sound";
import RichText from "@/components/common/RichText";

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
  const [videoVolume, setVideoVolume] = useState(() => {
    try {
      const saved = localStorage.getItem("nova_video_muted");
      if (saved === "false") return 1;
    } catch {}
    return 0; // Default muted like Instagram to guarantee instant browser autoplay on first load
  });
  const [controlsVisible, setControlsVisible] = useState(true);
  const [heartBurst, setHeartBurst] = useState(false);
  const [isLikeAnimating, setIsLikeAnimating] = useState(false);
  const [isBookmarkAnimating, setIsBookmarkAnimating] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [showVolumeSlider, setShowVolumeSlider] = useState(false);
  const [qrModalOpen, setQrModalOpen] = useState(false);
  const [collectionModalOpen, setCollectionModalOpen] = useState(false);
  const [quoteModalOpen, setQuoteModalOpen] = useState(false);
  const [repostMenuOpen, setRepostMenuOpen] = useState(false);
  const [reposts, setReposts] = useState(post?.reposts || []);
  const [deleteConfirmModal, setDeleteConfirmModal] = useState({
    open: false,
    mode: "everyone",
    title: "",
    message: "",
    confirmText: "",
  });

  /* ── ADAPTIVE MEDIA ASPECT & CAROUSEL ───────────────────── */
  const mediaItems = Array.isArray(post?.media) && post.media.length > 0
    ? post.media
    : post?.image
    ? [{ url: post.image, mediaType: post.mediaType || "image" }]
    : [];

  const [activeSlide, setActiveSlide] = useState(0);
  const [mediaAspect, setMediaAspect] = useState(4 / 5);
  const [mediaReady, setMediaReady] = useState(false);
  const [mediaFitMode, setMediaFitMode] = useState("fill");
  const [lightboxOpen, setLightboxOpen] = useState(false);

  const currentMedia = mediaItems[activeSlide] || mediaItems[0] || {};
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
  const currentUrl = currentMedia.url || post?.image;

  const [showTags, setShowTags] = useState(false);

  /* reset aspect & slide when post changes */
  useEffect(() => {
    setActiveSlide(0);
    setMediaAspect(4 / 5);
    setMediaReady(false);
    setShowTags(false);
  }, [post?._id]);

  useEffect(() => {
    setMediaReady(false);
    setVideoPlaying(false);
    setVideoTime(0);
    setVideoEnded(false);
    setShowTags(false);
  }, [activeSlide]);

  // Tagged users on current slide
  const slideTags = (post?.taggedUsers || []).filter(
    (t) => (t.mediaIndex ?? 0) === activeSlide && t.user
  );

  // Collaborators & unique tagged people on this post (excluding the author)
  const collaborators = (post?.collaborators || []).filter(
    (c) =>
      c &&
      (c._id || c).toString() !==
        (post?.author?._id || post?.author)?.toString()
  );


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
  const touchStartCoordsRef = useRef({ x: 0, y: 0 });

  const isOwnPost = (post?.author?._id || post?.author)?.toString() === user?._id?.toString();
  const isCollaborator = (post?.collaborators || []).some(
    (c) => (c?._id || c)?.toString() === user?._id?.toString()
  );
  const isTaggedInPost = (post?.taggedUsers || []).some(
    (t) => (t?.user?._id || t?.user)?.toString() === user?._id?.toString()
  );
  const isFollowing = user?.following?.some(
    (i) => (i?._id || i)?.toString() === post?.author?._id?.toString(),
  );

  /* reset aspect when slide changes */
  useEffect(() => {
    setMediaReady(false);
  }, [activeSlide]);

  useEffect(() => {
    setLiked(post?.likes?.some((i) => (i?._id || i)?.toString() === user?._id?.toString()) || false);
    setPostLike(post?.likes?.length || 0);
    setComment(post?.comments || []);
    setReposts(post?.reposts || []);
  }, [post?._id, post?.likes, post?.comments, post?.reposts, user?._id]);

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

  /* sync video volume & muted state */
  useEffect(() => {
    const video = videoRef.current;
    if (video) {
      video.volume = videoVolume;
      video.muted = videoVolume === 0;
    }
    try {
      localStorage.setItem("nova_video_muted", videoVolume === 0 ? "true" : "false");
    } catch {}
  }, [videoVolume]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !isCurrentVideo) return undefined;

    // Check if video metadata or frames are already cached and ready
    if (video.readyState >= 1) {
      if (video.videoWidth && video.videoHeight) {
        setMediaAspect(clampAspect(video.videoWidth / video.videoHeight));
      }
      if (video.duration && isFinite(video.duration)) {
        setVideoDuration(video.duration);
      }
      video.volume = videoVolume;
      video.muted = videoVolume === 0;
      setMediaReady(true);
    }

    const handleVisibility = () => {
      if (document.visibilityState !== "visible") {
        if (!video.paused) {
          video.dataset.autoPause = "true";
          video.pause();
        }
      }
    };

    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && entry.intersectionRatio >= 0.5) {
          if (
            document.visibilityState === "visible" &&
            video.dataset.userPaused !== "true" &&
            !video.ended
          ) {
            const playPromise = video.play();
            if (playPromise !== undefined) {
              playPromise.catch((err) => {
                // If browser autoplay policy blocked sound on initial load, mute and retry
                if (err?.name === "NotAllowedError") {
                  video.muted = true;
                  setVideoVolume(0);
                  video.play().catch(() => {});
                }
              });
            }
          }
        } else {
          if (!video.paused) {
            video.dataset.autoPause = "true";
            video.pause();
          }
        }
      },
      { threshold: [0, 0.5] },
    );

    io.observe(video);
    document.addEventListener("visibilitychange", handleVisibility);

    return () => {
      io.disconnect();
      document.removeEventListener("visibilitychange", handleVisibility);
      video.pause();
    };
  }, [post?._id, isCurrentVideo, activeSlide]);

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
    const d = e.currentTarget.duration;
    if (d && isFinite(d)) setVideoDuration(d);
    e.currentTarget.volume = videoVolume;
    e.currentTarget.muted = videoVolume === 0;
    setMediaReady(true);
  };

  const likeOrDislikeHandler = async () => {
    if (typeof navigator !== "undefined" && !navigator.onLine) {
      toast.error("You're offline. Reconnect to internet to like posts.");
      return;
    }
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

      // Horizontal swipe navigation for carousel
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
    if (bookmarked) {
      setCollectionModalOpen(true);
      return;
    }

    try {
      setActionLoading("bookmark");
      const res = await axios.get(
        apiUrl(`/api/v1/post/${post?._id}/bookmark`),
        { withCredentials: true },
      );
      if (res.data.success) {
        setBookmarked(true);
        setIsBookmarkAnimating(true);
        window.clearTimeout(bookmarkAnimTimeoutRef.current);
        bookmarkAnimTimeoutRef.current = window.setTimeout(
          () => setIsBookmarkAnimating(false),
          650,
        );
        dispatch(updateBookmarks({ postId: post._id }));
        setCollectionModalOpen(true);
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

  const deletePostHandler = async (mode = "everyone") => {
    if (actionLoading) return;
    try {
      setActionLoading("delete");
      const res = await axios.delete(
        apiUrl(`/api/v1/post/delete/${post?._id}?mode=${mode}`),
        { withCredentials: true },
      );
      if (res.data.success) {
        dispatch(setPosts(posts.filter((i) => i?._id !== post?._id)));
        toast.success(res.data.message || (mode === "for_me" ? "Removed from your profile" : "Post deleted"));
      }
    } catch (error) {
      toast.error(getErrorMessage(error, "Unable to delete this post."));
    } finally {
      setActionLoading(null);
      setDeleteConfirmModal({ open: false, mode: "everyone", title: "", message: "", confirmText: "" });
    }
  };


  const untagHandler = async () => {
    if (actionLoading || !post?._id) return;
    try {
      setActionLoading("untag");
      const res = await axios.post(
        apiUrl(`/api/v1/post/${post._id}/untag`),
        {},
        { withCredentials: true }
      );
      if (res.data.success) {
        toast.success(res.data.message || "Removed your tag from this post");
      }
    } catch (err) {
      toast.error(getErrorMessage(err, "Unable to untag from post"));
    } finally {
      setActionLoading(null);
    }
  };

  const isPinned = user?.pinnedPosts?.some(
    (p) => (p?._id || p)?.toString() === post?._id?.toString(),
  );

  const togglePinHandler = async () => {
    if (actionLoading || !post?._id) return;
    try {
      setActionLoading("pin");
      const res = await axios.post(
        apiUrl(`/api/v1/post/${post._id}/pin`),
        {},
        { withCredentials: true },
      );
      if (res.data.success) {
        dispatch(updatePinnedPosts(res.data.pinnedPosts));
        toast.success(res.data.message);
      }
    } catch (err) {
      console.error("togglePin error:", err.response?.data || err);
      toast.error(getErrorMessage(err, "Unable to pin/unpin post"));
    } finally {
      setActionLoading(null);
    }
  };

  const isAuthorOrCollab = Boolean(
    user?._id && (
      (post.author?._id || post.author)?.toString() === user._id?.toString() ||
      collaborators.some((c) => (c?._id || c)?.toString() === user._id?.toString())
    )
  );

  const repostedByMe = Boolean(
    !isAuthorOrCollab &&
      collaborators.length === 0 &&
      user?._id &&
      reposts?.some((id) => (id?._id || id)?.toString() === user._id?.toString())
  );

  const toggleRepostHandler = async () => {
    if (actionLoading || !user?._id || !post?._id) return;
    try {
      setActionLoading("repost");
      const res = await axios.post(
        apiUrl(`/api/v1/post/${post._id}/repost`),
        {},
        { withCredentials: true },
      );
      if (res.data.success) {
        const nextReposts = res.data.reposted
          ? [...(reposts || []), user._id]
          : (reposts || []).filter(
              (id) => (id?._id || id)?.toString() !== user._id?.toString()
            );
        setReposts(nextReposts);
        dispatch(
          setPosts(
            posts.map((p) =>
              p._id === post._id ? { ...p, reposts: nextReposts } : p
            )
          )
        );
        toast.success(res.data.message);
      }
    } catch (err) {
      console.error("toggleRepost error:", err.response?.data || err);
      toast.error(getErrorMessage(err, "Unable to repost"));
    } finally {
      setActionLoading(null);
    }
  };



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
        bg-[var(--surface)]
        border border-[var(--border)]/60
        shadow-[0_2px_8px_-2px_rgba(0,0,0,.05),0_12px_40px_-24px_rgba(0,0,0,.18)]
        transition-all duration-300 ease-[cubic-bezier(.2,.8,.2,1)]
      "
    >
      {/* ── REPOST HEADER BANNER ────────────────────── */}
      {repostedByMe && !collaborators.length && !isAuthorOrCollab && (
        <div className="flex items-center gap-1.5 px-4 pt-3 pb-0 text-xs font-semibold text-emerald-400 select-none">
          <AnimatedIcon icon={Repeat2Icon} size={13} strokeWidth={2.4} />
          <span>You reposted</span>
        </div>
      )}

      {/* ── HEADER ─────────────────────────────────── */}
      <header className="flex items-center gap-3 px-4 py-3">
        {collaborators.length > 0 ? (
          <div className="relative size-10 shrink-0 select-none">
            {/* Author Avatar (top-left) */}
            <Link
              to={`/profile/${post.author?.username || post.author?._id}`}
              className="absolute top-0 left-0 size-7 rounded-full border-2 border-[var(--surface)] ring-1 ring-[var(--border)] overflow-hidden z-10 transition-transform hover:scale-110 hover:z-30 block bg-[var(--surface)] shadow-sm"
              title={post.author?.fullName || post.author?.username}
              aria-label={`${post.author?.fullName || post.author?.username} profile`}
            >
              <Avatar className="size-full">
                <AvatarImage
                  src={post.author?.profilePicture}
                  alt={post.author?.fullName || post.author?.username}
                  className="object-cover size-full"
                />
                <AvatarFallback className="text-[10px] font-bold">
                  {(post.author?.fullName || post.author?.username || "U").charAt(0).toUpperCase()}
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
            to={`/profile/${post.author?.username || post.author?._id}`}
            className="relative shrink-0 size-10 flex items-center justify-center"
            aria-label={`${post.author?.fullName || post.author?.username} profile`}
          >
            <Avatar className="size-10 border border-[var(--border)] transition-transform hover:scale-105">
              <AvatarImage
                src={post.author?.profilePicture}
                alt={post.author?.fullName || post.author?.username}
              />
              <AvatarFallback>
                {(post.author?.fullName || post.author?.username || "U").charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
          </Link>
        )}

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5 flex-wrap">
            <Link
              to={`/profile/${post.author?.username || post.author?._id}`}
              className="text-[13.5px] font-semibold text-[var(--foreground)] truncate hover:text-[var(--primary)] transition-colors duration-200"
            >
              {post.author?.fullName || post.author?.username}
            </Link>

            {collaborators.length > 0 && (
              <>
                <span className="text-[12px] text-[var(--muted-foreground)] font-normal">and</span>
                <Link
                  to={`/profile/${collaborators[0]?.username || collaborators[0]?._id}`}
                  className="text-[13.5px] font-semibold text-[var(--foreground)] truncate hover:text-[var(--primary)] transition-colors duration-200"
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

            {isOwnPost && !collaborators.length && (
              <span className="shrink-0 text-[9px] font-bold tracking-wider uppercase px-1.5 py-[2px] rounded-md bg-[var(--primary)]/12 text-[var(--primary)]">
                You
              </span>
            )}
          </div>
          <p className="text-[11.5px] text-[var(--muted-foreground)] truncate mt-0.5">
            {post.repostOf
              ? "Quoted a post"
              : post.location ||
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
              <AnimatedIcon icon={EllipsisVerticalIcon} size={20} />
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
                    outline-none disabled:opacity-50 cursor-pointer group
                  "
                >
                  {isFollowing ? (
                    <AnimatedIcon
                      icon={UserMinusIcon}
                      size={16}
                      className="text-[var(--danger)]"
                    />
                  ) : (
                    <AnimatedIcon
                      icon={UserPlusIcon}
                      size={16}
                      className="text-[var(--primary)]"
                    />
                  )}
                  {isFollowing ? "Unfollow account" : "Follow account"}
                </button>
              )}
              <button
                type="button"
                onClick={() => setQrModalOpen(true)}
                className="
                  flex items-center gap-3 px-3 py-3 rounded-xl text-sm font-medium
                  text-[var(--foreground)] hover:bg-[var(--surface-2)]
                  active:scale-[.98] transition-all duration-200
                  outline-none cursor-pointer group
                "
              >
                <AnimatedIcon icon={QrCodeIcon} size={16} className="text-cyan-400" />
                Generate QR Code
              </button>
              {isOwnPost && (
                <button
                  type="button"
                  onClick={togglePinHandler}
                  disabled={!!actionLoading}
                  className="
                    flex items-center gap-3 px-3 py-3 rounded-xl text-sm font-medium
                    text-[var(--foreground)] hover:bg-[var(--surface-2)]
                    active:scale-[.98] transition-all duration-200
                    outline-none disabled:opacity-50 cursor-pointer group
                  "
                >
                  {isPinned ? (
                    <>
                      <AnimatedIcon icon={PinOffIcon} size={16} className="text-amber-400" />
                      <span>Unpin from profile</span>
                    </>
                  ) : (
                    <>
                      <AnimatedIcon icon={PinIcon} size={16} className="text-amber-400" />
                      <span>Pin to profile</span>
                    </>
                  )}
                </button>
              )}
              {isOwnPost && (
                <>
                  {collaborators.length > 0 ? (
                    <>
                      <button
                        type="button"
                        onClick={() => {
                          setDeleteConfirmModal({
                            open: true,
                            mode: "for_me",
                            title: "Leave collaboration?",
                            message:
                              "This post will be removed from your profile and feed, but will remain active for the other co-authors. Are you sure you want to leave?",
                            confirmText: "Leave & Remove",
                          });
                        }}
                        disabled={!!actionLoading}
                        className="
                          flex items-center gap-3 px-3 py-3 rounded-xl text-sm font-medium
                          text-[var(--danger)] hover:bg-[var(--danger)]/8
                          active:scale-[.98] transition-all duration-200
                          outline-none disabled:opacity-50 cursor-pointer group
                        "
                      >
                        <AnimatedIcon icon={UserMinusIcon} size={16} />
                        Leave collaboration
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setDeleteConfirmModal({
                            open: true,
                            mode: "everyone",
                            title: "Delete for everyone?",
                            message:
                              "This will permanently delete this post, media, comments and likes for all co-authors. This action cannot be undone.",
                            confirmText: "Delete for everyone",
                          });
                        }}
                        disabled={!!actionLoading}
                        className="
                          flex items-center gap-3 px-3 py-3 rounded-xl text-sm font-medium
                          text-[var(--danger)] hover:bg-[var(--danger)]/8
                          active:scale-[.98] transition-all duration-200
                          outline-none disabled:opacity-50 cursor-pointer group
                        "
                      >
                        <AnimatedIcon icon={Trash2Icon} size={16} />
                        Delete for everyone
                      </button>
                    </>
                  ) : (
                    <button
                      type="button"
                      onClick={() => {
                        setDeleteConfirmModal({
                          open: true,
                          mode: "everyone",
                          title: "Delete post?",
                          message:
                            "Are you sure you want to permanently delete this post? This action cannot be undone.",
                          confirmText: "Delete post",
                        });
                      }}
                      disabled={!!actionLoading}
                      className="
                        flex items-center gap-3 px-3 py-3 rounded-xl text-sm font-medium
                        text-[var(--danger)] hover:bg-[var(--danger)]/8
                        active:scale-[.98] transition-all duration-200
                        outline-none disabled:opacity-50 cursor-pointer group
                      "
                    >
                      <AnimatedIcon icon={Trash2Icon} size={16} />
                      Delete post
                    </button>
                  )}
                </>
              )}

              {!isOwnPost && isCollaborator && (
                <button
                  type="button"
                  onClick={() => {
                    setDeleteConfirmModal({
                      open: true,
                      mode: "for_me",
                      title: "Delete from your profile?",
                      message:
                        "If you delete this post, you will leave this collaboration and it will no longer appear on your profile. The post will remain intact for the other authors. Do you want to continue?",
                      confirmText: "Delete & Leave",
                    });
                  }}
                  disabled={!!actionLoading}
                  className="
                    flex items-center gap-3 px-3 py-3 rounded-xl text-sm font-medium
                    text-[var(--danger)] hover:bg-[var(--danger)]/8
                    active:scale-[.98] transition-all duration-200
                    outline-none disabled:opacity-50 cursor-pointer group
                  "
                >
                  <AnimatedIcon icon={Trash2Icon} size={16} />
                  Delete post
                </button>
              )}

              {isTaggedInPost && (
                <button
                  type="button"
                  onClick={untagHandler}
                  disabled={!!actionLoading}
                  className="
                    flex items-center gap-3 px-3 py-3 rounded-xl text-sm font-medium
                    text-[var(--foreground)] hover:bg-[var(--surface-2)]
                    active:scale-[.98] transition-all duration-200
                    outline-none disabled:opacity-50 cursor-pointer group
                  "
                >
                  <AnimatedIcon icon={TagIcon} size={16} className="text-pink-400" />
                  Remove tag from post
                </button>
              )}
            </div>
          </DialogContent>
        </Dialog>
      </header>

      {/* ── QUOTE POST CONTENT (Twitter / Threads style) ── */}
      {post.repostOf ? (
        <div className="px-4 pb-2">
          {/* Quoter's commentary */}
          {post.caption && (
            <div className="pb-3 text-[14.5px] leading-relaxed text-[var(--foreground)]">
              <RichText text={post.caption} />
            </div>
          )}

          {/* Embedded Quoted Post Card */}
          <div
            onClick={() => navigate(`/post/${post.repostOf?._id}`)}
            className="rounded-2xl border border-[var(--border)]/80 bg-[var(--surface-2)]/30 hover:bg-[var(--surface-2)]/70 hover:border-[var(--primary)]/40 transition-all cursor-pointer overflow-hidden group/quote select-none shadow-sm"
          >
            {/* Original author header */}
            <div className="flex items-center gap-2 p-3 pb-2">
              {(() => {
                const quoteCollabs = (post.repostOf.collaborators || []).filter(
                  (c) => c && (c._id || c).toString() !== (post.repostOf.author?._id || post.repostOf.author)?.toString()
                );
                return (
                  <>
                    {quoteCollabs.length > 0 ? (
                      <div className="relative size-7 shrink-0 select-none mr-0.5">
                        <Avatar className="absolute top-0 left-0 size-5 border border-[var(--surface)] shadow-sm">
                          <AvatarImage src={post.repostOf.author?.profilePicture} />
                          <AvatarFallback className="text-[8px] font-bold">
                            {getDisplayName(post.repostOf.author, "U").charAt(0).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <Avatar className="absolute bottom-0 right-0 size-5 border border-[var(--surface)] shadow-sm">
                          <AvatarImage src={quoteCollabs[0]?.profilePicture} />
                          <AvatarFallback className="text-[8px] font-bold">
                            {(quoteCollabs[0]?.fullName || quoteCollabs[0]?.username || "U").charAt(0).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                      </div>
                    ) : (
                      <Avatar className="size-6 border border-[var(--border)]">
                        <AvatarImage src={post.repostOf.author?.profilePicture} />
                        <AvatarFallback className="text-[10px] font-bold">
                          {getDisplayName(post.repostOf.author, "U").charAt(0).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                    )}
                    <span className="text-xs font-semibold text-[var(--foreground)] truncate group-hover/quote:text-[var(--primary)] transition-colors">
                      {getDisplayName(post.repostOf.author)}
                    </span>
                    {quoteCollabs.length > 0 && (
                      <>
                        <span className="text-[11px] text-[var(--muted-foreground)] font-normal">and</span>
                        <span className="text-xs font-semibold text-[var(--foreground)] truncate group-hover/quote:text-[var(--primary)] transition-colors">
                          {quoteCollabs[0]?.fullName || quoteCollabs[0]?.username}
                        </span>
                      </>
                    )}
                    {quoteCollabs.length === 0 && post.repostOf.author?.username && (
                      <span className="text-[11px] text-[var(--muted-foreground)] truncate">
                        @{post.repostOf.author.username}
                      </span>
                    )}
                  </>
                );
              })()}
            </div>

            {/* Original caption */}
            {post.repostOf.caption && (
              <div className="px-3 pb-2.5 text-xs text-[var(--foreground)]/90 leading-relaxed">
                <RichText text={post.repostOf.caption} />
              </div>
            )}

            {/* Original media */}
            {post.repostOf.image && (
              <div className="w-full max-h-[380px] overflow-hidden bg-black/40 border-t border-[var(--border)]/50">
                {post.repostOf.mediaType === "video" ? (
                  <video
                    src={post.repostOf.image}
                    className="w-full max-h-[380px] object-cover"
                    controls={false}
                    muted
                    playsInline
                  />
                ) : (
                  <img
                    src={post.repostOf.image}
                    alt={post.repostOf.caption || "Quoted post"}
                    className="w-full max-h-[380px] object-cover"
                  />
                )}
              </div>
            )}
          </div>
        </div>
      ) : (
        /* ── REGULAR POST MEDIA ── */
        <div
          className="group/media relative bg-[var(--surface-2)]/40 overflow-hidden w-full select-none"
          style={mediaStyle}
          onDoubleClick={handleMediaDoubleClick}
          onTouchStart={(e) => {
            handleMediaTouchStart(e);
            if (isCurrentVideo) showControls();
          }}
          onTouchEnd={handleMediaTouchEnd}
          onMouseMove={isCurrentVideo ? showControls : undefined}
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

        {isCurrentVideo ? (
          <>
            <video
              ref={videoRef}
              key={currentUrl}
              data-feed-video
              src={currentUrl}
              className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-300 ${
                mediaReady ? "opacity-100" : "opacity-0"
              }`}
              controls={false}
              playsInline
              muted={videoVolume === 0}
              preload="auto"
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
              onLoadedData={(e) => {
                setMediaReady(true);
                const d = e.currentTarget.duration;
                if (d && isFinite(d)) setVideoDuration(d);
              }}
              onCanPlay={(e) => {
                setMediaReady(true);
                const d = e.currentTarget.duration;
                if (d && isFinite(d)) setVideoDuration(d);
              }}
              onDurationChange={(e) => {
                const d = e.currentTarget.duration;
                if (d && isFinite(d)) setVideoDuration(d);
              }}
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

            {/* Quick sound toggle pill */}
            {mediaReady && (
              <button
                type="button"
                aria-label={videoVolume === 0 ? "Unmute video" : "Mute video"}
                onClick={(e) => {
                  e.stopPropagation();
                  const next = videoVolume === 0 ? 1 : 0;
                  setVideoVolume(next);
                  if (videoRef.current) {
                    videoRef.current.volume = next;
                    videoRef.current.muted = next === 0;
                  }
                  showControls();
                }}
                className="absolute top-3 left-3 z-20 size-8 rounded-full bg-black/50 backdrop-blur-md border border-white/15 text-white/90 hover:text-white hover:bg-black/75 flex items-center justify-center transition-all active:scale-90 cursor-pointer shadow-md"
              >
                {videoVolume === 0 ? (
                  <VolumeX size={15} />
                ) : (
                  <Volume2 size={15} />
                )}
              </button>
            )}

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
                absolute left-0 right-0 bottom-0 z-20
                px-3 pb-2.5 pt-6
                bg-gradient-to-t from-black/75 via-black/25 to-transparent
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

                {/* Full View Lightbox Button for Video */}
                <button
                  type="button"
                  title="Full view"
                  aria-label="Full view"
                  onClick={(e) => {
                    e.stopPropagation();
                    setLightboxOpen(true);
                  }}
                  className="size-8 rounded-full flex items-center justify-center hover:bg-white/15 transition-colors outline-none cursor-pointer active:scale-95 shrink-0"
                >
                  <AnimatedIcon icon={ExpandIcon} size={15} />
                </button>
              </div>
            </div>
          </>
        ) : (
          <div className="relative w-full h-full flex items-center justify-center">
            {/* Ambient blurred backdrop when in fit mode */}
            {mediaFitMode === "fit" && (
              <div className="absolute inset-0 overflow-hidden pointer-events-none select-none">
                <img
                  key={`blur-${currentUrl}`}
                  src={currentUrl}
                  alt=""
                  aria-hidden="true"
                  className="w-full h-full object-cover blur-2xl scale-125 opacity-40 brightness-75 transition-opacity duration-300"
                />
              </div>
            )}
            <img
              key={currentUrl}
              className={`relative z-10 w-full h-full transition-all duration-300 ${
                mediaFitMode === "fit" ? "object-contain" : "object-cover"
              } ${mediaReady ? "opacity-100" : "opacity-0"}`}
              src={currentUrl}
              alt={post.caption || `Post media ${activeSlide + 1}`}
              draggable={false}
              onLoad={handleImageLoad}
            />
          </div>
        )}

        {/* Carousel slide counter badge (top right) */}
        {mediaItems.length > 1 && (
          <div className="absolute top-3 right-3 z-20 px-2.5 py-1 rounded-full bg-black/60 backdrop-blur-md border border-white/15 text-white text-[11px] font-semibold tracking-wide shadow-md pointer-events-none select-none">
            {activeSlide + 1}/{mediaItems.length}
          </div>
        )}

        {/* Carousel Left / Right Arrows */}
        {mediaItems.length > 1 && activeSlide > 0 && (
          <button
            type="button"
            aria-label="Previous slide"
            onClick={(e) => {
              e.stopPropagation();
              setActiveSlide((prev) => Math.max(0, prev - 1));
            }}
            className="absolute left-2.5 top-1/2 -translate-y-1/2 z-20 size-8 sm:size-9 rounded-full bg-black/60 hover:bg-black/80 backdrop-blur-md border border-white/20 text-white flex items-center justify-center shadow-lg transition-all active:scale-90 hover:scale-105 cursor-pointer opacity-90 hover:opacity-100"
          >
            <ChevronLeft size={20} />
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
            className="absolute right-2.5 top-1/2 -translate-y-1/2 z-20 size-8 sm:size-9 rounded-full bg-black/60 hover:bg-black/80 backdrop-blur-md border border-white/20 text-white flex items-center justify-center shadow-lg transition-all active:scale-90 hover:scale-105 cursor-pointer opacity-90 hover:opacity-100"
          >
            <ChevronRight size={20} />
          </button>
        )}

        {/* Pagination Dots */}
        {mediaItems.length > 1 && (
          <div className="absolute bottom-3 left-1/2 -translate-x-1/2 z-20 flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-black/40 backdrop-blur-md pointer-events-none">
            {mediaItems.map((_, idx) => (
              <span
                key={idx}
                className={`transition-all duration-300 rounded-full ${
                  idx === activeSlide
                    ? "w-2.5 h-2 bg-white shadow-sm"
                    : "w-1.5 h-1.5 bg-white/45"
                }`}
              />
            ))}
          </div>
        )}

        {/* Tagged People Indicator Pill (Bottom Left) */}
        {slideTags.length > 0 && (
          <button
            type="button"
            title={showTags ? "Hide tags" : "Show tagged people"}
            aria-label="Show tagged people"
            onClick={(e) => {
              e.stopPropagation();
              setShowTags((prev) => !prev);
            }}
            className={`
              absolute bottom-3 left-3 z-20 flex items-center gap-1.5 px-2.5 py-1 rounded-full
              backdrop-blur-md border text-white text-[11px] font-semibold shadow-lg
              transition-all duration-200 active:scale-95 cursor-pointer
              ${showTags ? "bg-black/85 border-pink-500/50 text-pink-300" : "bg-black/60 hover:bg-black/80 border-white/20"}
            `}
          >
            <AnimatedIcon icon={TagIcon} size={13} className={showTags ? "text-pink-400" : "text-white"} />
            <span>{slideTags.length === 1 ? `@${slideTags[0].user?.username}` : `${slideTags.length} tagged`}</span>
          </button>
        )}

        {/* Interactive Tag Bubbles over the Photo */}
        {showTags &&
          slideTags.map((tag) => {
            const u = tag.user;
            if (!u) return null;
            return (
              <div
                key={u._id || u.username}
                style={{ left: `${tag.x ?? 50}%`, top: `${tag.y ?? 50}%` }}
                className="absolute -translate-x-1/2 -translate-y-full mb-1.5 z-30 pointer-events-auto animate-in fade-in zoom-in-95 duration-200"
                onClick={(e) => {
                  e.stopPropagation();
                  if (u.username || u._id) {
                    navigate(`/profile/${u.username || u._id}`);
                  }
                }}
              >
                <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-black/85 hover:bg-black/95 backdrop-blur-md border border-white/30 text-white text-[11px] font-semibold shadow-2xl transition-transform hover:scale-105 active:scale-95 cursor-pointer">
                  <Avatar className="size-4 shrink-0 border border-white/40">
                    <AvatarImage src={u.profilePicture} />
                    <AvatarFallback className="text-[9px]">
                      {u.username?.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <span>@{u.username}</span>
                </div>
                <div className="w-0 h-0 border-x-4 border-x-transparent border-t-4 border-t-black/85 mx-auto" />
              </div>
            );
          })}

        {/* Floating media overlay controls: Fit/Fill Toggle & Fullscreen Lightbox (Photos only) */}
        {!isCurrentVideo && (
          <div
            className="absolute bottom-3 right-3 z-20 flex items-center gap-1.5 pointer-events-auto opacity-100 md:opacity-0 md:group-hover/media:opacity-100 transition-opacity duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Fit / Fill toggle (for images) */}
            <button
              type="button"
              title={mediaFitMode === "fill" ? "Fit whole photo (uncrop)" : "Fill frame"}
              aria-label={mediaFitMode === "fill" ? "Fit whole photo" : "Fill frame"}
              onClick={(e) => {
                e.stopPropagation();
                setMediaFitMode((m) => (m === "fill" ? "fit" : "fill"));
              }}
              className="
                size-8 rounded-full flex items-center justify-center
                bg-black/65 hover:bg-black/85 backdrop-blur-md
                border border-white/20 text-white shadow-md
                transition-all duration-200 active:scale-90 hover:scale-110 cursor-pointer
              "
            >
              <AnimatedIcon
                icon={mediaFitMode === "fill" ? Minimize2Icon : Maximize2Icon}
                size={14}
              />
            </button>

            {/* Full View Lightbox Button */}
            <button
              type="button"
              title="Full view"
              aria-label="Full view"
              onClick={(e) => {
                e.stopPropagation();
                setLightboxOpen(true);
              }}
              className="
                size-8 rounded-full flex items-center justify-center
                bg-black/65 hover:bg-black/85 backdrop-blur-md
                border border-white/20 text-white shadow-md
                transition-all duration-200 active:scale-90 hover:scale-110 cursor-pointer
              "
            >
              <AnimatedIcon icon={ExpandIcon} size={14} />
            </button>
          </div>
        )}

        {/* heart burst */}
        {heartBurst && (
          <div
            className="nova-heart-burst absolute inset-0 flex items-center justify-center pointer-events-none z-30"
            aria-hidden="true"
          >
            <LucideHeart
              size={130}
              strokeWidth={2.2}
              fill="#ff315d"
              color="#ff315d"
            />
          </div>
        )}
      </div>
      )}

      {/* ── BODY ───────────────────────────────────── */}
      <section className="px-4 pt-3 pb-3">
        {/* actions (Instagram dock layout) */}
        <div className="flex items-center justify-between select-none py-1.5 -mx-1.5">
          {/* Left action cluster */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Like */}
            <button
              ref={likeRef}
              type="button"
              onClick={likeOrDislikeHandler}
              disabled={actionLoading === "like"}
              aria-label={liked ? "Unlike post" : "Like post"}
              className={`px-2.5 py-1.5 rounded-full flex items-center gap-1.5 transition-all duration-200 outline-none active:scale-90 cursor-pointer select-none ${
                liked
                  ? "text-[#ff315d] hover:bg-[#ff315d]/10"
                  : "text-[var(--foreground)] hover:text-[#ff315d] hover:bg-[#ff315d]/10"
              }`}
            >
              <div className="relative flex items-center justify-center">
                {liked ? (
                  <LucideHeart
                    size={22}
                    strokeWidth={2.1}
                    fill="#ff315d"
                    color="#ff315d"
                    className={`transition-transform duration-200 ${
                      isLikeAnimating ? "scale-125" : "scale-105"
                    }`}
                  />
                ) : (
                  <AnimatedIcon
                    icon={HeartIcon}
                    size={22}
                    strokeWidth={2.1}
                    className={`transition-transform duration-200 ${
                      isLikeAnimating ? "scale-125" : ""
                    }`}
                  />
                )}
                {isLikeAnimating && (
                  <span
                    className="absolute -inset-1 rounded-full border-2 border-[#ff315d] animate-ping opacity-75 pointer-events-none"
                    aria-hidden
                  />
                )}

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
                        <LucideHeart size={14} fill="currentColor" stroke="none" />
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {postLike > 0 && (
                <span className="text-[13px] sm:text-[13.5px] font-semibold tabular-nums tracking-tight">
                  {fmtCount(postLike)}
                </span>
              )}
            </button>

            {/* Comment */}
            <button
              ref={commentRef}
              type="button"
              onClick={openComments}
              aria-label="Comments"
              className="px-2.5 py-1.5 rounded-full flex items-center gap-1.5 text-[var(--foreground)] hover:text-[var(--primary)] hover:bg-[var(--primary)]/10 active:scale-90 transition-all duration-200 outline-none cursor-pointer select-none"
            >
              <AnimatedIcon icon={MessageCircleIcon} size={22} strokeWidth={2.1} />
              {comment.length > 0 && (
                <span className="text-[13px] sm:text-[13.5px] font-semibold tabular-nums tracking-tight">
                  {fmtCount(comment.length)}
                </span>
              )}
            </button>

            {/* Repost button */}
            <Popover open={repostMenuOpen} onOpenChange={setRepostMenuOpen}>
              <PopoverTrigger asChild>
                <button
                  type="button"
                  aria-label="Repost"
                  className={`px-2.5 py-1.5 rounded-full flex items-center gap-1.5 transition-all duration-200 outline-none active:scale-90 cursor-pointer select-none ${
                    repostedByMe
                      ? "text-emerald-400 hover:bg-emerald-500/10"
                      : "text-[var(--foreground)] hover:text-emerald-400 hover:bg-emerald-500/10"
                  }`}
                >
                  <AnimatedIcon icon={Repeat2Icon} size={21} strokeWidth={2.1} />
                  {reposts?.length > 0 && (
                    <span className="text-[13px] sm:text-[13.5px] font-semibold tabular-nums tracking-tight">
                      {fmtCount(reposts.length)}
                    </span>
                  )}
                </button>
              </PopoverTrigger>
              <PopoverContent
                align="center"
                side="top"
                className="w-40 p-1.5 rounded-2xl bg-[var(--surface)] border border-[var(--border)] shadow-xl z-50"
              >
                <button
                  type="button"
                  onClick={() => {
                    setRepostMenuOpen(false);
                    toggleRepostHandler();
                  }}
                  className="flex items-center gap-2.5 w-full px-3 py-2 rounded-xl text-xs font-semibold text-[var(--foreground)] hover:bg-[var(--surface-2)] transition-colors cursor-pointer group"
                >
                  <AnimatedIcon icon={Repeat2Icon} size={16} className="text-emerald-400" />
                  <span>{repostedByMe ? "Undo Repost" : "Repost"}</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setRepostMenuOpen(false);
                    setQuoteModalOpen(true);
                  }}
                  className="flex items-center gap-2.5 w-full px-3 py-2 rounded-xl text-xs font-semibold text-[var(--foreground)] hover:bg-[var(--surface-2)] transition-colors cursor-pointer group"
                >
                  <AnimatedIcon icon={MessageCircleIcon} size={16} className="text-cyan-400" />
                  <span>Quote Post</span>
                </button>
              </PopoverContent>
            </Popover>

            {/* Share post */}
            <button
              type="button"
              onClick={() => setShareOpen(true)}
              aria-label="Share post"
              className="p-2 rounded-full flex items-center justify-center text-[var(--foreground)] hover:text-[var(--primary)] hover:bg-[var(--primary)]/10 active:scale-90 transition-all duration-200 outline-none cursor-pointer"
            >
              <AnimatedIcon icon={SendIcon} size={21} strokeWidth={2.1} />
            </button>
          </div>

          {/* Bookmark (Right side) */}
          <button
            ref={bookmarkRef}
            type="button"
            onClick={bookmarkHandler}
            onContextMenu={(e) => {
              e.preventDefault();
              setCollectionModalOpen(true);
            }}
            title="Click to save, right-click to organize in collections"
            disabled={!!actionLoading}
            aria-label={bookmarked ? "Remove saved" : "Save"}
            className={`
              relative p-2 rounded-full flex items-center justify-center
              transition-all duration-200 outline-none active:scale-90 cursor-pointer
              ${bookmarked ? "text-[var(--primary)] hover:bg-[var(--primary)]/10" : "text-[var(--foreground)] hover:text-[var(--primary)] hover:bg-[var(--primary)]/10"}
              ${isBookmarkAnimating ? "nova-bookmark-spring" : ""}
            `}
          >
            {bookmarked ? (
              <LucideBookmark
                size={21}
                strokeWidth={2.1}
                fill="currentColor"
                color="currentColor"
                className={`transition-transform duration-200 ${
                  isBookmarkAnimating ? "scale-125" : "scale-105"
                }`}
              />
            ) : (
              <AnimatedIcon
                icon={BookmarkIcon}
                size={21}
                strokeWidth={2.1}
                className={`transition-transform duration-200 ${
                  isBookmarkAnimating ? "scale-125" : ""
                }`}
              />
            )}
            {isBookmarkAnimating && (
              <span
                className="absolute -inset-1 rounded-full border-2 border-[var(--primary)] animate-ping opacity-75 pointer-events-none"
                aria-hidden
              />
            )}
          </button>
        </div>

        {/* caption (only for regular posts) */}
        {!post.repostOf && (
          <p className="mt-2 text-[13.5px] leading-relaxed text-[var(--foreground)] break-words">
            <Link
              to={`/profile/${post.author?.username || post.author?._id}`}
              className="font-semibold mr-1.5 hover:text-[var(--primary)] transition-colors"
            >
              {getDisplayName(post.author)}
            </Link>
            {post.caption && (
              <RichText text={post.caption} className="text-[var(--foreground)]/85" />
            )}
          </p>
        )}

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
          <AiCommentSuggestions
            post={post}
            onSelectComment={(val) => setText(val)}
            compact
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

      <SaveToCollectionModal
        isOpen={collectionModalOpen}
        onClose={() => setCollectionModalOpen(false)}
        post={post}
        onSaved={() => setBookmarked(true)}
        onUnsaved={() => setBookmarked(false)}
      />

      <NovaQRCodeModal
        isOpen={qrModalOpen}
        onClose={() => setQrModalOpen(false)}
        url={`${window.location.origin}/post/${post?._id}`}
        title={post?.author?.username || "Nova Post"}
        subtitle="Scan to view post"
        avatar={post?.author?.profilePicture}
        type="post"
      />

      <QuotePostModal
        isOpen={quoteModalOpen}
        onClose={() => setQuoteModalOpen(false)}
        post={post}
      />

      <PostLightboxModal
        open={lightboxOpen}
        onClose={() => setLightboxOpen(false)}
        post={post}
        mediaItems={mediaItems}
        initialSlide={activeSlide}
        liked={liked}
        postLike={postLike}
        onLike={likeOrDislikeHandler}
        bookmarked={bookmarked}
        onBookmark={bookmarkHandler}
        onCommentClick={() => {
          dispatch(setSelectedPost(post));
          setOpen(true);
        }}
        onShareClick={() => setShareOpen(true)}
      />

      {/* ── DELETE / LEAVE CONFIRMATION MODAL ── */}
      <Dialog
        open={deleteConfirmModal.open}
        onOpenChange={(v) =>
          setDeleteConfirmModal((prev) => ({ ...prev, open: v }))
        }
      >
        <DialogContent className="max-w-[400px] p-6 rounded-3xl border border-[var(--border)] bg-[var(--surface)] text-[var(--foreground)] shadow-2xl">
          <DialogTitle className="text-lg font-bold tracking-tight text-[var(--foreground)] flex items-center gap-2.5">
            <div className="size-9 rounded-xl bg-red-500/10 border border-red-500/20 text-red-500 flex items-center justify-center shrink-0">
              <AnimatedIcon icon={Trash2Icon} size={18} />
            </div>
            <span>{deleteConfirmModal.title || "Confirm Deletion"}</span>
          </DialogTitle>
          <p className="text-xs sm:text-sm text-[var(--muted-foreground)] leading-relaxed mt-2">
            {deleteConfirmModal.message}
          </p>
          <div className="flex items-center justify-end gap-2.5 mt-5">
            <button
              type="button"
              onClick={() =>
                setDeleteConfirmModal((prev) => ({ ...prev, open: false }))
              }
              className="px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold border border-[var(--border)] bg-[var(--surface-2)] hover:bg-[var(--surface-3)] text-[var(--foreground)] transition-all cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={Boolean(actionLoading === "delete")}
              onClick={() => deletePostHandler(deleteConfirmModal.mode)}
              className="px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold bg-red-600 hover:bg-red-700 active:scale-95 text-white shadow-md transition-all cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
            >
              {actionLoading === "delete" ? (
                <span>Processing…</span>
              ) : (
                deleteConfirmModal.confirmText || "Delete"
              )}
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </article>
  );
};

export default Post;
