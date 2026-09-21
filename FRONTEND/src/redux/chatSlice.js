import { createSlice } from "@reduxjs/toolkit";

const chatSlice = createSlice({
  name: "chat",
  initialState: {
    onlineUsers: [],
    messages: [],
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
  },
});
export const {
  setOnlineUsers,
  setMessages,
  appendMessage,
  updateMessageStatus,
} = chatSlice.actions;
export default chatSlice.reducer;
