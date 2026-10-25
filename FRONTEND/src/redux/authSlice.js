import { createSlice } from "@reduxjs/toolkit";

const initialState = {
  user: null,
  suggestedUsers: [],
  userProfile: null,
  selectedUser: null,
  viewedStoryItemIds: [],
  collections: [],
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

    updatePinnedPosts: (state, action) => {
      if (!state.user) return;
      state.user.pinnedPosts = action.payload;
      if (state.userProfile && state.userProfile._id === state.user._id) {
        state.userProfile.pinnedPosts = action.payload;
      }
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
    updateUserLastSeen: (state, action) => {
      const { userId, lastSeen } = action.payload || {};
      if (!userId) return;
      if (state.selectedUser && state.selectedUser._id?.toString() === userId.toString()) {
        state.selectedUser = {
          ...state.selectedUser,
          lastSeen,
        };
      }
    },
    setCollections: (state, action) => {
      state.collections = action.payload || [];
    },
    addCollection: (state, action) => {
      if (action.payload) {
        state.collections = [
          action.payload,
          ...state.collections.filter((c) => c._id !== action.payload._id),
        ];
      }
    },
    removeCollection: (state, action) => {
      state.collections = state.collections.filter((c) => c._id !== action.payload);
    },
    updateCollectionInList: (state, action) => {
      if (action.payload?._id) {
        state.collections = state.collections.map((c) =>
          c._id === action.payload._id ? action.payload : c
        );
      }
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
  updatePinnedPosts,
  markStoryItemViewed,
  updateUserLastSeen,
  setCollections,
  addCollection,
  removeCollection,
  updateCollectionInList,
} = authSlice.actions;

export default authSlice.reducer;
