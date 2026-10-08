import { createSlice } from "@reduxjs/toolkit";

const initialState = {
  user: null,
  suggestedUsers: [],
  userProfile: null,
  selectedUser: null,
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
      const followedUserId = action.payload;

      if (!state.user) return;

      const following = state.user.following || [];
      const isFollowing = following.includes(followedUserId);

      if (isFollowing) {
        // Unfollow logic
        state.user.following = following.filter(
          (id) => id !== followedUserId,
        );
      } else {
        // Follow logic
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
} = authSlice.actions;

export default authSlice.reducer;
