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
  },
});
export const {
  setOnlineUsers,
  setMessages,
  appendMessage,
  updateMessageStatus,
  updateMessageReactions,
} = chatSlice.actions;
export default chatSlice.reducer;
