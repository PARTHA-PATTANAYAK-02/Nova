import { createSlice } from "@reduxjs/toolkit";

const rtnSlice = createSlice({
  name: "realTimeNotification",
  initialState: {
    likeNotification: [],
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
        // Repeated action (e.g. like again on the same post) - it was removed
        // from the list before, so add it fresh. Always bump the unread count.
        state.likeNotification = state.likeNotification.filter(
          (item) => item._id !== notificationId,
        );
        state.likeNotification.unshift({
          ...notification,
          read: false,
          _id: notificationId,
        });
        state.unreadCount += 1;
        return;
      }

      if (!state.likeNotification.some((item) => item._id === notificationId)) {
        state.likeNotification.unshift({
          ...notification,
          _id: notificationId,
        });
        state.unreadCount += 1;
      }
    },
    setNotifications: (state, action) => {
      state.likeNotification = action.payload.notifications || [];
      state.unreadCount = state.likeNotification.filter(
        (item) => !item.read,
      ).length;
    },
    markNotificationsRead: (state) => {
      state.unreadCount = 0;
    },
    clearNotifications: (state) => {
      state.likeNotification = [];
      state.unreadCount = 0;
    },
    removeNotification: (state, action) => {
      state.likeNotification = state.likeNotification.filter(
        (item) => item._id !== action.payload,
      );
    },
  },
});

export const {
  setLikeNotification,
  setNotifications,
  markNotificationsRead,
  clearNotifications,
  removeNotification,
} = rtnSlice.actions;
export default rtnSlice.reducer;
