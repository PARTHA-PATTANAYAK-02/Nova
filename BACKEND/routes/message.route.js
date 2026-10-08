import express from "express";
import isAuthenticated from "../middlewares/isAuthenticated.js";
import upload from "../middlewares/multer.js";
import {
  getConversations,
  getMessage,
  markMessagesAsRead,
  reactToMessage,
  sendMessage,
} from "../controllers/message.controller.js";

const router = express.Router();

router.route("/send/:id").post(isAuthenticated, sendMessage);
router.route("/all/:id").get(isAuthenticated, getMessage);
router.route("/conversations").get(isAuthenticated, getConversations);
router.route("/read/:id").patch(isAuthenticated, markMessagesAsRead);
router.route("/:userId/reaction/:id").patch(isAuthenticated, reactToMessage);

export default router;
