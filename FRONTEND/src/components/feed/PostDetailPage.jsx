import React, { useEffect, useRef, useState } from "react";
import { useParams, useNavigate, useLocation, Link } from "react-router-dom";
import { useSelector, useDispatch } from "react-redux";
import {
  Loader2,
  Smile,
  Volume2,
  VolumeX,
  Lock,
  Heart as LucideHeart,
  Bookmark as LucideBookmark,
  ChevronLeft,
  ChevronRight,
  User,
} from "lucide-react";
import {
  ArrowLeftIcon,
  HeartIcon,
  MessageCircleIcon,
  BookmarkIcon,
  ShareIcon,
  SendIcon,
  Trash2Icon,
  SparklesIcon,
  ExternalLinkIcon,
  QrCodeIcon,
  FolderPlusIcon,
  TagIcon,
} from "@animateicons/react/lucide";
import AnimatedIcon from "@/components/common/AnimatedIcon";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import axios from "axios";
import { toast } from "sonner";
import { apiUrl } from "@/lib/api";
import { getDisplayName, getErrorMessage } from "@/lib/utils";
import { playLikeSound, playCommentSound } from "@/lib/sound";
import RichText from "@/components/common/RichText";
import { updateBookmarks } from "@/redux/authSlice";
import { setPosts } from "@/redux/postSlice";
import ShareDialog from "@/components/feed/ShareDialog";
import EmojiPicker from "@/components/chat/EmojiPicker";
import MainLayout from "@/components/layout/MainLayout";
import NovaQRCodeModal from "@/components/common/NovaQRCodeModal";
import SaveToCollectionModal from "@/components/feed/SaveToCollectionModal";
import AiCommentSuggestions from "@/components/comments/AiCommentSuggestions";

const formatTimeAgo = (iso) => {
  if (!iso) return "";
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  const hours = Math.floor(mins / 60);
  const days = Math.floor(hours / 24);
  if (days > 0) return `${days}d ago`;
  if (hours > 0) return `${hours}h ago`;
  if (mins > 0) return `${mins}m ago`;
  return "just now";
};

const PostDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const dispatch = useDispatch();

  const { user } = useSelector((s) => s.auth);
  const { posts } = useSelector((s) => s.post);

  const [post, setPost] = useState(null);
  const [loading, setLoading] = useState(() => Boolean(user));
  const [error, setError] = useState(false);

  // Interactions
  const [comments, setComments] = useState([]);
  const [commentText, setCommentText] = useState("");
  const [submittingComment, setSubmittingComment] = useState(false);
  const [liked, setLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(0);
  const [bookmarked, setBookmarked] = useState(false);
  const [heartBurst, setHeartBurst] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [isFollowing, setIsFollowing] = useState(false);
  const [followLoading, setFollowLoading] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [qrModalOpen, setQrModalOpen] = useState(false);
  const [collectionModalOpen, setCollectionModalOpen] = useState(false);

  // Video & Carousel
  const videoRef = useRef(null);
  const [isMuted, setIsMuted] = useState(true);
  const [videoTime, setVideoTime] = useState(0);
  const [videoDuration, setVideoDuration] = useState(0);
  const [activeSlide, setActiveSlide] = useState(0);
  const [showTags, setShowTags] = useState(false);

  // Refs
  const lastTapRef = useRef(0);
  const commentInputRef = useRef(null);
  const commentsListRef = useRef(null);

  useEffect(() => {
    setActiveSlide(0);
    setShowTags(false);
  }, [post?._id]);

  useEffect(() => {
    setShowTags(false);
  }, [activeSlide]);

  /* ═══ FETCH POST DETAIL ═══ */
  useEffect(() => {
    if (!id || !user) {
      setLoading(false);
      return;
    }
    let isMounted = true;
    setLoading(true);
    setError(false);

    axios
      .get(apiUrl(`/api/v1/post/${id}/detail`), { withCredentials: true })
      .then((res) => {
        if (!isMounted) return;
        if (res.data?.success && res.data.post) {
          const p = res.data.post;
          setPost(p);
          setComments(p.comments || []);
          const isLikedByMe = (p.likes || []).some(
            (lId) => (lId?._id || lId)?.toString() === user?._id?.toString()
          );
          setLiked(isLikedByMe);
          setLikeCount((p.likes || []).length);
          const isSavedByMe = (user?.bookmarks || []).some(
            (bId) => (bId?._id || bId)?.toString() === p._id?.toString()
          );
          setBookmarked(isSavedByMe);

          const authorId = p.author?._id;
          if (authorId) {
            const followed = (user?.following || []).some(
              (fId) => (fId?._id || fId)?.toString() === authorId.toString()
            );
            setIsFollowing(followed);
          }

          document.title = `${getDisplayName(p.author, "User")} on Nova`;
        } else {
          setError(true);
        }
      })
      .catch(() => {
        if (isMounted) setError(true);
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [id, user]);

  /* ═══ LIKE / DISLIKE HANDLER ═══ */
  const handleLikeToggle = async () => {
    if (!post?._id) return;
    const nextLiked = !liked;
    const nextCount = nextLiked ? likeCount + 1 : Math.max(0, likeCount - 1);

    setLiked(nextLiked);
    setLikeCount(nextCount);

    if (nextLiked) {
      playLikeSound();
      setHeartBurst(true);
      setTimeout(() => setHeartBurst(false), 900);
    }

    try {
      const action = nextLiked ? "like" : "dislike";
      const res = await axios.get(apiUrl(`/api/v1/post/${post._id}/${action}`), {
        withCredentials: true,
      });
      if (res.data?.success) {
        dispatch(
          setPosts(
            posts.map((p) =>
              p._id === post._id
                ? {
                    ...p,
                    likes: nextLiked
                      ? [...(p.likes || []), user?._id]
                      : (p.likes || []).filter(
                          (uid) => (uid?._id || uid)?.toString() !== user?._id?.toString()
                        ),
                  }
                : p
            )
          )
        );
      }
    } catch (err) {
      setLiked(!nextLiked);
      setLikeCount(likeCount);
      toast.error(getErrorMessage(err, "Unable to update like."));
    }
  };

  /* ═══ DOUBLE TAP ON MEDIA TO LIKE ═══ */
  const handleMediaDoubleTap = () => {
    const now = Date.now();
    if (now - lastTapRef.current < 300) {
      if (!liked) {
        handleLikeToggle();
      } else {
        setHeartBurst(true);
        setTimeout(() => setHeartBurst(false), 900);
      }
    }
    lastTapRef.current = now;
  };

  /* ═══ BOOKMARK HANDLER ═══ */
  const handleBookmarkToggle = async () => {
    if (!post?._id) return;
    if (bookmarked) {
      setCollectionModalOpen(true);
      return;
    }

    setBookmarked(true);
    try {
      const res = await axios.get(apiUrl(`/api/v1/post/${post._id}/bookmark`), {
        withCredentials: true,
      });
      if (res.data?.success) {
        dispatch(updateBookmarks({ postId: post._id }));
        setCollectionModalOpen(true);
      }
    } catch (err) {
      setBookmarked(false);
      toast.error(getErrorMessage(err, "Unable to save post."));
    }
  };

  /* ═══ FOLLOW / UNFOLLOW HANDLER ═══ */
  const handleFollowToggle = async () => {
    const authorId = post?.author?._id;
    if (!authorId || followLoading) return;
    try {
      setFollowLoading(true);
      const res = await axios.post(
        apiUrl(`/api/v1/user/followorunfollow/${authorId}`),
        {},
        { withCredentials: true }
      );
      if (res.data?.success) {
        setIsFollowing((prev) => !prev);
        toast.success(res.data.message);
      }
    } catch (err) {
      toast.error(getErrorMessage(err, "Unable to update follow state."));
    } finally {
      setFollowLoading(false);
    }
  };

  /* ═══ ADD COMMENT HANDLER ═══ */
  const handleAddComment = async (e) => {
    e?.preventDefault();
    if (!commentText.trim() || submittingComment || !post?._id) return;

    const textToSubmit = commentText.trim();
    setSubmittingComment(true);

    try {
      const res = await axios.post(
        apiUrl(`/api/v1/post/${post._id}/comment`),
        { text: textToSubmit },
        { withCredentials: true }
      );
      if (res.data?.success && res.data.comment) {
        playCommentSound();
        const updated = [...comments, res.data.comment];
        setComments(updated);
        setCommentText("");
        setShowEmojiPicker(false);
        toast.success("Comment posted!");

        // Scroll comments to bottom
        setTimeout(() => {
          if (commentsListRef.current) {
            commentsListRef.current.scrollTop = commentsListRef.current.scrollHeight;
          }
        }, 100);

        dispatch(
          setPosts(
            posts.map((p) =>
              p._id === post._id ? { ...p, comments: updated } : p
            )
          )
        );
      }
    } catch (err) {
      toast.error(getErrorMessage(err, "Unable to post comment."));
    } finally {
      setSubmittingComment(false);
    }
  };

  /* ═══ DELETE COMMENT HANDLER ═══ */
  const handleDeleteComment = async (commentId) => {
    if (!commentId || !post?._id) return;
    try {
      const res = await axios.delete(
        apiUrl(`/api/v1/post/${post._id}/comment/${commentId}`),
        { withCredentials: true }
      );
      if (res.data?.success) {
        const next = comments.filter((c) => c._id !== commentId);
        setComments(next);
        toast.success("Comment deleted");
        dispatch(
          setPosts(
            posts.map((p) => (p._id === post._id ? { ...p, comments: next } : p))
          )
        );
      }
    } catch (err) {
      toast.error(getErrorMessage(err, "Unable to delete comment."));
    }
  };

  const handleBack = () => {
    if (window.history.state && window.history.state.idx > 0) {
      navigate(-1);
    } else {
      navigate("/");
    }
  };

  /* ═══ UNAUTHENTICATED VISITOR GATEWAY ═══ */
  if (!user) {
    return (
      <div className="min-h-dvh w-full flex items-center justify-center p-4 bg-[#090a10] relative overflow-hidden select-none">
        {/* Ambient Auroras */}
        <div className="absolute -top-32 -left-32 size-96 rounded-full bg-purple-600/20 blur-[120px] pointer-events-none" />
        <div className="absolute -bottom-32 -right-32 size-96 rounded-full bg-pink-600/20 blur-[120px] pointer-events-none" />

        {/* Floating Gateway Card */}
        <div className="relative z-10 w-full max-w-[420px] rounded-3xl bg-zinc-950/85 border border-white/15 backdrop-blur-2xl p-6 sm:p-8 shadow-2xl text-center animate-in zoom-in-95 fade-in duration-300">
          {/* Nova Logo with glowing ring */}
          <div className="mx-auto mb-5 size-16 rounded-2xl p-[2px] bg-gradient-to-tr from-purple-500 via-pink-500 to-amber-500 shadow-[0_0_25px_rgba(236,72,153,0.35)]">
            <div className="size-full rounded-[14px] bg-zinc-950 flex items-center justify-center">
              <img src="/logo.gif" alt="Nova" className="size-9 object-contain" />
            </div>
          </div>

          {/* Badge */}
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 border border-white/15 text-xs font-semibold text-pink-400 mb-3">
            <AnimatedIcon icon={SparklesIcon} size={12} />
            <span>Shared Post on Nova</span>
          </div>

          {/* Heading */}
          <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight mb-2">
            Log in to view this post
          </h1>

          {/* Subtitle */}
          <p className="text-xs sm:text-sm text-zinc-400 leading-relaxed mb-6">
            A post was shared with you. Sign in to your Nova account or create one to view the full photo, video, likes, and comments.
          </p>

          {/* Action Buttons */}
          <div className="space-y-2.5">
            <button
              type="button"
              onClick={() => navigate("/login", { state: { from: location } })}
              className="w-full py-3 rounded-2xl bg-grad-btn text-white text-sm font-semibold shadow-lg hover:opacity-95 active:scale-[0.98] transition-all cursor-pointer flex items-center justify-center gap-2"
            >
              <Lock className="size-4" />
              <span>Log in to your account</span>
            </button>

            <button
              type="button"
              onClick={() => navigate("/signup", { state: { from: location } })}
              className="w-full py-3 rounded-2xl bg-white/10 hover:bg-white/15 border border-white/15 text-white text-sm font-semibold active:scale-[0.98] transition-all cursor-pointer"
            >
              Create new account
            </button>
          </div>

          {/* Footnote */}
          <p className="text-[11px] text-zinc-500 mt-5">
            ⚡ Once you log in, you will be taken directly to this post.
          </p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <MainLayout>
        <div className="max-w-2xl mx-auto p-4 animate-pulse space-y-4">
          <div className="rounded-3xl bg-[var(--surface)]/70 backdrop-blur-xl border border-[var(--border)]/60 overflow-hidden">
            <div className="flex items-center gap-3 p-4">
              <div className="size-10 rounded-full bg-[var(--surface-2)]" />
              <div className="space-y-2 flex-1">
                <div className="h-3.5 w-32 rounded-md bg-[var(--surface-2)]" />
                <div className="h-2.5 w-20 rounded-md bg-[var(--surface-2)]/70" />
              </div>
            </div>
            <div className="aspect-[4/5] sm:aspect-square w-full bg-[var(--surface-2)]" />
            <div className="p-4 space-y-3">
              <div className="flex items-center gap-3">
                <div className="size-8 rounded-full bg-[var(--surface-2)]" />
                <div className="size-8 rounded-full bg-[var(--surface-2)]" />
                <div className="size-8 rounded-full bg-[var(--surface-2)]" />
              </div>
              <div className="h-3.5 w-3/4 rounded-md bg-[var(--surface-2)]" />
              <div className="h-3 w-1/2 rounded-md bg-[var(--surface-2)]/70" />
            </div>
          </div>
        </div>
      </MainLayout>
    );
  }

  if (error || !post) {
    return (
      <MainLayout>
        <div className="h-[75vh] flex flex-col items-center justify-center p-6 text-center max-w-md mx-auto">
          <div className="size-14 rounded-2xl bg-[var(--surface-2)] border border-[var(--border)] flex items-center justify-center mb-3 text-[var(--muted-foreground)]">
            <AnimatedIcon icon={ExternalLinkIcon} size={24} />
          </div>
          <h2 className="text-base font-bold text-[var(--foreground)] mb-1">
            Post Not Available
          </h2>
          <p className="text-xs text-[var(--muted-foreground)] mb-5 leading-relaxed">
            The link you followed may be broken, or the post may have been removed.
          </p>
          <button
            type="button"
            onClick={() => navigate("/")}
            className="px-5 py-2 rounded-full bg-grad-btn text-white text-xs font-semibold shadow-md active:scale-95 transition-transform cursor-pointer"
          >
            Back to Feed
          </button>
        </div>
      </MainLayout>
    );
  }

  const author = post.author || {};
  const isMine = author._id === user?._id;

  const mediaItems =
    Array.isArray(post?.media) && post.media.length > 0
      ? post.media
      : post?.image
      ? [{ url: post.image, mediaType: post.mediaType || "image" }]
      : [];


  const currentMedia = mediaItems[activeSlide] || mediaItems[0] || {};
  const currentUrl = currentMedia.url || post?.image;
  const isVideo = currentMedia.mediaType === "video";

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


  return (
    <MainLayout>
      <div className="h-[calc(100dvh-1rem)] md:h-[calc(100dvh-2rem)] flex flex-col max-w-6xl mx-auto px-2 sm:px-4 md:px-6 py-2 overflow-hidden select-none">
        {/* ═══ TOP BAR ═══ */}
        <div className="flex items-center justify-between h-10 shrink-0 mb-2 px-1">
          <button
            type="button"
            onClick={handleBack}
            className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-[var(--surface-2)] hover:bg-[var(--surface-3)] border border-[var(--border)] text-xs font-semibold text-[var(--foreground)] transition-all cursor-pointer active:scale-95 group"
          >
            <AnimatedIcon icon={ArrowLeftIcon} size={16} />
            <span>Back</span>
          </button>

          <div className="flex items-center gap-1.5 flex-wrap justify-center max-w-md">
            <span className="text-xs font-semibold text-[var(--foreground)] tracking-tight">
              Post by
            </span>
            <Link
              to={`/profile/${author.username || author._id}`}
              className="text-xs font-bold text-primary hover:underline flex items-center gap-1"
            >
              {author.fullName || author.username}
            </Link>
            {collaborators.length > 0 && (
              <>
                <span className="text-xs text-[var(--muted-foreground)] font-normal">and</span>
                <Link
                  to={`/profile/${collaborators[0].username || collaborators[0]._id}`}
                  className="font-bold text-primary hover:underline text-xs"
                >
                  {collaborators[0].fullName || collaborators[0].username}
                </Link>
                {collaborators.length > 1 && (
                  <span className="text-[11px] font-medium text-[var(--muted-foreground)]">
                    +{collaborators.length - 1} other{collaborators.length > 2 ? "s" : ""}
                  </span>
                )}
              </>
            )}
          </div>

          {/* Spacer for balanced alignment */}
          <div className="w-16" />
        </div>

      {/* ═══ POST CARD (FITS 1 SCREEN ON DESKTOP, SCROLLS INTERNALLY ONLY) ═══ */}
      <div className="flex-1 min-h-0 rounded-2xl md:rounded-3xl border border-[var(--border)]/70 bg-[var(--surface)] overflow-hidden shadow-2xl flex flex-col md:grid md:grid-cols-12">
        {/* Left: Media Column (Desktop col-span-7 / Mobile flex-none) */}
        <div
          onClick={handleMediaDoubleTap}
          className="md:col-span-7 bg-black flex items-center justify-center relative select-none overflow-hidden h-[42vh] sm:h-[48vh] md:h-full shrink-0 group/media"
        >
          {isVideo ? (
            <div className="relative size-full flex items-center justify-center">
              <video
                key={currentUrl}
                ref={videoRef}
                src={currentUrl}
                autoPlay
                loop
                muted={isMuted}
                playsInline
                className="size-full object-contain cursor-pointer"
                onLoadedMetadata={(e) => setVideoDuration(e.currentTarget.duration || 0)}
                onTimeUpdate={(e) => setVideoTime(e.currentTarget.currentTime || 0)}
                onClick={(e) => {
                  e.stopPropagation();
                  if (videoRef.current) {
                    if (videoRef.current.paused) videoRef.current.play();
                    else videoRef.current.pause();
                  }
                }}
              />
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setIsMuted(!isMuted);
                }}
                className="absolute bottom-3 right-3 size-8 rounded-full bg-black/60 backdrop-blur-md border border-white/20 text-white flex items-center justify-center hover:bg-black/80 transition-colors cursor-pointer z-20"
              >
                {isMuted ? <VolumeX className="size-4" /> : <Volume2 className="size-4" />}
              </button>

              {/* Sleek Minimal Progress Line */}
              <div
                className="absolute bottom-0 left-0 right-0 z-30 h-1 hover:h-2 bg-white/20 transition-all cursor-pointer group/line"
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
                    if (videoRef.current) videoRef.current.currentTime = t;
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
              alt={post.caption || `Post photo ${activeSlide + 1}`}
              className="size-full object-contain mx-auto"
              draggable={false}
            />
          )}

          {/* Carousel slide counter badge */}
          {mediaItems.length > 1 && (
            <div className="absolute top-3 right-3 z-20 px-2.5 py-1 rounded-full bg-black/60 backdrop-blur-md border border-white/15 text-white text-[11px] font-semibold tracking-wide pointer-events-none select-none whitespace-nowrap">
              {activeSlide + 1} / {mediaItems.length}
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
              className="absolute left-3 top-1/2 -translate-y-1/2 z-20 size-9 rounded-full bg-black/60 hover:bg-black/85 backdrop-blur-md border border-white/20 text-white flex items-center justify-center shadow-lg transition-all active:scale-90 cursor-pointer"
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
              className="absolute right-3 top-1/2 -translate-y-1/2 z-20 size-9 rounded-full bg-black/60 hover:bg-black/85 backdrop-blur-md border border-white/20 text-white flex items-center justify-center shadow-lg transition-all active:scale-90 cursor-pointer"
            >
              <ChevronRight size={20} />
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

          {/* Double Tap Heart Burst */}
          {heartBurst && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none animate-heart-burst z-30">
              <LucideHeart className="size-20 fill-red-500 text-red-500 drop-shadow-[0_0_24px_rgba(239,68,68,0.85)]" />
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
                absolute bottom-3 left-3 z-30 flex items-center gap-1.5 px-2.5 py-1 rounded-full
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
                  className="absolute -translate-x-1/2 -translate-y-full mb-1.5 z-40 pointer-events-auto animate-in fade-in zoom-in-95 duration-200"
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
        </div>

        {/* Right: Info, Comments & Actions Column (Desktop col-span-5 / Mobile flex-1 min-h-0) */}
        <div className="md:col-span-5 flex-1 min-h-0 flex flex-col justify-between border-t md:border-t-0 md:border-l border-[var(--border)] bg-[var(--surface)] overflow-hidden">
          {/* Header: Author & Follow */}
          <div className="p-3 sm:p-3.5 border-b border-[var(--border)]/70 flex items-center justify-between shrink-0 bg-[var(--surface)]">
            {collaborators.length > 0 ? (
              <div className="flex items-center gap-2.5 min-w-0">
                {/* Overlapping Dual Avatars */}
                <div className="relative size-10 shrink-0 select-none">
                  <Link
                    to={`/profile/${author.username || author._id}`}
                    className="absolute top-0 left-0 size-7 rounded-full border-2 border-[var(--surface)] ring-1 ring-[var(--border)] overflow-hidden z-10 transition-transform hover:scale-110 hover:z-30 block bg-[var(--surface)] shadow-sm"
                    title={author.fullName || author.username}
                  >
                    <Avatar className="size-full">
                      <AvatarImage src={author.profilePicture} className="object-cover size-full" />
                      <AvatarFallback className="text-[10px] font-bold">
                        {(author.fullName || author.username || "U").charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                  </Link>
                  <Link
                    to={`/profile/${collaborators[0].username || collaborators[0]._id}`}
                    className="absolute bottom-0 right-0 size-7 rounded-full border-2 border-[var(--surface)] ring-1 ring-[var(--border)] overflow-hidden z-20 transition-transform hover:scale-110 hover:z-30 block bg-[var(--surface)] shadow-sm"
                    title={collaborators[0].fullName || collaborators[0].username}
                  >
                    <Avatar className="size-full">
                      <AvatarImage src={collaborators[0].profilePicture} className="object-cover size-full" />
                      <AvatarFallback className="text-[10px] font-bold">
                        {(collaborators[0].fullName || collaborators[0].username || "U").charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                  </Link>
                </div>
                {/* Full Names */}
                <div className="min-w-0 text-left">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <Link
                      to={`/profile/${author.username || author._id}`}
                      className="text-xs sm:text-sm font-semibold text-[var(--foreground)] truncate hover:underline hover:text-primary"
                    >
                      {author.fullName || author.username}
                    </Link>
                    <span className="text-xs text-[var(--muted-foreground)] font-normal">and</span>
                    <Link
                      to={`/profile/${collaborators[0].username || collaborators[0]._id}`}
                      className="text-xs sm:text-sm font-semibold text-[var(--foreground)] truncate hover:underline hover:text-primary"
                    >
                      {collaborators[0].fullName || collaborators[0].username}
                    </Link>
                    {collaborators.length > 1 && (
                      <span className="text-[11px] font-medium text-[var(--muted-foreground)]">
                        +{collaborators.length - 1} more
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <Link
                to={`/profile/${author.username || author._id}`}
                className="flex items-center gap-2.5 min-w-0 hover:opacity-85 transition-opacity"
              >
                <Avatar className="size-9 ring-1.5 ring-primary/30 shrink-0">
                  <AvatarImage src={author.profilePicture} />
                  <AvatarFallback className="bg-zinc-800 text-white font-bold text-xs">
                    {author.fullName?.[0] || author.username?.[0] || "U"}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0 text-left">
                  <div className="flex items-center gap-1.5">
                    <p className="text-xs sm:text-sm font-semibold text-[var(--foreground)] truncate">
                      {author.fullName || author.username}
                    </p>
                    <AnimatedIcon icon={SparklesIcon} size={12} className="text-pink-500 shrink-0" />
                  </div>
                  <p className="text-[11px] text-[var(--muted-foreground)] truncate">
                    @{author.username}
                  </p>
                </div>
              </Link>
            )}

            {!isMine && (
              <button
                type="button"
                onClick={handleFollowToggle}
                disabled={followLoading}
                className={`px-3 py-1 rounded-full text-xs font-semibold transition-all active:scale-95 cursor-pointer ${
                  isFollowing
                    ? "bg-[var(--surface-2)] text-[var(--foreground)] border border-[var(--border)] hover:bg-[var(--surface-3)]"
                    : "bg-grad-btn text-white shadow-sm hover:opacity-95"
                }`}
              >
                {followLoading ? (
                  <Loader2 className="size-3 animate-spin" />
                ) : isFollowing ? (
                  "Following"
                ) : (
                  "Follow"
                )}
              </button>
            )}
          </div>

          {/* ═══ SCROLLABLE COMMENTS CONTAINER (ONLY THIS PART SCROLLS) ═══ */}
          <div
            ref={commentsListRef}
            className="flex-1 min-h-0 overflow-y-auto p-3 sm:p-3.5 space-y-3 overscroll-contain"
          >
            {/* Author's Caption */}
            {post.caption && (
              <div className="flex items-start gap-2.5 pb-2.5 border-b border-[var(--border)]/40 text-left">
                <Avatar className="size-7 shrink-0 mt-0.5">
                  <AvatarImage src={author.profilePicture} />
                  <AvatarFallback className="text-[10px] bg-zinc-800 text-white">
                    {author.fullName?.[0] || "U"}
                  </AvatarFallback>
                </Avatar>
                <div className="text-xs leading-relaxed min-w-0">
                  <p className="text-[var(--foreground)]">
                    <Link
                      to={`/profile/${author.username || author._id}`}
                      className="font-semibold mr-1.5 hover:underline"
                    >
                      {author.username}
                    </Link>
                    <RichText text={post.caption} />
                  </p>
                  <p className="text-[10px] text-[var(--muted-foreground)] mt-1">
                    {formatTimeAgo(post.createdAt)}
                  </p>
                </div>
              </div>
            )}

            {/* Comments List */}
            {comments.length === 0 ? (
              <div className="py-8 text-center text-xs text-[var(--muted-foreground)]">
                <AnimatedIcon icon={MessageCircleIcon} size={28} className="mx-auto mb-1.5 opacity-40" />
                <p className="font-semibold text-[var(--foreground)] text-xs">No comments yet</p>
                <p className="text-[11px]">Start the conversation…</p>
              </div>
            ) : (
              comments.map((comment) => {
                const commentAuthor = comment.author || {};
                const canDelete =
                  commentAuthor._id === user?._id || author._id === user?._id;

                return (
                  <div key={comment._id} className="flex items-start justify-between gap-2 group/c text-left">
                    <div className="flex items-start gap-2.5 min-w-0">
                      <Avatar className="size-7 shrink-0 mt-0.5">
                        <AvatarImage src={commentAuthor.profilePicture} />
                        <AvatarFallback className="text-[10px] bg-zinc-800 text-white">
                          {commentAuthor.fullName?.[0] || "U"}
                        </AvatarFallback>
                      </Avatar>
                      <div className="text-xs leading-relaxed min-w-0">
                        <p className="text-[var(--foreground)]">
                          <Link
                            to={`/profile/${commentAuthor.username || commentAuthor._id}`}
                            className="font-semibold mr-1.5 hover:underline"
                          >
                            {commentAuthor.username || "User"}
                          </Link>
                          <RichText text={comment.text} />
                        </p>
                        <p className="text-[10px] text-[var(--muted-foreground)] mt-0.5">
                          {formatTimeAgo(comment.createdAt)}
                        </p>
                      </div>
                    </div>

                    {canDelete && (
                      <button
                        type="button"
                        onClick={() => handleDeleteComment(comment._id)}
                        className="opacity-0 group-hover/c:opacity-100 p-1 text-[var(--muted-foreground)] hover:text-red-400 transition-opacity cursor-pointer shrink-0"
                        title="Delete comment"
                      >
                        <AnimatedIcon icon={Trash2Icon} size={14} />
                      </button>
                    )}
                  </div>
                );
              })
            )}
          </div>

          {/* ═══ BOTTOM FIXED ACTIONS & INPUT ═══ */}
          <div className="shrink-0 border-t border-[var(--border)]/70 bg-[var(--surface)] p-2.5 sm:p-3">
            {/* Quick Action Icons */}
            <div className="flex items-center justify-between mb-1.5 px-0.5">
              <div className="flex items-center gap-2 sm:gap-3">
                <button
                  type="button"
                  onClick={handleLikeToggle}
                  className={`size-8 rounded-full flex items-center justify-center active:scale-75 transition-all cursor-pointer ${
                    liked ? "text-red-500" : "text-[var(--foreground)] hover:text-red-400"
                  }`}
                  aria-label="Like post"
                >
                  {liked ? (
                    <LucideHeart
                      size={20}
                      fill="#ef4444"
                      color="#ef4444"
                      className="scale-105 transition-transform"
                    />
                  ) : (
                    <AnimatedIcon
                      icon={HeartIcon}
                      size={20}
                    />
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => commentInputRef.current?.focus()}
                  className="size-8 rounded-full flex items-center justify-center text-[var(--foreground)] hover:text-primary active:scale-90 transition-transform cursor-pointer"
                  aria-label="Comment"
                >
                  <AnimatedIcon icon={MessageCircleIcon} size={20} />
                </button>

                <button
                  type="button"
                  onClick={() => setShareOpen(true)}
                  className="size-8 rounded-full flex items-center justify-center text-[var(--foreground)] hover:text-primary active:scale-90 transition-transform cursor-pointer"
                  aria-label="Share"
                >
                  <AnimatedIcon icon={ShareIcon} size={18} />
                </button>
              </div>

              <button
                type="button"
                onClick={handleBookmarkToggle}
                onContextMenu={(e) => {
                  e.preventDefault();
                  setCollectionModalOpen(true);
                }}
                title="Click to save, right-click to organize in collections"
                className={`size-8 rounded-full flex items-center justify-center active:scale-90 transition-all cursor-pointer ${
                  bookmarked ? "text-amber-400" : "text-[var(--foreground)] hover:text-amber-400"
                }`}
                aria-label="Bookmark post"
              >
                {bookmarked ? (
                  <LucideBookmark
                    size={18}
                    fill="currentColor"
                    color="currentColor"
                    className="scale-105 transition-transform"
                  />
                ) : (
                  <AnimatedIcon
                    icon={BookmarkIcon}
                    size={18}
                  />
                )}
              </button>
            </div>

            {/* Like Counter & Date */}
            <div className="px-1 mb-1.5 text-left flex items-center justify-between">
              <p className="text-xs font-semibold text-[var(--foreground)]">
                {likeCount === 1 ? "1 like" : `${likeCount} likes`}
              </p>
              <p className="text-[10px] text-[var(--muted-foreground)]">
                {formatTimeAgo(post.createdAt)}
              </p>
            </div>

            {/* Comment Input Box */}
            <form
              onSubmit={handleAddComment}
              className="relative flex items-center gap-2 pt-1 border-t border-[var(--border)]/50"
            >
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                  className="size-7 rounded-full flex items-center justify-center text-[var(--muted-foreground)] hover:text-[var(--foreground)] transition-colors cursor-pointer"
                  aria-label="Add emoji"
                >
                  <Smile className="size-4" />
                </button>
                {showEmojiPicker && (
                  <div className="absolute bottom-9 left-0 z-50">
                    <EmojiPicker
                      onSelectEmoji={(emoji) => {
                        setCommentText((prev) => prev + emoji);
                        setShowEmojiPicker(false);
                      }}
                      onClose={() => setShowEmojiPicker(false)}
                    />
                  </div>
                )}
              </div>

              <AiCommentSuggestions
                post={post}
                onSelectComment={(val) => setCommentText(val)}
                compact
              />

              <input
                ref={commentInputRef}
                type="text"
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                placeholder="Add a comment…"
                className="flex-1 bg-transparent text-xs text-[var(--foreground)] placeholder-[var(--muted-foreground)] outline-none py-1"
              />

              <button
                type="submit"
                disabled={!commentText.trim() || submittingComment}
                className="px-2.5 py-0.5 rounded-full text-xs font-semibold text-primary hover:text-primary/80 disabled:opacity-0 disabled:pointer-events-none transition-all active:scale-95 cursor-pointer shrink-0"
              >
                {submittingComment ? <Loader2 className="size-3 animate-spin" /> : "Post"}
              </button>
            </form>
          </div>
        </div>
      </div>

      {/* Share Dialog */}
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
    </div>
    </MainLayout>
  );
};

export default PostDetailPage;
