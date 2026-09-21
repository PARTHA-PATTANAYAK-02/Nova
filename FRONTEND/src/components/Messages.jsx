import React, { useEffect, useRef } from "react";
import { Check, CheckCheck, MessageCircle } from "lucide-react";
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
    if (status === "seen") {
      return (
        <CheckCheck
          className="h-3 w-3 text-cyan-200 drop-shadow-[0_0_4px_rgba(103,232,249,0.6)]"
          aria-label="Seen"
        />
      );
    }

    if (status === "delivered") {
      return (
        <CheckCheck className="h-3 w-3 text-white/60" aria-label="Delivered" />
      );
    }

    return <Check className="h-3 w-3 text-white/50" aria-label="Sent" />;
  };

  /* ---------- SCROLL HELPERS ---------- */

  const scrollToBottom = () => {
    const el = scrollContainerRef.current;

    if (!el) return;

    // First frame
    requestAnimationFrame(() => {
      el.scrollTop = el.scrollHeight;

      // Second frame - makes sure DOM/layout is fully updated
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

  /* ---------- INITIAL LOAD + CONVERSATION CHANGE ---------- */

  useEffect(() => {
    // Wait until message request has finished
    if (messageRequest.loading) return;

    scrollToBottom();
  }, [selectedUser?._id, messageRequest.loading, messages]);

  /* ---------- NEW MESSAGE ---------- */

  useEffect(() => {
    if (!messages?.length) return;

    scrollToBottom();
  }, [messages?.length]);

  /* ---------- TYPING ---------- */

  useEffect(() => {
    if (!isTyping) return;

    // Typing indicator should only move the chat
    // if the user is already near the bottom.
    if (isNearBottom()) {
      scrollToBottom();
    }
  }, [isTyping]);

  /* ---------- UI ---------- */

  return (
    <div className="flex flex-col h-full relative">
      {/* Mobile-only header card */}
      <div className="md:hidden relative overflow-hidden border-b border-white/8 shrink-0">
        <div className="absolute inset-0 bg-gradient-to-br from-violet-500/20 via-fuchsia-500/10 to-cyan-500/20" />

        <div className="relative flex flex-col items-center p-5">
          <div className="relative">
            <div className="absolute -inset-0.5 rounded-full bg-gradient-to-br from-violet-500 via-fuchsia-500 to-cyan-400 opacity-80" />

            <Avatar className="relative h-16 w-16 ring-4 ring-[#0a0a18]">
              <AvatarImage
                src={selectedUser?.profilePicture}
                alt={selectedUser?.fullName || selectedUser?.username}
              />

              <AvatarFallback className="bg-gradient-to-br from-violet-500 to-cyan-500 text-white font-semibold text-lg">
                {(selectedUser?.fullName || selectedUser?.username)
                  ?.charAt(0)
                  .toUpperCase()}
              </AvatarFallback>
            </Avatar>
          </div>

          <h2 className="mt-2.5 font-display font-semibold text-base text-white">
            {selectedUser?.fullName || selectedUser?.username}
          </h2>

          <Link
            to={`/profile/${selectedUser?._id}`}
            className="mt-3 text-[11px] font-semibold px-3.5 py-1.5 rounded-full bg-white/8 border border-white/10 text-white/80 hover:bg-white/12 hover:border-white/20 transition-all"
          >
            View profile
          </Link>
        </div>
      </div>

      {/* Messages scroll container */}
      <div
        ref={scrollContainerRef}
        className="flex-1 px-3 md:px-5 py-4 overflow-y-auto flex flex-col gap-1.5"
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
            <div className="w-14 h-14 rounded-full bg-gradient-to-br from-violet-500/20 to-cyan-500/20 border border-white/10 flex items-center justify-center mb-3">
              <MessageCircle className="w-6 h-6 text-white/50" />
            </div>

            <p className="text-white/60 text-sm font-medium">No messages yet</p>

            <p className="text-white/35 text-xs mt-1">
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

            return (
              <div
                key={msg._id}
                className={`flex ${isMine ? "justify-end" : "justify-start"} ${
                  sameAsPrev ? "mt-0.5" : "mt-2.5"
                }`}
              >
                <div
                  className={`max-w-[80%] md:max-w-sm lg:max-w-md px-3.5 py-2 text-sm transition-all ${
                    isMine
                      ? `bg-gradient-to-br from-violet-500 to-cyan-500 text-white shadow-[0_2px_14px_rgba(124,92,255,0.35)] ${
                          sameAsNext
                            ? "rounded-2xl"
                            : "rounded-2xl rounded-br-md"
                        }`
                      : `bg-white/6 border border-white/8 text-white/90 backdrop-blur-sm ${
                          sameAsNext
                            ? "rounded-2xl"
                            : "rounded-2xl rounded-bl-md"
                        }`
                  }`}
                >
                  <p className="break-words leading-relaxed whitespace-pre-wrap">
                    {msg.message}
                  </p>

                  <div
                    className={`mt-1 flex items-center gap-1 text-[10px] ${
                      isMine ? "justify-end text-white/75" : "text-white/40"
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

        {/* Typing indicator */}
        {isTyping && (
          <div className="flex justify-start mt-2.5" aria-live="polite">
            <div className="bg-white/6 border border-white/8 backdrop-blur-sm rounded-2xl rounded-bl-md px-4 py-2.5 flex items-center gap-2">
              <span className="flex gap-1">
                <span
                  className="w-1.5 h-1.5 rounded-full bg-white/60 animate-typing"
                  style={{ animationDelay: "0ms" }}
                />

                <span
                  className="w-1.5 h-1.5 rounded-full bg-white/60 animate-typing"
                  style={{ animationDelay: "160ms" }}
                />

                <span
                  className="w-1.5 h-1.5 rounded-full bg-white/60 animate-typing"
                  style={{ animationDelay: "320ms" }}
                />
              </span>

              <span className="text-[11px] text-white/45">
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
