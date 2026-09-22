import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";

const STORY_DURATION = 5000; // 5s per item

const formatTime = (iso) => {
  if (!iso) return "";
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  const hours = Math.floor(mins / 60);
  if (hours > 0) return `${hours}h ago`;
  if (mins > 0) return `${mins}m ago`;
  return "just now";
};

const StoryViewer = ({
  stories,
  initialUserIndex = 0,
  initialItemIndex = 0,
  onClose,
  onMarkViewed,
  onOpenProfile,
}) => {
  const [userIndex, setUserIndex] = useState(initialUserIndex);
  const [itemIndex, setItemIndex] = useState(initialItemIndex);
  const [paused, setPaused] = useState(false);

  const holdTimerRef = useRef(null);
  const isHoldingRef = useRef(false);
  const touchStartRef = useRef(null);

  const currentStory = stories[userIndex];
  const currentItem = currentStory?.items?.[itemIndex];

  /* ---------- NAVIGATION ---------- */
  const goNext = () => {
    if (!currentStory) return;
    if (itemIndex < currentStory.items.length - 1) {
      setItemIndex((i) => i + 1);
    } else if (userIndex < stories.length - 1) {
      setUserIndex((i) => i + 1);
      setItemIndex(0);
    } else {
      onClose();
    }
  };

  const goPrev = () => {
    if (itemIndex > 0) {
      setItemIndex((i) => i - 1);
    } else if (userIndex > 0) {
      const prev = userIndex - 1;
      setUserIndex(prev);
      setItemIndex((stories[prev]?.items?.length || 1) - 1);
    }
  };

  /* ---------- MARK VIEWED ---------- */
  useEffect(() => {
    if (currentItem && onMarkViewed) {
      onMarkViewed(currentItem._id);
    }
  }, [currentItem, onMarkViewed]);

  /* ---------- BODY SCROLL LOCK ---------- */
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  /* ---------- KEYBOARD ---------- */
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "Escape") onClose();
      else if (e.key === "ArrowRight") goNext();
      else if (e.key === "ArrowLeft") goPrev();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  /* ---------- HOLD TO PAUSE ---------- */
  const handlePointerDown = () => {
    isHoldingRef.current = false;
    clearTimeout(holdTimerRef.current);
    holdTimerRef.current = setTimeout(() => {
      isHoldingRef.current = true;
      setPaused(true);
    }, 180);
  };

  const handlePointerUp = (e) => {
    clearTimeout(holdTimerRef.current);

    if (isHoldingRef.current) {
      isHoldingRef.current = false;
      setPaused(false);
      return;
    }

    // Tap → navigate
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const third = rect.width / 3;
    if (x < third) goPrev();
    else if (x > rect.width - third) goNext();
  };

  const handlePointerCancel = () => {
    clearTimeout(holdTimerRef.current);
    isHoldingRef.current = false;
    setPaused(false);
  };

  /* ---------- SWIPE DOWN ---------- */
  const onTouchStart = (e) => {
    touchStartRef.current = { y: e.touches[0].clientY };
  };
  const onTouchEnd = (e) => {
    if (!touchStartRef.current) return;
    const dy = e.changedTouches[0].clientY - touchStartRef.current.y;
    if (dy > 80) onClose();
    touchStartRef.current = null;
  };

  if (!currentStory || !currentItem) return null;

  const viewer = (
    <div
      className="fixed inset-0 z-[9999] flex select-none items-center justify-center bg-black/65 p-0 backdrop-blur-md animate-fade-in md:p-5"
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
      onPointerDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      {/* Viewer shell — fullscreen on mobile, centered card on desktop */}
      <div
        className="relative h-full w-full overflow-hidden bg-[var(--surface)] shadow-2xl md:h-[88vh] md:w-[420px] md:rounded-2xl"
        onPointerDown={(event) => event.stopPropagation()}
      >
        {/* Story image */}
        <img
          src={currentItem.image}
          alt=""
          draggable={false}
          className="absolute inset-0 w-full h-full object-cover"
        />

        {/* Dark gradient top + bottom for readability */}
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-black/60 via-transparent to-black/40" />

        {/* Tap zones */}
        <div
          className="absolute inset-0 z-10 cursor-pointer"
          onPointerDown={handlePointerDown}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerCancel}
          onPointerLeave={handlePointerCancel}
        />

        {/* Progress bars */}
        <div className="absolute top-2 left-2 right-2 z-20 flex gap-1">
          {currentStory.items.map((item, i) => (
            <div
              key={item._id}
              className="flex-1 h-[2px] bg-white/30 rounded-full overflow-hidden"
            >
              {i < itemIndex && <div className="h-full w-full bg-white/90" />}
              {i === itemIndex && (
                <div
                  key={`${userIndex}-${itemIndex}`}
                  className="h-full bg-white origin-left"
                  style={{
                    animation: `storyProgress ${STORY_DURATION}ms linear forwards`,
                    animationPlayState: paused ? "paused" : "running",
                  }}
                  onAnimationEnd={goNext}
                />
              )}
            </div>
          ))}
        </div>

        {/* Header */}
        <div className="absolute top-5 left-3 right-3 z-20 flex items-center gap-3">
          <button
            type="button"
            onClick={() => onOpenProfile?.(currentStory.user)}
            className="flex min-w-0 flex-1 items-center gap-3 text-left text-white"
            aria-label={`Open @${currentStory.user.username}'s profile`}
          >
            <Avatar className="h-9 w-9 ring-2 ring-white/40">
              <AvatarImage src={currentStory.user.profilePicture} />
              <AvatarFallback>
                {(currentStory.user.fullName || currentStory.user.username)
                  ?.charAt(0)
                  .toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold leading-tight hover:underline">
                @{currentStory.user.username}
              </p>
              <p className="mt-0.5 truncate text-[11px] leading-tight text-white/70">
                {formatTime(currentItem.createdAt)}
              </p>
            </div>
          </button>

          <button
            onClick={onClose}
            aria-label="Close story"
            className="w-8 h-8 rounded-full flex items-center justify-center text-white/90 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="h-5 w-5" strokeWidth={2} />
          </button>
        </div>

        {/* Pause hint */}
        {paused && (
          <div className="absolute top-16 left-3 z-20 text-white/70 text-[10px] uppercase tracking-wider font-medium">
            Paused
          </div>
        )}

        {currentItem.caption && (
          <div className="absolute bottom-5 left-4 right-4 z-20 text-center text-sm leading-relaxed text-white drop-shadow-md">
            {currentItem.caption}
          </div>
        )}
      </div>
    </div>
  );

  return createPortal(viewer, document.body);
};

export default StoryViewer;
