import express from "express";
import isAuthenticated from "../middlewares/isAuthenticated.js";
import upload from "../middlewares/multer.js";
import { createStory, getStoriesForFeed } from "../controllers/story.controller.js";

const router = express.Router();

router.route("/").get(isAuthenticated, getStoriesForFeed);
router.route("/").post(isAuthenticated, upload.single("image"), createStory);

export default router;
