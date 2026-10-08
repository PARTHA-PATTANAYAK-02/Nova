import React, { useEffect, useRef, useState } from "react";
import {
  Check,
  CheckCheck,
  MessageCircle,
  Clock,
  Smile,
  MessageSquareReply,
  X,
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useDispatch, useSelector } from "react-redux";
import axios from "axios";
import { toast } from "sonner";
import { updateMessageReactions } from "@/redux/chatSlice";
import { apiUrl } from "@/lib/api";
import { getDisplayName } from "@/lib/utils";
import useGetAllMessage from "@/hooks/useGetAllMessage";
import useGetRTM from "@/hooks/useGetRTM";
import { ErrorState, LoadingState } from "@/components/common/RequestState";
import EmojiPicker from "./EmojiPicker";

/* ============================================================
   Touch detection
   ============================================================ */
const isTouchPrimary = () =>
  typeof window !== "undefined" &&
  window.matchMedia &&
  window.matchMedia("(hover: none) and (pointer: coarse)").matches;

const SWIPE_THRESHOLD = 55;
const SWIPE_MAX = 80;

/* ============================================================
   Receiver popup
   ============================================================ */
const ReactionPopup = ({ emoji, name }) => {
  const particles = Array.from({ length: 12 });
  return (
    <div
      role="status"
      className="pointer-events-none absolute left-1/2 top-4 z-40 -translate-x-1/2 animate-reaction-popup-in"
    >
      <div className="relative flex items-center gap-3 rounded-2xl border border-[var(--border)] bg-[var(--surface)]/95 px-4 py-2.5 shadow-[0_12px_40px_rgba(0,0,0,0.25)] backdrop-blur-xl">
        <span className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <span className="absolute h-12 w-12 rounded-full border-2 border-[var(--primary)]/40 animate-reaction-ring" />
          <span
            className="absolute h-12 w-12 rounded-full border-2 border-[var(--primary)]/25 animate-reaction-ring"
            style={{ animationDelay: "180ms" }}
          />
        </span>

        <span className="relative text-3xl animate-reaction-emoji-spin">
          {emoji}
        </span>

        <span className="pointer-events-none absolute inset-0 flex items-center justify-center">
          {particles.map((_, i) => {
            const angle = (i / particles.length) * Math.PI * 2;
            const distance = 34 + (i % 3) * 10;
            return (
              <span
                key={i}
                className="absolute h-1.5 w-1.5 rounded-full animate-reaction-particle"
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

        <span className="text-sm font-medium text-[var(--foreground)] whitespace-nowrap">
          {name} reacted
        </span>
      </div>
    </div>
  );
};

/* ============================================================
   Desktop action menu (shows on bubble click)
   ============================================================ */
const MessageActions = ({ isMine, onReply, onReact, onClose }) => (
  <>
    {/* Invisible full-screen backdrop to catch outside clicks */}
    <div
      className="fixed inset-0 z-40"
      onClick={(e) => {
        e.stopPropagation();
        onClose();
      }}
      onTouchStart={(e) => {
        e.stopPropagation();
        onClose();
      }}
    />

    {/* The menu */}
    <div
      className={`
        absolute z-50 top-full mt-2
        ${isMine ? "right-0" : "left-0"}
        animate-actions-in
      `}
      onClick={(e) => e.stopPropagation()}
    >
      <div className="flex items-center gap-0.5 rounded-full border border-[var(--border)] bg-[var(--surface)]/98 backdrop-blur-xl shadow-[0_12px_36px_rgba(0,0,0,0.28)] p-1">
        {/* Reply */}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onReply();
          }}
          className="
            inline-flex items-center gap-1.5
            rounded-full
            px-3 py-1.5
            text-xs font-medium
            text-[var(--foreground)]
            hover:bg-[var(--surface-2)]
            hover:text-[var(--primary)]
            transition-all duration-150
            active:scale-95
          "
        >
          <MessageSquareReply className="h-3.5 w-3.5" strokeWidth={2.2} />
          Reply
        </button>

        {/* React — only received */}
        {!isMine && (
          <>
            <span className="w-px h-4 bg-[var(--border)] mx-0.5" />
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onReact();
              }}
              className="
                inline-flex items-center gap-1.5
                rounded-full
                px-3 py-1.5
                text-xs font-medium
                text-[var(--foreground)]
                hover:bg-[var(--surface-2)]
                hover:text-[var(--primary)]
                transition-all duration-150
                active:scale-95
              "
            >
              <Smile className="h-3.5 w-3.5" strokeWidth={2.2} />
              React
            </button>
          </>
        )}

        {/* Close */}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onClose();
          }}
          aria-label="Close menu"
          className="
            ml-0.5 w-7 h-7 rounded-full
            flex items-center justify-center
            text-[var(--muted-foreground)]
            hover:text-[var(--foreground)]
            hover:bg-[var(--surface-2)]
            transition-all duration-150
            active:scale-90
          "
        >
          <X className="h-3 w-3" strokeWidth={2.4} />
        </button>
      </div>
    </div>
  </>
);

