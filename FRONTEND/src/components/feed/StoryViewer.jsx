import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import axios from "axios";
import { toast } from "sonner";
import { apiUrl } from "@/lib/api";
import { useSelector } from "react-redux";
import { getSocketInstance } from "@/redux/socketSlice";
import { getDisplayName } from "@/lib/utils";

const STORY_DURATION = 5000; // 5s per item
const STORY_REACTIONS = ["❤️", "🥰", "😂", "😮", "😢", "🔥"];

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
  onReactionChange,
  onOpenProfile,
}) => {
  const [userIndex, setUserIndex] = useState(initialUserIndex);
  const [itemIndex, setItemIndex] = useState(initialItemIndex);
  const [paused, setPaused] = useState(false);
  const [itemDuration, setItemDuration] = useState(STORY_DURATION);
  const [reactionByMe, setReactionByMe] = useState({});
  const [reactionDetailsByItem, setReactionDetailsByItem] = useState({});
  const [showReactions, setShowReactions] = useState(false);
  const [reacting, setReacting] = useState(false);
  const { user } = useSelector((state) => state.auth);

  const holdTimerRef = useRef(null);
  const isHoldingRef = useRef(false);
  const touchStartRef = useRef(null);
  const onMarkViewedRef = useRef(onMarkViewed);
  const onReactionChangeRef = useRef(onReactionChange);

  const currentStory = stories[userIndex];
  const currentItem = currentStory?.items?.[itemIndex];

  useEffect(() => {
    setItemDuration(STORY_DURATION);
    setPaused(false);
    setShowReactions(false);
  }, [currentItem?._id]);

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
    onMarkViewedRef.current = onMarkViewed;
  }, [onMarkViewed]);

  useEffect(() => {
    onReactionChangeRef.current = onReactionChange;
  }, [onReactionChange]);

  useEffect(() => {
    if (currentItem?._id) onMarkViewedRef.current?.(currentItem._id);
  }, [currentItem?._id]);

  useEffect(() => {
    const socket = getSocketInstance();
    const handleStoryReaction = (update) => {
      if (!update.reactionDetails || !currentStory?.user?._id) return;
      const storyId = update.storyId?.toString();
      const itemExists = currentStory.items.some((item) => item._id.toString() === storyId);
      if (!itemExists) return;
      setReactionDetailsByItem((previous) => ({
        ...previous,
        [storyId]: update.reactionDetails,
      }));
      onReactionChangeRef.current?.(
        storyId,
        currentStory.items.find((item) => item._id.toString() === storyId)?.reactionByMe || null,
        update.reactionDetails,
      );
    };
    socket?.on("storyReactionUpdated", handleStoryReaction);
    return () => socket?.off("storyReactionUpdated", handleStoryReaction);
  }, [currentStory?._id, currentStory?.user?._id, currentStory?.items]);

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

  const handleStoryReaction = async (emoji) => {
    if (!currentItem || reacting) return;
    const currentReaction = Object.prototype.hasOwnProperty.call(reactionByMe, currentItem._id)
      ? reactionByMe[currentItem._id]
      : currentItem.reactionByMe ?? null;
    const nextReaction = currentReaction === emoji ? null : emoji;
    try {
      setReacting(true);
      const response = await axios.post(
        apiUrl(`/api/v1/story/${currentItem._id}/reaction`),
        { emoji: nextReaction },
        { withCredentials: true },
      );
      setReactionByMe((previous) => ({ ...previous, [currentItem._id]: nextReaction }));
      if (response.data?.reactionDetails) {
        setReactionDetailsByItem((previous) => ({
          ...previous,
          [currentItem._id]: response.data.reactionDetails,
        }));
      }
      onReactionChange?.(currentItem._id, nextReaction, response.data?.reactionDetails);
    } catch (error) {
      toast.error(error.response?.data?.message || "Unable to react to story.");
    } finally {
      setReacting(false);
    }
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
        {currentItem.mediaType === "video" ? (
          <video
            key={currentItem._id}
            src={currentItem.image}
            autoPlay
            muted={false}
            controls={false}
            playsInline
            disablePictureInPicture
            controlsList="nodownload noplaybackrate nofullscreen"
            className="absolute inset-0 h-full w-full object-contain bg-black"
            onClick={(event) => {
              const video = event.currentTarget;
              if (video.paused) video.play().catch(() => {});
              else video.pause();
            }}
            onContextMenu={(event) => event.preventDefault()}
            onLoadedMetadata={(event) =>
              setItemDuration(Math.min(event.currentTarget.duration * 1000, 30000))
            }
            onEnded={goNext}
            onDoubleClick={(event) => event.stopPropagation()}
          />
        ) : (
          <img
            src={currentItem.image}
            alt=""
            draggable={false}
            className="absolute inset-0 w-full h-full object-cover"
          />
        )}

        {/* Dark gradient top + bottom for readability */}
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-black/60 via-transparent to-black/40" />

        {/* Tap zones */}
        <div
          className="absolute inset-0 z-10 cursor-pointer"
          style={currentItem.mediaType === "video" ? { pointerEvents: "none" } : undefined}
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
                    animation: `storyProgress ${itemDuration}ms linear forwards`,
                    animationPlayState: paused ? "paused" : "running",
                  }}
                  onAnimationEnd={currentItem.mediaType === "video" ? undefined : goNext}
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
            aria-label={`Open ${getDisplayName(currentStory.user)}'s profile`}
          >
            <Avatar className="h-9 w-9 ring-2 ring-white/40">
              <AvatarImage src={currentStory.user.profilePicture} />
              <AvatarFallback>
                {getDisplayName(currentStory.user, "U").charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold leading-tight hover:underline">
                {getDisplayName(currentStory.user)}
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
          <div className={`absolute ${currentItem.mediaType === "video" ? "bottom-20" : "bottom-16"} left-4 right-4 z-20 text-center text-sm leading-relaxed text-white drop-shadow-md`}>
            {currentItem.caption}
          </div>
        )}

        <div className="absolute bottom-4 left-3 right-3 z-30 flex items-center justify-center gap-2 rounded-2xl border border-white/15 bg-black/40 px-2 py-2 backdrop-blur-md">
          {STORY_REACTIONS.map((emoji) => {
            const selectedReaction = Object.prototype.hasOwnProperty.call(reactionByMe, currentItem._id)
              ? reactionByMe[currentItem._id]
              : currentItem.reactionByMe;
            return (
              <button
                key={emoji}
                type="button"
                disabled={reacting}
                onClick={() => handleStoryReaction(emoji)}
                onPointerDown={(event) => event.stopPropagation()}
                aria-label={`React ${emoji}`}
                aria-pressed={selectedReaction === emoji}
                className={`rounded-full px-1.5 py-1 text-xl transition-transform hover:scale-125 disabled:opacity-50 ${selectedReaction === emoji ? "bg-white/25 scale-110 animate-reaction-pop" : ""}`}
              >
                {emoji}
              </button>
            );
          })}
        </div>
        {currentStory.user?._id === user?._id && (() => {
          const details = reactionDetailsByItem[currentItem._id] ?? currentItem.reactionDetails ?? [];
          if (!details.length) return null;
          return (
            <div className="absolute bottom-[4.5rem] left-3 right-3 z-30 flex justify-center">
              <button
                type="button"
                onClick={() => setShowReactions((value) => !value)}
                onPointerDown={(event) => event.stopPropagation()}
                className="rounded-full border border-white/20 bg-black/55 px-3 py-1 text-xs font-medium text-white backdrop-blur-md transition hover:bg-black/75"
                aria-expanded={showReactions}
              >
                {details.length} {details.length === 1 ? "reaction" : "reactions"}
              </button>
              {showReactions && (
                <div
                  className="absolute bottom-9 max-h-40 w-full max-w-sm overflow-y-auto rounded-xl border border-white/15 bg-black/80 p-2 text-white shadow-xl backdrop-blur-md"
                  onPointerDown={(event) => event.stopPropagation()}
                >
                  {details.map((reaction, index) => (
                    <div key={`${reaction.user?._id || reaction.emoji}-${index}`} className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm">
                      <span className="text-xl animate-reaction-pop">{reaction.emoji}</span>
                      <span className="truncate">{getDisplayName(reaction.user)}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })()}
      </div>
    </div>
  );

  return createPortal(viewer, document.body);
};

export default StoryViewer;
