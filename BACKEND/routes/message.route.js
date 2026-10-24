import express from "express";
import isAuthenticated from "../middlewares/isAuthenticated.js";
import upload from "../middlewares/multer.js";
import {
  getConversations,
  getMessage,
  markMessagesAsRead,
  reactToMessage,
  sendMessage,
  deleteMessage,
  toggleStarMessage,
} from "../controllers/message.controller.js";

const router = express.Router();

router.route("/send/:id").post(isAuthenticated, upload.single("file"), sendMessage);
router.route("/delete/:id").post(isAuthenticated, deleteMessage);
router.route("/star/:id").post(isAuthenticated, toggleStarMessage);
router.route("/all/:id").get(isAuthenticated, getMessage);
router.route("/conversations").get(isAuthenticated, getConversations);
router.route("/read/:id").patch(isAuthenticated, markMessagesAsRead);
router.route("/:userId/reaction/:id").patch(isAuthenticated, reactToMessage);

export default router;
