import React, { useEffect, useState, useRef, useCallback } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { setSelectedUser } from "@/redux/authSlice";
import {
  MessageCircle,
  Search,
  Menu,
  Send,
  X,
  Sparkles,
  Users,
  ChevronLeft,
  ChevronRight,
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

  const location = useLocation();

  // On mobile: always show contacts side panel first unless explicitly opened for a specific user
  const [showContacts, setShowContacts] = useState(() => {
    if (typeof window !== "undefined" && window.innerWidth < 768) {
      return !location.state?.user?._id;
    }
    return true;
  });
  const [collapsed, setCollapsed] = useState(false);

  const typingTimeoutRef = useRef(null);
  const messagesRef = useRef([]);
  const inputRef = useRef(null);

  const isMobileRef = useRef(
    typeof window !== "undefined" && window.innerWidth < 768,
  );
  const isConversationPushedRef = useRef(false);

  const { user, suggestedUsers, selectedUser } = useSelector((s) => s.auth);
  const { onlineUsers, messages } = useSelector((s) => s.chat);

  const conversationRequest = useGetConversations();
  const suggestedUserRequest = useGetSuggestedUsers();
  const dispatch = useDispatch();

  useEffect(() => {
    messagesRef.current = Array.isArray(messages) ? messages : [];
  }, [messages]);

  const othersOnline = (onlineUsers || []).filter((id) => id !== user?._id);
  const othersOnlineCount = othersOnline.length;

  /* ---------- RESIZE LISTENER ---------- */
  useEffect(() => {
    const handleResize = () => {
      const mobile = window.innerWidth < 768;
      isMobileRef.current = mobile;
      if (!mobile) {
        setShowContacts(true);
      }
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  /* ---------- POPSTATE: MOBILE BACK NAVIGATION ---------- */
  useEffect(() => {
    const handlePopState = () => {
      const isMobile = window.innerWidth < 768;
      if (isMobile) {
        if (!showContacts) {
          // If in conversation view on mobile, pressing device back goes to side panel
          setShowContacts(true);
          isConversationPushedRef.current = false;
        }
      }
    };

    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, [showContacts]);

  /* ---------- OPEN CONVERSATION (mobile-history-aware) ---------- */
  const openConversation = useCallback(
    (targetUser) => {
      dispatch(setSelectedUser(targetUser));
      const isMobile = window.innerWidth < 768;
      if (isMobile) {
        if (!isConversationPushedRef.current) {
          window.history.pushState({ novaChatView: "conversation" }, "");
          isConversationPushedRef.current = true;
        }
        setShowContacts(false);
      }
    },
    [dispatch],
  );

  /* ---------- ROUTE CHANGE: ON MOBILE SHOW CONTACTS FIRST ---------- */
  useEffect(() => {
    const isMobile = window.innerWidth < 768;
    if (isMobile) {
      if (location.state?.user?._id) {
        setShowContacts(false);
      } else {
        setShowContacts(true);
      }
    }
  }, [location.pathname, location.key, location.state]);

  /* ---------- CLOSE CONTACTS (mobile) ---------- */
  const closeContacts = useCallback(() => {
    if (selectedUser) {
      const isMobile = window.innerWidth < 768;
      if (isMobile && !isConversationPushedRef.current) {
        window.history.pushState({ novaChatView: "conversation" }, "");
        isConversationPushedRef.current = true;
      }
      setShowContacts(false);
    }
  }, [selectedUser]);

  /* ---------- LOCATION USER ---------- */
  useEffect(() => {
    if (location.state?.user?._id) {
      dispatch(setSelectedUser(location.state.user));
      const isMobile = window.innerWidth < 768;
      if (isMobile) {
        if (!isConversationPushedRef.current) {
          window.history.pushState({ novaChatView: "conversation" }, "");
          isConversationPushedRef.current = true;
        }
        setShowContacts(false);
      }
      window.history.replaceState({}, "", window.location.pathname);
    }
  }, [dispatch, location.state]);

  /* ---------- AUTO SELECT LATEST (desktop only) ---------- */
  useEffect(() => {
    const isMobile = window.innerWidth < 768;
    if (
      !isMobile &&
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

  /* ---------- SEND ---------- */
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

    const tempId = `temp-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
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

  useEffect(() => () => clearTimeout(typingTimeoutRef.current), [selectedUser]);

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

  return (
    <div className="nova-chat">
      {/* ═══════════ CONTACTS PANEL ═══════════ */}
      <aside
        className={`nova-chat__contacts ${showContacts ? "is-open" : ""} ${
          collapsed ? "is-collapsed" : ""
        }`}
      >
        {/* desktop collapse toggle */}
        <button
          type="button"
          className="nova-chat__collapse"
          onClick={() => setCollapsed((v) => !v)}
          aria-label={collapsed ? "Expand contacts" : "Collapse contacts"}
          title={collapsed ? "Expand" : "Collapse"}
        >
          {collapsed ? (
            <ChevronRight className="size-4" strokeWidth={2.4} />
          ) : (
            <ChevronLeft className="size-4" strokeWidth={2.4} />
          )}
        </button>

        <div className="nova-chat__contacts-head">
          <div className="nova-chat__contacts-title-row">
            <h1 className="nova-chat__contacts-title">
              <Sparkles className="size-4" strokeWidth={2.2} />
              <span className="nova-chat__contacts-title-text">Messages</span>
            </h1>

            <div className="nova-chat__contacts-actions">
              {othersOnlineCount > 0 ? (
                <span className="nova-chat__online-pill">
                  <span className="nova-chat__online-dot" />
                  <span>{othersOnlineCount}</span>
                </span>
              ) : (
                <span className="nova-chat__solo-pill">Solo</span>
              )}

              {selectedUser && (
                <button
                  type="button"
                  onClick={closeContacts}
                  className="nova-chat__contacts-close md:hidden"
                  aria-label="Close contacts"
                  title="Close"
                >
                  <X className="size-4" strokeWidth={2.2} />
                </button>
              )}
            </div>
          </div>

          <div className="nova-chat__search">
            <Search className="nova-chat__search-icon" strokeWidth={1.9} />
            <input
              type="text"
              placeholder="Search people…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="nova-chat__search-input"
            />
          </div>
        </div>

        <div className="nova-chat__contacts-list">
          {conversationRequest.loading &&
            suggestedUserRequest.loading &&
            contacts.length === 0 && (
              <LoadingState message="Loading conversations…" />
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
              <div className="nova-chat__empty">
                <div className="nova-chat__empty-orb">
                  <Users className="size-4" strokeWidth={1.8} />
                </div>
                <p className="nova-chat__empty-title">No one matches</p>
                <p className="nova-chat__empty-sub">Try a different search</p>
              </div>
            )}

          {filteredUsers.map((u, idx) => {
            const isOnline = onlineUsers.includes(u?._id);
            const isSelected = selectedUser?._id === u._id;
            const conversation = getConversationForUser(u._id);
            const hasConversation = Boolean(conversation);

            return (
              <button
                key={u._id}
                onClick={() => openConversation(u)}
                className={`nova-chat__contact ${
                  isSelected ? "is-selected" : ""
                }`}
                style={{ animationDelay: `${Math.min(idx * 25, 400)}ms` }}
                title={getDisplayName(u)}
              >
                <span className="nova-chat__contact-avatar">
                  <Avatar className="size-11">
                    <AvatarImage src={u?.profilePicture} />
                    <AvatarFallback>
                      {getDisplayName(u, "U").charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  {isOnline && <span className="nova-chat__status-dot" />}
                </span>

                <span className="nova-chat__contact-meta">
                  <span className="nova-chat__contact-name">
                    {getDisplayName(u)}
                  </span>
                  <span
                    className={`nova-chat__contact-sub ${
                      isOnline ? "is-online" : ""
                    }`}
                  >
                    {isOnline
                      ? "Active now"
                      : hasConversation
                        ? "Tap to chat"
                        : "Suggested"}
                  </span>
                </span>

                {conversation?.unreadCount > 0 && !isSelected && (
                  <span className="nova-chat__unread">
                    {conversation.unreadCount > 99
                      ? "99+"
                      : conversation.unreadCount}
                  </span>
                )}

                {!conversation?.unreadCount &&
                  !isSelected &&
                  hasConversation && (
                    <span className="nova-chat__contact-chevron" aria-hidden>
                      ›
                    </span>
                  )}
              </button>
            );
          })}
        </div>
      </aside>

      {/* ═══════════ CHAT AREA ═══════════ */}
      {selectedUser ? (
        <section
          className={`nova-chat__window ${!showContacts ? "is-visible" : ""}`}
        >
          <div className="nova-chat__window-head">
            <button
              type="button"
              className="nova-chat__menu-btn md:hidden"
              onClick={() => {
                if (isConversationPushedRef.current) {
                  window.history.back();
                } else {
                  setShowContacts(true);
                }
              }}
              aria-label="Open chats menu"
              title="Menu"
            >
              <Menu className="size-5" strokeWidth={2.2} />
            </button>

            <ChatUserMenu user={selectedUser}>
              <span className="nova-chat__window-user">
                <span className="nova-chat__window-avatar">
                  <Avatar className="size-10">
                    <AvatarImage src={selectedUser?.profilePicture} />
                    <AvatarFallback>
                      {getDisplayName(selectedUser, "U")
                        .charAt(0)
                        .toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  {onlineUsers.includes(selectedUser?._id) && (
                    <span className="nova-chat__status-dot" />
                  )}
                </span>
                <span className="nova-chat__window-meta">
                  <span className="nova-chat__window-name">
                    {getDisplayName(selectedUser)}
                  </span>
                  <span
                    className={`nova-chat__window-sub ${
                      onlineUsers.includes(selectedUser?._id) ? "is-online" : ""
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

          <div className="nova-chat__messages">
            <Messages
              selectedUser={selectedUser}
              onReplyMessage={setReplyingTo}
            />
          </div>

          <div className="nova-chat__composer">
            {replyingTo && (
              <div className="nova-chat__reply">
                <span className="nova-chat__reply-bar" aria-hidden />
                <div className="nova-chat__reply-body">
                  <p className="nova-chat__reply-label">
                    Replying to{" "}
                    {replyingTo.senderId?.toString() === user?._id?.toString()
                      ? "yourself"
                      : getDisplayName(selectedUser, "User")}
                  </p>
                  <p className="nova-chat__reply-text">{replyingTo.message}</p>
                </div>
                <button
                  type="button"
                  onClick={() => setReplyingTo(null)}
                  aria-label="Cancel reply"
                  className="nova-chat__reply-close"
                >
                  <X className="size-3.5" strokeWidth={2.4} />
                </button>
              </div>
            )}

            <div className="nova-chat__composer-row">
              <div className="nova-chat__input-wrap">
                <input
                  ref={inputRef}
                  type="text"
                  name="chat-message"
                  autoComplete="off"
                  autoCorrect="on"
                  spellCheck="true"
                  data-form-type="other"
                  value={textMessage}
                  onChange={messageChangeHandler}
                  placeholder="Write a message…"
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      sendMessageHandler(selectedUser?._id);
                    }
                  }}
                  className="nova-chat__input"
                />
              </div>

              <button
                onClick={() => sendMessageHandler(selectedUser?._id)}
                disabled={!textMessage.trim() || sending}
                aria-label="Send message"
                className="nova-chat__send"
              >
                <Send
                  className={`size-4 transition-transform duration-300 ${
                    sending ? "translate-x-1 -translate-y-1 opacity-70" : ""
                  }`}
                  strokeWidth={2.2}
                />
              </button>
            </div>
          </div>
        </section>
      ) : (
        <section className="nova-chat__empty-window">
          <div className="nova-chat__empty-window-orb">
            <MessageCircle className="size-6" strokeWidth={1.8} />
            <span className="nova-chat__empty-window-glow" aria-hidden />
          </div>
          <h2 className="nova-chat__empty-window-title">Your messages</h2>
          <p className="nova-chat__empty-window-sub">
            Pick a conversation to start chatting. Fast, private, and alive.
          </p>
        </section>
      )}
    </div>
  );
};

export default ChatPage;
