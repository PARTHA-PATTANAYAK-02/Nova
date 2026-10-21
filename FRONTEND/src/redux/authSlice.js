import { createSlice } from "@reduxjs/toolkit";

const initialState = {
  user: null,
  suggestedUsers: [],
  userProfile: null,
  selectedUser: null,
  viewedStoryItemIds: [],
};

const authSlice = createSlice({
  name: "auth",
  initialState,
  reducers: {
    // ✅ Set logged in user
    setAuthUser: (state, action) => {
      if (!action.payload) return initialState;
      state.user = action.payload;
    },

    // ✅ Update following list after follow/unfollow
    updateFollowing: (state, action) => {
      const followedUserId = (action.payload?._id || action.payload)?.toString();
      if (!state.user || !followedUserId) return;

      const following = state.user.following || [];
      const isFollowing = following.some(
        (id) => (id?._id || id)?.toString() === followedUserId,
      );

      if (isFollowing) {
        state.user.following = following.filter(
          (id) => (id?._id || id)?.toString() !== followedUserId,
        );
      } else {
        state.user.following.push(followedUserId);
      }
    },

    updateBookmarks: (state, action) => {
      if (!state.user) return;

      const postId = action.payload.postId;
      const currentBookmarks = state.user.bookmarks || [];
      const isBookmarked = currentBookmarks.some(
        (bookmark) => (bookmark?._id || bookmark) === postId,
      );

      state.user.bookmarks = isBookmarked
        ? currentBookmarks.filter(
            (bookmark) => (bookmark?._id || bookmark) !== postId,
          )
        : [...currentBookmarks, postId];
    },

    // Mark story item as globally viewed
    markStoryItemViewed: (state, action) => {
      const id = String(action.payload);
      if (id && !state.viewedStoryItemIds.includes(id)) {
        state.viewedStoryItemIds.push(id);
      }
    },

    // Other reducers
    setSuggestedUsers: (state, action) => {
      state.suggestedUsers = action.payload;
    },
    setUserProfile: (state, action) => {
      state.userProfile = action.payload;
    },
    setSelectedUser: (state, action) => {
      state.selectedUser = action.payload;
    },
  },
});

// ✅ Export actions including the new one
export const {
  setAuthUser,
  updateFollowing,
  setSuggestedUsers,
  setUserProfile,
  setSelectedUser,
  updateBookmarks,
  markStoryItemViewed,
} = authSlice.actions;

export default authSlice.reducer;
