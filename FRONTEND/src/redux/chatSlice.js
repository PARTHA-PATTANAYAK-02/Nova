import { createSlice } from "@reduxjs/toolkit";

const chatSlice = createSlice({
  name: "chat",
  initialState: {
    onlineUsers: [],
    messages: [],
    pinnedMessage: null,
    reactionNotice: null,
    typingUsers: {}, // { [chatId]: [ { userId, fullName, username } ] }
  },
  reducers: {
    setPinnedMessage: (state, action) => {
      state.pinnedMessage = action.payload;
    },
    // actions
    setOnlineUsers: (state, action) => {
      state.onlineUsers = action.payload;
    },
    setMessages: (state, action) => {
      state.messages = action.payload;
    },
    prependMessages: (state, action) => {
      const existingIds = new Set(state.messages.map((message) => message._id));
      const olderMessages = (action.payload || []).filter(
        (message) => !existingIds.has(message._id),
      );
      state.messages = [...olderMessages, ...state.messages];
    },
    appendMessage: (state, action) => {
      if (
        !state.messages.some((message) => message._id === action.payload._id)
      ) {
        state.messages.push(action.payload);
      }
    },
    updateMessageStatus: (state, action) => {
      const targetId = (action.payload?.messageId || action.payload?._id)?.toString();
      const message = state.messages.find(
        (item) => (item._id || item.id)?.toString() === targetId,
      );
      if (message) message.status = action.payload.status;
    },
    updateMessageReactions: (state, action) => {
      const targetId = (action.payload?.messageId || action.payload?._id)?.toString();
      const message = state.messages.find(
        (item) => (item._id || item.id)?.toString() === targetId,
      );
      if (message) message.reactions = action.payload.reactions || [];
      if (action.payload?.actorId) {
        state.reactionNotice = {
          messageId: targetId,
          actorId: action.payload.actorId?.toString(),
          actorName: action.payload.actorName,
          actor: action.payload.actor,
          conversationUserId: action.payload.conversationUserId?.toString(),
          emoji: action.payload.emoji,
          timestamp: action.payload.timestamp || Date.now(),
        };
      }
    },
    clearReactionNotice: (state) => {
      state.reactionNotice = null;
    },
    markStoryAsUnavailable: (state, action) => {
      const { storyId, isDeleted } = action.payload || {};
      if (!storyId) return;
      state.messages = state.messages.map((m) => {
        if (m.storyRef && m.storyRef.storyId?.toString() === storyId?.toString()) {
          return {
            ...m,
            storyRef: {
              ...m.storyRef,
              image: null,
              isUnavailable: true,
              isDeleted: Boolean(isDeleted),
            },
          };
        }
        return m;
      });
    },
    deleteMessageForMe: (state, action) => {
      const messageId = action.payload?.messageId || action.payload;
      if (!messageId) return;
      state.messages = state.messages.filter(
        (m) => m._id?.toString() !== messageId.toString(),
      );
    },
    markMessagesAsSeenByReader: (state, action) => {
      const readerId = action.payload?.readerId || action.payload;
      if (!readerId) return;
      state.messages = state.messages.map((m) => {
        const receiverId = typeof m.receiverId === "object" ? m.receiverId?._id : m.receiverId;
        if (receiverId?.toString() === readerId.toString() && m.status !== "seen") {
          return { ...m, status: "seen" };
        }
        return m;
      });
    },
    deleteMessageForEveryone: (state, action) => {
      const { messageId, deletedAt } = action.payload || {};
      if (!messageId) return;
      state.messages = state.messages.map((m) => {
        if (m._id?.toString() === messageId.toString()) {
          return {
            ...m,
            isDeletedForEveryone: true,
            message: "This message was deleted",
            mediaUrl: "",
            mediaType: "text",
            storyRef: null,
            reactions: [],
            deletedAt: deletedAt || new Date().toISOString(),
          };
        }
        return m;
      });
    },
    deleteMultipleMessagesForMe: (state, action) => {
      const messageIds = new Set((action.payload || []).map((id) => id?.toString()));
      state.messages = state.messages.filter((m) => !messageIds.has(m._id?.toString()));
    },
    clearAllMessages: (state) => {
      state.messages = [];
    },
    toggleStarMessageLocal: (state, action) => {
      const { messageId, userId } = action.payload || {};
      if (!messageId || !userId) return;
      const message = state.messages.find((m) => m._id?.toString() === messageId.toString());
      if (message) {
        if (!message.starredBy) message.starredBy = [];
        const uidStr = userId.toString();
        const hasStarred = message.starredBy.some((id) => id?.toString() === uidStr);
        if (hasStarred) {
          message.starredBy = message.starredBy.filter((id) => id?.toString() !== uidStr);
        } else {
          message.starredBy.push(userId);
        }
      }
    },
    setUserTyping: (state, action) => {
      const { chatId, user } = action.payload || {};
      const uidStr = (user?.userId || user?._id)?.toString();
      if (!chatId || !uidStr) return;
      const cidStr = chatId.toString();
      const current = state.typingUsers[cidStr] || [];
      const index = current.findIndex((u) => (u?.userId || u?._id)?.toString() === uidStr);
      const cleanUser = {
        userId: uidStr,
        fullName: user.fullName || "",
        username: user.username || "",
        profilePicture: user.profilePicture || "",
      };
      if (index === -1) {
        state.typingUsers[cidStr] = [...current, cleanUser];
      } else {
        const updated = [...current];
        updated[index] = { ...updated[index], ...cleanUser };
        state.typingUsers[cidStr] = updated;
      }
    },
    setUserStoppedTyping: (state, action) => {
      const { chatId, userId } = action.payload || {};
      const uidStr = (userId || action.payload)?.toString();
      if (!chatId || !uidStr) return;
      const cidStr = chatId.toString();
      const current = state.typingUsers[cidStr] || [];
      const filtered = current.filter((u) => (u?.userId || u?._id)?.toString() !== uidStr);
      if (filtered.length === 0) {
        delete state.typingUsers[cidStr];
      } else {
        state.typingUsers[cidStr] = filtered;
      }
    },
    clearTypingForChat: (state, action) => {
      const chatId = action.payload?.toString();
      if (chatId && state.typingUsers[chatId]) {
        delete state.typingUsers[chatId];
      }
    },
  },
});
export const {
  setOnlineUsers,
  setMessages,
  prependMessages,
  appendMessage,
  updateMessageStatus,
  updateMessageReactions,
  clearReactionNotice,
  markStoryAsUnavailable,
  deleteMessageForMe,
  deleteMultipleMessagesForMe,
  clearAllMessages,
  markMessagesAsSeenByReader,
  deleteMessageForEveryone,
  toggleStarMessageLocal,
  setPinnedMessage,
  setUserTyping,
  setUserStoppedTyping,
  clearTypingForChat,
} = chatSlice.actions;
export default chatSlice.reducer;
