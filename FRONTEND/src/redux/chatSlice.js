import { createSlice } from "@reduxjs/toolkit";

const chatSlice = createSlice({
  name: "chat",
  initialState: {
    onlineUsers: [],
    messages: [],
    reactionNotice: null,
  },
  reducers: {
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
      const message = state.messages.find(
        (item) => item._id === action.payload.messageId,
      );
      if (message) message.status = action.payload.status;
    },
    updateMessageReactions: (state, action) => {
      const message = state.messages.find(
        (item) => item._id === action.payload.messageId,
      );
      if (message) message.reactions = action.payload.reactions;
      if (action.payload.actorId) {
        state.reactionNotice = {
          messageId: action.payload.messageId,
          actorId: action.payload.actorId,
          conversationUserId: action.payload.conversationUserId,
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
} = chatSlice.actions;
export default chatSlice.reducer;
