import { Conversation } from "../models/conversation.model.js";
import { getReceiverSocketId, io } from "../socket/socket.js";
import { Message } from "../models/message.model.js";
import { User } from "../models/user.model.js";
import mongoose from "mongoose";
import { createAndEmitNotification } from "../utils/notifications.js";
import { Notification } from "../models/notification.model.js";

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
      .populate("participants", "username profilePicture")
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
    await Notification.updateMany(
      {
        recipient: readerId,
        type: "message",
        conversationId: conversation._id,
        read: false,
      },
      { $set: { read: true } },
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
