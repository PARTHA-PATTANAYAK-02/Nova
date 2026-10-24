import { useEffect, useRef, useState, useCallback } from "react";
import { createPortal } from "react-dom";
import { Link } from "react-router-dom";
import {
  X,
  Send,
  Eye,
  Heart,
  ChevronUp,
  Sparkles,
  Trash2,
  Bookmark,
  BarChart2,
  HelpCircle,
  ExternalLink,
  Plus,
  Check,
  Loader2,
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import axios from "axios";
import { toast } from "sonner";
import { apiUrl } from "@/lib/api";
import { useSelector } from "react-redux";
import { getSocketInstance } from "@/redux/socketSlice";
import { getDisplayName } from "@/lib/utils";
import { markStoryItemAsViewed } from "@/lib/story";

const IMAGE_DURATION = 8000;
const STORY_REACTIONS = ["❤️", "🔥", "😂", "😮", "😢", "👏"];

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
  onDeleteStory,
}) => {
  const [userIndex, setUserIndex] = useState(initialUserIndex);
  const [itemIndex, setItemIndex] = useState(initialItemIndex);
  const [paused, setPaused] = useState(false);
  const [itemDuration, setItemDuration] = useState(IMAGE_DURATION);
  const [reactionByMe, setReactionByMe] = useState({});
  const [reactionDetailsByItem, setReactionDetailsByItem] = useState({});
  const [showViewersSheet, setShowViewersSheet] = useState(false);
  const [reacting, setReacting] = useState(false);
  const [replyText, setReplyText] = useState("");
  const [sendingReply, setSendingReply] = useState(false);
  const [floatingEmojis, setFloatingEmojis] = useState([]);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeletingStory, setIsDeletingStory] = useState(false);

  /* Interactive Poll State */
  const [pollsByItem, setPollsByItem] = useState({});
  const [votingPoll, setVotingPoll] = useState(false);

  /* Interactive Question Sticker State */
  const [questionAnswer, setQuestionAnswer] = useState("");
  const [submittingQuestion, setSubmittingQuestion] = useState(false);

  /* Save to Highlights State */
  const [showHighlightSheet, setShowHighlightSheet] = useState(false);
  const [userHighlights, setUserHighlights] = useState([]);
  const [loadingHighlights, setLoadingHighlights] = useState(false);
  const [newHighlightTitle, setNewHighlightTitle] = useState("");
  const [creatingHighlight, setCreatingHighlight] = useState(false);

  const { user } = useSelector((state) => state.auth);

  const holdTimerRef = useRef(null);
  const isHoldingRef = useRef(false);
  const touchStartRef = useRef(null);
  const inputRef = useRef(null);
  const onMarkViewedRef = useRef(onMarkViewed);
  const onReactionChangeRef = useRef(onReactionChange);

  const currentStory = stories[userIndex];
  const currentItem = currentStory?.items?.[itemIndex];
  const isOwnStory = currentStory?.user?._id === user?._id;

  useEffect(() => {
    setItemDuration(IMAGE_DURATION);
    setPaused(false);
    setShowViewersSheet(false);
    setShowHighlightSheet(false);
    setReplyText("");
    setQuestionAnswer("");
  }, [currentItem?._id]);

  // Load author's highlights when opening highlight sheet
  useEffect(() => {
    if (showHighlightSheet && user?._id) {
      setLoadingHighlights(true);
      axios
        .get(apiUrl(`/api/v1/story/highlights/user/${user._id}`), {
          withCredentials: true,
        })
        .then((res) => {
          if (res.data?.success) {
            setUserHighlights(res.data.highlights || []);
          }
        })
        .finally(() => setLoadingHighlights(false));
    }
  }, [showHighlightSheet, user?._id]);

  /* ---------- BURST FLOATING EMOJIS ---------- */
  const triggerBurst = useCallback((emoji) => {
    const burstCount = 6;
    const newItems = Array.from({ length: burstCount }).map((_, i) => ({
      id: `${Date.now()}-${i}-${Math.random()}`,
      emoji,
      left: 65 + (Math.random() * 25 - 12),
      rot: `${Math.floor(Math.random() * 36 - 18)}deg`,
      delay: `${i * 90}ms`,
    }));
    setFloatingEmojis((prev) => [...prev, ...newItems]);
    setTimeout(() => {
      setFloatingEmojis((prev) => prev.filter((item) => !newItems.includes(item)));
    }, 2200);
  }, []);

  /* ---------- NAVIGATION ---------- */
  const goNext = useCallback(() => {
    if (!currentStory) return;
    if (itemIndex < currentStory.items.length - 1) {
      setItemIndex((i) => i + 1);
    } else if (userIndex < stories.length - 1) {
      setUserIndex((i) => i + 1);
      setItemIndex(0);
    } else {
      onClose();
    }
  }, [currentStory, itemIndex, userIndex, stories.length, onClose]);

  const goPrev = useCallback(() => {
    if (itemIndex > 0) {
      setItemIndex((i) => i - 1);
    } else if (userIndex > 0) {
      const prev = userIndex - 1;
      setUserIndex(prev);
      setItemIndex((stories[prev]?.items?.length || 1) - 1);
    }
  }, [itemIndex, userIndex, stories]);

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

  /* ---------- REALTIME SOCKET LISTENERS ---------- */
  useEffect(() => {
    const socket = getSocketInstance();
    if (!socket) return undefined;

    const handleStoryReaction = (update) => {
      if (!update.storyId) return;
      const storyId = update.storyId.toString();

      if (update.reactionDetails) {
        setReactionDetailsByItem((prev) => ({
          ...prev,
          [storyId]: update.reactionDetails,
        }));
      }

      if (currentItem?._id?.toString() === storyId && update.latestReaction?.emoji) {
        triggerBurst(update.latestReaction.emoji);
      }

      onReactionChangeRef.current?.(
        storyId,
        update.reactions?.find((r) => r.userId?.toString() === user?._id)?.emoji || null,
        update.reactionDetails
      );
    };

    const handleStoryReply = (data) => {
      if (data.storyId?.toString() === currentItem?._id?.toString()) {
        toast.custom(
          () => (
            <div className="flex items-center gap-3 bg-black/90 text-white px-4 py-2.5 rounded-2xl border border-white/20 shadow-2xl backdrop-blur-xl animate-in slide-in-from-bottom-2">
              <Avatar className="size-8 ring-1 ring-white/30">
                <AvatarImage src={data.sender?.profilePicture} />
                <AvatarFallback>{data.sender?.fullName?.[0] || "U"}</AvatarFallback>
              </Avatar>
              <div className="text-left text-xs min-w-0">
                <p className="font-semibold text-white/95 truncate">
                  {data.sender?.fullName || data.sender?.username}
                </p>
                <p className="text-white/80 truncate">{data.message}</p>
              </div>
            </div>
          ),
          { duration: 4000 }
        );
      }
    };

    const handleStoryPollUpdated = (data) => {
      if (data.storyId && data.poll) {
        setPollsByItem((prev) => ({
          ...prev,
          [data.storyId.toString()]: data.poll,
        }));
      }
    };

    socket.on("storyReactionUpdated", handleStoryReaction);
    socket.on("storyReplyReceived", handleStoryReply);
    socket.on("storyPollUpdated", handleStoryPollUpdated);

    return () => {
      socket.off("storyReactionUpdated", handleStoryReaction);
      socket.off("storyReplyReceived", handleStoryReply);
      socket.off("storyPollUpdated", handleStoryPollUpdated);
    };
  }, [currentItem?._id, user?._id, triggerBurst]);

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
      if (
        document.activeElement?.tagName === "INPUT" ||
        document.activeElement?.tagName === "TEXTAREA"
      )
        return;
      if (e.key === "Escape") onClose();
      else if (e.key === "ArrowRight") goNext();
      else if (e.key === "ArrowLeft") goPrev();
      else if (e.key === " ") setPaused((p) => !p);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose, goNext, goPrev]);

  /* ---------- TOUCH & TAP TO NAVIGATE / HOLD TO PAUSE ---------- */
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

  /* ---------- SWIPE DOWN TO DISMISS ---------- */
  const onTouchStart = (e) => {
    touchStartRef.current = { y: e.touches[0].clientY };
  };
  const onTouchEnd = (e) => {
    if (!touchStartRef.current) return;
    const dy = e.changedTouches[0].clientY - touchStartRef.current.y;
    if (dy > 80) onClose();
    touchStartRef.current = null;
  };

  /* ---------- REACT TO STORY ---------- */
  const handleStoryReaction = async (emoji) => {
    if (!currentItem || reacting) return;
    const currentReaction = Object.prototype.hasOwnProperty.call(reactionByMe, currentItem._id)
      ? reactionByMe[currentItem._id]
      : (currentItem.reactionByMe ?? null);

    const nextReaction = currentReaction === emoji ? null : emoji;

    if (nextReaction) {
      triggerBurst(nextReaction);
    }

    try {
      setReacting(true);
      const response = await axios.post(
        apiUrl(`/api/v1/story/${currentItem._id}/reaction`),
        { emoji: nextReaction },
        { withCredentials: true }
      );

      setReactionByMe((prev) => ({
        ...prev,
        [currentItem._id]: nextReaction,
      }));

      if (response.data?.reactionDetails) {
        setReactionDetailsByItem((prev) => ({
          ...prev,
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

  /* ---------- SEND STORY REPLY (DM) ---------- */
  const handleSendReply = async () => {
    if (!replyText.trim() || sendingReply || !currentItem) return;
    const messageToSend = replyText.trim();
    setSendingReply(true);
    try {
      await axios.post(
        apiUrl(`/api/v1/story/${currentItem._id}/reply`),
        { message: messageToSend },
        { withCredentials: true }
      );
      setReplyText("");
      inputRef.current?.blur();
      setPaused(false);
      toast.success(`Reply sent to ${getDisplayName(currentStory.user)}`);
    } catch (error) {
      toast.error(error.response?.data?.message || "Unable to send reply.");
    } finally {
      setSendingReply(false);
    }
  };

  /* ---------- VOTE ON POLL ---------- */
  const handleVotePoll = async (optionIndex) => {
    if (!currentItem?._id || votingPoll) return;
    try {
      setVotingPoll(true);
      const res = await axios.post(
        apiUrl(`/api/v1/story/${currentItem._id}/poll/vote`),
        { optionIndex },
        { withCredentials: true }
      );
      if (res.data?.success && res.data.poll) {
        setPollsByItem((prev) => ({
          ...prev,
          [currentItem._id]: res.data.poll,
        }));
        toast.success("Vote recorded!");
      }
    } catch (err) {
      toast.error(err.response?.data?.message || "Unable to vote.");
    } finally {
      setVotingPoll(false);
    }
  };

  /* ---------- SUBMIT QUESTION RESPONSE ---------- */
  const handleSendQuestionResponse = async () => {
    if (!questionAnswer.trim() || submittingQuestion || !currentItem?._id) return;
    try {
      setSubmittingQuestion(true);
      const res = await axios.post(
        apiUrl(`/api/v1/story/${currentItem._id}/question/respond`),
        { response: questionAnswer.trim() },
        { withCredentials: true }
      );
      if (res.data?.success) {
        toast.success("Sent to author!");
        setQuestionAnswer("");
        setPaused(false);
      }
    } catch (err) {
      toast.error(err.response?.data?.message || "Unable to send response.");
    } finally {
      setSubmittingQuestion(false);
    }
  };

  /* ---------- ADD STORY TO HIGHLIGHT ---------- */
  const handleAddToHighlight = async (highlightId) => {
    if (!currentItem?._id) return;
    try {
      const res = await axios.post(
        apiUrl(`/api/v1/story/highlight/${highlightId}/add`),
        { storyId: currentItem._id },
        { withCredentials: true }
      );
      if (res.data?.success) {
        toast.success("Saved to Highlights!");
        setShowHighlightSheet(false);
        setPaused(false);
      }
    } catch (err) {
      toast.error(err.response?.data?.message || "Unable to save to highlight.");
    }
  };

  const handleCreateNewHighlight = async () => {
    if (!newHighlightTitle.trim() || !currentItem?._id || creatingHighlight) return;
    try {
      setCreatingHighlight(true);
      const res = await axios.post(
        apiUrl("/api/v1/story/highlight"),
        {
          name: newHighlightTitle.trim(),
          storyId: currentItem._id,
          cover: currentItem.image,
        },
        { withCredentials: true }
      );
      if (res.data?.success) {
        toast.success(`Highlight "${newHighlightTitle.trim()}" created!`);
        setUserHighlights((prev) => [res.data.highlight, ...prev]);
        setNewHighlightTitle("");
        setShowHighlightSheet(false);
        setPaused(false);
      }
    } catch (err) {
      toast.error(err.response?.data?.message || "Unable to create highlight.");
    } finally {
      setCreatingHighlight(false);
    }
  };

  /* ---------- DELETE STORY ---------- */
  const handleDeleteStory = async () => {
    if (!currentItem?._id || isDeletingStory) return;
    try {
      setIsDeletingStory(true);
      const storyId = currentItem._id;
      await axios.delete(apiUrl(`/api/v1/story/${storyId}`), {
        withCredentials: true,
      });
      toast.success("Story deleted");
      setShowDeleteConfirm(false);
      onDeleteStory?.(storyId);

      if (currentStory.items.length > 1) {
        if (itemIndex >= currentStory.items.length - 1) {
          setItemIndex((i) => Math.max(i - 1, 0));
        } else {
          setItemIndex((i) => i);
        }
      } else {
        onClose();
      }
    } catch (err) {
      toast.error(err.response?.data?.message || "Unable to delete story");
    } finally {
      setIsDeletingStory(false);
      setPaused(false);
    }
  };

  if (!currentStory || !currentItem) return null;

  const currentReactions =
    reactionDetailsByItem[currentItem._id] ?? currentItem.reactionDetails ?? [];

  const activeReaction = Object.prototype.hasOwnProperty.call(reactionByMe, currentItem._id)
    ? reactionByMe[currentItem._id]
    : currentItem.reactionByMe;

  const pollData = pollsByItem[currentItem._id] || currentItem.poll;
  const questionData = currentItem.questionSticker;
  const sharedPostData = currentItem.sharedPost;

  const viewer = (
    <div
      className="fixed inset-0 z-[9999] flex select-none items-center justify-center bg-black/90 p-0 backdrop-blur-xl animate-in fade-in duration-200 md:p-6"
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
      onPointerDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div
        className="relative h-dvh w-full overflow-hidden bg-black shadow-2xl md:h-[88vh] md:w-[420px] md:rounded-[32px] md:border md:border-white/10"
        onPointerDown={(event) => event.stopPropagation()}
      >
        {/* STORY MEDIA */}
        {sharedPostData ? (
          <div className="relative h-full w-full flex flex-col items-center justify-center p-4 overflow-hidden bg-gradient-to-b from-[#1c1d2e] via-[#10111d] to-[#07080f]">
            {/* Ambient subtle color orbs behind the card */}
            <div className="absolute -top-20 -left-20 size-72 rounded-full bg-purple-600/20 blur-3xl pointer-events-none" />
            <div className="absolute -bottom-20 -right-20 size-72 rounded-full bg-pink-600/15 blur-3xl pointer-events-none" />

            {/* If the story creator added a thought / text note, show as sticker above the card */}
            {currentItem.caption && (
              <div
                className="z-20 mb-3 max-w-[85%] text-center animate-in fade-in slide-in-from-top-2 duration-300 pointer-events-auto"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="inline-block px-4 py-2 rounded-2xl bg-black/60 backdrop-blur-xl border border-white/20 text-white text-xs sm:text-sm font-medium shadow-2xl tracking-wide leading-snug">
                  {currentItem.caption}
                </div>
              </div>
            )}

            {/* The Reshared Post Card */}
            <div
              className="relative z-20 w-[90%] max-w-[340px] rounded-2xl bg-[#141522]/95 border border-white/15 backdrop-blur-2xl shadow-2xl overflow-hidden transition-all pointer-events-auto select-none"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header: Author Info */}
              <div className="flex items-center justify-between px-3.5 py-2.5 border-b border-white/10 bg-white/[0.02]">
                <Link
                  to={`/profile/${sharedPostData.author?._id}`}
                  onClick={() => onClose()}
                  className="flex items-center gap-2.5 min-w-0 hover:opacity-85 transition-opacity"
                >
                  <Avatar className="size-8 ring-1.5 ring-purple-500/40 shadow">
                    <AvatarImage src={sharedPostData.author?.profilePicture} />
                    <AvatarFallback className="bg-zinc-800 text-white font-bold text-xs">
                      {sharedPostData.author?.fullName?.[0] || sharedPostData.author?.username?.[0] || "U"}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 text-left">
                    <p className="text-xs font-semibold text-white truncate leading-tight">
                      {sharedPostData.author?.fullName || sharedPostData.author?.username}
                    </p>
                    <p className="text-[10px] text-zinc-400 truncate leading-tight">
                      @{sharedPostData.author?.username || "user"}
                    </p>
                  </div>
                </Link>

                <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-white/10 border border-white/15 text-[10px] font-medium text-zinc-300">
                  <Sparkles className="size-2.5 text-purple-400" />
                  <span>Post</span>
                </div>
              </div>

              {/* Media preview */}
              <div className="relative aspect-square w-full bg-black/80 overflow-hidden flex items-center justify-center">
                {sharedPostData.mediaType === "video" ? (
                  <video
                    src={sharedPostData.image}
                    className="size-full object-cover"
                    autoPlay
                    muted
                    loop
                    playsInline
                  />
                ) : (
                  <img
                    src={sharedPostData.image}
                    alt="Post"
                    className="size-full object-cover"
                    draggable={false}
                  />
                )}
              </div>

              {/* Caption snippet if post has one */}
              {sharedPostData.caption && (
                <div className="px-3.5 pt-2 pb-1 text-left">
                  <p className="text-xs text-zinc-300 line-clamp-2 leading-relaxed">
                    <span className="font-semibold text-white mr-1.5">
                      {sharedPostData.author?.username}
                    </span>
                    {sharedPostData.caption}
                  </p>
                </div>
              )}

              {/* View Post link */}
              <div className="p-2.5 pt-2">
                <Link
                  to={`/post/${sharedPostData._id}`}
                  onClick={() => onClose()}
                  className="w-full py-2 rounded-xl bg-gradient-to-r from-purple-600/80 to-pink-600/80 hover:from-purple-600 hover:to-pink-600 border border-white/20 text-white text-xs font-semibold flex items-center justify-center gap-1.5 transition-all shadow-md active:scale-[0.98] cursor-pointer"
                >
                  <span>View Post</span>
                  <ExternalLink className="size-3" />
                </Link>
              </div>
            </div>
          </div>
        ) : currentItem.mediaType === "video" ? (
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
              const dur = event.currentTarget.duration;
              if (Number.isFinite(dur) && dur > 0) {
                setItemDuration(dur * 1000);
              }
            }}
            onEnded={goNext}
            onDoubleClick={(event) => event.stopPropagation()}
          />
        ) : (
          <div className="relative h-full w-full flex items-center justify-center overflow-hidden bg-black">
            <div
              aria-hidden="true"
              className="absolute inset-0 bg-cover bg-center blur-3xl opacity-50 scale-125 pointer-events-none"
              style={{ backgroundImage: `url(${currentItem.image})` }}
            />
            <img
              src={currentItem.image}
              alt=""
              draggable={false}
              className="relative z-10 max-h-full max-w-full h-auto w-auto object-contain mx-auto select-none drop-shadow-xl"
            />
          </div>
        )}

        {/* ═══ INTERACTIVE POLL STICKER CARD ═══ */}
        {pollData?.question && (
          <div
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-30 w-[84%] max-w-xs bg-black/80 border border-white/20 backdrop-blur-xl rounded-2xl p-4 shadow-2xl pointer-events-auto select-none animate-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-center gap-1.5 pb-2 border-b border-white/10 text-amber-400 text-xs font-bold uppercase tracking-wider">
              <BarChart2 className="size-3.5" />
              <span>Voting Poll</span>
            </div>
            <p className="text-center font-bold text-white text-sm my-3 leading-snug">
              {pollData.question}
            </p>

            <div className="space-y-2">
              {pollData.options.map((option, idx) => {
                const total = pollData.totalVotes || 0;
                const count = option.voteCount || 0;
                const percent = total > 0 ? Math.round((count / total) * 100) : 0;
                const hasVoted = pollData.options.some((o) => o.votedByMe);

                return (
                  <button
                    key={option._id || idx}
                    type="button"
                    disabled={votingPoll}
                    onClick={() => handleVotePoll(idx)}
                    className={`relative w-full overflow-hidden rounded-xl py-2.5 px-3.5 text-left border transition-all cursor-pointer ${
                      option.votedByMe
                        ? "border-amber-400 bg-amber-400/20 text-white font-bold shadow-md"
                        : "border-white/20 bg-white/10 hover:bg-white/15 text-white/90"
                    }`}
                  >
                    {hasVoted && (
                      <div
                        className="absolute inset-y-0 left-0 bg-white/20 transition-all duration-500 rounded-xl"
                        style={{ width: `${percent}%` }}
                      />
                    )}
                    <div className="relative z-10 flex items-center justify-between text-xs font-semibold">
                      <span className="truncate pr-2">{option.text}</span>
                      {hasVoted && (
                        <span className="font-mono text-xs font-bold text-amber-300">
                          {percent}%
                        </span>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>

            <p className="text-center text-[10.5px] text-white/60 mt-2 font-medium">
              {pollData.totalVotes || 0}{" "}
              {pollData.totalVotes === 1 ? "vote" : "votes"}
            </p>
          </div>
        )}

        {/* ═══ INTERACTIVE QUESTION STICKER (ASK ME ANYTHING) ═══ */}
        {questionData?.question && (
          <div
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-30 w-[84%] max-w-xs bg-gradient-to-br from-pink-500/85 via-purple-600/85 to-indigo-600/85 border border-white/25 backdrop-blur-xl rounded-2xl p-4 shadow-2xl pointer-events-auto select-none text-center animate-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-center gap-1.5 text-white/90 text-xs font-bold uppercase tracking-wider pb-1.5">
              <HelpCircle className="size-3.5" />
              <span>Question</span>
            </div>

            <p className="font-extrabold text-white text-sm my-2 drop-shadow">
              {questionData.question}
            </p>

            {!isOwnStory ? (
              <div className="mt-2.5 flex items-center gap-1.5 bg-white/20 border border-white/30 rounded-xl p-1 pl-3">
                <input
                  type="text"
                  value={questionAnswer}
                  onChange={(e) => setQuestionAnswer(e.target.value)}
                  onFocus={() => setPaused(true)}
                  onBlur={() => setPaused(false)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      handleSendQuestionResponse();
                    }
                  }}
                  placeholder="Type a response…"
                  className="flex-1 bg-transparent text-xs text-white placeholder-white/60 outline-none"
                />
                <button
                  type="button"
                  onClick={handleSendQuestionResponse}
                  disabled={!questionAnswer.trim() || submittingQuestion}
                  className="size-7 rounded-lg bg-white text-purple-700 flex items-center justify-center hover:bg-white/90 active:scale-95 transition-all disabled:opacity-40 cursor-pointer"
                >
                  <Send className="size-3.5 fill-current" />
                </button>
              </div>
            ) : (
              <div className="mt-2 py-1.5 px-3 rounded-xl bg-black/30 border border-white/15 text-xs text-white/90 font-medium">
                {questionData.responsesCount || 0} response(s) received
              </div>
            )}
          </div>
        )}



        {/* TOP & BOTTOM SCRIM GRADIENTS */}
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-black/75 via-transparent to-black/85" />

        {/* TAP & HOLD HITBOX */}
        <div
          className="absolute inset-0 z-10 cursor-pointer"
          style={currentItem.mediaType === "video" ? { pointerEvents: "none" } : undefined}
          onPointerDown={handlePointerDown}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerCancel}
          onPointerLeave={handlePointerCancel}
        />

        {/* FLOATING BURST EMOJIS */}
        <div className="pointer-events-none absolute inset-0 z-40 overflow-hidden">
          {floatingEmojis.map((item) => (
            <span
              key={item.id}
              className="absolute text-4xl drop-shadow-[0_4px_16px_rgba(0,0,0,0.8)]"
              style={{
                left: `${item.left}%`,
                bottom: "85px",
                "--rot": item.rot,
                animation: "storyFloatBurst 2s cubic-bezier(0.2, 0.8, 0.2, 1) forwards",
                animationDelay: item.delay,
              }}
            >
              {item.emoji}
            </span>
          ))}
        </div>

        {/* TOP PROGRESS BARS */}
        <div className="absolute top-2.5 sm:top-3 left-3 right-3 z-30 flex gap-1.5">
          {currentStory.items.map((item, i) => (
            <div
              key={item._id}
              className="h-[3px] flex-1 overflow-hidden rounded-full bg-white/25 shadow-sm"
            >
              {i < itemIndex && <div className="h-full w-full bg-white" />}
              {i === itemIndex && (
                <div
                  key={`${userIndex}-${itemIndex}`}
                  className="h-full origin-left bg-white"
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

        {/* TOP HEADER */}
        <div className="absolute top-6 left-3 right-3 z-30 flex items-center justify-between gap-3 pt-1">
          <button
            type="button"
            onClick={() => onOpenProfile?.(currentStory.user)}
            className="flex min-w-0 flex-1 items-center gap-2.5 text-left text-white outline-none active:opacity-85"
            aria-label={`Open ${getDisplayName(currentStory.user)}'s profile`}
          >
            <div className="relative size-9 shrink-0">
              <Avatar className="size-9 ring-2 ring-white/70 shadow-md">
                <AvatarImage src={currentStory.user.profilePicture} />
                <AvatarFallback>
                  {getDisplayName(currentStory.user, "U").charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
            </div>
            <div className="min-w-0">
              <p className="truncate text-xs sm:text-sm font-semibold leading-tight drop-shadow-md">
                {getDisplayName(currentStory.user)}
              </p>
              <p className="mt-0.5 truncate text-[10px] leading-tight text-white/80 drop-shadow">
                {formatTime(currentItem.createdAt)}
              </p>
            </div>
          </button>

          <div className="flex items-center gap-2 shrink-0">
            {paused && (
              <span className="text-[10px] uppercase font-bold tracking-widest text-white/90 bg-black/40 px-2 py-0.5 rounded-full border border-white/10 backdrop-blur-md">
                Paused
              </span>
            )}
            {isOwnStory && (
              <button
                type="button"
                onClick={() => {
                  setPaused(true);
                  setShowDeleteConfirm(true);
                }}
                title="Delete story"
                aria-label="Delete story"
                className="size-8 rounded-full flex items-center justify-center bg-red-500/25 text-red-200 hover:bg-red-500/40 active:scale-95 transition-all outline-none border border-red-500/30 backdrop-blur-md cursor-pointer"
              >
                <Trash2 className="size-4" strokeWidth={2.2} />
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              aria-label="Close story"
              className="size-8 rounded-full flex items-center justify-center bg-black/40 text-white hover:bg-black/60 active:scale-95 transition-all outline-none border border-white/10 backdrop-blur-md cursor-pointer"
            >
              <X className="size-4" strokeWidth={2.4} />
            </button>
          </div>
        </div>

        {/* CAPTION */}
        {!sharedPostData && currentItem.caption && (
          <div className="absolute bottom-28 left-4 right-4 z-20 text-center text-sm leading-relaxed text-white drop-shadow-[0_2px_8px_rgba(0,0,0,0.85)] font-medium">
            <span className="bg-black/45 px-3.5 py-1.5 rounded-2xl backdrop-blur-md border border-white/10 inline-block">
              {currentItem.caption}
            </span>
          </div>
        )}

        {/* BOTTOM ACTION BAR */}
        <div className="absolute bottom-4 left-3 right-3 z-30 flex flex-col gap-2.5 pb-safe">
          {!isOwnStory && (
            <div className="flex items-center justify-center gap-1.5 py-1 px-2 rounded-full bg-black/40 border border-white/15 backdrop-blur-xl shadow-lg w-fit mx-auto animate-in fade-in slide-in-from-bottom-2 duration-300">
              {STORY_REACTIONS.map((emoji) => (
                <button
                  key={emoji}
                  type="button"
                  disabled={reacting}
                  onClick={() => handleStoryReaction(emoji)}
                  onPointerDown={(event) => event.stopPropagation()}
                  className={`size-8 text-xl rounded-full flex items-center justify-center hover:scale-125 active:scale-90 transition-transform cursor-pointer outline-none ${
                    activeReaction === emoji ? "scale-125 bg-white/20" : ""
                  }`}
                  aria-label={`React ${emoji}`}
                >
                  {emoji}
                </button>
              ))}
            </div>
          )}

          {!isOwnStory ? (
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <input
                  ref={inputRef}
                  type="text"
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  onFocus={() => setPaused(true)}
                  onBlur={() => {
                    if (!sendingReply) setPaused(false);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      handleSendReply();
                    }
                  }}
                  placeholder={`Send message to ${getDisplayName(currentStory.user)}...`}
                  className="w-full bg-white/15 hover:bg-white/20 focus:bg-white/25 border border-white/25 focus:border-white/50 text-white placeholder-white/60 text-xs sm:text-sm rounded-full py-2.5 pl-4 pr-11 outline-none backdrop-blur-xl transition-all shadow-lg"
                />

                <button
                  type="button"
                  onClick={handleSendReply}
                  disabled={!replyText.trim() || sendingReply}
                  aria-label="Send reply"
                  className="absolute right-1.5 top-1/2 -translate-y-1/2 size-7 rounded-full bg-white text-black flex items-center justify-center hover:bg-white/90 active:scale-90 transition-all disabled:opacity-0 disabled:pointer-events-none cursor-pointer"
                >
                  <Send className="size-3.5 fill-current" />
                </button>
              </div>

              <button
                type="button"
                onClick={() => handleStoryReaction("❤️")}
                className={`size-10 rounded-full flex items-center justify-center border transition-all active:scale-90 cursor-pointer ${
                  activeReaction === "❤️"
                    ? "bg-red-500/30 border-red-400 text-red-400 shadow-[0_0_12px_rgba(239,68,68,0.5)]"
                    : "bg-white/15 hover:bg-white/25 border-white/20 text-white"
                }`}
                aria-label="Like story"
              >
                <Heart className={`size-5 ${activeReaction === "❤️" ? "fill-red-400 text-red-400" : ""}`} />
              </button>
            </div>
          ) : (
            /* STORY OWNER ACTIONS: VIEWERS & HIGHLIGHT */
            <div className="flex items-center justify-between gap-2 px-1">
              <button
                type="button"
                onClick={() => {
                  setShowViewersSheet(true);
                  setPaused(true);
                }}
                className="flex items-center gap-2 px-3.5 py-2 rounded-full bg-black/60 hover:bg-black/80 border border-white/20 text-white backdrop-blur-xl active:scale-95 transition-all text-xs font-semibold shadow-xl cursor-pointer"
              >
                <Eye className="size-3.5 text-white/80" />
                <span>
                  {currentReactions.length > 0
                    ? `${currentReactions.length} reactions`
                    : "Viewers & Reactions"}
                </span>
                <ChevronUp className="size-3.5 text-white/60" />
              </button>

              {/* ═══ SAVE TO PROFILE HIGHLIGHT BUTTON ═══ */}
              <button
                type="button"
                onClick={() => {
                  setShowHighlightSheet(true);
                  setPaused(true);
                }}
                className="flex items-center gap-1.5 px-3 py-2 rounded-full bg-black/60 hover:bg-black/80 border border-white/20 text-white backdrop-blur-xl active:scale-95 transition-all text-xs font-semibold shadow-xl cursor-pointer"
              >
                <Bookmark className="size-3.5 text-amber-400" />
                <span>Highlight</span>
              </button>
            </div>
          )}
        </div>

        {/* ═══ ADD TO HIGHLIGHT SLIDE-UP SHEET ═══ */}
        {isOwnStory && showHighlightSheet && (
          <div
            className="absolute inset-0 z-50 flex flex-col justify-end bg-black/60 backdrop-blur-md animate-in fade-in duration-200"
            onClick={() => {
              setShowHighlightSheet(false);
              setPaused(false);
            }}
          >
            <div
              className="flex flex-col max-h-[75%] w-full rounded-t-[28px] border-t border-white/15 bg-black/90 p-4 text-white shadow-2xl backdrop-blur-2xl animate-in slide-in-from-bottom duration-300 space-y-3"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="mx-auto h-1 w-10 rounded-full bg-white/30 mb-1" />

              <div className="flex items-center justify-between border-b border-white/10 pb-2.5">
                <div className="flex items-center gap-2">
                  <Bookmark className="size-4 text-amber-400" />
                  <h3 className="text-sm font-semibold tracking-wide">
                    Save to Highlights
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setShowHighlightSheet(false);
                    setPaused(false);
                  }}
                  className="size-7 rounded-full flex items-center justify-center bg-white/10 text-white/80 hover:text-white cursor-pointer"
                >
                  <X className="size-4" />
                </button>
              </div>

              {/* Existing highlights */}
              {loadingHighlights ? (
                <div className="py-6 flex justify-center">
                  <Loader2 className="size-5 animate-spin text-white/50" />
                </div>
              ) : userHighlights.length > 0 ? (
                <div className="space-y-1.5 max-h-48 overflow-y-auto">
                  <p className="text-[11px] font-medium text-white/70">
                    Choose existing highlight:
                  </p>
                  <div className="grid grid-cols-2 gap-2">
                    {userHighlights.map((hl) => (
                      <button
                        key={hl._id}
                        type="button"
                        onClick={() => handleAddToHighlight(hl._id)}
                        className="flex items-center gap-2.5 p-2 rounded-2xl bg-white/10 hover:bg-white/15 border border-white/15 text-left transition-colors cursor-pointer"
                      >
                        <div className="size-9 rounded-full overflow-hidden bg-white/20 border border-white/20 shrink-0">
                          {hl.cover ? (
                            <img src={hl.cover} alt="" className="size-full object-cover" />
                          ) : (
                            <div className="size-full flex items-center justify-center text-xs">⭐</div>
                          )}
                        </div>
                        <span className="text-xs font-semibold text-white truncate">
                          {hl.name}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              ) : null}

              {/* Create New Highlight Input */}
              <div className="pt-2 border-t border-white/10 space-y-2">
                <p className="text-[11px] font-medium text-white/70">
                  Or create a new highlight:
                </p>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={newHighlightTitle}
                    onChange={(e) => setNewHighlightTitle(e.target.value.slice(0, 30))}
                    placeholder="e.g. Travel, Fitness, Memories..."
                    className="flex-1 bg-white/10 border border-white/20 rounded-xl px-3 py-2 text-xs text-white placeholder-white/40 outline-none focus:border-amber-400"
                  />
                  <button
                    type="button"
                    disabled={!newHighlightTitle.trim() || creatingHighlight}
                    onClick={handleCreateNewHighlight}
                    className="px-4 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-pink-500 hover:opacity-90 text-white text-xs font-semibold transition-opacity active:scale-95 disabled:opacity-40 cursor-pointer flex items-center gap-1"
                  >
                    {creatingHighlight ? (
                      <Loader2 className="size-3.5 animate-spin" />
                    ) : (
                      <Plus className="size-3.5" />
                    )}
                    <span>Save</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ═══ VIEWERS & ACTIVITY DRAWER ═══ */}
        {isOwnStory && showViewersSheet && (
          <div
            className="absolute inset-0 z-50 flex flex-col justify-end bg-black/60 backdrop-blur-md animate-in fade-in duration-200"
            onClick={() => {
              setShowViewersSheet(false);
              setPaused(false);
            }}
          >
            <div
              className="flex flex-col max-h-[70%] w-full rounded-t-[28px] border-t border-white/15 bg-black/90 p-4 text-white shadow-2xl backdrop-blur-2xl animate-in slide-in-from-bottom duration-300"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="mx-auto h-1 w-10 rounded-full bg-white/30 mb-3" />

              <div className="flex items-center justify-between border-b border-white/10 pb-3">
                <div className="flex items-center gap-2">
                  <Sparkles className="size-4 text-primary" />
                  <h3 className="text-sm font-semibold tracking-wide">Story Activity</h3>
                  <span className="text-xs bg-white/10 px-2 py-0.5 rounded-full font-medium">
                    {currentReactions.length}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setShowViewersSheet(false);
                    setPaused(false);
                  }}
                  className="size-7 rounded-full flex items-center justify-center bg-white/10 text-white/80 hover:text-white cursor-pointer"
                >
                  <X className="size-4" />
                </button>
              </div>

              <div className="overflow-y-auto py-2 divide-y divide-white/5 space-y-1">
                {currentReactions.length === 0 ? (
                  <div className="py-12 text-center text-xs text-white/60">
                    <p className="font-medium text-sm text-white/80">No reactions yet</p>
                    <p className="mt-1">Reactions from your friends will appear here in real-time.</p>
                  </div>
                ) : (
                  currentReactions.map((reaction, index) => (
                    <div
                      key={`${reaction.user?._id || index}`}
                      className="flex items-center justify-between py-2.5 px-1 animate-in fade-in duration-200"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <Avatar className="size-9 ring-1 ring-white/20 shrink-0">
                          <AvatarImage src={reaction.user?.profilePicture} />
                          <AvatarFallback>
                            {getDisplayName(reaction.user, "U").charAt(0).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div className="min-w-0 text-left">
                          <p className="text-xs font-semibold text-white truncate">
                            {getDisplayName(reaction.user)}
                          </p>
                          <p className="text-[11px] text-white/60 truncate">
                            @{reaction.user?.username || "user"}
                          </p>
                        </div>
                      </div>

                      <span className="text-2xl animate-reaction-pop drop-shadow">
                        {reaction.emoji}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}

        {/* DELETE CONFIRMATION MODAL */}
        {showDeleteConfirm && (
          <div
            className="absolute inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-md p-4 animate-in fade-in duration-150"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-full max-w-xs rounded-2xl bg-[#1c1c1e] border border-white/10 p-5 text-center shadow-2xl space-y-4 animate-in zoom-in-95 duration-150">
              <div className="mx-auto flex size-12 items-center justify-center rounded-full bg-red-500/15 text-red-400">
                <Trash2 className="size-6" />
              </div>
              <div className="space-y-1">
                <h3 className="text-base font-semibold text-white">Delete this story?</h3>
                <p className="text-xs text-white/70">
                  This story will be permanently removed for you and all viewers.
                </p>
              </div>
              <div className="flex flex-col gap-2 pt-1">
                <button
                  type="button"
                  disabled={isDeletingStory}
                  onClick={handleDeleteStory}
                  className="w-full rounded-xl bg-red-600 hover:bg-red-700 py-2.5 text-xs font-semibold text-white transition-colors cursor-pointer active:scale-98 disabled:opacity-50"
                >
                  {isDeletingStory ? "Deleting..." : "Delete Story"}
                </button>
                <button
                  type="button"
                  disabled={isDeletingStory}
                  onClick={() => {
                    setShowDeleteConfirm(false);
                    setPaused(false);
                  }}
                  className="w-full rounded-xl bg-white/10 hover:bg-white/15 py-2.5 text-xs font-semibold text-white/90 transition-colors cursor-pointer active:scale-98"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );

  return createPortal(viewer, document.body);
};

export default StoryViewer;