const Messages = ({ selectedUser, onReplyMessage }) => {
  const { isTyping } = useGetRTM();
  const messageRequest = useGetAllMessage();

  const { messages, reactionNotice } = useSelector((store) => store.chat);
  const { user } = useSelector((store) => store.auth);
  const dispatch = useDispatch();

  const scrollContainerRef = useRef(null);
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

  /* ---------- Desktop action menu ---------- */
  const [actionsFor, setActionsFor] = useState(null);

  /* ---------- Swipe-to-reply state ---------- */
  const [swipeFor, setSwipeFor] = useState({ msgId: null, offset: 0 });
  const swipeRef = useRef(null);
  const suppressTapRef = useRef(false);

  /* ---------- Touch detection ---------- */
  useEffect(() => {
    setIsTouch(isTouchPrimary());
  }, []);

  /* ---------- Escape closes menu + picker ---------- */
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "Escape") {
        setActionsFor(null);
        setOpenPickerFor(null);
        setAnchorEl(null);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  /* ---------- Receiver popup + sound ---------- */
  useEffect(() => {
    if (
      !reactionNotice?.emoji ||
      reactionNotice.actorId === user?._id ||
      reactionNotice.conversationUserId !== selectedUser?._id
    )
      return undefined;

    setReactionPopup(reactionNotice.emoji);
    const timer = setTimeout(() => setReactionPopup(null), 2600);

    try {
      const AudioContextClass =
        window.AudioContext || window.webkitAudioContext;
      if (AudioContextClass) {
        const audioContext = new AudioContextClass();
        const oscillator = audioContext.createOscillator();
        const gain = audioContext.createGain();
        oscillator.type = "sine";
        oscillator.connect(gain);
        gain.connect(audioContext.destination);
        oscillator.onended = () => audioContext.close();
        audioContext
          .resume()
          .then(() => {
            const startAt = audioContext.currentTime;
            oscillator.frequency.setValueAtTime(660, startAt);
            oscillator.frequency.setValueAtTime(880, startAt + 0.09);
            gain.gain.setValueAtTime(0.0001, startAt);
            gain.gain.exponentialRampToValueAtTime(0.08, startAt + 0.025);
            gain.gain.exponentialRampToValueAtTime(0.0001, startAt + 0.24);
            oscillator.start(startAt);
            oscillator.stop(startAt + 0.25);
          })
          .catch(() => {
            try {
              audioContext.close();
            } catch {
              /* noop */
            }
          });
      }
    } catch {
      /* silent */
    }

    return () => clearTimeout(timer);
  }, [
    reactionNotice?.timestamp,
    reactionNotice?.emoji,
    reactionNotice?.actorId,
    reactionNotice?.conversationUserId,
    selectedUser?._id,
    user?._id,
  ]);

  /* ---------- Formatters ---------- */
  const formatMessageTime = (createdAt) => {
    if (!createdAt) return "";
    return new Intl.DateTimeFormat(undefined, {
      hour: "numeric",
      minute: "2-digit",
    }).format(new Date(createdAt));
  };

  const getFirstName = (person) => getDisplayName(person, "User");

  /* ---------- Reaction handler ---------- */
  const handleReaction = async (message, emoji) => {
    if (reactingMessageId) return;
    if (message.senderId === user?._id) return;

    const current = message.reactions?.find(
      (reaction) =>
        (reaction.userId?._id || reaction.userId)?.toString() ===
        user?._id?.toString(),
    );
    const nextEmoji = current?.emoji === emoji ? null : emoji;

    setJustReacted({ messageId: message._id, emoji });
    setTimeout(() => setJustReacted(null), 800);

    try {
      setReactingMessageId(message._id);
      const response = await axios.patch(
        apiUrl(`/api/v1/message/${selectedUser._id}/reaction/${message._id}`),
        { emoji: nextEmoji },
        { withCredentials: true },
      );
      dispatch(
        updateMessageReactions({
          messageId: message._id,
          reactions: response.data.reactions,
        }),
      );
      setOpenPickerFor(null);
      setAnchorEl(null);
    } catch (error) {
      toast.error(
        error.response?.data?.message || "Unable to react to message.",
      );
    } finally {
      setReactingMessageId(null);
    }
  };

  /* ---------- Status icon ---------- */
  const MessageStatus = ({ status }) => {
    if (status === "sending") {
      return (
        <Clock
          className="h-3 w-3 text-white/60 animate-pulse"
          strokeWidth={2}
          aria-label="Sending"
        />
      );
    }
    if (status === "seen") {
      return (
        <CheckCheck
          className="h-3 w-3 text-[var(--primary)]"
          strokeWidth={2.4}
          aria-label="Seen"
        />
      );
    }
    if (status === "delivered") {
      return (
        <CheckCheck
          className="h-3 w-3 text-white/85"
          strokeWidth={2.4}
          aria-label="Delivered"
        />
      );
    }
    return (
      <Check
        className="h-3 w-3 text-white/70"
        strokeWidth={2.4}
        aria-label="Sent"
      />
    );
  };

  /* ---------- Reset on conv switch ---------- */
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

  useEffect(
    () => () => {
      clearTimeout(highlightTimerRef.current);
    },
    [],
  );

  /* ============================================================
     Reply triggers
     ============================================================ */
  const triggerReply = (msg) => {
    if (!msg || msg.__optimistic || msg.status === "sending") return;
    setActionsFor(null);
    onReplyMessage?.(msg);
  };

  /* Mobile: swipe right */
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

  /* ============================================================
     Bubble click
     - Mobile:
       - Own: nothing
       - Received: open emoji picker
     - Desktop:
       - Any message: open action menu (Reply + React)
     ============================================================ */
  const handleBubbleClick = (e, msg, isMine) => {
    if (suppressTapRef.current) return;
    e.stopPropagation();

    if (isTouch) {
      // Mobile behavior
      if (isMine) return;
      openPicker(msg._id, e.currentTarget, isMine);
      return;
    }

    // Desktop behavior — toggle action menu
    setActionsFor((cur) => (cur === msg._id ? null : msg._id));
  };

  /* ---------- Jump to replied message ---------- */
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
      1800,
    );
  };

  /* ---------- New message animation ---------- */
  useEffect(() => {
    if (!messages?.length) return;
    const isInitialLoad = seenIdsRef.current.size === 0;
    const incoming = messages.filter(
      (m) => !seenIdsRef.current.has(m._id) && !m.__optimistic,
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

  /* ---------- Scroll ---------- */
  const scrollToBottom = () => {
    const el = scrollContainerRef.current;
    if (!el) return;
    requestAnimationFrame(() => {
      el.scrollTop = el.scrollHeight;
      requestAnimationFrame(() => {
        el.scrollTop = el.scrollHeight;
      });
    });
  };

  const isNearBottom = () => {
    const el = scrollContainerRef.current;
    if (!el) return true;
    const distanceFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
    return distanceFromBottom <= 150;
  };

  useEffect(() => {
    if (messageRequest.loading) return;
    scrollToBottom();
  }, [selectedUser?._id, messageRequest.loading, messages]);

  useEffect(() => {
    if (!messages?.length) return;
    scrollToBottom();
  }, [messages?.length]);

  useEffect(() => {
    if (!isTyping) return;
    if (isNearBottom()) scrollToBottom();
  }, [isTyping]);

  /* ---------- Open emoji picker ---------- */
  const openPicker = (msgId, anchor, isOwn) => {
    if (isOwn) return;
    if (openPickerFor === msgId) {
      setOpenPickerFor(null);
      setAnchorEl(null);
      return;
    }
    setAnchorEl(anchor);
    setOpenPickerFor(msgId);
  };

  /* ============================================================
     UI
     ============================================================ */
  return (
    <div className="relative flex h-full min-h-0 flex-col bg-[var(--background)]">
      {reactionPopup && (
        <ReactionPopup
          emoji={reactionPopup}
          name={getDisplayName(selectedUser, "Someone")}
        />
      )}

      <div
        ref={scrollContainerRef}
        className="flex-1 min-h-0 px-3 md:px-5 py-4 overflow-y-auto flex flex-col gap-1"
      >
        {messageRequest.loading ? (
          <LoadingState message="Loading messages..." />
        ) : messageRequest.error ? (
          <ErrorState
            message={messageRequest.error}
            onRetry={messageRequest.retry}
          />
        ) : messages?.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center text-center py-12">
            <div className="relative mb-3">
              <span className="absolute inset-0 rounded-full bg-[var(--primary)]/12 blur-2xl animate-pulse" />
              <div className="relative w-12 h-12 rounded-full bg-[var(--surface-2)] flex items-center justify-center">
                <MessageCircle
                  className="w-5 h-5 text-[var(--muted-foreground)]"
                  strokeWidth={1.8}
                />
              </div>
            </div>
            <p className="text-[var(--foreground)] text-sm font-semibold">
              No messages yet
            </p>
            <p className="text-[var(--muted-foreground)] text-xs mt-1">
              Say hi to start the conversation.
            </p>
          </div>
        ) : (
          messages?.map((msg, index) => {
            const isMine = msg.senderId === user?._id;
            const prev = messages[index - 1];
            const sameAsPrev = prev?.senderId === msg.senderId;
            const next = messages[index + 1];
            const sameAsNext = next?.senderId === msg.senderId;

            const shouldAnimate = newIds.has(msg._id);
            const isPending = msg.__optimistic || msg.status === "sending";
            const isPickerOpen = openPickerFor === msg._id;
            const isActionsOpen = actionsFor === msg._id;
            const isReplyable = !isPending;

            const burstEmoji =
              justReacted?.messageId === msg._id ? justReacted.emoji : null;

            const grouped = Object.entries(
              (msg.reactions || []).reduce((acc, r) => {
                acc[r.emoji] = (acc[r.emoji] || 0) + 1;
                return acc;
              }, {}),
            );

            const isSwiping = swipeFor.msgId === msg._id;
            const swipeOffset = isSwiping ? swipeFor.offset : 0;
            const swipeProgress = Math.min(swipeOffset / SWIPE_THRESHOLD, 1);

            return (
              <div
                key={msg._id}
                id={`message-${msg._id}`}
                className={`flex ${isMine ? "justify-end" : "justify-start"} ${
                  sameAsPrev ? "mt-0.5" : "mt-2.5"
                } ${
                  shouldAnimate
                    ? isMine
                      ? "animate-message-in-mine"
                      : "animate-message-in-theirs"
                    : ""
                }`}
              >
                <div
                  className={`relative max-w-[80%] md:max-w-sm lg:max-w-md ${
                    highlightedMessageId === msg._id
                      ? "rounded-2xl ring-2 ring-[var(--gold)] shadow-[0_0_20px_var(--gold)]"
                      : ""
                  }`}
                >
                  {/* Swipe reply indicator */}
                  {isSwiping && isReplyable && (
                    <span
                      className="pointer-events-none absolute top-1/2 -translate-y-1/2 -left-12 z-10"
                      style={{
                        opacity: swipeProgress,
                        transform: `translateY(-50%) scale(${
                          0.6 + swipeProgress * 0.5
                        })`,
                      }}
                    >
                      <span
                        className={`
                          flex h-9 w-9 items-center justify-center rounded-full
                          bg-[var(--primary)] text-[var(--primary-foreground)]
                          shadow-[0_6px_18px_rgba(34,64,138,0.5)]
                          ${
                            swipeOffset >= SWIPE_THRESHOLD
                              ? "animate-reply-icon-pop"
                              : ""
                          }
                        `}
                      >
                        <MessageSquareReply
                          className="h-4 w-4"
                          strokeWidth={2.4}
                        />
                      </span>
                    </span>
                  )}

                  <div
                    className="relative"
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
                      <span className="pointer-events-none absolute inset-0 z-30 flex items-center justify-center">
                        <span className="text-3xl animate-emoji-send-burst">
                          {burstEmoji}
                        </span>
                      </span>
                    )}

                    {/* Bubble */}
                    <div
                      onClick={(e) => handleBubbleClick(e, msg, isMine)}
                      className={`relative px-3.5 py-2 text-sm transition-all duration-200 ${
                        isPending ? "message-pending" : ""
                      } ${isActionsOpen && !isTouch ? "scale-[1.02]" : ""} ${
                        isPickerOpen && isTouch ? "scale-[1.02]" : ""
                      } ${
                        isMine
                          ? `${
                              sameAsNext
                                ? "rounded-2xl"
                                : "rounded-2xl rounded-br-md"
                            }`
                          : `bg-[var(--surface)] border border-[var(--border)] text-[var(--foreground)] ${
                              sameAsNext
                                ? "rounded-2xl"
                                : "rounded-2xl rounded-bl-md"
                            }`
                      } cursor-pointer`}
                      style={
                        isMine
                          ? {
                              background: "var(--primary)",
                              color: "var(--primary-foreground)",
                            }
                          : undefined
                      }
                    >
                      {msg.replyTo?.message && (
                        <button
                          type="button"
                          onClick={(event) => {
                            event.stopPropagation();
                            jumpToMessage(msg.replyTo.messageId);
                          }}
                          className={`mb-2 block w-full rounded-lg border-l-2 px-2.5 py-1.5 text-left transition-all duration-200 hover:brightness-110 ${
                            isMine
                              ? "border-white/60 bg-black/10"
                              : "border-[var(--primary)] bg-[var(--surface-2)]"
                          }`}
                          aria-label="Jump to replied message"
                        >
                          <span className="block text-[10px] font-semibold opacity-80">
                            {msg.replyTo.senderId?.toString() ===
                            user?._id?.toString()
                              ? "You"
                              : getDisplayName(selectedUser, "User")}
                          </span>
                          <span className="block truncate text-xs opacity-80">
                            {msg.replyTo.message}
                          </span>
                        </button>
                      )}

                      <p className="break-words leading-relaxed whitespace-pre-wrap">
                        {msg.message}
                      </p>

                      <div
                        className={`mt-1 flex items-center gap-1 text-[10px] ${
                          isMine
                            ? "justify-end text-white/75"
                            : "text-[var(--muted-foreground)]"
                        }`}
                      >
                        <span>{formatMessageTime(msg.createdAt)}</span>
                        {isMine && (
                          <MessageStatus status={msg.status || "sent"} />
                        )}
                      </div>
                    </div>

                    {/* Reaction pills */}
                    {grouped.length > 0 && (
                      <div
                        className={`-mt-2 flex items-center gap-1 ${
                          isMine ? "justify-end pr-2" : "justify-start pl-2"
                        }`}
                      >
                        {grouped.map(([emoji, count]) => {
                          const isMineReaction = msg.reactions?.some(
                            (r) =>
                              r.emoji === emoji &&
                              (r.userId?._id || r.userId)?.toString() ===
                                user?._id?.toString(),
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
                              className={`
                                reaction-pill
                                inline-flex items-center gap-1
                                rounded-full border
                                px-2 py-0.5 text-xs
                                shadow-sm backdrop-blur-md
                                transition-transform duration-200
                                ${
                                  isMine
                                    ? "cursor-default"
                                    : "hover:scale-110 hover:-translate-y-0.5 active:scale-95"
                                }
                                disabled:opacity-60 disabled:cursor-not-allowed
                                ${
                                  isMineReaction
                                    ? "border-[var(--primary)]/40 bg-[var(--primary)]/15 text-[var(--foreground)]"
                                    : "border-[var(--border)] bg-[var(--surface)]/95 text-[var(--foreground)]"
                                }
                              `}
                            >
                              <span className="emoji-glyph-sm">{emoji}</span>
                              {count > 1 && (
                                <span className="font-medium tabular-nums">
                                  {count}
                                </span>
                              )}
                            </button>
                          );
                        })}
                      </div>
                    )}

                    {/* Desktop — action menu on click */}
                    {!isTouch && isActionsOpen && isReplyable && (
                      <MessageActions
                        isMine={isMine}
                        onReply={() => triggerReply(msg)}
                        onReact={() => {
                          const anchor = document.getElementById(
                            `message-${msg._id}`,
                          );
                          if (anchor) openPicker(msg._id, anchor, isMine);
                        }}
                        onClose={() => setActionsFor(null)}
                      />
                    )}

                    {/* Mobile — always-visible smile button (received only) */}
                    {isTouch && !isMine && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          openPicker(msg._id, e.currentTarget, isMine);
                        }}
                        aria-label="Add reaction"
                        className={`
                          absolute top-1/2 -translate-y-1/2 -right-9
                          w-7 h-7 rounded-full
                          flex items-center justify-center
                          bg-[var(--surface)] border border-[var(--border)]
                          text-[var(--muted-foreground)]
                          hover:text-[var(--foreground)]
                          hover:bg-[var(--surface-2)]
                          shadow-sm
                          transition-all duration-200
                          ${
                            isPickerOpen
                              ? "opacity-100 scale-100"
                              : "opacity-100 scale-100"
                          }
                        `}
                      >
                        <Smile className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}

        {/* Typing indicator */}
        {isTyping && (
          <div
            className="flex justify-start mt-2.5 animate-fade-in"
            aria-live="polite"
          >
            <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl rounded-bl-md px-3.5 py-2.5 flex items-center gap-2">
              <span className="flex gap-1">
                <span
                  className="w-1.5 h-1.5 rounded-full bg-[var(--muted-foreground)] animate-typing"
                  style={{ animationDelay: "0ms" }}
                />
                <span
                  className="w-1.5 h-1.5 rounded-full bg-[var(--muted-foreground)] animate-typing"
                  style={{ animationDelay: "160ms" }}
                />
                <span
                  className="w-1.5 h-1.5 rounded-full bg-[var(--muted-foreground)] animate-typing"
                  style={{ animationDelay: "320ms" }}
                />
              </span>
              <span className="text-[11px] text-[var(--muted-foreground)]">
                {getFirstName(selectedUser)} is typing
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Portal picker */}
      {openPickerFor && anchorEl && (
        <EmojiPicker
          anchorEl={anchorEl}
          disabled={Boolean(reactingMessageId)}
          defaultExpanded={isTouch}
          onPick={(emoji) => {
            const msg = messages.find((m) => m._id === openPickerFor);
            if (!msg) return;
            if (msg.senderId === user?._id) return;
            handleReaction(msg, emoji);
          }}
          onClose={() => {
            setOpenPickerFor(null);
            setAnchorEl(null);
          }}
        />
      )}
    </div>
  );
};

export default Messages;
