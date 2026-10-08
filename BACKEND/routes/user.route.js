import express from "express";
import {
  editProfile,
  deleteAccount,
  checkUsernameAvailability,
  followOrUnfollow,
  getCurrentUser,
  getProfile,
  getSuggestedUsers,
  login,
  logout,
  register,
  requestPasswordResetOtp,
  requestRegistrationOtp,
  resetPasswordWithOtp,
  searchUsers,
  verifyPasswordResetOtp,
  verifyRegistrationOtp,
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

// Account creation is intentionally split so a user cannot be persisted until
// their deliverable email has completed the OTP step.
router.route("/register/request-otp").post(requestRegistrationOtp);
router.route("/register/verify-otp").post(verifyRegistrationOtp);
router.route("/register").post(register);
router.route("/login").post(login);
router.route("/me").get(isAuthenticated, getCurrentUser);
router.route("/password/request-otp").post(requestPasswordResetOtp);
router.route("/password/verify-otp").post(verifyPasswordResetOtp);
router.route("/password/reset").post(resetPasswordWithOtp);
router.route("/logout").get(logout);
router.route("/account").delete(isAuthenticated, deleteAccount);
router.route("/username/availability").get(isAuthenticated, checkUsernameAvailability);
router.route("/:id/profile").get(isAuthenticated, getProfile);
router
  .route("/profile/edit")
  .post(
    isAuthenticated,
    upload.fields([
      { name: "profilePhoto", maxCount: 1 },
      { name: "coverPhoto", maxCount: 1 },
    ]),
    editProfile,
  );
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
