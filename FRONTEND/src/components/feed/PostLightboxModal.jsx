import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import {
  Heart as LucideHeart,
  Bookmark as LucideBookmark,
  ChevronLeft,
  ChevronRight,
  User,
  Play,
  Pause,
  Volume2,
  VolumeX,
  RotateCcw,
} from "lucide-react";
import {
  HeartIcon,
  MessageCircleIcon,
  BookmarkIcon,
  SendIcon,
  XIcon,
  TagIcon,
} from "@animateicons/react/lucide";
import AnimatedIcon from "@/components/common/AnimatedIcon";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { getDisplayName } from "@/lib/utils";
import RichText from "@/components/common/RichText";

const PostLightboxModal = ({
  open,
  onClose,
  post,
  mediaItems = [],
  initialSlide = 0,
  liked,
  postLike,
  onLike,
  bookmarked,
  onBookmark,
  onCommentClick,
  onShareClick,
}) => {
  const navigate = useNavigate();
  const [scale, setScale] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [heartBurst, setHeartBurst] = useState(false);
  const [currentSlide, setCurrentSlide] = useState(initialSlide || 0);
  const [showTags, setShowTags] = useState(false);

  const initialPinchDistRef = useRef(null);
  const initialScaleRef = useRef(1);
  const touchStartRef = useRef({ x: 0, y: 0 });
  const touchCoordsRef = useRef({ x: 0, y: 0 });
  const heartTimeoutRef = useRef(null);
  const lastTapRef = useRef(0);

  // Video states in Lightbox
  const lightboxVideoRef = useRef(null);
  const [videoPlaying, setVideoPlaying] = useState(true);
  const [videoMuted, setVideoMuted] = useState(false);
  const [videoTime, setVideoTime] = useState(0);
  const [videoDuration, setVideoDuration] = useState(0);

  // Normalize media items
  const items =
    Array.isArray(mediaItems) && mediaItems.length > 0
      ? mediaItems
      : Array.isArray(post?.media) && post.media.length > 0
      ? post.media
      : post?.image
      ? [{ url: post.image, mediaType: post.mediaType || "image" }]
      : [];

  const activeItem = items[currentSlide] || items[0] || {};
  const activeUrl = activeItem.url || (typeof activeItem === "string" ? activeItem : "") || post?.image;
  const isVideo = (() => {
    if (activeItem?.mediaType === "video" || activeItem?.type === "video") return true;
    if (activeItem?.mediaType === "image" || activeItem?.type === "image") return false;
    const targetUrl = (typeof activeItem === "string" ? activeItem : "") || activeUrl || activeItem?.url || "";
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
    if (items.length <= 1 && post?.mediaType === "video") return true;
    return false;
  })();

  // Tagged users on current slide
  const slideTags = (post?.taggedUsers || []).filter(
    (t) => (t.mediaIndex ?? 0) === currentSlide && t.user
  );

  // Collaborators & unique tagged people on this post (excluding author)
  const collaborators = (post?.collaborators || []).filter(
    (c) =>
      c &&
      (c._id || c).toString() !==
        (post?.author?._id || post?.author)?.toString()
  );


  // Sync initial slide and reset zoom when opened or slide changes
  useEffect(() => {
    if (open) {
      setCurrentSlide(Math.min(initialSlide || 0, Math.max(0, items.length - 1)));
      setScale(1);
      setPan({ x: 0, y: 0 });
      setShowTags(false);
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [open, post?._id, initialSlide, items.length]);

  useEffect(() => {
    setScale(1);
    setPan({ x: 0, y: 0 });
    setShowTags(false);
    setVideoPlaying(true);
    setVideoTime(0);
  }, [currentSlide]);

  // Keyboard navigation: Escape to close, Left/Right arrow keys for carousel
  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (e) => {
      if (e.key === "Escape") {
        onClose();
      } else if (e.key === "ArrowLeft" && items.length > 1) {
        setCurrentSlide((prev) => Math.max(0, prev - 1));
      } else if (e.key === "ArrowRight" && items.length > 1) {
        setCurrentSlide((prev) => Math.min(items.length - 1, prev + 1));
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open, onClose, items.length]);

  if (!open || !post) return null;

  const author = post.author || post.user || {};
  const authorName = getDisplayName(author, "Unknown");
  const authorAvatar = author.profilePicture || "";
  const authorInitial = authorName.charAt(0).toUpperCase();

  const handleDoubleTap = () => {
    setHeartBurst(true);
    window.clearTimeout(heartTimeoutRef.current);
    heartTimeoutRef.current = window.setTimeout(() => setHeartBurst(false), 950);
    if (!liked && onLike) {
      onLike();
    }
  };

  /* ── MOBILE PINCH-TO-ZOOM & SWIPE TOUCH HANDLERS ── */
  const handleTouchStart = (e) => {
    if (e.touches.length === 2) {
      // 2 fingers: pinch start
      const d = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      );
      initialPinchDistRef.current = d;
      initialScaleRef.current = scale;
    } else if (e.touches.length === 1) {
      touchCoordsRef.current = {
        x: e.touches[0].clientX,
        y: e.touches[0].clientY,
      };
      touchStartRef.current = {
        x: e.touches[0].clientX - pan.x,
        y: e.touches[0].clientY - pan.y,
      };
    }
  };

  const handleTouchMove = (e) => {
    if (e.touches.length === 2 && initialPinchDistRef.current) {
      // Pinching
      const currentDist = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      );
      const ratio = currentDist / initialPinchDistRef.current;
      const nextScale = Math.max(1, Math.min(3.5, initialScaleRef.current * ratio));
      setScale(nextScale);
      if (nextScale === 1) setPan({ x: 0, y: 0 });
    } else if (e.touches.length === 1 && scale > 1) {
      // Pan when zoomed
      setPan({
        x: e.touches[0].clientX - touchStartRef.current.x,
        y: e.touches[0].clientY - touchStartRef.current.y,
      });
    }
  };

  const handleTouchEnd = (e) => {
    if (e.touches.length < 2) {
      initialPinchDistRef.current = null;
    }
    // Snap back if barely scaled
    if (scale < 1.05) {
      setScale(1);
      setPan({ x: 0, y: 0 });
    }

    const t = e.changedTouches?.[0];
    if (t && scale <= 1.05 && items.length > 1) {
      const deltaX = t.clientX - touchCoordsRef.current.x;
      const deltaY = t.clientY - touchCoordsRef.current.y;
      // Horizontal swipe navigation for carousel in lightbox
      if (Math.abs(deltaX) > 40 && Math.abs(deltaX) > Math.abs(deltaY) * 1.3) {
        if (deltaX < 0 && currentSlide < items.length - 1) {
          setCurrentSlide((prev) => prev + 1);
          return;
        } else if (deltaX > 0 && currentSlide > 0) {
          setCurrentSlide((prev) => prev - 1);
          return;
        }
      }
    }

    // Double-tap detection on mobile
    const now = Date.now();
    if (now - lastTapRef.current < 280) {
      e.preventDefault();
      handleDoubleTap();
    }
    lastTapRef.current = now;
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Fullscreen photo view"
      className="fixed inset-0 z-[120] bg-black/95 backdrop-blur-2xl flex flex-col justify-between animate-in fade-in duration-200 select-none"
      onClick={onClose}
    >
      {/* ── TOP HEADER BAR ── */}
      <header
        className="relative z-30 flex items-center justify-between px-4 py-3 bg-gradient-to-b from-black/85 via-black/45 to-transparent shrink-0"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Author details */}
        {collaborators.length > 0 ? (
          <div className="flex items-center gap-3 min-w-0">
            <div className="relative size-10 shrink-0 select-none">
              <div
                className="absolute top-0 left-0 size-7 rounded-full border-2 border-black/80 ring-1 ring-white/30 overflow-hidden z-10 block bg-zinc-800 shadow-md cursor-pointer hover:scale-110 transition-transform"
                onClick={(e) => {
                  e.stopPropagation();
                  onClose();
                  navigate(`/profile/${author.username || author._id}`);
                }}
                title={author.fullName || author.username}
              >
                <Avatar className="size-full">
                  <AvatarImage src={authorAvatar} alt={authorName} className="object-cover size-full" />
                  <AvatarFallback className="text-[10px] font-bold text-white bg-zinc-800">
                    {authorInitial}
                  </AvatarFallback>
                </Avatar>
              </div>
              <div
                className="absolute bottom-0 right-0 size-7 rounded-full border-2 border-black/80 ring-1 ring-white/30 overflow-hidden z-20 block bg-zinc-800 shadow-md cursor-pointer hover:scale-110 transition-transform"
                onClick={(e) => {
                  e.stopPropagation();
                  onClose();
                  navigate(`/profile/${collaborators[0].username || collaborators[0]._id}`);
                }}
                title={collaborators[0].fullName || collaborators[0].username}
              >
                <Avatar className="size-full">
                  <AvatarImage
                    src={collaborators[0].profilePicture}
                    alt={collaborators[0].fullName || collaborators[0].username}
                    className="object-cover size-full"
                  />
                  <AvatarFallback className="text-[10px] font-bold text-white bg-zinc-800">
                    {(collaborators[0].fullName || collaborators[0].username || "U").charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
              </div>
            </div>
            <div className="min-w-0">
              <div className="text-sm font-semibold text-white truncate drop-shadow-sm flex items-center gap-1.5 flex-wrap">
                <span
                  className="hover:underline cursor-pointer"
                  onClick={(e) => {
                    e.stopPropagation();
                    onClose();
                    navigate(`/profile/${author.username || author._id}`);
                  }}
                >
                  {author.fullName || author.username}
                </span>
                <span className="text-xs font-normal text-white/70">and</span>
                <span
                  className="hover:underline cursor-pointer"
                  onClick={(e) => {
                    e.stopPropagation();
                    onClose();
                    navigate(`/profile/${collaborators[0].username || collaborators[0]._id}`);
                  }}
                >
                  {collaborators[0].fullName || collaborators[0].username}
                </span>
                {collaborators.length > 1 && (
                  <span className="text-[11px] text-white/70 font-normal">
                    +{collaborators.length - 1} more
                  </span>
                )}
              </div>
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-3 min-w-0">
            <Avatar className="size-10 border border-white/20 shadow-md shrink-0">
              <AvatarImage src={authorAvatar} alt={authorName} />
              <AvatarFallback className="bg-white/10 text-white font-bold text-sm">
                {authorInitial}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0">
              <div className="text-sm font-semibold text-white truncate drop-shadow-sm flex items-center gap-1.5 flex-wrap">
                <span
                  className="hover:underline cursor-pointer"
                  onClick={(e) => {
                    e.stopPropagation();
                    onClose();
                    navigate(`/profile/${author.username || author._id}`);
                  }}
                >
                  {author.fullName || author.username}
                </span>
              </div>
              {author.username && (
                <div className="text-xs text-white/70 truncate">
                  @{author.username}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Slide counter & Close button */}
        <div className="flex items-center gap-2">
          {items.length > 1 && (
            <div className="px-3 py-1 rounded-full bg-white/15 backdrop-blur-md border border-white/20 text-white text-xs font-semibold tracking-wider">
              {currentSlide + 1} / {items.length}
            </div>
          )}
          <button
            type="button"
            title="Close (Esc)"
            aria-label="Close"
            onClick={onClose}
            className="size-9 rounded-full flex items-center justify-center bg-white/10 hover:bg-white/20 active:scale-90 text-white border border-white/15 backdrop-blur-md transition-all cursor-pointer"
          >
            <AnimatedIcon icon={XIcon} size={18} />
          </button>
        </div>
      </header>

      {/* ── CENTER MEDIA CANVAS ── */}
      <main
        className="relative flex-1 w-full flex items-center justify-center p-2 sm:p-4 md:p-6 overflow-hidden"
        onClick={(e) => {
          if (e.target === e.currentTarget) onClose();
        }}
      >
        {/* Carousel Left / Right Chevrons */}
        {items.length > 1 && currentSlide > 0 && (
          <button
            type="button"
            aria-label="Previous slide"
            onClick={(e) => {
              e.stopPropagation();
              setCurrentSlide((prev) => Math.max(0, prev - 1));
            }}
            className="absolute left-3 md:left-6 top-1/2 -translate-y-1/2 z-30 size-11 md:size-12 rounded-full bg-black/60 hover:bg-black/85 active:scale-95 text-white flex items-center justify-center border border-white/20 backdrop-blur-md shadow-2xl transition-all cursor-pointer"
          >
            <ChevronLeft size={26} />
          </button>
        )}
        {items.length > 1 && currentSlide < items.length - 1 && (
          <button
            type="button"
            aria-label="Next slide"
            onClick={(e) => {
              e.stopPropagation();
              setCurrentSlide((prev) => Math.min(items.length - 1, prev + 1));
            }}
            className="absolute right-3 md:right-6 top-1/2 -translate-y-1/2 z-30 size-11 md:size-12 rounded-full bg-black/60 hover:bg-black/85 active:scale-95 text-white flex items-center justify-center border border-white/20 backdrop-blur-md shadow-2xl transition-all cursor-pointer"
          >
            <ChevronRight size={26} />
          </button>
        )}

        <div
          className="relative max-w-full max-h-full flex items-center justify-center touch-none"
          onDoubleClick={(e) => {
            e.stopPropagation();
            handleDoubleTap();
          }}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          onClick={(e) => e.stopPropagation()}
        >
          {isVideo ? (
            <div className="relative max-w-[94vw] max-h-[62vh] sm:max-h-[68vh] md:max-h-[72vh] flex items-center justify-center rounded-2xl overflow-hidden shadow-2xl border border-white/10 bg-black select-none">
              <video
                key={activeUrl}
                ref={lightboxVideoRef}
                src={activeUrl}
                playsInline
                muted={videoMuted}
                autoPlay
                className="max-w-full max-h-[62vh] sm:max-h-[68vh] md:max-h-[72vh] object-contain cursor-pointer"
                onLoadedMetadata={(e) => setVideoDuration(e.currentTarget.duration || 0)}
                onTimeUpdate={(e) => setVideoTime(e.currentTarget.currentTime || 0)}
                onPlay={() => setVideoPlaying(true)}
                onPause={() => setVideoPlaying(false)}
                onClick={(e) => {
                  e.stopPropagation();
                  const v = lightboxVideoRef.current;
                  if (!v) return;
                  if (v.paused) v.play().catch(() => {});
                  else v.pause();
                }}
              />

              {/* Center Play button when paused */}
              {!videoPlaying && (
                <button
                  type="button"
                  aria-label="Play video"
                  onClick={(e) => {
                    e.stopPropagation();
                    lightboxVideoRef.current?.play().catch(() => {});
                  }}
                  className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-20 size-16 rounded-full flex items-center justify-center bg-black/50 hover:bg-black/70 backdrop-blur-md border border-white/25 text-white shadow-2xl hover:scale-110 active:scale-95 transition-all cursor-pointer"
                >
                  <Play size={26} fill="currentColor" className="ml-1" />
                </button>
              )}

              {/* Top-Left Mute / Unmute Button */}
              <button
                type="button"
                aria-label={videoMuted ? "Unmute" : "Mute"}
                onClick={(e) => {
                  e.stopPropagation();
                  const next = !videoMuted;
                  setVideoMuted(next);
                  if (lightboxVideoRef.current) lightboxVideoRef.current.muted = next;
                }}
                className="absolute top-3 left-3 z-30 size-9 rounded-full bg-black/55 hover:bg-black/80 backdrop-blur-md border border-white/20 text-white flex items-center justify-center transition-all hover:scale-110 active:scale-95 cursor-pointer shadow-lg"
              >
                {videoMuted ? <VolumeX size={16} /> : <Volume2 size={16} />}
              </button>

              {/* Sleek Minimal Progress Line */}
              <div
                className="absolute bottom-0 left-0 right-0 z-30 h-1.5 hover:h-2.5 bg-white/25 transition-all cursor-pointer group/line"
                onClick={(e) => e.stopPropagation()}
              >
                <div
                  className="h-full bg-white transition-all duration-75 relative shadow-[0_0_10px_rgba(255,255,255,0.8)]"
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
                    if (lightboxVideoRef.current) lightboxVideoRef.current.currentTime = t;
                  }}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  aria-label="Seek video"
                />
              </div>
            </div>
          ) : (
            <img
              key={activeUrl}
              src={activeUrl}
              alt={post.caption || `Full photo ${currentSlide + 1}`}
              draggable={false}
              style={{
                transform: `scale(${scale}) translate(${pan.x / scale}px, ${pan.y / scale}px)`,
                transition: scale === 1 ? "transform 0.25s cubic-bezier(0.2, 0.8, 0.2, 1)" : "none",
              }}
              className="max-w-[96vw] max-h-[64vh] sm:max-h-[68vh] md:max-h-[72vh] rounded-2xl shadow-[0_20px_60px_-15px_rgba(0,0,0,0.8)] object-contain border border-white/10 select-none will-change-transform"
            />
          )}

          {/* Heart Burst on Double Tap */}
          {heartBurst && (
            <div
              className="nova-heart-burst absolute inset-0 flex items-center justify-center pointer-events-none z-40"
              aria-hidden="true"
            >
              <LucideHeart
                size={140}
                strokeWidth={2.4}
                fill="#ff315d"
                color="#ff315d"
                className="drop-shadow-[0_10px_30px_rgba(255,49,93,0.6)]"
              />
            </div>
          )}

          {/* Tagged People Indicator Pill */}
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
                absolute bottom-4 left-4 z-40 flex items-center gap-1.5 px-3 py-1.5 rounded-full
                backdrop-blur-md border text-white text-xs font-semibold shadow-2xl
                transition-all duration-200 active:scale-95 cursor-pointer
                ${showTags ? "bg-black/90 border-pink-500/60 text-pink-300" : "bg-black/65 hover:bg-black/85 border-white/20"}
              `}
            >
              <AnimatedIcon icon={TagIcon} size={14} className={showTags ? "text-pink-400" : "text-white"} />
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
                  className="absolute -translate-x-1/2 -translate-y-full mb-1.5 z-50 pointer-events-auto animate-in fade-in zoom-in-95 duration-200"
                  onClick={(e) => {
                    e.stopPropagation();
                    onClose();
                    if (u.username || u._id) {
                      navigate(`/profile/${u.username || u._id}`);
                    }
                  }}
                >
                  <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-black/85 hover:bg-black/95 backdrop-blur-md border border-white/30 text-white text-xs font-semibold shadow-2xl transition-transform hover:scale-105 active:scale-95 cursor-pointer">
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
      </main>

      {/* ── BOTTOM INFO & ACTION BAR ── */}
      <footer
        className="relative z-30 px-4 py-3 bg-gradient-to-t from-black/90 via-black/60 to-transparent flex flex-col gap-2 shrink-0 max-w-4xl mx-auto w-full"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Pagination Dots */}
        {items.length > 1 && (
          <div className="flex items-center justify-center gap-1.5 py-1 select-none pointer-events-none">
            {items.map((_, idx) => (
              <span
                key={idx}
                className={`rounded-full transition-all duration-300 ${
                  idx === currentSlide
                    ? "w-2.5 h-2 bg-white shadow-sm"
                    : "w-1.5 h-1.5 bg-white/40"
                }`}
              />
            ))}
          </div>
        )}

        {/* Caption */}
        {post.caption && (
          <div className="text-sm text-white/95 leading-relaxed line-clamp-2 hover:line-clamp-none transition-all drop-shadow-sm font-normal">
            <RichText text={post.caption} />
          </div>
        )}

        {/* Action buttons */}
        <div className="flex items-center justify-between pt-1 border-t border-white/10">
          <div className="flex items-center gap-3">
            {/* Like */}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onLike?.();
              }}
              className={`h-9 px-3.5 rounded-full flex items-center gap-1.5 text-xs font-semibold backdrop-blur-md border transition-all cursor-pointer shrink-0 active:scale-95 ${
                liked
                  ? "bg-[#ff315d]/20 border-[#ff315d]/40 text-[#ff315d]"
                  : "bg-white/10 hover:bg-white/20 border-white/15 text-white"
              }`}
            >
              {liked ? (
                <LucideHeart
                  size={16}
                  fill="#ff315d"
                  color="#ff315d"
                  className="scale-105"
                />
              ) : (
                <AnimatedIcon
                  icon={HeartIcon}
                  size={16}
                  className="text-white"
                />
              )}
              <span>{postLike || 0}</span>
            </button>

            {/* Comment */}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onClose();
                onCommentClick?.();
              }}
              className="h-9 px-3.5 rounded-full flex items-center gap-1.5 text-xs font-semibold bg-white/10 hover:bg-white/20 border border-white/15 text-white backdrop-blur-md transition-all cursor-pointer shrink-0 active:scale-95"
            >
              <AnimatedIcon icon={MessageCircleIcon} size={16} />
              <span>{post.comments?.length || 0}</span>
            </button>

            {/* Share */}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onShareClick?.();
              }}
              className="size-9 rounded-full flex items-center justify-center text-white bg-white/10 hover:bg-white/20 border border-white/15 backdrop-blur-md transition-all cursor-pointer shrink-0 active:scale-95"
              title="Share post"
              aria-label="Share post"
            >
              <AnimatedIcon icon={SendIcon} size={16} />
            </button>
          </div>

          {/* Bookmark */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onBookmark?.();
            }}
            className={`size-9 rounded-full flex items-center justify-center border backdrop-blur-md transition-all cursor-pointer shrink-0 active:scale-95 ${
              bookmarked
                ? "bg-amber-400/20 border-amber-400/40 text-amber-400"
                : "bg-white/10 hover:bg-white/20 border-white/15 text-white"
            }`}
            title={bookmarked ? "Remove bookmark" : "Save post"}
            aria-label="Bookmark post"
          >
            {bookmarked ? (
              <LucideBookmark
                size={16}
                fill="#f59e0b"
                color="#f59e0b"
                className="scale-105"
              />
            ) : (
              <AnimatedIcon
                icon={BookmarkIcon}
                size={16}
                className="text-white"
              />
            )}
          </button>
        </div>
      </footer>
    </div>
  );
};

export default PostLightboxModal;
