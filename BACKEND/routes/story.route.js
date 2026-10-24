import express from "express";
import isAuthenticated from "../middlewares/isAuthenticated.js";
import { uploadStory } from "../middlewares/multer.js";
import {
  createStory,
  getStoriesForFeed,
  markStoryViewed,
  reactToStory,
  replyToStory,
  deleteStory,
  getStoryById,
  sharePostToStory,
  voteStoryPoll,
  respondToQuestionSticker,
  createHighlight,
  getUserHighlights,
  getHighlightById,
  addStoryToHighlight,
  deleteHighlight,
  getMyStoriesArchive,
} from "../controllers/story.controller.js";

const router = express.Router();

router.route("/").get(isAuthenticated, getStoriesForFeed);
router.route("/").post(isAuthenticated, uploadStory, createStory);
router.route("/share-post").post(isAuthenticated, sharePostToStory);
router.route("/archive").get(isAuthenticated, getMyStoriesArchive);


/* Highlights routes */
router.route("/highlight").post(isAuthenticated, createHighlight);
router.route("/highlight/:id").get(isAuthenticated, getHighlightById).delete(isAuthenticated, deleteHighlight);
router.route("/highlight/:id/add").post(isAuthenticated, addStoryToHighlight);
router.route("/highlights/user/:userId").get(isAuthenticated, getUserHighlights);

/* Interactive stickers */
router.route("/:id/poll/vote").post(isAuthenticated, voteStoryPoll);
router.route("/:id/question/respond").post(isAuthenticated, respondToQuestionSticker);

/* Story interactions */
router.route("/:id/view").post(isAuthenticated, markStoryViewed);
router.route("/:id/reaction").post(isAuthenticated, reactToStory);
router.route("/:id/reply").post(isAuthenticated, replyToStory);
router.route("/:id").get(isAuthenticated, getStoryById).delete(isAuthenticated, deleteStory);

export default router;
