import React, { useState, useEffect, useRef } from "react";
import { Heart as LucideHeart, Bookmark as LucideBookmark } from "lucide-react";
import {
  HeartIcon,
  MessageCircleIcon,
  BookmarkIcon,
  SendIcon,
  XIcon,
} from "@animateicons/react/lucide";
import AnimatedIcon from "@/components/common/AnimatedIcon";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { getDisplayName } from "@/lib/utils";
import RichText from "@/components/common/RichText";

const PostLightboxModal = ({
  open,
  onClose,
  post,
  liked,
  postLike,
  onLike,
  bookmarked,
  onBookmark,
  onCommentClick,
  onShareClick,
}) => {
  const [scale, setScale] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [heartBurst, setHeartBurst] = useState(false);

  const initialPinchDistRef = useRef(null);
  const initialScaleRef = useRef(1);
  const touchStartRef = useRef({ x: 0, y: 0 });
  const heartTimeoutRef = useRef(null);
  const lastTapRef = useRef(0);

  // Lock body scroll and reset scale on open
  useEffect(() => {
    if (open) {
      setScale(1);
      setPan({ x: 0, y: 0 });
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [open, post?._id]);

  // Keyboard shortcut: Escape to close
  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (e) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open, onClose]);

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

  /* ── MOBILE PINCH-TO-ZOOM TOUCH HANDLERS ── */
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
        <div className="flex items-center gap-3 min-w-0">
          <Avatar className="size-10 border border-white/20 shadow-md shrink-0">
            <AvatarImage src={authorAvatar} alt={authorName} />
            <AvatarFallback className="bg-white/10 text-white font-bold text-sm">
              {authorInitial}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0">
            <div className="text-sm font-semibold text-white truncate drop-shadow-sm">
              {authorName}
            </div>
            {author.username && (
              <div className="text-xs text-white/70 truncate">
                @{author.username}
              </div>
            )}
          </div>
        </div>

        {/* Close button with AnimatedIcon */}
        <button
          type="button"
          title="Close (Esc)"
          aria-label="Close"
          onClick={onClose}
          className="size-9 rounded-full flex items-center justify-center bg-white/10 hover:bg-white/20 active:scale-90 text-white border border-white/15 backdrop-blur-md transition-all cursor-pointer"
        >
          <AnimatedIcon icon={XIcon} size={18} />
        </button>
      </header>

      {/* ── CENTER MEDIA CANVAS ── */}
      <main
        className="relative flex-1 w-full flex items-center justify-center p-2 sm:p-4 md:p-6 overflow-hidden"
        onClick={(e) => {
          if (e.target === e.currentTarget) onClose();
        }}
      >
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
          {post.mediaType === "video" ? (
            <video
              src={post.image}
              controls
              autoPlay
              playsInline
              className="max-w-[94vw] max-h-[75vh] md:max-h-[82vh] rounded-2xl shadow-2xl object-contain border border-white/10"
              onClick={(e) => e.stopPropagation()}
            />
          ) : (
            <img
              src={post.image}
              alt={post.caption || "Full photo"}
              draggable={false}
              style={{
                transform: `scale(${scale}) translate(${pan.x / scale}px, ${pan.y / scale}px)`,
                transition: scale === 1 ? "transform 0.25s cubic-bezier(0.2, 0.8, 0.2, 1)" : "none",
              }}
              className="max-w-[96vw] max-h-[76vh] md:max-h-[82vh] rounded-2xl shadow-[0_20px_60px_-15px_rgba(0,0,0,0.8)] object-contain border border-white/10 select-none will-change-transform"
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
        </div>
      </main>

      {/* ── BOTTOM INFO & ACTION BAR ── */}
      <footer
        className="relative z-30 px-4 py-3 bg-gradient-to-t from-black/90 via-black/60 to-transparent flex flex-col gap-2 shrink-0 max-w-4xl mx-auto w-full"
        onClick={(e) => e.stopPropagation()}
      >
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
