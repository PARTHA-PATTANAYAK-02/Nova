import { Conversation } from "../models/conversation.model.js";
import { getReceiverSocketId, io } from "../socket/socket.js";
import { Message } from "../models/message.model.js";
import { User } from "../models/user.model.js";
import mongoose from "mongoose";
import { createAndEmitNotification } from "../utils/notifications.js";
import { Notification } from "../models/notification.model.js";

const MESSAGE_REACTIONS = new Set([
  "❤️", "😂", "😮", "😢", "🙏", "🔥",
  "👍", "👏", "🎉", "😍", "🤔", "😎",
  "💯", "🥰", "😭", "🤯", "✨", "💔",
]);

const getConversationForUsers = (firstUserId, secondUserId) =>
  Conversation.findOne({
    participants: { $all: [firstUserId, secondUserId] },
  });

const incrementUnreadCount = (conversation, userId) => {
  const unreadEntry = conversation.unreadCounts.find(
    (entry) => entry.user.toString() === userId.toString(),
  );

  if (unreadEntry) {
    unreadEntry.count += 1;
  } else {
    conversation.unreadCounts.push({ user: userId, count: 1 });
  }
};

export const sendMessage = async (req, res) => {
  try {
    const senderId = req.id;
    const receiverId = req.params.id;
    const message = req.body.textMessage?.trim();
    const replyToId = req.body.replyToId;

    if (!mongoose.isValidObjectId(receiverId)) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid recipient" });
    }

    if (!message) {
      return res
        .status(400)
        .json({ success: false, message: "Message cannot be empty" });
    }
    if (senderId === receiverId) {
      return res
        .status(400)
        .json({ success: false, message: "You cannot message yourself" });
    }

    const receiver = await User.findById(receiverId).select("_id");
    if (!receiver) {
      return res
        .status(404)
        .json({ success: false, message: "Recipient not found" });
    }

    let conversation = await getConversationForUsers(senderId, receiverId);
    let replyTo;
    if (replyToId) {
      if (!mongoose.isValidObjectId(replyToId) || !conversation) {
        return res
          .status(400)
          .json({ success: false, message: "Invalid message to reply to" });
      }
      const repliedMessage = await Message.findOne({
        _id: replyToId,
        $or: [
          { senderId, receiverId },
          { senderId: receiverId, receiverId: senderId },
        ],
      }).select("senderId message");
      if (!repliedMessage) {
        return res
          .status(404)
          .json({ success: false, message: "Reply message not found" });
      }
      replyTo = {
        messageId: repliedMessage._id,
        senderId: repliedMessage.senderId,
        message: repliedMessage.message,
      };
    }

    if (!conversation) {
      conversation = await Conversation.create({
        participants: [senderId, receiverId],
        unreadCounts: [
          { user: senderId, count: 0 },
          { user: receiverId, count: 0 },
        ],
      });
    }

    const receiverSocketId = getReceiverSocketId(receiverId);
    const newMessage = await Message.create({
      senderId,
      receiverId,
      message,
      replyTo,
      status: receiverSocketId ? "delivered" : "sent",
    });

    conversation.messages.push(newMessage._id);
    conversation.lastMessage = newMessage._id;
    conversation.lastMessageAt = newMessage.createdAt;
    incrementUnreadCount(conversation, receiverId);
    await conversation.save();

    const senderSocketId = getReceiverSocketId(senderId);

    if (receiverSocketId) {
      io.to(receiverSocketId).emit("newMessage", newMessage);
      await createAndEmitNotification({
        recipient: receiverId,
        actor: senderId,
        type: "message",
        messageId: newMessage._id,
        conversationId: conversation._id,
      });
      if (senderSocketId) {
        io.to(senderSocketId).emit("messageStatus", {
          messageId: newMessage._id,
          status: "delivered",
        });
      }
      io.to(receiverSocketId).emit("conversationUpdated", {
        conversationId: conversation._id,
        lastMessage: newMessage,
      });
    }

    if (!receiverSocketId) {
      await createAndEmitNotification({
        recipient: receiverId,
        actor: senderId,
        type: "message",
        messageId: newMessage._id,
        conversationId: conversation._id,
      });
    }

    if (senderSocketId) {
      io.to(senderSocketId).emit("conversationUpdated", {
        conversationId: conversation._id,
        lastMessage: newMessage,
      });
    }

    return res.status(201).json({
      success: true,
      message: "Message sent",
      newMessage,
    });
  } catch (error) {
    console.error("sendMessage error:", error);
    return res
      .status(500)
      .json({ success: false, message: "Unable to send message" });
  }
};

