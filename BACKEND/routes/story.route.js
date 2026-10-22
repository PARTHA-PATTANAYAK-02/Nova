import express from "express";
import isAuthenticated from "../middlewares/isAuthenticated.js";
import { uploadStory } from "../middlewares/multer.js";
import { createStory, getStoriesForFeed, markStoryViewed, reactToStory, replyToStory, deleteStory, getStoryById } from "../controllers/story.controller.js";

const router = express.Router();

router.route("/").get(isAuthenticated, getStoriesForFeed);
router.route("/").post(isAuthenticated, uploadStory, createStory);
router.route("/:id/view").post(isAuthenticated, markStoryViewed);
router.route("/:id/reaction").post(isAuthenticated, reactToStory);
router.route("/:id/reply").post(isAuthenticated, replyToStory);
router.route("/:id").get(isAuthenticated, getStoryById).delete(isAuthenticated, deleteStory);

export default router;
