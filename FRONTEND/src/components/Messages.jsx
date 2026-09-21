import React, { useEffect, useRef, useState } from "react";
import { Check, CheckCheck, MessageCircle, Clock } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import { Link } from "react-router-dom";
import { useSelector } from "react-redux";
import useGetAllMessage from "@/hooks/useGetAllMessage";
import useGetRTM from "@/hooks/useGetRTM";
import { ErrorState, LoadingState } from "./RequestState";

const Messages = ({ selectedUser }) => {
  const { isTyping } = useGetRTM();
  const messageRequest = useGetAllMessage();

  const { messages } = useSelector((store) => store.chat);
  const { user } = useSelector((store) => store.auth);

  const scrollContainerRef = useRef(null);
  const seenIdsRef = useRef(new Set());
  const [newIds, setNewIds] = useState(new Set());

  /* ---------- LOGIC ---------- */
  const formatMessageTime = (createdAt) => {
    if (!createdAt) return "";
    return new Intl.DateTimeFormat(undefined, {
      hour: "numeric",
      minute: "2-digit",
    }).format(new Date(createdAt));
  };

  const getFirstName = (person) =>
    (person?.fullName || person?.username || "User").trim().split(/\s+/)[0];

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

  /* ---------- RESET ON CONVERSATION SWITCH ---------- */
  useEffect(() => {
    seenIdsRef.current = new Set();
    setNewIds(new Set());
  }, [selectedUser?._id]);

  /* ---------- ANIMATE ONLY NEW MESSAGES ---------- */
  useEffect(() => {
    if (!messages?.length) return;

    const isInitialLoad = seenIdsRef.current.size === 0;

    const incoming = messages.filter(
      (m) => !seenIdsRef.current.has(m._id) && !m.__optimistic,
    );

    incoming.forEach((m) => seenIdsRef.current.add(m._id));

    // Also mark optimistic messages as seen (so no animation, they were just rendered)
    messages.forEach((m) => {
      if (!seenIdsRef.current.has(m._id)) seenIdsRef.current.add(m._id);
    });

    if (!isInitialLoad && incoming.length > 0) {
      setNewIds(new Set(incoming.map((m) => m._id)));
      const timer = setTimeout(() => setNewIds(new Set()), 800);
      return () => clearTimeout(timer);
    }
  }, [messages]);

  /* ---------- SCROLL ---------- */
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

  /* ---------- UI ---------- */
  return (
    <div className="flex flex-col h-full relative bg-[var(--background)]">
      {/* Mobile header */}
      <div className="md:hidden border-b border-[var(--border)] bg-[var(--surface)] shrink-0">
        <div className="flex items-center gap-3 p-3">
          <Avatar className="h-10 w-10 shrink-0">
            <AvatarImage
              src={selectedUser?.profilePicture}
              alt={selectedUser?.fullName || selectedUser?.username}
            />
            <AvatarFallback>
              {(selectedUser?.fullName || selectedUser?.username)
                ?.charAt(0)
                .toUpperCase()}
            </AvatarFallback>
          </Avatar>

          <div className="min-w-0 flex-1">
            <p className="font-semibold text-sm text-[var(--foreground)] truncate">
              {selectedUser?.fullName || selectedUser?.username}
            </p>
            <p className="text-[11px] text-[var(--muted-foreground)] truncate">
              @{selectedUser?.username}
            </p>
          </div>

          <Link
            to={`/profile/${selectedUser?._id}`}
            className="shrink-0 text-[11px] font-medium px-3 py-1.5 rounded-full border border-[var(--border-strong)] text-[var(--foreground)] hover:bg-[var(--surface-2)] transition-colors"
          >
            View
          </Link>
        </div>
      </div>

      {/* Messages */}
      <div
        ref={scrollContainerRef}
        className="flex-1 px-3 md:px-5 py-4 overflow-y-auto flex flex-col gap-1"
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
            <div className="w-12 h-12 rounded-full bg-[var(--surface-2)] flex items-center justify-center mb-3">
              <MessageCircle
                className="w-5 h-5 text-[var(--muted-foreground)]"
                strokeWidth={1.8}
              />
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

            return (
              <div
                key={msg._id}
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
                  className={`max-w-[80%] md:max-w-sm lg:max-w-md px-3.5 py-2 text-sm ${
                    isPending ? "message-pending" : ""
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
                  }`}
                  style={
                    isMine
                      ? {
                          background: "var(--primary)",
                          color: "var(--primary-foreground)",
                        }
                      : undefined
                  }
                >
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
                    {isMine && <MessageStatus status={msg.status || "sent"} />}
                  </div>
                </div>
              </div>
            );
          })
        )}

        {/* Typing */}
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
    </div>
  );
};

export default Messages;
