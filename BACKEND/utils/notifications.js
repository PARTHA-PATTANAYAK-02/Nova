import { Notification } from "../models/notification.model.js";
import { getReceiverSocketIds, io } from "../socket/socket.js";
import { User } from "../models/user.model.js";
import { Post } from "../models/post.model.js";

export const createAndEmitNotification = async ({
  recipient,
  actor,
  type,
  postId,
  messageId,
  conversationId,
}) => {
  const notificationQuery = { recipient, actor, type };
  if (messageId) notificationQuery.messageId = messageId;
  if (postId) notificationQuery.postId = postId;
  if (conversationId) notificationQuery.conversationId = conversationId;

  // Reuse the same DB document for repeat actions (e.g. liking the same post
  // again), but ALWAYS emit so every connected device updates in real time.
  let notification = await Notification.findOne(notificationQuery);
  const isNew = !notification;

  if (isNew) {
    // 500 CAPACITY CAP (FIFO): If at or above 500, purge oldest notifications
    const MAX_CENTER_CAPACITY = 500;
    const currentCount = await Notification.countDocuments({ recipient });
    if (currentCount >= MAX_CENTER_CAPACITY) {
      const excess = currentCount - MAX_CENTER_CAPACITY + 1;
      const oldestDocs = await Notification.find({ recipient })
        .sort({ createdAt: 1 })
        .limit(excess)
        .select("_id");
      if (oldestDocs.length > 0) {
        await Notification.deleteMany({
          _id: { $in: oldestDocs.map((d) => d._id) },
        });
      }
    }

    notification = await Notification.create({
      recipient,
      actor,
      type,
      postId,
      messageId,
      conversationId,
      modalDismissed: false,
      read: false,
    });
  } else {
    // Un-dismiss and mark unread if repeated
    notification.modalDismissed = false;
    notification.read = false;
    await notification.save();
  }

  const actorDetails = await User.findById(actor).select(
    "username fullName profilePicture",
  );

  let postDetails = null;
  if (postId) {
    try {
      postDetails = await Post.findById(postId).select("image mediaType caption");
    } catch {}
  }

  const payload = {
    _id: notification._id,
    notificationId: notification._id,
    type,
    userId: actor,
    userDetails: actorDetails,
    postId,
    post: postDetails,
    messageId,
    conversationId,
    read: false,
    createdAt: notification.createdAt,
    // Lets the client force the unread badge up even for a repeated event.
    repeat: !isNew,
  };
  for (const socketId of getReceiverSocketIds(recipient)) {
    io.to(socketId).emit("notification", payload);
  }
  return notification;
};
