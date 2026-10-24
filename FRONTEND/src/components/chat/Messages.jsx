import React, { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  Check,
  CheckCheck,
  MessageCircle,
  Clock,
  Smile,
  MessageSquareReply,
  ImageOff,
  Trash2,
  Ban,
  X,
  Loader2,
  Play,
  Pause,
  Mic,
  Maximize2,
  Download,
  Copy,
  Plus,
  MoreVertical,
  ChevronDown,
  ArrowLeft,
Star,
  Forward,
  Info,
  Volume2,
  VolumeX,
  Search,
} from "lucide-react";
import { useDispatch, useSelector } from "react-redux";
import axios from "axios";
import { toast } from "sonner";
import {
  updateMessageReactions,
  clearReactionNotice,
  markStoryAsUnavailable,
  deleteMessageForMe,
  deleteMessageForEveryone,
  toggleStarMessageLocal,
} from "@/redux/chatSlice";
import { apiUrl } from "@/lib/api";
import { getSocketInstance } from "@/redux/socketSlice";
import { getDisplayName } from "@/lib/utils";
import { playReactionSound } from "@/lib/sound";
import useGetAllMessage from "@/hooks/useGetAllMessage";
import useGetRTM from "@/hooks/useGetRTM";
import { ErrorState, LoadingState } from "@/components/common/RequestState";
import EmojiPicker from "./EmojiPicker";
import StoryViewer from "@/components/feed/StoryViewer";

const isSameUser = (a, b) => {
  if (!a || !b) return false;
  const idA = (a?._id || a)?.toString();
  const idB = (b?._id || b)?.toString();
  return Boolean(idA && idB && idA === idB);
};

const isTouchPrimary = () =>
  typeof window !== "undefined" &&
  window.matchMedia &&
  window.matchMedia("(hover: none) and (pointer: coarse)").matches;

const SWIPE_THRESHOLD = 55;
const SWIPE_MAX = 80;

