import { Notification } from "../models/notification.model.js";
import { getReceiverSocketIds, io } from "../socket/socket.js";
import { User } from "../models/user.model.js";

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
    notification = await Notification.create({
      recipient,
      actor,
      type,
      postId,
      messageId,
      conversationId,
    });
  }

  const actorDetails = await User.findById(actor).select(
    "username fullName profilePicture",
  );
  const payload = {
    _id: notification._id,
    notificationId: notification._id,
    type,
    userId: actor,
    userDetails: actorDetails,
    postId,
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
