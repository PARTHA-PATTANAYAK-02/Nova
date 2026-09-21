import { createSlice } from "@reduxjs/toolkit";
const postSlice = createSlice({
  name: "post",
  initialState: {
    posts: [],
    selectedPost: null,
  },
  reducers: {
    //actions
    setPosts: (state, action) => {
      state.posts = action.payload;
    },
    appendPosts: (state, action) => {
      const existingIds = new Set(state.posts.map((post) => post._id));
      state.posts.push(
        ...action.payload.filter((post) => !existingIds.has(post._id)),
      );
    },
    setSelectedPost: (state, action) => {
      state.selectedPost = action.payload;
    },
    // Replace a post in place with the fresh version pushed over the socket.
    updatePost: (state, action) => {
      const updated = action.payload;
      const index = state.posts.findIndex((p) => p._id === updated._id);
      if (index !== -1) {
        state.posts[index] = updated;
      } else {
        state.posts.unshift(updated);
      }
      if (state.selectedPost?._id === updated._id) {
        state.selectedPost = updated;
      }
    },
    appendPost: (state, action) => {
      const post = action.payload;
      if (!state.posts.some((p) => p._id === post._id)) {
        state.posts.unshift(post);
      }
    },
    removePost: (state, action) => {
      state.posts = state.posts.filter((p) => p._id !== action.payload);
      if (state.selectedPost?._id === action.payload) {
        state.selectedPost = null;
      }
    },
  },
});
export const {
  setPosts,
  appendPosts,
  setSelectedPost,
  updatePost,
  appendPost,
  removePost,
} = postSlice.actions;
export default postSlice.reducer;
