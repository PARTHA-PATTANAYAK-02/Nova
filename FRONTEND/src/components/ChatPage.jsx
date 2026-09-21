import React, { useEffect, useState, useRef } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import { setSelectedUser } from "@/redux/authSlice";
import { Input } from "./ui/input";
import { MessageCircle, Search, ArrowLeft, Send } from "lucide-react";
import Messages from "./Messages";
import axios from "axios";
import { setMessages } from "@/redux/chatSlice";
import { getErrorMessage } from "@/lib/utils";
import { toast } from "sonner";
import { getSocketInstance } from "@/redux/socketSlice";
import useGetConversations from "@/hooks/useGetConversations";
import { ErrorState, LoadingState } from "./RequestState";
import { useLocation } from "react-router-dom";
import { apiUrl } from "@/lib/api";

const ChatPage = () => {
  const [textMessage, setTextMessage] = useState("");
  const [searchQuery, setSearchQuery] = useState("");

  const [showContacts, setShowContacts] = useState(() => {
    return window.innerWidth < 768;
  });

  const typingTimeoutRef = useRef(null);
  const messagesRef = useRef([]);
  const location = useLocation();

  const { user, suggestedUsers, selectedUser } = useSelector(
    (store) => store.auth,
  );

  const { onlineUsers, messages } = useSelector((store) => store.chat);

  const conversationRequest = useGetConversations();
  const dispatch = useDispatch();

  /* ---------- SYNC REF WITH REDUX STATE ---------- */
  useEffect(() => {
    messagesRef.current = Array.isArray(messages) ? messages : [];
  }, [messages]);

  /* ---------- SELF-FILTERED ONLINE COUNT ---------- */
  const othersOnline = (onlineUsers || []).filter((id) => id !== user?._id);
  const othersOnlineCount = othersOnline.length;

  /* ---------- LOCATION USER ---------- */
  useEffect(() => {
    if (location.state?.user?._id) {
      dispatch(setSelectedUser(location.state.user));
      window.history.replaceState({}, "", window.location.pathname);
    }
  }, [dispatch, location.state]);

  /* ---------- SEND MESSAGE — OPTIMISTIC ---------- */
  const sendMessageHandler = async (receiverId) => {
    const text = textMessage.trim();
    if (!text || !receiverId || !user?._id) return;

    const socket = getSocketInstance();
    socket?.emit("stopTyping", { receiverId });
    clearTimeout(typingTimeoutRef.current);

    // 1) Build optimistic message
    const tempId = `temp-${Date.now()}-${Math.random()
      .toString(36)
      .slice(2, 7)}`;
    const optimisticMsg = {
      _id: tempId,
      senderId: user._id,
      receiverId,
      message: text,
      createdAt: new Date().toISOString(),
      status: "sending",
      __optimistic: true,
    };

    // 2) INSTANT UI update (synchronous ref + redux dispatch)
    const currentList = messagesRef.current || [];
    const nextList = [...currentList, optimisticMsg];
    messagesRef.current = nextList;
    dispatch(setMessages(nextList));

    // 3) Clear input instantly
    setTextMessage("");

    // 4) Background API call
    try {
      const res = await axios.post(
        apiUrl(`/api/v1/message/send/${receiverId}`),
        { textMessage: text },
        { withCredentials: true },
      );

      if (res.data.success) {
        const realMsg = res.data.newMessage || res.data.message;

        if (realMsg?._id) {
          const latest = messagesRef.current || [];
          const hasReal = latest.some((m) => m._id === realMsg._id);

          let updated;
          if (hasReal) {
            // Socket already delivered the real message — just drop the temp
            updated = latest.filter((m) => m._id !== tempId);
          } else {
            // Replace temp with real
            updated = latest.map((m) =>
              m._id === tempId
                ? { ...realMsg, status: realMsg.status || "sent" }
                : m,
            );
          }
          messagesRef.current = updated;
          dispatch(setMessages(updated));
        }
      }
    } catch (error) {
      // Rollback: remove temp message, restore text
      const latest = messagesRef.current || [];
      const updated = latest.filter((m) => m._id !== tempId);
      messagesRef.current = updated;
      dispatch(setMessages(updated));
      setTextMessage(text);
      toast.error(getErrorMessage(error, "Unable to send your message."));
    }
  };

  /* ---------- TYPING ---------- */
  const messageChangeHandler = (event) => {
    const nextMessage = event.target.value;
    setTextMessage(nextMessage);

    const socket = getSocketInstance();
    if (!selectedUser || !socket) return;

    clearTimeout(typingTimeoutRef.current);

    if (!nextMessage.trim()) {
      socket.emit("stopTyping", { receiverId: selectedUser._id });
      return;
    }

    socket.emit("typing", { receiverId: selectedUser._id });
    typingTimeoutRef.current = setTimeout(() => {
      socket.emit("stopTyping", { receiverId: selectedUser._id });
    }, 1200);
  };

  useEffect(() => {
    return () => {
      clearTimeout(typingTimeoutRef.current);
    };
  }, [selectedUser]);

  useEffect(() => {
    return () => {
      dispatch(setSelectedUser(null));
    };
  }, [dispatch]);

  useEffect(() => {
    if (selectedUser && window.innerWidth < 768) {
      setShowContacts(false);
    }
  }, [selectedUser]);

  const filteredUsers = suggestedUsers.filter((u) =>
    `${u.fullName || ""} ${u.username}`
      .toLowerCase()
      .includes(searchQuery.toLowerCase()),
  );

  const getConversationForUser = (userId) =>
    conversationRequest.conversations.find(
      (conversation) => conversation.user?._id === userId,
    );

  /* ---------- UI ---------- */
  return (
    <div className="relative flex h-screen w-full overflow-hidden bg-[var(--background)]">
      {/* ============ CONTACTS PANEL ============ */}
      <aside
        className={`
          ${showContacts ? "flex" : "hidden"}
          md:flex w-full md:w-[320px] lg:w-[340px]
          flex-col md:m-3 md:mr-0 md:rounded-2xl
          bg-[var(--surface)] border border-[var(--border)]
          overflow-hidden absolute md:relative z-20
          h-full md:h-auto md:shrink-0 min-h-0
        `}
      >
        {/* Header */}
        <div className="px-4 pt-4 pb-3 shrink-0 border-b border-[var(--border)]">
          <div className="flex items-center justify-between">
            <h1
              className="text-xl font-bold text-[var(--foreground)]"
              style={{ fontFamily: "var(--font-display)" }}
            >
              Messages
            </h1>

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
          </div>
        </div>

        {/* Search */}
        <div className="px-3 py-3 shrink-0">
          <div className="relative">
            <Search
              className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--muted-foreground)] pointer-events-none"
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
          {conversationRequest.loading && suggestedUsers.length === 0 && (
            <LoadingState message="Loading conversations..." />
          )}

          {conversationRequest.error && suggestedUsers.length === 0 && (
            <ErrorState
              message={conversationRequest.error}
              onRetry={conversationRequest.retry}
            />
          )}

          {filteredUsers.length === 0 &&
            !conversationRequest.loading &&
            suggestedUsers.length > 0 && (
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

          {filteredUsers.map((u) => {
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
                className={`w-full flex items-center gap-3 px-2.5 py-2 rounded-xl transition-colors text-left ${
                  isSelected
                    ? "bg-[var(--surface-2)]"
                    : "hover:bg-[var(--surface-2)]"
                }`}
              >
                <div className="relative shrink-0">
                  <Avatar className="h-10 w-10">
                    <AvatarImage src={u?.profilePicture} />
                    <AvatarFallback>
                      {(u?.fullName || u?.username)?.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>

                  {isOnline && (
                    <span className="absolute bottom-0 right-0 flex h-2.5 w-2.5">
                      <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-emerald-400 ring-2 ring-[var(--surface)]" />
                    </span>
                  )}
                </div>

                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-sm text-[var(--foreground)] truncate">
                    {u?.fullName || u?.username}
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
                    className="shrink-0 flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-[10px] font-bold"
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
        <section className="flex-1 min-h-0 flex flex-col w-full md:m-3 md:rounded-2xl bg-[var(--surface)] border border-[var(--border)] overflow-hidden">
          {/* Chat header */}
          <div className="flex items-center gap-3 px-3 md:px-4 py-2.5 border-b border-[var(--border)] shrink-0">
            <button
              className="md:hidden w-8 h-8 rounded-full flex items-center justify-center text-[var(--foreground)] hover:bg-[var(--surface-2)] transition-colors shrink-0"
              onClick={() => setShowContacts(true)}
              aria-label="Back"
            >
              <ArrowLeft className="h-4 w-4" strokeWidth={2} />
            </button>

            <div className="relative shrink-0">
              <Avatar className="h-9 w-9">
                <AvatarImage src={selectedUser?.profilePicture} />
                <AvatarFallback>
                  {(selectedUser?.fullName || selectedUser?.username)
                    ?.charAt(0)
                    .toUpperCase()}
                </AvatarFallback>
              </Avatar>

              {onlineUsers.includes(selectedUser?._id) && (
                <span className="absolute bottom-0 right-0 flex h-2.5 w-2.5">
                  <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-emerald-400 ring-2 ring-[var(--surface)]" />
                </span>
              )}
            </div>

            <div className="flex-1 min-w-0">
              <p className="font-semibold text-sm text-[var(--foreground)] truncate">
                {selectedUser?.fullName || selectedUser?.username}
              </p>
              <p
                className={`text-[11px] truncate ${
                  onlineUsers.includes(selectedUser?._id)
                    ? "text-emerald-600 dark:text-emerald-400"
                    : "text-[var(--muted-foreground)]"
                }`}
              >
                {onlineUsers.includes(selectedUser?._id)
                  ? "Active now"
                  : "Offline"}
              </p>
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 min-h-0 overflow-hidden">
            <Messages selectedUser={selectedUser} />
          </div>

          {/* Input bar */}
          <div className="border-t border-[var(--border)] px-3 py-3 shrink-0">
            <div className="flex items-center gap-2">
              <Input
                value={textMessage}
                onChange={messageChangeHandler}
                placeholder="Write a message..."
                onKeyPress={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    sendMessageHandler(selectedUser?._id);
                  }
                }}
                className="flex-1"
              />
              <button
                onClick={() => sendMessageHandler(selectedUser?._id)}
                disabled={!textMessage.trim()}
                className="shrink-0 w-11 h-11 rounded-full flex items-center justify-center transition-all active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed"
                style={{
                  background: "var(--primary)",
                  color: "var(--primary-foreground)",
                }}
              >
                <Send className="h-4 w-4" strokeWidth={2} />
              </button>
            </div>
          </div>
        </section>
      ) : (
        /* ============ EMPTY STATE ============ */
        <section className="hidden md:flex flex-1 flex-col items-center justify-center m-3 rounded-2xl bg-[var(--surface)] border border-[var(--border)] p-8">
          <div className="w-16 h-16 rounded-full bg-[var(--surface-2)] flex items-center justify-center mb-4">
            <MessageCircle
              className="w-6 h-6 text-[var(--muted-foreground)]"
              strokeWidth={1.8}
            />
          </div>
          <h2
            className="text-xl font-bold text-[var(--foreground)] mb-1.5"
            style={{ fontFamily: "var(--font-display)" }}
          >
            Your messages
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
