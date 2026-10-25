import express from "express";
import isAuthenticated from "../middlewares/isAuthenticated.js";
import { uploadPost } from "../middlewares/multer.js";
import {
  addComment,
  addNewPost,
  bookmarkPost,
  deletePost,
  dislikePost,
  getAllPost,
  getCommentsOfPost,
  getExploreFeed,
  getPostById,
  getPostsByTag,
  getUserPost,
  likePost,
  togglePinPost,
  toggleRepost,
  quotePost,
  toggleLikeComment,
} from "../controllers/post.controller.js";

const router = express.Router();

router
  .route("/addpost")
  .post(isAuthenticated, uploadPost, addNewPost);
router.route("/all").get(isAuthenticated, getAllPost);
router.route("/explore").get(isAuthenticated, getExploreFeed);
router.route("/tag/:tag").get(isAuthenticated, getPostsByTag);
router.route("/:id/detail").get(isAuthenticated, getPostById);
router.route("/userpost/all").get(isAuthenticated, getUserPost);
router.route("/:id/like").get(isAuthenticated, likePost);
router.route("/:id/dislike").get(isAuthenticated, dislikePost);
router.route("/comment/:id/like").get(isAuthenticated, toggleLikeComment).post(isAuthenticated, toggleLikeComment);
router.route("/:id/pin").get(isAuthenticated, togglePinPost).post(isAuthenticated, togglePinPost);
router.route("/:id/repost").get(isAuthenticated, toggleRepost).post(isAuthenticated, toggleRepost);
router.route("/:id/quote").post(isAuthenticated, quotePost);
router.route("/:id/comment").post(isAuthenticated, addComment);
router.route("/:id/comment/all").post(isAuthenticated, getCommentsOfPost);
router.route("/delete/:id").delete(isAuthenticated, deletePost);
router.route("/:id/bookmark").get(isAuthenticated, bookmarkPost);
router.route("/:id").get(isAuthenticated, getPostById);

export default router;
