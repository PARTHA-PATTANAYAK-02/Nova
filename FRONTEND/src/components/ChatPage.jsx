import React, { useEffect, useState, useRef } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import { setSelectedUser } from "@/redux/authSlice";
import { Input } from "./ui/input";
import { MessageCircle, Search, ArrowLeft, Send, Loader2 } from "lucide-react";
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

  // FIX: On mobile, show contacts initially.
  // On desktop, the md:flex class handles the sidebar.
  const [showContacts, setShowContacts] = useState(() => {
    return window.innerWidth < 768;
  });

  const [sending, setSending] = useState(false);

  const typingTimeoutRef = useRef(null);
  const location = useLocation();

  const { user, suggestedUsers, selectedUser } = useSelector(
    (store) => store.auth,
  );

  const { onlineUsers, messages } = useSelector((store) => store.chat);

  const conversationRequest = useGetConversations();
  const dispatch = useDispatch();

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

  /* ---------- SEND MESSAGE ---------- */

  const sendMessageHandler = async (receiverId) => {
    if (!textMessage.trim() || sending) return;

    const socket = getSocketInstance();

    socket?.emit("stopTyping", {
      receiverId,
    });

    clearTimeout(typingTimeoutRef.current);

    try {
      setSending(true);

      const res = await axios.post(
        apiUrl(`/api/v1/message/send/${receiverId}`),
        {
          textMessage: textMessage.trim(),
        },
        {
          withCredentials: true,
        },
      );

      if (res.data.success) {
        dispatch(setMessages([...(messages || []), res.data.newMessage]));

        setTextMessage("");
      }
    } catch (error) {
      toast.error(getErrorMessage(error, "Unable to send your message."));
    } finally {
      setSending(false);
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
      socket.emit("stopTyping", {
        receiverId: selectedUser._id,
      });

      return;
    }

    socket.emit("typing", {
      receiverId: selectedUser._id,
    });

    typingTimeoutRef.current = setTimeout(() => {
      socket.emit("stopTyping", {
        receiverId: selectedUser._id,
      });
    }, 1200);
  };

  /* ---------- CLEANUP TYPING ---------- */

  useEffect(() => {
    return () => {
      clearTimeout(typingTimeoutRef.current);
    };
  }, [selectedUser]);

  /* ---------- CLEANUP SELECTED USER ---------- */

  useEffect(() => {
    return () => {
      dispatch(setSelectedUser(null));
    };
  }, [dispatch]);

  /* ---------- MOBILE CONTACTS ---------- */

  useEffect(() => {
    if (selectedUser && window.innerWidth < 768) {
      setShowContacts(false);
    }
  }, [selectedUser]);

  /* ---------- FILTER USERS ---------- */

  const filteredUsers = suggestedUsers.filter((u) =>
    `${u.fullName || ""} ${u.username}`
      .toLowerCase()
      .includes(searchQuery.toLowerCase()),
  );

  /* ---------- CONVERSATION ---------- */

  const getConversationForUser = (userId) =>
    conversationRequest.conversations.find(
      (conversation) => conversation.user?._id === userId,
    );

  /* ---------- UI ---------- */

  return (
    <div className="relative flex h-screen w-full overflow-hidden">
      {/* ================= CONTACTS PANEL ================= */}

      <aside
        className={`${
          showContacts ? "flex" : "hidden"
        } md:flex w-full md:w-[340px] lg:w-[380px] flex-col md:my-4 md:ml-4 md:mr-2 md:rounded-[28px] glass overflow-hidden absolute md:relative z-20 h-full md:h-auto md:shrink-0`}
      >
        {/* Header */}
        <div className="px-4 md:px-5 pt-5 pb-3 shrink-0">
          <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-white/40">
            Inbox
          </p>

          <div className="mt-1.5 flex items-center justify-between">
            <h1 className="font-display text-2xl font-bold text-white truncate">
              Messages
            </h1>

            {othersOnlineCount > 0 ? (
              <span className="flex items-center gap-1.5 text-[11px] text-white/50">
                <span className="relative flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-60 animate-ping" />

                  <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-400" />
                </span>
                {othersOnlineCount} online
              </span>
            ) : (
              <span className="flex items-center gap-1.5 text-[11px] text-white/35">
                <span className="relative inline-flex h-2 w-2 rounded-full bg-white/25" />
                Only you
              </span>
            )}
          </div>
        </div>

        {/* Search */}
        <div className="px-4 md:px-5 pb-3 shrink-0">
          <div className="relative group">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-white/30 group-focus-within:text-violet-300 transition-colors" />

            <Input
              type="text"
              placeholder="Search people..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 h-10 bg-white/5 border-white/10 text-white placeholder:text-white/30 rounded-xl focus-visible:border-violet-400/50 focus-visible:ring-violet-400/20"
            />
          </div>
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto px-2 pb-3">
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
                <Search className="w-6 h-6 text-white/20 mx-auto mb-2" />

                <p className="text-xs text-white/40">No one matches</p>
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

                  if (window.innerWidth < 768) {
                    setShowContacts(false);
                  }
                }}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-2xl transition-all duration-200 text-left group relative overflow-hidden ${
                  isSelected
                    ? "bg-white/10 border border-white/10"
                    : "hover:bg-white/5 border border-transparent"
                }`}
              >
                {isSelected && (
                  <span className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-6 rounded-r-full bg-gradient-to-b from-violet-400 to-cyan-400" />
                )}

                <div className="relative shrink-0">
                  <Avatar
                    className={`h-11 w-11 ring-2 transition-all ${
                      isSelected ? "ring-violet-400/60" : "ring-white/10"
                    }`}
                  >
                    <AvatarImage src={u?.profilePicture} />

                    <AvatarFallback className="bg-gradient-to-br from-violet-500 to-cyan-500 text-white text-sm font-semibold">
                      {(u?.fullName || u?.username)?.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>

                  {isOnline && (
                    <span className="absolute bottom-0 right-0 flex h-3 w-3">
                      <span className="absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-60 animate-ping" />

                      <span className="relative inline-flex h-3 w-3 rounded-full bg-emerald-400 ring-2 ring-[#0a0a18]" />
                    </span>
                  )}
                </div>

                <div className="min-w-0 flex-1">
                  <p
                    className={`font-semibold text-sm truncate ${
                      isSelected ? "text-white" : "text-white/90"
                    }`}
                  >
                    {u?.fullName || u?.username}
                  </p>

                  <p
                    className={`text-[11px] truncate mt-0.5 ${
                      isOnline ? "text-emerald-300/80" : "text-white/35"
                    }`}
                  >
                    {isOnline ? "Active now" : "Offline"}
                  </p>
                </div>

                {conversation?.unreadCount > 0 && !isSelected && (
                  <span className="shrink-0 flex h-5 min-w-5 items-center justify-center rounded-full bg-gradient-to-br from-violet-500 to-cyan-500 px-1.5 text-[10px] font-bold text-white shadow-[0_0_10px_rgba(124,92,255,0.6)]">
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

      {/* ================= CHAT AREA ================= */}

      {selectedUser ? (
        <section className="flex-1 flex flex-col w-full md:my-4 md:mr-4 md:rounded-[28px] glass overflow-hidden">
          {/* Chat Header */}
          <div className="flex items-center gap-3 px-3 md:px-5 py-3 border-b border-white/8 shrink-0 relative z-10">
            <button
              className="md:hidden w-9 h-9 rounded-full flex items-center justify-center text-white/70 hover:text-white hover:bg-white/8 transition-all shrink-0"
              onClick={() => setShowContacts(true)}
            >
              <ArrowLeft className="h-5 w-5" />
            </button>

            <div className="relative shrink-0">
              <Avatar className="h-10 w-10 ring-2 ring-white/10">
                <AvatarImage src={selectedUser?.profilePicture} />

                <AvatarFallback className="bg-gradient-to-br from-violet-500 to-cyan-500 text-white text-sm font-semibold">
                  {(selectedUser?.fullName || selectedUser?.username)
                    ?.charAt(0)
                    .toUpperCase()}
                </AvatarFallback>
              </Avatar>

              {onlineUsers.includes(selectedUser?._id) && (
                <span className="absolute bottom-0 right-0 flex h-3 w-3">
                  <span className="absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-60 animate-ping" />

                  <span className="relative inline-flex h-3 w-3 rounded-full bg-emerald-400 ring-2 ring-[#0a0a18]" />
                </span>
              )}
            </div>

            <div className="flex-1 min-w-0">
              <p className="font-semibold text-sm text-white truncate">
                {selectedUser?.fullName || selectedUser?.username}
              </p>

              <p
                className={`text-[11px] truncate ${
                  onlineUsers.includes(selectedUser?._id)
                    ? "text-emerald-300/85"
                    : "text-white/40"
                }`}
              >
                {onlineUsers.includes(selectedUser?._id)
                  ? "Active now"
                  : "Offline"}
              </p>
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-hidden">
            <Messages selectedUser={selectedUser} />
          </div>

          {/* Input Bar */}
          <div className="border-t border-white/8 px-3 md:px-5 py-3 shrink-0">
            <div className="flex items-center gap-2">
              <div className="flex-1 relative">
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
                  className="h-11 bg-white/5 border-white/10 text-white placeholder:text-white/30 rounded-2xl focus-visible:border-violet-400/50 focus-visible:ring-violet-400/20"
                />
              </div>

              <button
                onClick={() => sendMessageHandler(selectedUser?._id)}
                disabled={!textMessage.trim() || sending}
                className="shrink-0 w-11 h-11 rounded-full bg-gradient-to-br from-violet-500 to-cyan-500 flex items-center justify-center text-white shadow-[0_0_20px_rgba(124,92,255,0.45)] hover:opacity-90 active:scale-95 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {sending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
              </button>
            </div>
          </div>
        </section>
      ) : (
        /* ================= EMPTY STATE ================= */

        <section className="hidden md:flex flex-1 flex-col items-center justify-center my-4 mr-4 rounded-[28px] glass p-8">
          <div className="relative mb-6">
            <div className="absolute inset-0 rounded-full bg-gradient-to-br from-violet-500 to-cyan-500 opacity-25 blur-2xl animate-pulse" />

            <div className="relative w-20 h-20 rounded-full bg-gradient-to-br from-violet-500/25 to-cyan-500/25 border border-white/10 flex items-center justify-center">
              <MessageCircle className="w-8 h-8 text-white/60" />
            </div>
          </div>

          <h2 className="font-display text-2xl font-bold text-white mb-2">
            Your messages
          </h2>

          <p className="text-white/45 text-sm max-w-sm text-center leading-relaxed">
            Choose someone from the list to start a conversation. Your messages
            stay in the moment — fast, private, and alive.
          </p>
        </section>
      )}
    </div>
  );
};

export default ChatPage;
