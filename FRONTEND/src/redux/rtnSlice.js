import { createSlice } from "@reduxjs/toolkit";

const MODAL_MAX_CAPACITY = 100;

const rtnSlice = createSlice({
  name: "realTimeNotification",
  initialState: {
    likeNotification: [], // Latest 100 notifications for modal / quick view
    unreadCount: 0,
  },
  reducers: {
    setLikeNotification: (state, action) => {
      const notification = action.payload;
      if (notification.type === "dislike") return;

      const notificationId =
        notification.notificationId ||
        `${notification.type}-${notification.userId}-${notification.postId || notification.messageId || Date.now()}`;

      if (notification.repeat) {
        state.likeNotification = state.likeNotification.filter(
          (item) => item._id !== notificationId
        );
        state.likeNotification.unshift({
          ...notification,
          read: false,
          _id: notificationId,
        });
        state.unreadCount += 1;
      } else if (!state.likeNotification.some((item) => item._id === notificationId)) {
        state.likeNotification.unshift({
          ...notification,
          _id: notificationId,
        });
        state.unreadCount += 1;
      }

      // FIFO CAP: Keep latest 100 notifications in modal
      if (state.likeNotification.length > MODAL_MAX_CAPACITY) {
        state.likeNotification = state.likeNotification.slice(0, MODAL_MAX_CAPACITY);
      }
    },
    setNotifications: (state, action) => {
      // Set modal list with max 100
      state.likeNotification = (action.payload.notifications || []).slice(
        0,
        MODAL_MAX_CAPACITY
      );
      state.unreadCount = state.likeNotification.filter((item) => !item.read).length;
    },
    markNotificationsRead: (state) => {
      state.unreadCount = 0;
      state.likeNotification = state.likeNotification.map((item) => ({
        ...item,
        read: true,
      }));
    },
    // Dismiss only from modal view (still kept in Notification Center)
    dismissModalNotification: (state, action) => {
      state.likeNotification = state.likeNotification.filter(
        (item) => item._id !== action.payload
      );
      state.unreadCount = state.likeNotification.filter((item) => !item.read).length;
    },
    dismissAllModalNotifications: (state) => {
      state.likeNotification = [];
      state.unreadCount = 0;
    },
    // Permanent deletion (from Notification Center)
    clearNotifications: (state) => {
      state.likeNotification = [];
      state.unreadCount = 0;
    },
    removeNotification: (state, action) => {
      state.likeNotification = state.likeNotification.filter(
        (item) => item._id !== action.payload
      );
      state.unreadCount = state.likeNotification.filter((item) => !item.read).length;
    },
    removeConversationNotifications: (state, action) => {
      const userId = action.payload?.userId?.toString();
      const conversationId = action.payload?.conversationId?.toString();
      state.likeNotification = state.likeNotification.filter((item) => {
        if (item.type !== "message") return true;
        if (conversationId && item.conversationId?.toString() === conversationId) {
          return false;
        }
        return !userId || item.userId?.toString() !== userId;
      });
      state.unreadCount = state.likeNotification.filter((item) => !item.read).length;
    },
  },
});

export const {
  setLikeNotification,
  setNotifications,
  markNotificationsRead,
  dismissModalNotification,
  dismissAllModalNotifications,
  clearNotifications,
  removeNotification,
  removeConversationNotifications,
} = rtnSlice.actions;

export default rtnSlice.reducer;
