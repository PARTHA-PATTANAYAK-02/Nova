import sharp from "sharp";
import { Conversation } from "../models/conversation.model.js";
import { emitToUser, getReceiverSocketId, getReceiverSocketIds, io } from "../socket/socket.js";
import { Message } from "../models/message.model.js";
import { Story } from "../models/story.model.js";
import { User } from "../models/user.model.js";
import cloudinary from "../utils/cloudinary.js";
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
    const textMessage = req.body.textMessage?.trim() || "";
    const replyToId = req.body.replyToId;
    const file = req.file;

    if (!mongoose.isValidObjectId(receiverId)) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid recipient" });
    }

    let mediaType = "text";
    let mediaUrl = "";
    let audioDuration = Number(req.body.audioDuration) || 0;

    if (file) {
      let uploadBuffer = file.buffer;
      if (file.mimetype.startsWith("audio/")) {
        mediaType = "audio";
      } else if (file.mimetype.startsWith("video/")) {
        mediaType = "video";
      } else {
        mediaType = "image";
        try {
          uploadBuffer = await sharp(file.buffer)
            .rotate()
            .resize({ width: 1440, height: 1440, fit: "inside", withoutEnlargement: true })
            .jpeg({ quality: 80, mozjpeg: true })
            .toBuffer();
        } catch (compressionError) {
          console.warn("Image compression fallback to raw buffer:", compressionError?.message);
          uploadBuffer = file.buffer;
        }
      }

      const uploadResult = await new Promise((resolve, reject) => {
        cloudinary.uploader
          .upload_stream(
            { folder: "nova/chat", resource_type: "auto" },
            (error, result) => (error ? reject(error) : resolve(result)),
          )
          .end(uploadBuffer);
      });
      mediaUrl = uploadResult.secure_url;
    }

    if (!textMessage && !mediaUrl) {
      return res
        .status(400)
        .json({ success: false, message: "Message or media is required" });
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

    const receiverSocketIds = getReceiverSocketIds(receiverId);
    const fallbackText =
      mediaType === "audio"
        ? "🎤 Voice message"
        : mediaType === "video"
        ? "🎥 Video"
        : mediaType === "image"
        ? "📷 Photo"
        : "";

    const newMessage = await Message.create({
      senderId,
      receiverId,
      message: textMessage || fallbackText,
      mediaType,
      mediaUrl,
      audioDuration,
      replyTo,
      status: receiverSocketIds.length > 0 ? "delivered" : "sent",
    });

    conversation.messages.push(newMessage._id);
    conversation.lastMessage = newMessage._id;
    conversation.lastMessageAt = newMessage.createdAt;
    incrementUnreadCount(conversation, receiverId);
    await conversation.save();

    if (receiverSocketIds.length > 0) {
      emitToUser(receiverId, "newMessage", newMessage);
      await createAndEmitNotification({
        recipient: receiverId,
        actor: senderId,
        type: "message",
        messageId: newMessage._id,
        conversationId: conversation._id,
      });
      emitToUser(senderId, "messageStatus", {
        messageId: newMessage._id,
        status: "delivered",
      });
      emitToUser(receiverId, "conversationUpdated", {
        conversationId: conversation._id,
        lastMessage: newMessage,
      });
    }

    if (receiverSocketIds.length === 0) {
      await createAndEmitNotification({
        recipient: receiverId,
        actor: senderId,
        type: "message",
        messageId: newMessage._id,
        conversationId: conversation._id,
      });
    }

    emitToUser(senderId, "conversationUpdated", {
      conversationId: conversation._id,
      lastMessage: newMessage,
    });

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
      return res.status(200).json({ success: true, messages: [], hasMore: false });

    const limit = Math.min(Math.max(Number.parseInt(req.query.limit, 10) || 30, 1), 100);
    const beforeId = req.query.before;

    const query = { _id: { $in: conversation.messages }, deletedFor: { $ne: req.id } };

    if (beforeId && mongoose.isValidObjectId(beforeId)) {
      const beforeMessage = await Message.findById(beforeId).select("createdAt");
      if (beforeMessage) {
        query.createdAt = { $lt: beforeMessage.createdAt };
      }
    }

    // Fetch latest messages matching criteria
    const rawMessages = await Message.find(query)
      .sort({ createdAt: -1 })
      .limit(limit + 1);

    const hasMore = rawMessages.length > limit;
    const messages = hasMore ? rawMessages.slice(0, limit) : rawMessages;

    // Dynamically verify active stories for messages referencing stories
    const storyIds = messages
      .filter((m) => m.storyRef && m.storyRef.storyId)
      .map((m) => m.storyRef.storyId);

    if (storyIds.length > 0) {
      const activeStories = await Story.find({
        _id: { $in: storyIds },
        expiresAt: { $gt: new Date() },
      }).select("_id image mediaType expiresAt");

      const activeStoryMap = new Map();
      activeStories.forEach((s) => activeStoryMap.set(s._id.toString(), s));

      const expiredOrDeletedStoryIds = [];

      for (let i = 0; i < messages.length; i++) {
        const m = messages[i];
        if (m.storyRef && m.storyRef.storyId) {
          const sId = m.storyRef.storyId.toString();
          const activeStory = activeStoryMap.get(sId);
          if (m.toObject) messages[i] = m.toObject();
          if (!activeStory) {
            // Expired (> 24 hours) or deleted
            messages[i].storyRef.image = null;
            messages[i].storyRef.isUnavailable = true;
            expiredOrDeletedStoryIds.push(m.storyRef.storyId);
          } else {
            // Active story: ensure fresh active image
            messages[i].storyRef.image = activeStory.image;
            messages[i].storyRef.mediaType = activeStory.mediaType;
            messages[i].storyRef.isUnavailable = false;
          }
        }
      }

      if (expiredOrDeletedStoryIds.length > 0) {
        Message.updateMany(
          { "storyRef.storyId": { $in: expiredOrDeletedStoryIds } },
          {
            $set: {
              "storyRef.image": null,
              "storyRef.isUnavailable": true,
            },
          }
        ).catch((err) => console.error("Error clearing expired storyRef images:", err));
      }
    }

    // Return in ascending chronological order for client display
    messages.reverse();

    return res.status(200).json({
      success: true,
      messages,
      hasMore,
      nextCursor: hasMore && messages.length > 0 ? messages[0]._id : null,
    });
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
      .populate("participants", "username fullName profilePicture lastSeen")
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

    emitToUser(senderId, "messagesRead", { readerId });
    emitToUser(readerId, "conversationUpdated", {
      conversationId: conversation._id,
      unreadCount: 0,
    });

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
    emitToUser(message.senderId, "messageReactionUpdated", update);
    emitToUser(message.receiverId, "messageReactionUpdated", update);

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

export const deleteMessage = async (req, res) => {
  try {
    const messageId = req.params.id;
    const deleteType = req.body.deleteType || "me"; // "everyone" or "me"
    const userId = req.id;

    if (!mongoose.isValidObjectId(messageId)) {
      return res.status(400).json({ success: false, message: "Invalid message ID" });
    }

    const message = await Message.findById(messageId);
    if (!message) {
      return res.status(404).json({ success: false, message: "Message not found" });
    }

    const isSender = message.senderId.toString() === userId.toString();
    const isReceiver = message.receiverId.toString() === userId.toString();

    if (!isSender && !isReceiver) {
      return res.status(403).json({ success: false, message: "Unauthorized" });
    }

    if (deleteType === "everyone") {
      if (!isSender) {
        return res.status(403).json({
          success: false,
          message: "You can only delete your own messages for everyone",
        });
      }

      message.isDeletedForEveryone = true;
      message.message = "This message was deleted";
      message.mediaUrl = "";
      message.mediaType = "text";
      message.storyRef = null;
      message.reactions = [];
      message.deletedAt = new Date();
      await message.save();

      emitToUser(message.senderId, "messageDeletedForEveryone", {
        messageId: message._id,
        deletedAt: message.deletedAt,
      });
      emitToUser(message.receiverId, "messageDeletedForEveryone", {
        messageId: message._id,
        deletedAt: message.deletedAt,
      });

      const conv = await Conversation.findOne({ messages: message._id });
      if (conv && conv.lastMessage?.toString() === message._id.toString()) {
        emitToUser(message.senderId, "conversationUpdated", {
          conversationId: conv._id,
          lastMessage: message,
        });
        emitToUser(message.receiverId, "conversationUpdated", {
          conversationId: conv._id,
          lastMessage: message,
        });
      }

      return res.status(200).json({
        success: true,
        message: "Message deleted for everyone",
        messageId: message._id,
        isDeletedForEveryone: true,
      });
    } else {
      // Delete for me
      if (!message.deletedFor.some((id) => id.toString() === userId.toString())) {
        message.deletedFor.push(userId);
        await message.save();
      }

      emitToUser(userId, "messageDeletedForMe", {
        messageId: message._id,
      });

      return res.status(200).json({
        success: true,
        message: "Message deleted for you",
        messageId: message._id,
        deletedForMe: true,
      });
    }
  } catch (error) {
    console.error("deleteMessage error:", error);
    return res.status(500).json({ success: false, message: "Unable to delete message" });
  }
};

export const toggleStarMessage = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({ success: false, message: "Invalid message ID" });
    }
    const message = await Message.findById(id);
    if (!message) {
      return res.status(404).json({ success: false, message: "Message not found" });
    }
    const userIdStr = req.id.toString();
    const isStarred = (message.starredBy || []).some((uid) => uid.toString() === userIdStr);
    if (isStarred) {
      message.starredBy = message.starredBy.filter((uid) => uid.toString() !== userIdStr);
    } else {
      if (!message.starredBy) message.starredBy = [];
      message.starredBy.push(req.id);
    }
    await message.save();
    return res.status(200).json({
      success: true,
      messageId: message._id,
      isStarred: !isStarred,
    });
  } catch (error) {
    console.error("toggleStarMessage error:", error);
    return res.status(500).json({ success: false, message: "Unable to star message" });
  }
};