export const getMessage = async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ success: false, message: "Invalid user" });
    }
    const conversation = await getConversationForUsers(req.id, req.params.id);
    if (!conversation)
      return res.status(200).json({ success: true, messages: [] });

    const messages = await Message.find({
      _id: { $in: conversation.messages },
    }).sort({
      createdAt: 1,
    });
    return res.status(200).json({ success: true, messages });
  } catch (error) {
    console.error("getMessage error:", error);
    return res
      .status(500)
      .json({ success: false, message: "Unable to load messages" });
  }
};

export const getConversations = async (req, res) => {
  try {
    const conversations = await Conversation.find({ participants: req.id })
      .populate("participants", "username fullName profilePicture")
      .populate("lastMessage")
      .sort({ lastMessageAt: -1, updatedAt: -1 });

    const results = conversations.map((conversation) => {
      const otherUser = conversation.participants.find(
        (participant) => participant._id.toString() !== req.id.toString(),
      );
      const unreadEntry = conversation.unreadCounts.find(
        (entry) => entry.user.toString() === req.id.toString(),
      );

      return {
        _id: conversation._id,
        user: otherUser,
        lastMessage: conversation.lastMessage,
        lastMessageAt: conversation.lastMessageAt,
        unreadCount: unreadEntry?.count || 0,
      };
    });

    return res.status(200).json({ success: true, conversations: results });
  } catch (error) {
    console.error("getConversations error:", error);
    return res
      .status(500)
      .json({ success: false, message: "Unable to load conversations" });
  }
};

export const markMessagesAsRead = async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ success: false, message: "Invalid user" });
    }
    const readerId = req.id;
    const senderId = req.params.id;
    const conversation = await getConversationForUsers(readerId, senderId);
    if (!conversation)
      return res.status(200).json({ success: true, updated: 0 });

    const updateResult = await Message.updateMany(
      { senderId, receiverId: readerId, status: { $ne: "seen" } },
      { $set: { status: "seen", readAt: new Date() } },
    );

    const unreadEntry = conversation.unreadCounts.find(
      (entry) => entry.user.toString() === readerId.toString(),
    );
    if (unreadEntry) unreadEntry.count = 0;
    await conversation.save();
    await Notification.deleteMany(
      {
        recipient: readerId,
        type: "message",
        conversationId: conversation._id,
      },
    );

    const senderSocketId = getReceiverSocketId(senderId);
    if (senderSocketId)
      io.to(senderSocketId).emit("messagesRead", { readerId });

    const readerSocketId = getReceiverSocketId(readerId);
    if (readerSocketId) {
      io.to(readerSocketId).emit("conversationUpdated", {
        conversationId: conversation._id,
        unreadCount: 0,
      });
    }

    return res
      .status(200)
      .json({ success: true, updated: updateResult.modifiedCount });
  } catch (error) {
    console.error("markMessagesAsRead error:", error);
    return res.status(500).json({
      success: false,
      message: "Unable to mark messages as read",
    });
  }
};

export const reactToMessage = async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id) || !mongoose.isValidObjectId(req.params.userId)) {
      return res.status(400).json({ success: false, message: "Invalid message" });
    }
    const { emoji } = req.body;
    if (emoji !== null && !MESSAGE_REACTIONS.has(emoji)) {
      return res.status(400).json({ success: false, message: "Unsupported message reaction" });
    }

    const message = await Message.findOne({
      _id: req.params.id,
      $or: [
        { senderId: req.id, receiverId: req.params.userId },
        { senderId: req.params.userId, receiverId: req.id },
      ],
    });
    if (!message) {
      return res.status(404).json({ success: false, message: "Message not found" });
    }
    if (message.senderId.toString() === req.id.toString()) {
      return res.status(403).json({
        success: false,
        message: "You can only react to messages sent by the other person",
      });
    }

    const existing = message.reactions.find(
      (reaction) => reaction.userId.toString() === req.id.toString(),
    );
    if (existing) message.reactions.pull(existing._id);
    if (emoji && existing?.emoji !== emoji) {
      message.reactions.push({ userId: req.id, emoji });
    }
    await message.save();

    const update = {
      messageId: message._id,
      actorId: req.id.toString(),
      senderId: message.senderId.toString(),
      receiverId: message.receiverId.toString(),
      emoji: emoji && existing?.emoji !== emoji ? emoji : null,
      reactions: message.reactions.map((reaction) => ({
        userId: reaction.userId,
        emoji: reaction.emoji,
      })),
    };
    for (const participantId of [message.senderId, message.receiverId]) {
      const socketId = getReceiverSocketId(participantId.toString());
      if (socketId) io.to(socketId).emit("messageReactionUpdated", update);
    }

    return res.status(200).json({
      success: true,
      emoji: update.emoji,
      reactions: update.reactions,
    });
  } catch (error) {
    console.error("reactToMessage error:", error);
    return res.status(500).json({
      success: false,
      message: "Unable to react to message",
    });
  }
};
