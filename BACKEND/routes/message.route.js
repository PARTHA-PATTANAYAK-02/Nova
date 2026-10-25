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
  deleteMultipleMessages,
  clearConversationMessages,
  togglePinMessage,
  forwardMessages,
  getStarredMessages,
} from "../controllers/message.controller.js";

const router = express.Router();

router.route("/send/:id").post(isAuthenticated, upload.single("file"), sendMessage);
router.route("/forward").post(isAuthenticated, forwardMessages);
router.route("/delete-multiple").post(isAuthenticated, deleteMultipleMessages);
router.route("/delete/:id").post(isAuthenticated, deleteMessage);
router
  .route("/clear/:userId")
  .delete(isAuthenticated, clearConversationMessages)
  .post(isAuthenticated, clearConversationMessages);
router
  .route("/conversation/:userId/clear")
  .delete(isAuthenticated, clearConversationMessages)
  .post(isAuthenticated, clearConversationMessages);
router.route("/pin/:userId/:messageId").post(isAuthenticated, togglePinMessage);
router.route("/star/:id").post(isAuthenticated, toggleStarMessage);
router.route("/starred").get(isAuthenticated, getStarredMessages);
router.route("/starred/:userId").get(isAuthenticated, getStarredMessages);
router.route("/all/:id").get(isAuthenticated, getMessage);
router.route("/conversations").get(isAuthenticated, getConversations);
router.route("/read/:id").patch(isAuthenticated, markMessagesAsRead);
router.route("/:userId/reaction/:id").patch(isAuthenticated, reactToMessage);

export default router;
