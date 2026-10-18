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

const isTouchPrimary = () =>
  typeof window !== "undefined" &&
  window.matchMedia &&
  window.matchMedia("(hover: none) and (pointer: coarse)").matches;

const SWIPE_THRESHOLD = 55;
const SWIPE_MAX = 80;

/* ═══ Receiver popup — top of chat ═══ */
const ReactionPopup = ({ emoji, name }) => {
  const particles = Array.from({ length: 12 });
  return (
    <div
      role="status"
      className="nova-reaction-popup animate-reaction-popup-in"
    >
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

/* ═══ Desktop action menu — with outside dismiss and auto-placement ═══ */
const MessageActions = ({ isMine, isBelow, onReply, onReact, onClose }) => (
  <div
    className={`nova-actions ${
      isMine ? "nova-actions--right" : "nova-actions--left"
    } ${isBelow ? "nova-actions--below" : ""}`}
    onClick={(e) => e.stopPropagation()}
  >
    <div className="nova-actions__pill">
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onReply();
          }}
          className="nova-actions__btn"
        >
          <MessageSquareReply className="size-3.5" strokeWidth={2.2} />
          Reply
        </button>

        {!isMine && (
          <>
            <span className="nova-actions__sep" />
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onReact();
              }}
              className="nova-actions__btn"
            >
              <Smile className="size-3.5" strokeWidth={2.2} />
              React
            </button>
          </>
        )}

        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onClose();
          }}
          aria-label="Close"
          className="nova-actions__close"
        >
          <X className="size-3" strokeWidth={2.4} />
        </button>
      </div>
  </div>
);

const Messages = ({ selectedUser, onReplyMessage }) => {
  const { isTyping } = useGetRTM();
  const messageRequest = useGetAllMessage();

  const { messages, reactionNotice } = useSelector((s) => s.chat);
  const { user } = useSelector((s) => s.auth);
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
  const [actionsFor, setActionsFor] = useState(null);

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
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  /* Close action popup when tapping/clicking anywhere outside */
  useEffect(() => {
    if (!actionsFor) return;

    const handleOutsideClick = (e) => {
      // If click target is inside .nova-actions or .nova-msg bubble that was tapped, let internal handlers work
      if (e.target.closest(".nova-actions")) {
        return;
      }
      setActionsFor(null);
    };

    // Use capture phase so it registers reliably before child stopPropagation cancels bubbling
    document.addEventListener("pointerdown", handleOutsideClick, true);
    return () => {
      document.removeEventListener("pointerdown", handleOutsideClick, true);
    };
  }, [actionsFor]);

  /* ---------- receiver popup ---------- */
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
      const AC = window.AudioContext || window.webkitAudioContext;
      if (AC) {
        const ctx = new AC();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = "sine";
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.onended = () => ctx.close();
        ctx
          .resume()
          .then(() => {
            const t = ctx.currentTime;
            osc.frequency.setValueAtTime(660, t);
            osc.frequency.setValueAtTime(880, t + 0.09);
            gain.gain.setValueAtTime(0.0001, t);
            gain.gain.exponentialRampToValueAtTime(0.08, t + 0.025);
            gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.24);
            osc.start(t);
            osc.stop(t + 0.25);
          })
          .catch(() => {
            try {
              ctx.close();
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
    if (message.senderId === user?._id) return;

    const current = message.reactions?.find(
      (r) => (r.userId?._id || r.userId)?.toString() === user?._id?.toString(),
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

  const MessageStatus = ({ status }) => {
    if (status === "sending")
      return (
        <Clock className="size-3 text-white/60 animate-pulse" strokeWidth={2} />
      );
    if (status === "seen")
      return <CheckCheck className="size-3 text-white" strokeWidth={2.4} />;
    if (status === "delivered")
      return <CheckCheck className="size-3 text-white/85" strokeWidth={2.4} />;
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

  const handleBubbleClick = (e, msg, isMine) => {
    if (suppressTapRef.current) return;
    e.stopPropagation();
    setActionsFor((cur) => (cur === msg._id ? null : msg._id));
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
      1800,
    );
  };

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
    const d = el.scrollHeight - el.scrollTop - el.clientHeight;
    return d <= 150;
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

  return (
    <div className="nova-messages">
      {reactionPopup && (
        <ReactionPopup
          emoji={reactionPopup}
          name={getDisplayName(selectedUser, "Someone")}
        />
      )}

      <div ref={scrollContainerRef} className="nova-messages__scroll">
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
                    className="nova-msg-drag"
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

                    <div
                      onClick={(e) => handleBubbleClick(e, msg, isMine)}
                      className={`nova-msg ${
                        isMine ? "is-mine" : "is-theirs"
                      } ${isPending ? "is-pending" : ""} ${
                        isActionsOpen || isPickerOpen ? "is-active" : ""
                      } ${sameAsNext ? "is-grouped" : ""}`}
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
                            {msg.replyTo.senderId?.toString() ===
                            user?._id?.toString()
                              ? "You"
                              : getDisplayName(selectedUser, "User")}
                          </span>
                          <span className="nova-msg__reply-text">
                            {msg.replyTo.message}
                          </span>
                        </button>
                      )}

                      <p className="nova-msg__text">{msg.message}</p>

                      <div
                        className={`nova-msg__meta ${
                          isMine ? "is-mine" : "is-theirs"
                        }`}
                      >
                        <span>{formatMessageTime(msg.createdAt)}</span>
                        {isMine && (
                          <MessageStatus status={msg.status || "sent"} />
                        )}
                      </div>
                    </div>

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

                    {/* Message action menu (Reply / React) — with outside dismiss and auto-placement */}
                    {isActionsOpen && isReplyable && (
                      <MessageActions
                        isMine={isMine}
                        isBelow={index <= 1}
                        onReply={() => {
                          setActionsFor(null);
                          triggerReply(msg);
                        }}
                        onReact={() => {
                          setActionsFor(null);
                          const anchor = document.getElementById(
                            `message-${msg._id}`,
                          );
                          if (anchor) openPicker(msg._id, anchor, isMine);
                        }}
                        onClose={() => setActionsFor(null)}
                      />
                    )}

                    {/* Mobile smile button */}
                    {isTouch && !isMine && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          openPicker(msg._id, e.currentTarget, isMine);
                        }}
                        aria-label="Add reaction"
                        className="nova-msg__smile"
                      >
                        <Smile className="size-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })
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
      </div>

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
