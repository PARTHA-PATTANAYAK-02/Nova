import { Notification } from "../models/notification.model.js";

export const getNotifications = async (req, res) => {
  try {
    const notifications = await Notification.find({ recipient: req.id })
      .populate("actor", "username fullName profilePicture")
      .sort({ createdAt: -1 })
      .limit(100)
      .lean();

    return res.status(200).json({
      success: true,
      notifications: notifications.map((notification) => ({
        _id: notification._id,
        notificationId: notification._id,
        type: notification.type,
        userId: notification.actor?._id,
        userDetails: notification.actor,
        postId: notification.postId,
        messageId: notification.messageId,
        conversationId: notification.conversationId,
        read: notification.read,
        createdAt: notification.createdAt,
      })),
    });
  } catch (error) {
    console.error("getNotifications error:", error);
    return res
      .status(500)
      .json({ success: false, message: "Unable to load notifications" });
  }
};

export const markNotificationsRead = async (req, res) => {
  try {
    await Notification.updateMany(
      { recipient: req.id, read: false },
      { $set: { read: true } },
    );
    return res.status(200).json({ success: true });
  } catch (error) {
    console.error("markNotificationsRead error:", error);
    return res
      .status(500)
      .json({ success: false, message: "Unable to mark notifications read" });
  }
};

export const clearNotifications = async (req, res) => {
  try {
    await Notification.deleteMany({ recipient: req.id });
    return res.status(200).json({ success: true });
  } catch (error) {
    console.error("clearNotifications error:", error);
    return res
      .status(500)
      .json({ success: false, message: "Unable to clear notifications" });
  }
};

export const removeNotification = async (req, res) => {
  try {
    await Notification.deleteOne({ _id: req.params.id, recipient: req.id });
    return res.status(200).json({ success: true });
  } catch (error) {
    console.error("removeNotification error:", error);
    return res
      .status(500)
      .json({ success: false, message: "Unable to remove notification" });
  }
};
