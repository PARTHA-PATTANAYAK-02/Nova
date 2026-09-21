import express from "express";
import {
  editProfile,
  followOrUnfollow,
  getProfile,
  getSuggestedUsers,
  login,
  logout,
  register,
  searchUsers,
} from "../controllers/user.controller.js";
import isAuthenticated from "../middlewares/isAuthenticated.js";
import upload from "../middlewares/multer.js";
import {
  clearNotifications,
  getNotifications,
  markNotificationsRead,
  removeNotification,
} from "../controllers/notification.controller.js";

const router = express.Router();

router.route("/register").post(register);
router.route("/login").post(login);
router.route("/logout").get(logout);
router.route("/:id/profile").get(isAuthenticated, getProfile);
router
  .route("/profile/edit")
  .post(isAuthenticated, upload.single("profilePhoto"), editProfile);
router.route("/suggested").get(isAuthenticated, getSuggestedUsers);
router.route("/search").get(isAuthenticated, searchUsers);
router.route("/followorunfollow/:id").post(isAuthenticated, followOrUnfollow);
router.route("/notifications").get(isAuthenticated, getNotifications);
router
  .route("/notifications/read")
  .patch(isAuthenticated, markNotificationsRead);
router
  .route("/notifications/clear")
  .delete(isAuthenticated, clearNotifications);
router.route("/notifications/:id").delete(isAuthenticated, removeNotification);

export default router;
