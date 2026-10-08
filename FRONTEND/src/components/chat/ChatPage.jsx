import React, { useEffect, useState, useRef } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { setSelectedUser } from "@/redux/authSlice";
import { Input } from "@/components/ui/input";
import {
  MessageCircle,
  Search,
  ArrowLeft,
  Send,
  X,
  Sparkles,
} from "lucide-react";
import Messages from "@/components/chat/Messages";
import axios from "axios";
import { setMessages } from "@/redux/chatSlice";
import { getDisplayName, getErrorMessage } from "@/lib/utils";
import { toast } from "sonner";
import { getSocketInstance } from "@/redux/socketSlice";
import useGetConversations from "@/hooks/useGetConversations";
import useGetSuggestedUsers from "@/hooks/useGetSuggestedUsers";
import { ErrorState, LoadingState } from "@/components/common/RequestState";
import { useLocation } from "react-router-dom";
import { apiUrl } from "@/lib/api";
import ChatUserMenu from "@/components/chat/ChatUserMenu";

const ChatPage = () => {
  const [textMessage, setTextMessage] = useState("");
  const [replyingTo, setReplyingTo] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [sending, setSending] = useState(false);

  const [showContacts, setShowContacts] = useState(() => {
    return window.innerWidth < 768;
  });

  const typingTimeoutRef = useRef(null);
  const messagesRef = useRef([]);
  const inputRef = useRef(null);
  const location = useLocation();

  const { user, suggestedUsers, selectedUser } = useSelector(
    (store) => store.auth,
  );

  const { onlineUsers, messages } = useSelector((store) => store.chat);

  const conversationRequest = useGetConversations();
  const suggestedUserRequest = useGetSuggestedUsers();
  const dispatch = useDispatch();

  /* ---------- SYNC REF ---------- */
  useEffect(() => {
    messagesRef.current = Array.isArray(messages) ? messages : [];
  }, [messages]);

  /* ---------- SELF-FILTERED ONLINE ---------- */
  const othersOnline = (onlineUsers || []).filter((id) => id !== user?._id);
  const othersOnlineCount = othersOnline.length;

  /* ---------- LOCATION USER ---------- */
  useEffect(() => {
    if (location.state?.user?._id) {
      dispatch(setSelectedUser(location.state.user));
      window.history.replaceState({}, "", window.location.pathname);
    }
  }, [dispatch, location.state]);

  /* ---------- AUTO-SELECT LATEST ---------- */
  useEffect(() => {
    if (
      !selectedUser &&
      !location.state?.user?._id &&
      !conversationRequest.loading &&
      conversationRequest.conversations.length > 0
    ) {
      const latest = conversationRequest.conversations[0].user;
      if (latest?._id) dispatch(setSelectedUser(latest));
    }
  }, [
    conversationRequest.conversations,
    conversationRequest.loading,
    dispatch,
    location.state,
    selectedUser,
  ]);

  /* ---------- SEND MESSAGE — OPTIMISTIC ---------- */
  const sendMessageHandler = async (receiverId) => {
    const text = textMessage.trim();
    if (!text || !receiverId || !user?._id || sending) return;

    const replyTo = replyingTo
      ? {
          messageId: replyingTo._id,
          senderId: replyingTo.senderId,
          message: replyingTo.message,
        }
      : undefined;

    const socket = getSocketInstance();
    socket?.emit("stopTyping", { receiverId });
    clearTimeout(typingTimeoutRef.current);

    const tempId = `temp-${Date.now()}-${Math.random()
      .toString(36)
      .slice(2, 7)}`;
    const optimisticMsg = {
      _id: tempId,
      senderId: user._id,
      receiverId,
      message: text,
      replyTo,
      createdAt: new Date().toISOString(),
      status: "sending",
      __optimistic: true,
    };

    const nextList = [...(messagesRef.current || []), optimisticMsg];
    messagesRef.current = nextList;
    dispatch(setMessages(nextList));

    setTextMessage("");
    setReplyingTo(null);
    inputRef.current?.focus();

    try {
      setSending(true);
      const res = await axios.post(
        apiUrl(`/api/v1/message/send/${receiverId}`),
        { textMessage: text, replyToId: replyTo?.messageId },
        { withCredentials: true },
      );

      if (res.data.success) {
        const realMsg = res.data.newMessage || res.data.message;
        if (realMsg?._id) {
          const latest = messagesRef.current || [];
          const hasReal = latest.some((m) => m._id === realMsg._id);
          const updated = hasReal
            ? latest.filter((m) => m._id !== tempId)
            : latest.map((m) =>
                m._id === tempId
                  ? { ...realMsg, status: realMsg.status || "sent" }
                  : m,
              );
          messagesRef.current = updated;
          dispatch(setMessages(updated));
        }
      }
    } catch (error) {
      const latest = messagesRef.current || [];
      const updated = latest.filter((m) => m._id !== tempId);
      messagesRef.current = updated;
      dispatch(setMessages(updated));
      setTextMessage(text);
      setReplyingTo(replyingTo || null);
      toast.error(getErrorMessage(error, "Unable to send your message."));
    } finally {
      setSending(false);
    }
  };

  /* ---------- TYPING ---------- */
  const messageChangeHandler = (event) => {
    const next = event.target.value;
    setTextMessage(next);

    const socket = getSocketInstance();
    if (!selectedUser || !socket) return;

    clearTimeout(typingTimeoutRef.current);
    if (!next.trim()) {
      socket.emit("stopTyping", { receiverId: selectedUser._id });
      return;
    }
    socket.emit("typing", { receiverId: selectedUser._id });
    typingTimeoutRef.current = setTimeout(() => {
      socket.emit("stopTyping", { receiverId: selectedUser._id });
    }, 1200);
  };

  useEffect(() => {
    return () => clearTimeout(typingTimeoutRef.current);
  }, [selectedUser]);

  useEffect(() => {
    if (selectedUser && window.innerWidth < 768) setShowContacts(false);
  }, [selectedUser]);

  useEffect(() => {
    setReplyingTo(null);
  }, [selectedUser?._id]);

  /* ---------- CONTACTS ---------- */
  const conversationUsers = conversationRequest.conversations
    .map((c) => c.user)
    .filter((u) => u?._id);
  const conversationUserIds = new Set(
    conversationUsers.map((u) => u._id.toString()),
  );
  const contacts = [
    ...conversationUsers,
    ...suggestedUsers.filter(
      (u) => !conversationUserIds.has(u._id?.toString()),
    ),
  ];

  const filteredUsers = contacts.filter((u) =>
    `${u.fullName || ""} ${u.username}`
      .toLowerCase()
      .includes(searchQuery.toLowerCase()),
  );

  const getConversationForUser = (userId) =>
    conversationRequest.conversations.find((c) => c.user?._id === userId);

  const closeContacts = () => setShowContacts(false);

  /* ---------- UI ---------- */
  return (
    <div className="relative flex h-full min-h-0 w-full overflow-hidden bg-[var(--background)]">
      {/* ============ CONTACTS PANEL ============ */}
      <aside
        className={`
          ${showContacts ? "flex" : "hidden"}
          md:flex w-full md:w-[320px] lg:w-[340px]
          flex-col md:m-3 md:mr-0 md:rounded-2xl
          bg-[var(--surface)] border border-[var(--border)]
          overflow-hidden absolute md:relative z-20
          h-full md:h-auto md:shrink-0 min-h-0
          ${showContacts ? "animate-contacts-in" : ""}
        `}
      >
        {/* Header */}
        <div className="px-4 pt-4 pb-3 shrink-0 border-b border-[var(--border)]">
          <div className="flex items-center justify-between gap-2">
            <h1
              className="text-xl font-bold text-[var(--foreground)]"
              style={{ fontFamily: "var(--font-display)" }}
            >
              Messages
            </h1>

            <div className="flex items-center gap-2">
              {othersOnlineCount > 0 ? (
                <span className="flex items-center gap-1.5 text-[11px] text-[var(--muted-foreground)]">
                  <span className="relative flex h-1.5 w-1.5">
                    <span className="absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-60 animate-ping" />
                    <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-400" />
                  </span>
                  {othersOnlineCount} online
                </span>
              ) : (
                <span className="text-[11px] text-[var(--muted-foreground)]">
                  Only you
                </span>
              )}

              {/* Mobile close button */}
              <button
                type="button"
                onClick={closeContacts}
                className="md:hidden w-8 h-8 rounded-full flex items-center justify-center text-[var(--muted-foreground)] hover:text-[var(--foreground)] hover:bg-[var(--surface-2)] transition-colors"
                aria-label="Close contacts"
              >
                <X className="h-4 w-4" strokeWidth={2.2} />
              </button>
            </div>
          </div>
        </div>

        {/* Search */}
        <div className="px-3 py-3 shrink-0">
          <div className="relative group">
            <Search
              className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--muted-foreground)] group-focus-within:text-[var(--primary)] transition-colors pointer-events-none"
              strokeWidth={1.8}
            />
            <Input
              type="text"
              placeholder="Search people..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 h-10"
            />
          </div>
        </div>

        {/* List */}
        <div className="flex-1 min-h-0 overflow-y-auto px-1.5 pb-2">
          {conversationRequest.loading &&
            suggestedUserRequest.loading &&
            contacts.length === 0 && (
              <LoadingState message="Loading conversations..." />
            )}

          {!conversationRequest.loading &&
            !suggestedUserRequest.loading &&
            contacts.length === 0 &&
            (conversationRequest.error || suggestedUserRequest.error) && (
              <ErrorState
                message={
                  conversationRequest.error || suggestedUserRequest.error
                }
                onRetry={() => {
                  conversationRequest.retry();
                  suggestedUserRequest.retry();
                }}
              />
            )}

          {filteredUsers.length === 0 &&
            !conversationRequest.loading &&
            !suggestedUserRequest.loading && (
              <div className="py-12 text-center">
                <Search
                  className="w-5 h-5 text-[var(--muted-foreground)] mx-auto mb-2"
                  strokeWidth={1.8}
                />
                <p className="text-xs text-[var(--muted-foreground)]">
                  No one matches
                </p>
              </div>
            )}

          {filteredUsers.map((u, idx) => {
            const isOnline = onlineUsers.includes(u?._id);
            const isSelected = selectedUser?._id === u._id;
            const conversation = getConversationForUser(u._id);

            return (
              <button
                key={u._id}
                onClick={() => {
                  dispatch(setSelectedUser(u));
                  if (window.innerWidth < 768) setShowContacts(false);
                }}
                className={`
                  contact-item
                  w-full flex items-center gap-3 px-2.5 py-2.5 rounded-xl
                  transition-all duration-200 text-left
                  active:scale-[0.98]
                  ${
                    isSelected
                      ? "bg-[var(--surface-2)] shadow-sm"
                      : "hover:bg-[var(--surface-2)]/60"
                  }
                `}
                style={{ animationDelay: `${Math.min(idx * 25, 400)}ms` }}
              >
                <div className="relative shrink-0">
                  <Avatar
                    className={`h-10 w-10 transition-transform duration-300 ${
                      isSelected ? "scale-105" : ""
                    }`}
                  >
                    <AvatarImage src={u?.profilePicture} />
                    <AvatarFallback>
                      {getDisplayName(u, "U").charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>

                  {isOnline && (
                    <span className="absolute bottom-0 right-0 flex h-2.5 w-2.5">
                      <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-emerald-400 ring-2 ring-[var(--surface)]" />
                    </span>
                  )}
                </div>

                <div className="min-w-0 flex-1">
                  <p
                    className={`font-semibold text-sm truncate transition-colors ${
                      isSelected
                        ? "text-[var(--foreground)]"
                        : "text-[var(--foreground)]/90"
                    }`}
                  >
                    {getDisplayName(u)}
                  </p>
                  <p
                    className={`text-[11px] truncate mt-0.5 ${
                      isOnline
                        ? "text-emerald-600 dark:text-emerald-400"
                        : "text-[var(--muted-foreground)]"
                    }`}
                  >
                    {isOnline ? "Active now" : "Offline"}
                  </p>
                </div>

                {conversation?.unreadCount > 0 && !isSelected && (
                  <span
                    className="shrink-0 flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-[10px] font-bold animate-pulse-subtle"
                    style={{
                      background: "var(--primary)",
                      color: "var(--primary-foreground)",
                    }}
                  >
                    {conversation.unreadCount > 99
                      ? "99+"
                      : conversation.unreadCount}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </aside>

      {/* ============ CHAT AREA ============ */}
      {selectedUser ? (
        <section
          className={`
            flex-1 min-h-0 flex flex-col w-full
            md:m-3 md:rounded-2xl bg-[var(--surface)]
            border border-[var(--border)] overflow-hidden
            ${!showContacts ? "animate-chat-in" : ""}
          `}
        >
          {/* Chat header */}
          <div className="flex items-center gap-3 px-3 md:px-4 py-2.5 border-b border-[var(--border)] shrink-0 bg-[var(--surface)]">
            <button
              className="md:hidden w-8 h-8 rounded-full flex items-center justify-center text-[var(--foreground)] hover:bg-[var(--surface-2)] transition-all active:scale-90 shrink-0"
              onClick={() => setShowContacts(true)}
              aria-label="Back to contacts"
            >
              <ArrowLeft className="h-4 w-4" strokeWidth={2} />
            </button>

            <ChatUserMenu user={selectedUser}>
              <span className="flex min-w-0 flex-1 items-center gap-3">
                <span className="relative shrink-0">
                  <Avatar className="h-9 w-9">
                    <AvatarImage src={selectedUser?.profilePicture} />
                    <AvatarFallback>
                      {getDisplayName(selectedUser, "U")
                        .charAt(0)
                        .toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  {onlineUsers.includes(selectedUser?._id) && (
                    <span className="absolute bottom-0 right-0 flex h-2.5 w-2.5">
                      <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-emerald-400 ring-2 ring-[var(--surface)]" />
                    </span>
                  )}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-semibold text-[var(--foreground)]">
                    {getDisplayName(selectedUser)}
                  </span>
                  <span
                    className={`block truncate text-[11px] ${
                      onlineUsers.includes(selectedUser?._id)
                        ? "text-emerald-600 dark:text-emerald-400"
                        : "text-[var(--muted-foreground)]"
                    }`}
                  >
                    {onlineUsers.includes(selectedUser?._id)
                      ? "Active now"
                      : "Offline"}
                  </span>
                </span>
              </span>
            </ChatUserMenu>
          </div>

          {/* Messages */}
          <div className="flex-1 min-h-0 overflow-hidden">
            <Messages
              selectedUser={selectedUser}
              onReplyMessage={setReplyingTo}
            />
          </div>

          {/* Input bar */}
          <div className="border-t border-[var(--border)] px-3 py-3 shrink-0 bg-[var(--surface)]">
            {replyingTo && (
              <div className="mb-2 flex items-center gap-2 rounded-xl border-l-2 border-[var(--primary)] bg-[var(--surface-2)] px-3 py-2 animate-reply-slide-in">
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-semibold text-[var(--primary)]">
                    Replying to{" "}
                    {replyingTo.senderId?.toString() === user?._id?.toString()
                      ? "yourself"
                      : getDisplayName(selectedUser, "User")}
                  </p>
                  <p className="truncate text-xs text-[var(--muted-foreground)] mt-0.5">
                    {replyingTo.message}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setReplyingTo(null)}
                  aria-label="Cancel reply"
                  className="rounded-full p-1.5 text-[var(--muted-foreground)] hover:bg-[var(--surface)] hover:text-[var(--foreground)] transition-all active:scale-90 shrink-0"
                >
                  <X className="h-3.5 w-3.5" strokeWidth={2.2} />
                </button>
              </div>
            )}

            <div className="flex items-center gap-2">
              <div className="relative flex-1 group">
                <Input
                  ref={inputRef}
                  value={textMessage}
                  onChange={messageChangeHandler}
                  placeholder="Write a message..."
                  onKeyPress={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      sendMessageHandler(selectedUser?._id);
                    }
                  }}
                  className="flex-1 pr-12 transition-all duration-200"
                />
                {textMessage.trim() && (
                  <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-[var(--muted-foreground)]/60 font-medium pointer-events-none animate-fade-in">
                    ⏎
                  </span>
                )}
              </div>
              <button
                onClick={() => sendMessageHandler(selectedUser?._id)}
                disabled={!textMessage.trim() || sending}
                aria-label="Send message"
                className={`
                  shrink-0 w-11 h-11 rounded-full
                  flex items-center justify-center
                  transition-all duration-300
                  active:scale-90
                  disabled:cursor-not-allowed
                  ${
                    textMessage.trim() && !sending
                      ? "scale-100 shadow-[0_4px_16px_rgba(34,64,138,0.35)]"
                      : "scale-95 opacity-40"
                  }
                `}
                style={{
                  background: "var(--primary)",
                  color: "var(--primary-foreground)",
                }}
              >
                <Send
                  className={`h-4 w-4 transition-transform duration-300 ${
                    sending ? "translate-x-1 -translate-y-1 opacity-70" : ""
                  }`}
                  strokeWidth={2}
                />
              </button>
            </div>
          </div>
        </section>
      ) : (
        /* ============ EMPTY STATE ============ */
        <section className="hidden md:flex flex-1 flex-col items-center justify-center m-3 rounded-2xl bg-[var(--surface)] border border-[var(--border)] p-8">
          <div className="relative mb-4">
            <span className="absolute inset-0 rounded-full bg-[var(--primary)]/15 blur-2xl animate-pulse" />
            <div className="relative w-16 h-16 rounded-full bg-[var(--surface-2)] flex items-center justify-center">
              <MessageCircle
                className="w-6 h-6 text-[var(--muted-foreground)]"
                strokeWidth={1.8}
              />
            </div>
          </div>
          <h2
            className="text-xl font-bold text-[var(--foreground)] mb-1.5 inline-flex items-center gap-2"
            style={{ fontFamily: "var(--font-display)" }}
          >
            Your messages
            <Sparkles className="h-3.5 w-3.5 text-[var(--primary)]" />
          </h2>
          <p className="text-sm text-[var(--muted-foreground)] max-w-sm text-center leading-relaxed">
            Choose someone from the list to start a conversation. Your messages
            stay in the moment — fast, private, and alive.
          </p>
        </section>
      )}
    </div>
  );
};

export default ChatPage;
