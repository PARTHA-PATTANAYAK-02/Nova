import { Notification } from "../models/notification.model.js";

/**
 * Get notifications for either modal (quick menu) or center (full page).
 * - Modal: loads latest up to 100 notifications where modalDismissed !== true.
 * - Center: loads with pagination (e.g. 20 per page) and optional type filter.
 */
export const getNotifications = async (req, res) => {
  try {
    const { source, type, page = 1, limit = 20 } = req.query;
    const recipient = req.id;

    const query = { recipient };

    if (source === "modal") {
      // Modal only displays notifications that haven't been dismissed from the modal view (max 100)
      query.modalDismissed = { $ne: true };

      const notifications = await Notification.find(query)
        .populate("actor", "username fullName profilePicture")
        .populate("postId", "image mediaType caption")
        .sort({ createdAt: -1 })
        .limit(100)
        .lean();

      return res.status(200).json({
        success: true,
        source: "modal",
        total: notifications.length,
        notifications: notifications.map(formatNotification),
      });
    }

    // Notification Center view: supports filtering and pagination
    if (type && type !== "all") {
      query.type = type;
    }

    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(50, Math.max(1, parseInt(limit, 10) || 20));
    const skip = (pageNum - 1) * limitNum;

    // Center max capacity ceiling is 500
    const rawTotal = await Notification.countDocuments(query);
    const total = Math.min(500, rawTotal);

    const notifications = await Notification.find(query)
      .populate("actor", "username fullName profilePicture")
      .populate("postId", "image mediaType caption")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitNum)
      .lean();

    const totalPages = Math.ceil(total / limitNum) || 1;
    const hasMore = pageNum < totalPages;

    return res.status(200).json({
      success: true,
      source: "center",
      page: pageNum,
      limit: limitNum,
      total,
      totalPages,
      hasMore,
      notifications: notifications.map(formatNotification),
    });
  } catch (error) {
    console.error("getNotifications error:", error);
    return res
      .status(500)
      .json({ success: false, message: "Unable to load notifications" });
  }
};

const formatNotification = (notification) => ({
  _id: notification._id,
  notificationId: notification._id,
  type: notification.type,
  userId: notification.actor?._id,
  userDetails: notification.actor,
  postId: notification.postId?._id || notification.postId,
  post: notification.postId,
  messageId: notification.messageId,
  conversationId: notification.conversationId,
  read: notification.read,
  modalDismissed: Boolean(notification.modalDismissed),
  createdAt: notification.createdAt,
});

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

/**
 * Dismiss single notification from modal view ONLY.
 * Kept safe inside Notification Center!
 */
export const dismissModalNotification = async (req, res) => {
  try {
    await Notification.updateOne(
      { _id: req.params.id, recipient: req.id },
      { $set: { modalDismissed: true } }
    );
    return res.status(200).json({
      success: true,
      message: "Dismissed from popup (still saved in Notification Center)",
    });
  } catch (error) {
    console.error("dismissModalNotification error:", error);
    return res
      .status(500)
      .json({ success: false, message: "Unable to dismiss notification" });
  }
};

/**
 * Dismiss all notifications from modal view ONLY.
 * Kept safe inside Notification Center!
 */
export const dismissAllModalNotifications = async (req, res) => {
  try {
    await Notification.updateMany(
      { recipient: req.id },
      { $set: { modalDismissed: true } }
    );
    return res.status(200).json({
      success: true,
      message: "All dismissed from popup (still saved in Notification Center)",
    });
  } catch (error) {
    console.error("dismissAllModalNotifications error:", error);
    return res
      .status(500)
      .json({ success: false, message: "Unable to clear popup notifications" });
  }
};

/**
 * Permanent deletion from Notification Center (and database)
 */
export const removeNotification = async (req, res) => {
  try {
    await Notification.deleteOne({ _id: req.params.id, recipient: req.id });
    return res.status(200).json({ success: true, message: "Notification deleted permanently" });
  } catch (error) {
    console.error("removeNotification error:", error);
    return res
      .status(500)
      .json({ success: false, message: "Unable to remove notification" });
  }
};

/**
 * Permanent clear from Notification Center (and database)
 */
export const clearNotifications = async (req, res) => {
  try {
    await Notification.deleteMany({ recipient: req.id });
    return res.status(200).json({ success: true, message: "All notifications cleared permanently" });
  } catch (error) {
    console.error("clearNotifications error:", error);
    return res
      .status(500)
      .json({ success: false, message: "Unable to clear notifications" });
  }
};