/* ═══ WhatsApp / Telegram Voice Note Player Bubble ═══ */
const VoiceNoteBubble = ({ mediaUrl, duration = 0, isMine }) => {
  const audioRef = useRef(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [audioDuration, setAudioDuration] = useState(duration || 0);
  const [speed, setSpeed] = useState(1);

  const waveformHeights = [
    30, 45, 65, 35, 80, 95, 60, 40, 75, 90, 50, 30, 70, 85, 100, 75, 55, 90,
    65, 45, 80, 60, 35, 55, 75, 40, 60, 30,
  ];

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const onTimeUpdate = () => setCurrentTime(audio.currentTime);
    const onLoadedMetadata = () => {
      if (audio.duration && !isNaN(audio.duration)) {
        setAudioDuration(audio.duration);
      }
    };
    const onEnded = () => {
      setIsPlaying(false);
      setCurrentTime(0);
    };

    audio.addEventListener("timeupdate", onTimeUpdate);
    audio.addEventListener("loadedmetadata", onLoadedMetadata);
    audio.addEventListener("ended", onEnded);

    return () => {
      audio.removeEventListener("timeupdate", onTimeUpdate);
      audio.removeEventListener("loadedmetadata", onLoadedMetadata);
      audio.removeEventListener("ended", onEnded);
    };
  }, [mediaUrl]);

  const togglePlay = (e) => {
    e.stopPropagation();
    const audio = audioRef.current;
    if (!audio) return;
    if (isPlaying) {
      audio.pause();
      setIsPlaying(false);
    } else {
      audio
        .play()
        .then(() => setIsPlaying(true))
        .catch(() => {});
    }
  };

  const cycleSpeed = (e) => {
    e.stopPropagation();
    const speeds = [1, 1.5, 2];
    const nextIdx = (speeds.indexOf(speed) + 1) % speeds.length;
    const nextSpeed = speeds[nextIdx];
    setSpeed(nextSpeed);
    if (audioRef.current) {
      audioRef.current.playbackRate = nextSpeed;
    }
  };

  const handleWaveformClick = (e) => {
    e.stopPropagation();
    const audio = audioRef.current;
    if (!audio) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const progress = Math.max(0, Math.min(1, clickX / rect.width));
    const targetTime = progress * (audioDuration || 1);
    audio.currentTime = targetTime;
    setCurrentTime(targetTime);
  };

  const formatAudioTime = (seconds) => {
    if (!seconds || isNaN(seconds)) return "0:00";
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs < 10 ? "0" : ""}${secs}`;
  };

  const progressPercent =
    audioDuration > 0 ? (currentTime / audioDuration) * 100 : 0;

  return (
    <div className="flex flex-col gap-1.5 w-60 sm:w-68 py-1 select-none">
      <audio ref={audioRef} src={mediaUrl} preload="metadata" />
      <div className="flex items-center gap-2.5">
        <button
          type="button"
          onClick={togglePlay}
          className={`size-10 rounded-full flex items-center justify-center shrink-0 shadow-md transition-all active:scale-90 ${
            isMine
              ? "bg-white text-emerald-700 hover:bg-white/90"
              : "bg-[var(--primary)] text-white hover:opacity-90"
          }`}
          title={isPlaying ? "Pause" : "Play"}
        >
          {isPlaying ? (
            <Pause className="size-4 fill-current" />
          ) : (
            <Play className="size-4 fill-current ml-0.5" />
          )}
        </button>

        <div
          className="flex-1 flex items-center gap-[2.5px] h-8 cursor-pointer py-1 relative"
          onClick={handleWaveformClick}
        >
          {waveformHeights.map((h, i) => {
            const barPercent = (i / waveformHeights.length) * 100;
            const isPlayed = barPercent <= progressPercent;
            return (
              <span
                key={i}
                className="flex-1 rounded-full transition-colors duration-150"
                style={{
                  height: `${h}%`,
                  backgroundColor: isPlayed
                    ? isMine
                      ? "#ffffff"
                      : "var(--primary)"
                    : isMine
                      ? "rgba(255, 255, 255, 0.35)"
                      : "rgba(255, 255, 255, 0.2)",
                }}
              />
            );
          })}
        </div>

        <button
          type="button"
          onClick={cycleSpeed}
          className={`text-[10px] font-bold px-1.5 py-0.5 rounded-md transition-all active:scale-95 ${
            isMine
              ? "bg-white/20 hover:bg-white/30 text-white"
              : "bg-white/10 hover:bg-white/20 text-white/80"
          }`}
          title="Playback speed"
        >
          {speed}x
        </button>
      </div>

      <div className="flex items-center justify-between text-[10.5px] px-1 opacity-80 font-medium">
        <span>
          {isPlaying
            ? formatAudioTime(currentTime)
            : formatAudioTime(audioDuration || duration)}
        </span>
        <span className="flex items-center gap-1">
          <Mic className="size-3 opacity-70" />
          <span>Voice message</span>
        </span>
      </div>
    </div>
  );
};

/* ═══ Helper to highlight text during search ═══ */
const renderHighlightedText = (text, query) => {
  if (!query || !text) return text;
  const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const regex = new RegExp(`(${escaped})`, "gi");
  const parts = text.split(regex);
  return parts.map((part, i) =>
    part.toLowerCase() === query.toLowerCase() ? (
      <mark
        key={i}
        className="bg-amber-400 text-black font-semibold rounded-sm px-0.5 shadow-sm"
      >
        {part}
      </mark>
    ) : (
      part
    )
  );
};

/* ═══ Receiver popup — top of chat ═══ */
const ReactionPopup = ({ emoji, name }) => {
  const particles = Array.from({ length: 12 });
  return (
    <div role="status" className="nova-reaction-popup animate-reaction-popup-in">
      <div className="nova-reaction-popup__inner">
        <span className="nova-reaction-popup__rings">
          <span className="nova-reaction-popup__ring" />
          <span
            className="nova-reaction-popup__ring"
            style={{ animationDelay: "180ms" }}
          />
        </span>
        <span className="nova-reaction-popup__emoji animate-reaction-emoji-spin">
          {emoji}
        </span>
        <span className="nova-reaction-popup__particles">
          {particles.map((_, i) => {
            const angle = (i / particles.length) * Math.PI * 2;
            const distance = 34 + (i % 3) * 10;
            return (
              <span
                key={i}
                className="nova-reaction-popup__particle animate-reaction-particle"
                style={{
                  background: i % 2 === 0 ? "var(--primary)" : "var(--gold)",
                  "--tx": `${Math.cos(angle) * distance}px`,
                  "--ty": `${Math.sin(angle) * distance}px`,
                  animationDelay: `${(i % 4) * 40}ms`,
                }}
              />
            );
          })}
        </span>
        <span className="nova-reaction-popup__text">{name} reacted</span>
      </div>
    </div>
  );
};

/* ═══ Ultra Mobile-Friendly Futuristic Glass Message Popover ═══ */
const WhatsAppMessagePopover = ({
  anchorEl,
  message,
  currentUser,
  onReply,
  onReact,
  onDelete,
  onViewMedia,
  onClose,
}) => {
  if (!message) return null;
  const isMine = isSameUser(message.senderId, currentUser?._id);
  const isDeleted = Boolean(message.isDeletedForEveryone);
  const hasText = Boolean(message.message && !isDeleted);
  const hasMedia = Boolean(message.mediaUrl && !isDeleted);

  const popoverRef = useRef(null);

  // Initial coordinates calculated synchronously so it NEVER appears at top-left (0,0)
  const [coords, setCoords] = useState(() => {
    if (!anchorEl) return { top: 100, left: 100, ready: false };
    const a = anchorEl.getBoundingClientRect();
    const isMobile = typeof window !== "undefined" && window.innerWidth < 640;
    const margin = isMobile ? 10 : 16;
    const isOwner = isSameUser(message?.senderId, currentUser?._id);
    const placeAbove = a.top > 160;
    const top = placeAbove
      ? Math.max(margin, a.top - 130)
      : Math.min(window.innerHeight - 180, a.bottom + 6);
    let left = isOwner ? a.right - 210 : a.left;
    left = Math.max(margin, Math.min(left, window.innerWidth - 220));
    return { top, left, ready: true };
  });

  const POPULAR_EMOJIS = ["❤️", "👍", "😂", "🔥", "😮", "😢", "🙏"];

  const handleCopy = (e) => {
    e?.stopPropagation();
    if (message.message) {
      navigator.clipboard.writeText(message.message);
      toast.success("Message copied to clipboard");
      onClose();
    }
  };

  const computeCoords = useCallback(() => {
    if (!anchorEl || !popoverRef.current) return;
    const a = anchorEl.getBoundingClientRect();
    const p = popoverRef.current.getBoundingClientRect();
    const isMobile = window.innerWidth < 640;
    const margin = isMobile ? 10 : 16;
    const gap = 8;

    const placeAbove = a.top > p.height + gap + 20;
    let top = placeAbove
      ? a.top - p.height - gap
      : a.bottom + gap;

    // Constrain within viewport bounds
    top = Math.max(margin, Math.min(window.innerHeight - p.height - margin - 10, top));

    let left = isMine ? a.right - p.width : a.left;
    left = Math.max(margin, Math.min(window.innerWidth - p.width - margin, left));

    setCoords({ top, left, ready: true });
  }, [anchorEl, isMine]);

  useLayoutEffect(() => {
    computeCoords();
  }, [computeCoords]);

  useEffect(() => {
    if (!anchorEl) return undefined;
    const reposition = () => computeCoords();
    window.addEventListener("resize", reposition);
    window.addEventListener("scroll", reposition, true);
    return () => {
      window.removeEventListener("resize", reposition);
      window.removeEventListener("scroll", reposition, true);
    };
  }, [anchorEl, computeCoords]);

  useEffect(() => {
    const handleKey = (e) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [onClose]);

  return createPortal(
    <div
      className="fixed inset-0 z-[9990] select-none"
      style={{ touchAction: "manipulation" }}
    >
      {/* Click-outside backdrop with subtle blur */}
      <div
        className="fixed inset-0 bg-black/40 backdrop-blur-[2px] cursor-pointer"
        onClick={onClose}
        onTouchEnd={onClose}
      />

      {/* Floating Popover Container anchored directly at the bubble */}
      <div
        ref={popoverRef}
        onClick={(e) => e.stopPropagation()}
        onMouseDown={(e) => e.stopPropagation()}
        onPointerDown={(e) => e.stopPropagation()}
        onTouchStart={(e) => e.stopPropagation()}
        onTouchEnd={(e) => e.stopPropagation()}
        style={{
          position: "fixed",
          top: `${coords.top}px`,
          left: `${coords.left}px`,
          visibility: coords.ready ? "visible" : "hidden",
        }}
        className={`z-[9991] flex flex-col gap-1.5 animate-in fade-in zoom-in-95 duration-100 max-w-[calc(100vw-20px)] ${
          isMine ? "items-end" : "items-start"
        }`}
      >
        {/* Futuristic Glass Reaction Pill (Popular Emojis only) */}
        <div className="flex items-center gap-1 sm:gap-1.5 bg-[#141624]/90 backdrop-blur-2xl border border-white/20 rounded-full px-2 sm:px-2.5 py-1.5 shadow-[0_16px_40px_rgba(0,0,0,0.7),inset_0_1px_1px_rgba(255,255,255,0.25),0_0_20px_rgba(139,92,246,0.2)] ring-1 ring-white/10 max-w-full">
          {POPULAR_EMOJIS.map((emoji) => (
            <button
              key={emoji}
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onReact(emoji);
                onClose();
              }}
              onTouchEnd={(e) => {
                e.stopPropagation();
                onReact(emoji);
                onClose();
              }}
              className="size-8 sm:size-8.5 rounded-full flex items-center justify-center text-xl sm:text-2xl hover:scale-125 active:scale-90 hover:bg-white/15 transition-all cursor-pointer shrink-0"
            >
              {emoji}
            </button>
          ))}
        </div>

        {/* Futuristic Glass Context Menu Card */}
        <div className="w-48 sm:w-52 bg-[#121422]/90 backdrop-blur-2xl border border-white/20 rounded-2xl p-1.5 shadow-[0_20px_50px_rgba(0,0,0,0.85),inset_0_1px_1px_rgba(255,255,255,0.2),0_0_25px_rgba(59,130,246,0.15)] ring-1 ring-white/10 flex flex-col gap-0.5">
          {/* Reply */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onReply(message);
              onClose();
            }}
            className="flex items-center gap-3 w-full px-3 py-2 rounded-xl text-xs sm:text-sm font-semibold text-white/90 hover:bg-white/10 hover:text-white active:bg-white/20 transition-all text-left cursor-pointer group/btn"
          >
            <div className="size-7 rounded-lg bg-[var(--primary)]/20 text-[var(--primary)] ring-1 ring-[var(--primary)]/30 flex items-center justify-center shrink-0 group-hover/btn:scale-110 transition-transform">
              <MessageSquareReply className="size-3.5" />
            </div>
            <span>Reply</span>
          </button>

          {/* Copy Text */}
          {hasText && (
            <button
              type="button"
              onClick={handleCopy}
              className="flex items-center gap-3 w-full px-3 py-2 rounded-xl text-xs sm:text-sm font-semibold text-white/90 hover:bg-white/10 hover:text-white active:bg-white/20 transition-all text-left cursor-pointer group/btn"
            >
              <div className="size-7 rounded-lg bg-emerald-500/20 text-emerald-400 ring-1 ring-emerald-500/30 flex items-center justify-center shrink-0 group-hover/btn:scale-110 transition-transform">
                <Copy className="size-3.5" />
              </div>
              <span>Copy Text</span>
            </button>
          )}

          {/* View Full Media */}
          {hasMedia && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onViewMedia();
                onClose();
              }}
              className="flex items-center gap-3 w-full px-3 py-2 rounded-xl text-xs sm:text-sm font-semibold text-white/90 hover:bg-white/10 hover:text-white active:bg-white/20 transition-all text-left cursor-pointer group/btn"
            >
              <div className="size-7 rounded-lg bg-cyan-500/20 text-cyan-400 ring-1 ring-cyan-500/30 flex items-center justify-center shrink-0 group-hover/btn:scale-110 transition-transform">
                <Maximize2 className="size-3.5" />
              </div>
              <span>View Media</span>
            </button>
          )}

          <div className="my-0.5 h-px bg-white/10" />

          {/* Delete Message */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onClose();
              onDelete(message);
            }}
            className="flex items-center gap-3 w-full px-3 py-2 rounded-xl text-xs sm:text-sm font-semibold text-red-400 hover:bg-red-500/20 hover:text-red-300 active:bg-red-500/30 transition-all text-left cursor-pointer group/btn"
          >
            <div className="size-7 rounded-lg bg-rose-500/20 text-rose-400 ring-1 ring-rose-500/30 flex items-center justify-center shrink-0 group-hover/btn:scale-110 transition-transform">
              <Trash2 className="size-3.5" />
            </div>
            <span>Delete</span>
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};

const Messages = ({
  selectedUser,
  onReplyMessage,
  searchQuery = "",
  activeSearchId = null,
}) => {
  const { isTyping } = useGetRTM();
  const messageRequest = useGetAllMessage();

  const { messages, reactionNotice } = useSelector((s) => s.chat);
  const { user } = useSelector((s) => s.auth);
  const dispatch = useDispatch();

  const scrollContainerRef = useRef(null);
  const bottomSentinelRef = useRef(null);
  const highlightTimerRef = useRef(null);
  const seenIdsRef = useRef(new Set());

  const [newIds, setNewIds] = useState(new Set());
  const [highlightedMessageId, setHighlightedMessageId] = useState(null);
  const [openPickerFor, setOpenPickerFor] = useState(null);
  const [anchorEl, setAnchorEl] = useState(null);
  const [reactingMessageId, setReactingMessageId] = useState(null);
  const [reactionPopup, setReactionPopup] = useState(null);
  const [justReacted, setJustReacted] = useState(null);
  const [isTouch, setIsTouch] = useState(false);
  const [actionsFor, setActionsFor] = useState(null);
  const [actionsAnchorEl, setActionsAnchorEl] = useState(null);
  const [activeStoryViewer, setActiveStoryViewer] = useState(null);
  const [openingStory, setOpeningStory] = useState(false);
  const [deleteTargetMessage, setDeleteTargetMessage] = useState(null);
  
  const [deletingMessage, setDeletingMessage] = useState(false);
  const [lightboxMedia, setLightboxMedia] = useState(null);
  const [showScrollBottom, setShowScrollBottom] = useState(false);
  const [unreadWhileScrolled, setUnreadWhileScrolled] = useState(0);

  const scrollToBottom = useCallback((smooth = false) => {
    const el = scrollContainerRef.current;
    if (!el) return;
    if (smooth) {
      el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
    } else {
      el.scrollTop = el.scrollHeight;
    }
    bottomSentinelRef.current?.scrollIntoView({
      behavior: smooth ? "smooth" : "auto",
      block: "end",
    });
  }, []);

    const handleDeleteMessage = async (deleteType) => {
    if (!deleteTargetMessage?._id || deletingMessage) return;
    try {
      setDeletingMessage(true);
      await axios.post(
        apiUrl(`/api/v1/message/delete/${deleteTargetMessage._id}`),
        { deleteType },
        { withCredentials: true }
      );
      if (deleteType === "everyone") {
        dispatch(
          deleteMessageForEveryone({
            messageId: deleteTargetMessage._id,
            deletedAt: new Date().toISOString(),
          })
        );
        toast.success("Message deleted for everyone");
      } else {
        dispatch(deleteMessageForMe({ messageId: deleteTargetMessage._id }));
        toast.success("Message deleted for you");
      }
      setDeleteTargetMessage(null);
    } catch (err) {
      toast.error(err.response?.data?.message || "Unable to delete message");
    } finally {
      setDeletingMessage(false);
    }
  };

  const handleOpenStory = async (storyId) => {
    if (!storyId || openingStory) return;
    try {
      setOpeningStory(true);
      const res = await axios.get(apiUrl(`/api/v1/story/${storyId}`), {
        withCredentials: true,
      });
      if (res.data?.success && res.data.story) {
        setActiveStoryViewer({
          stories: [res.data.story],
          userIndex: 0,
          itemIndex: 0,
        });
      } else {
        toast.error("This story is no longer available.");
      }
    } catch (err) {
      const msg =
        err.response?.data?.message || "This story is no longer available.";
      toast.error(msg);
    } finally {
      setOpeningStory(false);
    }
  };

  const [swipeFor, setSwipeFor] = useState({ msgId: null, offset: 0 });
  const swipeRef = useRef(null);
  const suppressTapRef = useRef(false);

  useEffect(() => {
    setIsTouch(isTouchPrimary());
  }, []);

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "Escape") {
        setActionsFor(null);
        setOpenPickerFor(null);
        setAnchorEl(null);
        setLightboxMedia(null);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  /* Close action sheet when tapping/clicking anywhere outside */
  useEffect(() => {
    if (!actionsFor) return;

    const handleOutsideClick = (e) => {
      if (e.target.closest(".nova-msg-action-sheet")) return;
      setActionsFor(null);
    };

    document.addEventListener("pointerdown", handleOutsideClick, true);
    return () => {
      document.removeEventListener("pointerdown", handleOutsideClick, true);
    };
  }, [actionsFor]);

  /* ---------- Realtime story deletion / expiry listener ---------- */
  useEffect(() => {
    const socket = getSocketInstance();
    if (!socket) return undefined;
    const handleStoryUnavailable = (data) => {
      if (data?.storyId) {
        dispatch(
          markStoryAsUnavailable({
            storyId: data.storyId,
            isDeleted: Boolean(data.isDeleted ?? true),
          })
        );
      }
    };
    socket.on("storyDeleted", handleStoryUnavailable);
    socket.on("storyRefUnavailable", handleStoryUnavailable);

    const handleDeletedForEveryone = ({ messageId, deletedAt }) => {
      if (messageId) {
        dispatch(deleteMessageForEveryone({ messageId, deletedAt }));
      }
    };
    const handleDeletedForMe = ({ messageId }) => {
      if (messageId) {
        dispatch(deleteMessageForMe({ messageId }));
      }
    };
    socket.on("messageDeletedForEveryone", handleDeletedForEveryone);
    socket.on("messageDeletedForMe", handleDeletedForMe);

    return () => {
      socket.off("storyDeleted", handleStoryUnavailable);
      socket.off("storyRefUnavailable", handleStoryUnavailable);
      socket.off("messageDeletedForEveryone", handleDeletedForEveryone);
      socket.off("messageDeletedForMe", handleDeletedForMe);
    };
  }, [dispatch]);

  /* ---------- receiver popup ---------- */
  useEffect(() => {
    if (
      !reactionNotice?.emoji ||
      reactionNotice.actorId === user?._id ||
      reactionNotice.conversationUserId !== selectedUser?._id
    )
      return undefined;

    setReactionPopup(reactionNotice.emoji);
    dispatch(clearReactionNotice());
    playReactionSound();
    const timer = setTimeout(() => setReactionPopup(null), 2600);

    return () => clearTimeout(timer);
  }, [
    reactionNotice?.timestamp,
    reactionNotice?.emoji,
    reactionNotice?.actorId,
    reactionNotice?.conversationUserId,
    selectedUser?._id,
    user?._id,
  ]);

  const formatMessageTime = (createdAt) => {
    if (!createdAt) return "";
    return new Intl.DateTimeFormat(undefined, {
      hour: "numeric",
      minute: "2-digit",
    }).format(new Date(createdAt));
  };

  const getFirstName = (person) => getDisplayName(person, "User");

  /* ---------- reaction ---------- */
  const handleReaction = async (message, emoji) => {
    if (reactingMessageId) return;

    const current = message.reactions?.find(
      (r) => isSameUser(r.userId, user?._id)
    );
    const nextEmoji = current?.emoji === emoji ? null : emoji;

    setJustReacted({ messageId: message._id, emoji });
    setTimeout(() => setJustReacted(null), 800);
    playReactionSound();

    try {
      setReactingMessageId(message._id);
      const response = await axios.patch(
        apiUrl(`/api/v1/message/${selectedUser._id}/reaction/${message._id}`),
        { emoji: nextEmoji },
        { withCredentials: true }
      );
      dispatch(
        updateMessageReactions({
          messageId: message._id,
          reactions: response.data.reactions,
        })
      );
      setOpenPickerFor(null);
      setAnchorEl(null);
    } catch (error) {
      toast.error(
        error.response?.data?.message || "Unable to react to message."
      );
    } finally {
      setReactingMessageId(null);
    }
  };

  /* ═══ WhatsApp-style Blue Ticks ═══ */
  const MessageStatus = ({ status }) => {
    if (status === "sending")
      return (
        <Clock className="size-3 text-white/60 animate-pulse" strokeWidth={2} />
      );
    if (status === "seen")
      return (
        <CheckCheck
          className="size-3.5 text-[#38bdf8] drop-shadow-[0_0_8px_rgba(56,189,248,0.7)]"
          strokeWidth={2.6}
        />
      );
    if (status === "delivered")
      return <CheckCheck className="size-3 text-white/80" strokeWidth={2.4} />;
    return <Check className="size-3 text-white/70" strokeWidth={2.4} />;
  };

  useEffect(() => {
    seenIdsRef.current = new Set();
    setNewIds(new Set());
    setOpenPickerFor(null);
    setAnchorEl(null);
    setHighlightedMessageId(null);
    setSwipeFor({ msgId: null, offset: 0 });
    setActionsFor(null);
    swipeRef.current = null;
  }, [selectedUser?._id]);

  useEffect(() => () => clearTimeout(highlightTimerRef.current), []);

  /* ---------- reply triggers ---------- */
  const triggerReply = (msg) => {
    if (!msg || msg.__optimistic || msg.status === "sending") return;
    setActionsFor(null);
    onReplyMessage?.(msg);
  };

  const handleBubbleTouchStart = (msgId, e) => {
    if (e.touches.length !== 1) return;
    const touch = e.touches[0];
    swipeRef.current = {
      msgId,
      startX: touch.clientX,
      startY: touch.clientY,
      swiping: false,
      cancelled: false,
    };
  };

  const handleBubbleTouchMove = (e) => {
    const ref = swipeRef.current;
    if (!ref || ref.cancelled) return;
    const touch = e.touches[0];
    const dx = touch.clientX - ref.startX;
    const dy = touch.clientY - ref.startY;

    if (!ref.swiping && Math.abs(dy) > Math.abs(dx) && Math.abs(dy) > 8) {
      ref.cancelled = true;
      setSwipeFor({ msgId: null, offset: 0 });
      return;
    }

    if (dx > 8 && Math.abs(dx) > Math.abs(dy)) {
      ref.swiping = true;
      const offset = Math.min(dx, SWIPE_MAX);
      setSwipeFor({ msgId: ref.msgId, offset });
    }
  };

  const handleBubbleTouchEnd = () => {
    const ref = swipeRef.current;
    if (!ref) return;
    const { msgId, swiping, cancelled } = ref;
    const finalOffset = swipeFor.offset;
    swipeRef.current = null;

    if (swiping) {
      suppressTapRef.current = true;
      setTimeout(() => {
        suppressTapRef.current = false;
      }, 350);
    }

    if (!cancelled && swiping && finalOffset >= SWIPE_THRESHOLD) {
      const msg = messages.find((m) => m._id === msgId);
      triggerReply(msg);
    }

    setSwipeFor({ msgId: null, offset: 0 });
  };

  const handleBubbleClick = (e, msg) => {
    if (suppressTapRef.current) return;
    e.stopPropagation();
    if (msg.__optimistic || msg.status === "sending") return;
    const currentTarget = e.currentTarget;
    setActionsFor((cur) => {
      if (cur?._id === msg._id) {
        setActionsAnchorEl(null);
        return null;
      }
      setActionsAnchorEl(currentTarget);
      return msg;
    });
  };

  const jumpToMessage = (messageId) => {
    const container = scrollContainerRef.current;
    const target = document.getElementById(`message-${messageId}`);
    if (!container || !target) return;

    const targetTop =
      target.getBoundingClientRect().top -
      container.getBoundingClientRect().top +
      container.scrollTop;
    container.scrollTo({
      top: targetTop - container.clientHeight / 2 + target.clientHeight / 2,
      behavior: "smooth",
    });

    setHighlightedMessageId(messageId);
    clearTimeout(highlightTimerRef.current);
    highlightTimerRef.current = setTimeout(
      () => setHighlightedMessageId(null),
      2000
    );
  };

  /* Scroll to active search match */
  useEffect(() => {
    if (activeSearchId) {
      jumpToMessage(activeSearchId);
    }
  }, [activeSearchId]);

  useEffect(() => {
    if (!messages?.length) return;
    const isInitialLoad = seenIdsRef.current.size === 0;
    const incoming = messages.filter(
      (m) => !seenIdsRef.current.has(m._id) && !m.__optimistic
    );
    incoming.forEach((m) => seenIdsRef.current.add(m._id));
    messages.forEach((m) => {
      if (!seenIdsRef.current.has(m._id)) seenIdsRef.current.add(m._id);
    });

    if (!isInitialLoad && incoming.length > 0) {
      setNewIds(new Set(incoming.map((m) => m._id)));
      const timer = setTimeout(() => setNewIds(new Set()), 800);
      return () => clearTimeout(timer);
    }
    return undefined;
  }, [messages]);

  const isNearBottom = () => {
    const el = scrollContainerRef.current;
    if (!el) return true;
    const d = el.scrollHeight - el.scrollTop - el.clientHeight;
    return d <= 180;
  };

  const lastMsgIdRef = useRef(null);
  const isInitialScrollDoneRef = useRef(false);

  useEffect(() => {
    isInitialScrollDoneRef.current = false;
    setShowScrollBottom(false);
    setUnreadWhileScrolled(0);
  }, [selectedUser?._id]);

  /* Multi-phase initial scroll to bottom when opening chat / messages load */
  useEffect(() => {
    const el = scrollContainerRef.current;
    if (!el || messageRequest.loading || !messages?.length) return;

    if (!isInitialScrollDoneRef.current) {
      scrollToBottom(false);

      const r1 = requestAnimationFrame(() => scrollToBottom(false));
      const t1 = setTimeout(() => {
        scrollToBottom(false);
        isInitialScrollDoneRef.current = true;
      }, 60);
      const t2 = setTimeout(() => {
        scrollToBottom(false);
      }, 200);

      return () => {
        cancelAnimationFrame(r1);
        clearTimeout(t1);
        clearTimeout(t2);
      };
    }
  }, [messageRequest.loading, messages, selectedUser?._id, scrollToBottom]);

  /* Auto scroll on incoming / newly sent messages */
  useEffect(() => {
    const el = scrollContainerRef.current;
    if (!el || messageRequest.loading || !messages?.length) return;

    const latestMsg = messages[messages.length - 1];
    const isNewBottomMessage =
      latestMsg && latestMsg._id !== lastMsgIdRef.current;
    lastMsgIdRef.current = latestMsg?._id;

    if (isNewBottomMessage && isInitialScrollDoneRef.current) {
      const isNear = isNearBottom();
      const isMyMessage = isSameUser(latestMsg.senderId, user?._id);
      if (isNear || isMyMessage) {
        requestAnimationFrame(() => scrollToBottom(true));
      } else {
        setUnreadWhileScrolled((prev) => prev + 1);
      }
    }
  }, [messages, messageRequest.loading, scrollToBottom, user?._id]);

  const handleScroll = () => {
    const el = scrollContainerRef.current;
    if (!el) return;

    const distanceFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
    const isFar = distanceFromBottom > 220;
    setShowScrollBottom(isFar);
    if (!isFar) {
      setUnreadWhileScrolled(0);
    }

    // Auto-load older messages when user scrolls near top
    if (
      el.scrollTop <= 80 &&
      messageRequest.hasMore &&
      !messageRequest.loadingMore &&
      messages?.length > 0
    ) {
      const oldestId = messages[0]._id;
      const prevScrollHeight = el.scrollHeight;
      const prevScrollTop = el.scrollTop;

      messageRequest.loadOlderMessages(oldestId).then((loaded) => {
        if (loaded && el) {
          requestAnimationFrame(() => {
            el.scrollTop = el.scrollHeight - prevScrollHeight + prevScrollTop;
          });
        }
      });
    }
  };

  const openPicker = (msgId, anchor) => {
    if (openPickerFor === msgId) {
      setOpenPickerFor(null);
      setAnchorEl(null);
      return;
    }
    setAnchorEl(anchor);
    setOpenPickerFor(msgId);
  };

  return (
    <div className="nova-messages">
      {reactionPopup && (
        <ReactionPopup
          emoji={reactionPopup}
          name={getDisplayName(selectedUser, "Someone")}
        />
      )}

      <div
        ref={scrollContainerRef}
        onScroll={handleScroll}
        className="nova-messages__scroll"
      >
        {messageRequest.loading ? (
          <LoadingState message="Loading messages…" />
        ) : messageRequest.error ? (
          <ErrorState
            message={messageRequest.error}
            onRetry={messageRequest.retry}
          />
        ) : messages?.length === 0 ? (
          <div className="nova-messages__empty">
            <div className="nova-messages__empty-orb">
              <MessageCircle className="size-5" strokeWidth={1.8} />
            </div>
            <p className="nova-messages__empty-title">No messages yet</p>
            <p className="nova-messages__empty-sub">
              Say hi to start the conversation.
            </p>
          </div>
        ) : (
          <>
            {messageRequest.loadingMore && (
              <div className="flex items-center justify-center py-2.5 gap-2 text-xs text-[var(--muted-foreground)] animate-fade-in">
                <Loader2 className="size-3.5 animate-spin text-[var(--primary)]" />
                <span>Loading earlier messages…</span>
              </div>
            )}
            {messageRequest.hasMore && !messageRequest.loadingMore && (
              <div className="flex justify-center py-2">
                <button
                  type="button"
                  onClick={() => {
                    const el = scrollContainerRef.current;
                    if (!el || !messages?.length) return;
                    const prevScrollHeight = el.scrollHeight;
                    messageRequest
                      .loadOlderMessages(messages[0]._id)
                      .then((loaded) => {
                        if (loaded && el) {
                          requestAnimationFrame(() => {
                            el.scrollTop = el.scrollHeight - prevScrollHeight;
                          });
                        }
                      });
                  }}
                  className="text-[11px] font-medium text-[var(--primary)] hover:underline px-3 py-1 rounded-full bg-[var(--surface-2)]/80 border border-[var(--border)]/60 transition-colors"
                >
                  Load earlier messages
                </button>
              </div>
            )}
            {messages?.map((msg, index) => {
              const isMine = isSameUser(msg.senderId, user?._id);
              const prev = messages[index - 1];
              const sameAsPrev = prev && isSameUser(prev.senderId, msg.senderId);
              const next = messages[index + 1];
              const sameAsNext = next && isSameUser(next.senderId, msg.senderId);

              const shouldAnimate = newIds.has(msg._id);
              const isPending = msg.__optimistic || msg.status === "sending";
              const isPickerOpen = openPickerFor === msg._id;
              const isActionsOpen = actionsFor?._id === msg._id;
              const isReplyable = !isPending && !msg.isDeletedForEveryone;

              const burstEmoji =
                justReacted?.messageId === msg._id ? justReacted.emoji : null;

              const grouped = Object.entries(
                (msg.reactions || []).reduce((acc, r) => {
                  acc[r.emoji] = (acc[r.emoji] || 0) + 1;
                  return acc;
                }, {})
              );

              const isSwiping = swipeFor.msgId === msg._id;
              const swipeOffset = isSwiping ? swipeFor.offset : 0;
              const swipeProgress = Math.min(swipeOffset / SWIPE_THRESHOLD, 1);

              return (
                <div
                  key={msg._id}
                  id={`message-${msg._id}`}
                  className={`nova-msg-row ${
                    isMine ? "is-mine" : "is-theirs"
                  } ${sameAsPrev ? "is-tight" : ""} ${
                    shouldAnimate
                      ? isMine
                        ? "animate-message-in-mine"
                        : "animate-message-in-theirs"
                      : ""
                  }`}
                >
                  <div
                    className={`nova-msg-wrap ${
                      highlightedMessageId === msg._id ? "is-highlighted" : ""
                    }`}
                  >
                    {isSwiping && isReplyable && (
                      <span
                        className="nova-msg-swipe-hint"
                        style={{
                          opacity: swipeProgress,
                          transform: `translateY(-50%) scale(${
                            0.6 + swipeProgress * 0.5
                          })`,
                        }}
                      >
                        <span
                          className={`nova-msg-swipe-orb ${
                            swipeOffset >= SWIPE_THRESHOLD
                              ? "animate-reply-icon-pop"
                              : ""
                          }`}
                        >
                          <MessageSquareReply
                            className="size-4"
                            strokeWidth={2.4}
                          />
                        </span>
                      </span>
                    )}

                    <div
                      className="nova-msg-drag group/msg"
                      style={{
                        transform: `translateX(${swipeOffset}px)`,
                        transitionDuration: isSwiping ? "0ms" : "280ms",
                        transitionTimingFunction: isSwiping
                          ? "linear"
                          : "cubic-bezier(0.22, 1, 0.36, 1)",
                      }}
                      onTouchStart={(e) => handleBubbleTouchStart(msg._id, e)}
                      onTouchMove={handleBubbleTouchMove}
                      onTouchEnd={handleBubbleTouchEnd}
                      onTouchCancel={handleBubbleTouchEnd}
                    >
                      {burstEmoji && (
                        <span className="nova-msg-burst">
                          <span className="nova-msg-burst__emoji animate-emoji-send-burst">
                            {burstEmoji}
                          </span>
                        </span>
                      )}

                      {msg.isDeletedForEveryone ? (
                        <div
                          className={`nova-msg ${
                            isMine ? "is-mine" : "is-theirs"
                          } opacity-75 italic select-none ${
                            sameAsNext ? "is-grouped" : ""
                          }`}
                        >
                          <div className="flex items-center gap-1.5 py-0.5 text-[12.5px] text-white/75">
                            <Ban className="size-3.5 shrink-0 text-white/45" />
                            <span>
                              {isMine
                                ? "You deleted this message"
                                : "This message was deleted"}
                            </span>
                          </div>
                          <div
                            className={`nova-msg__meta ${
                              isMine ? "is-mine" : "is-theirs"
                            }`}
                          >
                            <span>
                              {formatMessageTime(msg.deletedAt || msg.createdAt)}
                            </span>
                          </div>
                        </div>
                      ) : (
                        <div
                          onClick={(e) => handleBubbleClick(e, msg)}
                          className={`nova-msg ${
                            isMine ? "is-mine" : "is-theirs"
                          } ${isPending ? "is-pending" : ""} ${
                            isActionsOpen || isPickerOpen ? "is-active" : ""
                          } ${sameAsNext ? "is-grouped" : ""} cursor-pointer`}
                        >
                          {msg.replyTo?.message && (
                            <button
                              type="button"
                              onClick={(event) => {
                                event.stopPropagation();
                                jumpToMessage(msg.replyTo.messageId);
                              }}
                              className={`nova-msg__reply ${
                                isMine ? "is-mine" : "is-theirs"
                              }`}
                            >
                              <span className="nova-msg__reply-label">
                                {isSameUser(msg.replyTo.senderId, user?._id)
                                  ? "You"
                                  : getDisplayName(selectedUser, "User")}
                              </span>
                              <span className="nova-msg__reply-text">
                                {msg.replyTo.message}
                              </span>
                            </button>
                          )}

                          {msg.storyRef?.storyId &&
                            (msg.storyRef.isUnavailable ||
                            !msg.storyRef.image ? (
                              <div
                                onClick={(event) => {
                                  event.stopPropagation();
                                  toast.info(
                                    "This story is no longer available."
                                  );
                                }}
                                className={`mb-2 flex items-center gap-2.5 rounded-xl p-2 pr-3 text-left border cursor-pointer select-none transition-all active:scale-98 ${
                                  isMine
                                    ? "bg-white/5 border-dashed border-white/20 text-white/80 hover:bg-white/10"
                                    : "bg-black/20 border-dashed border-white/15 text-white/80 hover:bg-black/30"
                                }`}
                              >
                                <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-white/10 text-white/50">
                                  <ImageOff
                                    className="size-4"
                                    strokeWidth={2}
                                  />
                                </div>
                                <div className="min-w-0 flex-1">
                                  <p className="text-[11px] font-semibold text-white/90 flex items-center gap-1.5">
                                    <span className="size-1.5 rounded-full bg-white/40" />
                                    Story unavailable
                                  </p>
                                  <p className="truncate text-[10px] text-white/50">
                                    No longer available
                                  </p>
                                </div>
                              </div>
                            ) : (
                              <button
                                type="button"
                                onClick={(event) => {
                                  event.stopPropagation();
                                  handleOpenStory(msg.storyRef.storyId);
                                }}
                                className={`mb-2 flex items-center gap-2.5 rounded-xl p-1.5 pr-3 text-left transition-all active:scale-98 group cursor-pointer border ${
                                  isMine
                                    ? "bg-white/10 hover:bg-white/20 border-white/20 text-white"
                                    : "bg-black/25 hover:bg-black/35 border-white/10 text-white"
                                }`}
                              >
                                <div className="relative size-11 shrink-0 overflow-hidden rounded-lg bg-black/40 ring-1 ring-white/15">
                                  {msg.storyRef.mediaType === "video" ? (
                                    <video
                                      src={msg.storyRef.image}
                                      className="h-full w-full object-cover"
                                      muted
                                      playsInline
                                    />
                                  ) : (
                                    <img
                                      src={msg.storyRef.image}
                                      alt="Story"
                                      className="h-full w-full object-cover"
                                    />
                                  )}
                                </div>
                                <div className="min-w-0 flex-1">
                                  <div className="flex items-center gap-1.5 text-[11px] font-semibold text-white/95">
                                    <span className="size-1.5 rounded-full bg-gradient-to-r from-pink-500 to-amber-500" />
                                    <span>Story reply</span>
                                  </div>
                                  <p className="truncate text-[10.5px] text-white/70">
                                    Tap to view story
                                  </p>
                                </div>
                              </button>
                            ))}

                          {/* ═══ Media in chat: Image ═══ */}
                          {msg.mediaType === "image" && msg.mediaUrl && (
                            <div
                              className="rounded-2xl overflow-hidden mb-2 cursor-pointer max-w-sm group relative ring-1 ring-white/10 bg-black/40"
                              onClick={(e) => {
                                e.stopPropagation();
                                setLightboxMedia({
                                  type: "image",
                                  url: msg.mediaUrl,
                                  caption: msg.message,
                                  message: msg,
                                });
                              }}
                            >
                              <img
                                src={msg.mediaUrl}
                                alt="Shared photo"
                                className="w-full max-h-72 object-cover rounded-2xl transition-transform duration-200 group-hover:scale-[1.01]"
                                loading="eager"
                                onLoad={() => {
                                  if (!isInitialScrollDoneRef.current || isNearBottom()) {
                                    scrollToBottom(false);
                                  }
                                }}
                              />
                              {msg.status === "sending" && (
                                <div className="absolute inset-0 bg-black/60 backdrop-blur-[2px] flex flex-col items-center justify-center gap-2 text-white">
                                  <Loader2 className="size-6 animate-spin text-[var(--primary)]" />
                                  <span className="text-[11px] font-semibold tracking-wide">
                                    Sending photo…
                                  </span>
                                </div>
                              )}
                              <div className="absolute bottom-2 right-2 bg-black/60 backdrop-blur-sm text-white/90 p-1.5 rounded-full opacity-80 hover:opacity-100 transition-opacity">
                                <Maximize2 className="size-3.5" />
                              </div>
                            </div>
                          )}

                          {/* ═══ Media in chat: Video ═══ */}
                          {msg.mediaType === "video" && msg.mediaUrl && (
                            <div
                              className="rounded-xl overflow-hidden mb-2 max-w-sm relative bg-black/50"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <video
                                src={msg.mediaUrl}
                                controls
                                playsInline
                                className="w-full max-h-72 rounded-xl object-contain bg-black"
                              />
                            </div>
                          )}

                          {/* ═══ Media in chat: Voice Note (Audio) ═══ */}
                          {msg.mediaType === "audio" && msg.mediaUrl && (
                            <VoiceNoteBubble
                              mediaUrl={msg.mediaUrl}
                              duration={msg.audioDuration}
                              isMine={isMine}
                            />
                          )}

                          {/* Message text with in-chat search highlighting */}
                          {msg.message && (
                            <p className="nova-msg__text">
                              {renderHighlightedText(msg.message, searchQuery)}
                            </p>
                          )}

                          <div
                            className={`nova-msg__meta ${
                              isMine ? "is-mine" : "is-theirs"
                            }`}
                          >
                            <span>{formatMessageTime(msg.createdAt)}</span>
                            {Boolean(msg.starredBy?.some((id) => isSameUser(id, user?._id))) && (
                              <Star className="size-3 fill-amber-400 text-amber-400 shrink-0 inline ml-0.5" />
                            )}
                            {isMine && (
                              <MessageStatus status={msg.status || "sent"} />
                            )}
                            {isReplyable && (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setActionsFor(msg);
                                }}
                                className="opacity-0 group-hover/msg:opacity-100 transition-opacity p-0.5 rounded-full text-white/60 hover:text-white hover:bg-white/10 cursor-pointer"
                                title="Message options"
                              >
                                <MoreVertical className="size-3" />
                              </button>
                            )}
                          </div>
                        </div>
                      )}

                      {grouped.length > 0 && (
                        <div
                          className={`nova-msg__pills ${
                            isMine ? "is-mine" : "is-theirs"
                          }`}
                        >
                          {grouped.map(([emoji, count]) => {
                            const isMineReaction = msg.reactions?.some(
                              (r) =>
                                r.emoji === emoji &&
                                isSameUser(r.userId, user?._id)
                            );
                            return (
                              <button
                                key={emoji}
                                type="button"
                                disabled={Boolean(reactingMessageId)}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  if (isMine) return;
                                  handleReaction(msg, emoji);
                                }}
                                className={`nova-reaction-pill ${
                                  isMineReaction ? "is-mine" : ""
                                }`}
                              >
                                <span className="emoji-glyph-sm">{emoji}</span>
                                {count > 1 && (
                                  <span className="nova-reaction-pill__count">
                                    {count}
                                  </span>
                                )}
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </>
        )}

        {isTyping && (
          <div className="nova-typing animate-fade-in">
            <div className="nova-typing__bubble">
              <span className="nova-typing__dots">
                <span
                  className="nova-typing__dot"
                  style={{ animationDelay: "0ms" }}
                />
                <span
                  className="nova-typing__dot"
                  style={{ animationDelay: "160ms" }}
                />
                <span
                  className="nova-typing__dot"
                  style={{ animationDelay: "320ms" }}
                />
              </span>
              <span className="nova-typing__text">
                {getFirstName(selectedUser)} is typing
              </span>
            </div>
          </div>
        )}
        <div ref={bottomSentinelRef} className="h-0 w-full shrink-0" />
      </div>

      {/* ═══ WhatsApp / Telegram Floating Scroll-To-Bottom Button ═══ */}
      {showScrollBottom && (
        <button
          type="button"
          onClick={() => {
            scrollToBottom(true);
            setUnreadWhileScrolled(0);
          }}
          className="absolute bottom-5 right-5 z-30 size-10 rounded-full bg-[#1b1c24]/90 hover:bg-[#252733] active:scale-95 text-white/90 hover:text-white border border-white/20 shadow-2xl backdrop-blur-xl flex items-center justify-center transition-all cursor-pointer group animate-in zoom-in-75 duration-150"
          title="Scroll to latest messages"
        >
          <ChevronDown className="size-5 group-hover:translate-y-0.5 transition-transform" />
          {unreadWhileScrolled > 0 && (
            <span className="absolute -top-1.5 -right-1.5 min-w-[20px] h-5 px-1 rounded-full bg-[var(--primary)] text-[10.5px] font-bold text-white shadow-lg flex items-center justify-center animate-bounce">
              {unreadWhileScrolled}
            </span>
          )}
        </button>
      )}

      {/* WHATSAPP-STYLE FLOATING MESSAGE CONTEXT POPOVER */}
      {actionsFor && (
        <WhatsAppMessagePopover
          anchorEl={
            actionsAnchorEl ||
            document.getElementById(`message-${actionsFor._id}`)
          }
          message={actionsFor}
          currentUser={user}
          onReply={(m) => triggerReply(m)}
          onReact={(emoji) => handleReaction(actionsFor, emoji)}
          onOpenPicker={() => {
            const el =
              actionsAnchorEl ||
              document.getElementById(`message-${actionsFor._id}`);
            setOpenPickerFor(actionsFor._id);
            setAnchorEl(el || document.body);
          }}
          onDelete={(m) => setDeleteTargetMessage(m)}
          onViewMedia={() => {
            if (actionsFor.mediaUrl) {
              setLightboxMedia({
                type: actionsFor.mediaType || "image",
                url: actionsFor.mediaUrl,
                caption: actionsFor.message,
                message: actionsFor,
              });
            }
          }}
          onClose={() => {
            setActionsFor(null);
            setActionsAnchorEl(null);
          }}
        />
      )}

      {openPickerFor && anchorEl && (
        <EmojiPicker
          anchorEl={anchorEl}
          disabled={Boolean(reactingMessageId)}
          defaultExpanded={isTouch}
          onPick={(emoji) => {
            const msg = messages.find((m) => m._id === openPickerFor);
            if (!msg) return;
            if (isSameUser(msg.senderId, user?._id)) return;
            handleReaction(msg, emoji);
          }}
          onClose={() => {
            setOpenPickerFor(null);
            setAnchorEl(null);
          }}
        />
      )}

      {activeStoryViewer && (
        <StoryViewer
          stories={activeStoryViewer.stories}
          initialUserIndex={activeStoryViewer.userIndex}
          initialItemIndex={activeStoryViewer.itemIndex}
          onClose={() => setActiveStoryViewer(null)}
        />
      )}

      {/* ═══ Media Lightbox Modal ═══ */}
      {lightboxMedia && (
        <div
          className="fixed inset-0 z-[10000] flex flex-col items-center justify-center bg-black/90 backdrop-blur-md p-4 animate-in fade-in duration-200 select-none"
          onClick={() => setLightboxMedia(null)}
        >
          <div className="absolute top-4 right-4 flex items-center gap-3 z-10">
            {lightboxMedia.message && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setDeleteTargetMessage(lightboxMedia.message);
                  setLightboxMedia(null);
                }}
                className="p-2.5 rounded-full bg-red-500/20 hover:bg-red-500/30 text-red-400 transition-colors cursor-pointer"
                title="Delete message"
              >
                <Trash2 className="size-5" />
              </button>
            )}
            <a
              href={lightboxMedia.url}
              target="_blank"
              rel="noopener noreferrer"
              download
              onClick={(e) => e.stopPropagation()}
              className="p-2.5 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors"
              title="Download"
            >
              <Download className="size-5" />
            </a>
            <button
              type="button"
              onClick={() => setLightboxMedia(null)}
              className="p-2.5 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors"
              title="Close"
            >
              <X className="size-5" />
            </button>
          </div>

          <div
            className="max-w-4xl max-h-[85vh] flex flex-col items-center justify-center"
            onClick={(e) => e.stopPropagation()}
          >
            {lightboxMedia.type === "image" ? (
              <img
                src={lightboxMedia.url}
                alt="Full size media"
                className="max-h-[80vh] max-w-full rounded-2xl object-contain shadow-2xl"
              />
            ) : (
              <video
                src={lightboxMedia.url}
                controls
                autoPlay
                className="max-h-[80vh] max-w-full rounded-2xl object-contain shadow-2xl"
              />
            )}
            {lightboxMedia.caption && (
              <p className="mt-3 text-sm text-white/90 bg-black/50 px-4 py-1.5 rounded-full backdrop-blur-sm text-center max-w-md">
                {lightboxMedia.caption}
              </p>
            )}
          </div>
        </div>
      )}

      {/* WHATSAPP-STYLE DELETE MESSAGE MODAL */}
      {deleteTargetMessage && (
        <div
          className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 animate-in fade-in duration-150"
          onClick={() => {
            if (!deletingMessage) setDeleteTargetMessage(null);
          }}
        >
          <div
            className="w-full max-w-sm rounded-2xl bg-[#1c1c1e] border border-white/10 p-5 shadow-2xl space-y-4 animate-in zoom-in-95 duration-150"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3">
              <div className="flex size-10 items-center justify-center rounded-full bg-red-500/15 text-red-400 shrink-0">
                <Trash2 className="size-5" />
              </div>
              <div className="min-w-0">
                <h3 className="text-base font-semibold text-white">
                  Delete message?
                </h3>
                <p className="text-xs text-white/60 mt-0.5">
                  {isSameUser(deleteTargetMessage.senderId, user?._id)
                    ? "Delete for everyone will replace it with a deleted message notice for both of you."
                    : "Delete for me will remove this message from your chat."}
                </p>
              </div>
            </div>

            <div className="flex flex-col gap-2 pt-2">
              {isSameUser(deleteTargetMessage.senderId, user?._id) && (
                <button
                  type="button"
                  disabled={deletingMessage}
                  onClick={() => handleDeleteMessage("everyone")}
                  className="w-full rounded-xl bg-red-600 hover:bg-red-700 py-2.5 text-xs font-semibold text-white transition-colors cursor-pointer active:scale-98 disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  Delete for everyone
                </button>
              )}
              <button
                type="button"
                disabled={deletingMessage}
                onClick={() => handleDeleteMessage("me")}
                className="w-full rounded-xl bg-white/10 hover:bg-white/15 py-2.5 text-xs font-semibold text-white/90 transition-colors cursor-pointer active:scale-98"
              >
                Delete for me
              </button>
              <button
                type="button"
                disabled={deletingMessage}
                onClick={() => setDeleteTargetMessage(null)}
                className="w-full rounded-xl py-2 text-xs font-medium text-white/60 hover:text-white transition-colors cursor-pointer"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Messages;
