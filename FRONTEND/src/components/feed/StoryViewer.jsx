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
import { markStoryItemAsViewed } from "@/lib/story";

const IMAGE_DURATION = 10000; // 10s for images
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
  const [itemDuration, setItemDuration] = useState(IMAGE_DURATION);
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
    // reset to image default; video will override on loadedmetadata
    setItemDuration(IMAGE_DURATION);
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
    if (currentItem?._id) {
      markStoryItemAsViewed(currentItem._id);
      onMarkViewedRef.current?.(currentItem._id);
    }
  }, [currentItem?._id]);

  useEffect(() => {
    const socket = getSocketInstance();
    const handleStoryReaction = (update) => {
      if (!update.reactionDetails || !currentStory?.user?._id) return;
      const storyId = update.storyId?.toString();
      const itemExists = currentStory.items.some(
        (item) => item._id.toString() === storyId,
      );
      if (!itemExists) return;
      setReactionDetailsByItem((previous) => ({
        ...previous,
        [storyId]: update.reactionDetails,
      }));
      onReactionChangeRef.current?.(
        storyId,
        currentStory.items.find((item) => item._id.toString() === storyId)
          ?.reactionByMe || null,
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
    const currentReaction = Object.prototype.hasOwnProperty.call(
      reactionByMe,
      currentItem._id,
    )
      ? reactionByMe[currentItem._id]
      : (currentItem.reactionByMe ?? null);
    const nextReaction = currentReaction === emoji ? null : emoji;
    try {
      setReacting(true);
      const response = await axios.post(
        apiUrl(`/api/v1/story/${currentItem._id}/reaction`),
        { emoji: nextReaction },
        { withCredentials: true },
      );
      setReactionByMe((previous) => ({
        ...previous,
        [currentItem._id]: nextReaction,
      }));
      if (response.data?.reactionDetails) {
        setReactionDetailsByItem((previous) => ({
          ...previous,
          [currentItem._id]: response.data.reactionDetails,
        }));
      }
      onReactionChange?.(
        currentItem._id,
        nextReaction,
        response.data?.reactionDetails,
      );
    } catch (error) {
      toast.error(error.response?.data?.message || "Unable to react to story.");
    } finally {
      setReacting(false);
    }
  };

  if (!currentStory || !currentItem) return null;

  const viewer = (
    <div
      className="fixed inset-0 z-[9999] flex select-none items-center justify-center bg-black/75 p-0 backdrop-blur-lg animate-fade-in md:p-5"
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
      onPointerDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div
        className="relative h-full w-full overflow-hidden bg-[var(--background)] shadow-[0_32px_80px_-24px_rgba(0,0,0,.6)] md:h-[88vh] md:w-[420px] md:rounded-3xl"
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
            className="absolute inset-0 h-full w-full bg-black object-contain"
            onClick={(event) => {
              const v = event.currentTarget;
              if (v.paused) v.play().catch(() => {});
              else v.pause();
            }}
            onContextMenu={(event) => event.preventDefault()}
            onLoadedMetadata={(event) => {
              // 🎯 full video duration — no cap
              const dur = event.currentTarget.duration;
              if (Number.isFinite(dur) && dur > 0) {
                setItemDuration(dur * 1000);
              }
            }}
            onEnded={goNext}
            onDoubleClick={(event) => event.stopPropagation()}
          />
        ) : (
          <img
            src={currentItem.image}
            alt=""
            draggable={false}
            className="absolute inset-0 h-full w-full object-cover"
          />
        )}

        <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-black/70 via-transparent to-black/55" />

        <div
          className="absolute inset-0 z-10 cursor-pointer"
          style={
            currentItem.mediaType === "video"
              ? { pointerEvents: "none" }
              : undefined
          }
          onPointerDown={handlePointerDown}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerCancel}
          onPointerLeave={handlePointerCancel}
        />

        {/* PROGRESS BARS */}
        <div className="absolute top-2 left-2 right-2 z-20 flex gap-1">
          {currentStory.items.map((item, i) => (
            <div
              key={item._id}
              className="h-[2.5px] flex-1 overflow-hidden rounded-full bg-white/25"
            >
              {i < itemIndex && <div className="h-full w-full bg-white/95" />}
              {i === itemIndex && (
                <div
                  key={`${userIndex}-${itemIndex}`}
                  className="h-full origin-left bg-white"
                  style={{
                    animation: `storyProgress ${itemDuration}ms linear forwards`,
                    animationPlayState: paused ? "paused" : "running",
                  }}
                  onAnimationEnd={
                    currentItem.mediaType === "video" ? undefined : goNext
                  }
                />
              )}
            </div>
          ))}
        </div>

        {/* HEADER */}
        <div className="absolute top-5 left-3 right-3 z-20 flex items-center gap-3">
          <button
            type="button"
            onClick={() => onOpenProfile?.(currentStory.user)}
            className="flex min-w-0 flex-1 items-center gap-3 text-left text-white outline-none"
            aria-label={`Open ${getDisplayName(currentStory.user)}'s profile`}
          >
            <span className="relative size-9 shrink-0">
              <Avatar className="size-9 border-2 border-white/50">
                <AvatarImage src={currentStory.user.profilePicture} />
                <AvatarFallback>
                  {getDisplayName(currentStory.user, "U")
                    .charAt(0)
                    .toUpperCase()}
                </AvatarFallback>
              </Avatar>
            </span>
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
            className="size-8 rounded-full flex items-center justify-center bg-white/10 text-white/95 backdrop-blur-md hover:bg-white/20 active:scale-95 transition-all duration-200 outline-none"
          >
            <X className="size-4" strokeWidth={2.2} />
          </button>
        </div>

        {paused && (
          <div className="absolute left-3 top-16 z-20 text-[10px] font-semibold uppercase tracking-widest text-white/70">
            Paused
          </div>
        )}

        {currentItem.caption && (
          <div className="absolute bottom-24 left-4 right-4 z-20 text-center text-sm leading-relaxed text-white drop-shadow-lg">
            {currentItem.caption}
          </div>
        )}

        {/* REACTION BAR */}
        <div className="absolute bottom-4 left-3 right-3 z-30 flex items-center justify-center gap-1.5 rounded-2xl border border-white/15 bg-black/50 px-2 py-2 backdrop-blur-xl">
          {STORY_REACTIONS.map((emoji) => {
            const selectedReaction = Object.prototype.hasOwnProperty.call(
              reactionByMe,
              currentItem._id,
            )
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
                className={`
                  rounded-full px-1.5 py-1 text-xl
                  transition-all duration-200
                  hover:scale-125 active:scale-95
                  disabled:opacity-50 outline-none
                  ${
                    selectedReaction === emoji
                      ? "bg-white/25 scale-110 animate-reaction-pop"
                      : ""
                  }
                `}
              >
                {emoji}
              </button>
            );
          })}
        </div>

        {currentStory.user?._id === user?._id &&
          (() => {
            const details =
              reactionDetailsByItem[currentItem._id] ??
              currentItem.reactionDetails ??
              [];
            if (!details.length) return null;
            return (
              <div className="absolute bottom-[4.5rem] left-3 right-3 z-30 flex justify-center">
                <button
                  type="button"
                  onClick={() => setShowReactions((v) => !v)}
                  onPointerDown={(event) => event.stopPropagation()}
                  className="rounded-full border border-white/20 bg-black/60 px-3 py-1 text-xs font-medium text-white backdrop-blur-md transition hover:bg-black/80 active:scale-95 outline-none"
                  aria-expanded={showReactions}
                >
                  {details.length}{" "}
                  {details.length === 1 ? "reaction" : "reactions"}
                </button>
                {showReactions && (
                  <div
                    className="absolute bottom-9 max-h-40 w-full max-w-sm overflow-y-auto rounded-2xl border border-white/15 bg-black/85 p-2 text-white shadow-2xl backdrop-blur-xl"
                    onPointerDown={(event) => event.stopPropagation()}
                  >
                    {details.map((reaction, index) => (
                      <div
                        key={`${reaction.user?._id || reaction.emoji}-${index}`}
                        className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm"
                      >
                        <span className="animate-reaction-pop text-xl">
                          {reaction.emoji}
                        </span>
                        <span className="truncate">
                          {getDisplayName(reaction.user)}
                        </span>
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
