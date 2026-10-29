import sharp from "sharp";
import { Conversation } from "../models/conversation.model.js";
import { emitToUser, emitToConversation, getReceiverSocketId, getReceiverSocketIds, io } from "../socket/socket.js";
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
    isGroup: false,
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

    // Check if target is a Group Conversation
    const groupConversation = await Conversation.findOne({
      _id: receiverId,
      isGroup: true,
      participants: senderId,
    });

    if (groupConversation) {
      let mediaType = "text";
      let mediaUrl = "";
      let audioDuration = Number(req.body.audioDuration) || 0;

      if (file) {
        let uploadBuffer = file.buffer;
        const isAudio =
          file.mimetype.startsWith("audio/") ||
          file.originalname?.toLowerCase().includes("voice-note") ||
          (Boolean(req.body.audioDuration) && !file.mimetype.startsWith("video/mp4"));

        if (isAudio) {
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

      let replyTo;
      if (replyToId && mongoose.isValidObjectId(replyToId)) {
        const repliedMessage = await Message.findById(replyToId)
          .populate("senderId", "username fullName profilePicture")
          .select("senderId message mediaType mediaUrl");
        if (repliedMessage) {
          replyTo = {
            messageId: repliedMessage._id,
            senderId: repliedMessage.senderId,
            message: repliedMessage.message,
            mediaType: repliedMessage.mediaType,
            mediaUrl: repliedMessage.mediaUrl,
          };
        }
      }

      const newMessage = await Message.create({
        conversationId: groupConversation._id,
        senderId,
        message: textMessage,
        mediaType,
        mediaUrl,
        audioDuration,
        replyTo,
        status: "delivered",
      });

      groupConversation.messages.push(newMessage._id);
      groupConversation.lastMessage = newMessage._id;
      groupConversation.lastMessageAt = new Date();
      if (groupConversation.deletedFor && groupConversation.deletedFor.length > 0) {
        groupConversation.deletedFor = [];
      }

      for (const pid of groupConversation.participants) {
        if (pid.toString() !== senderId.toString()) {
          incrementUnreadCount(groupConversation, pid);
        }
      }
      await groupConversation.save();

      await newMessage.populate("senderId", "username fullName profilePicture");

      emitToConversation(
        groupConversation.participants,
        "newMessage",
        {
          newMessage,
          conversationId: groupConversation._id,
          isGroup: true,
        },
        senderId
      );

      emitToConversation(
        groupConversation.participants,
        "conversationUpdated",
        {
          conversationId: groupConversation._id,
          lastMessage: newMessage,
          isGroup: true,
        }
      );

      return res.status(201).json({
        success: true,
        message: "Message sent",
        newMessage,
      });
    }

    if (!mongoose.isValidObjectId(receiverId)) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid recipient" });
    }

    const recipient = await User.findById(receiverId).select("whoCanMessage followers username");
    if (recipient?.whoCanMessage === "no_one") {
      return res.status(403).json({
        success: false,
        message: "This user has disabled direct messages.",
      });
    }
    if (recipient?.whoCanMessage === "followers") {
      const isFollower = (recipient.followers || []).some(
        (f) => (f?._id || f)?.toString() === senderId.toString(),
      );
      if (!isFollower) {
        return res.status(403).json({
          success: false,
          message: `You need to follow @${recipient.username || "this user"} first to send them a message.`,
        });
      }
    }

    let mediaType = "text";
    let mediaUrl = "";
    let audioDuration = Number(req.body.audioDuration) || 0;

    if (file) {
      let uploadBuffer = file.buffer;
      const isAudio =
        file.mimetype.startsWith("audio/") ||
        file.originalname?.toLowerCase().includes("voice-note") ||
        (Boolean(req.body.audioDuration) && !file.mimetype.startsWith("video/mp4"));

      if (isAudio) {
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
    if (conversation.deletedFor && conversation.deletedFor.length > 0) {
      conversation.deletedFor = conversation.deletedFor.filter(
        (id) => id.toString() !== senderId.toString() && id.toString() !== receiverId.toString()
      );
    }
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
    let conversation = await Conversation.findOne({
      _id: req.params.id,
      participants: req.id,
    });
    if (!conversation) {
      conversation = await getConversationForUsers(req.id, req.params.id);
    }
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
      .populate("senderId", "username fullName profilePicture")
      .populate("reactions.userId", "username fullName profilePicture")
      .sort({ createdAt: -1 })
      .limit(limit + 1)
      .lean();

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

    let pinnedMessage = null;
    if (conversation.pinnedMessage) {
      pinnedMessage = await Message.findById(conversation.pinnedMessage);
      if (pinnedMessage?.deletedFor?.includes(req.id) || pinnedMessage?.isDeletedForEveryone) {
        pinnedMessage = null;
      }
    }

    return res.status(200).json({
      success: true,
      messages,
      pinnedMessage,
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
    const conversations = await Conversation.find({
      participants: req.id,
      deletedFor: { $ne: req.id },
    })
      .populate("participants", "username fullName profilePicture lastSeen whoCanMessage")
      .populate("admins", "username fullName profilePicture")
      .populate("creator", "username fullName profilePicture")
      .populate({
        path: "lastMessage",
        populate: { path: "senderId", select: "username fullName" },
      })
      .sort({ lastMessageAt: -1, updatedAt: -1 })
      .lean();

    const results = conversations.map((conversation) => {
      const unreadEntry = conversation.unreadCounts.find(
        (entry) => entry.user.toString() === req.id.toString(),
      );

      // Check if lastMessage is deleted for current user
      const isLastMessageDeleted = conversation.lastMessage?.deletedFor?.some(
        (id) => id.toString() === req.id.toString(),
      );
      const displayLastMessage = isLastMessageDeleted ? null : conversation.lastMessage;

      if (conversation.isGroup) {
        return {
          _id: conversation._id,
          isGroup: true,
          groupName: conversation.groupName,
          groupDescription: conversation.groupDescription || "",
          groupAvatar: conversation.groupAvatar || "",
          creator: conversation.creator,
          admin: conversation.admin || conversation.creator,
          admins: conversation.admins || [],
          participants: conversation.participants || [],
          user: {
            _id: conversation._id,
            isGroup: true,
            username: conversation.groupName,
            fullName: conversation.groupName,
            profilePicture: conversation.groupAvatar || "",
            groupDescription: conversation.groupDescription || "",
            participants: conversation.participants || [],
            admins: conversation.admins || [],
            creator: conversation.creator,
            admin: conversation.admin || conversation.creator,
          },
          lastMessage: displayLastMessage,
          lastMessageAt: conversation.lastMessageAt,
          unreadCount: unreadEntry?.count || 0,
        };
      }

      const otherUser = conversation.participants.find(
        (participant) => participant._id.toString() !== req.id.toString(),
      );

      return {
        _id: conversation._id,
        isGroup: false,
        user: otherUser,
        lastMessage: displayLastMessage,
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
    let conversation = await Conversation.findOne({
      _id: req.params.id,
      participants: readerId,
    });
    if (!conversation) {
      conversation = await getConversationForUsers(readerId, senderId);
    }
    if (!conversation)
      return res.status(200).json({ success: true, updated: 0 });

    if (conversation.isGroup) {
      const unreadEntry = conversation.unreadCounts.find(
        (entry) => entry.user.toString() === readerId.toString(),
      );
      if (unreadEntry) unreadEntry.count = 0;
      await conversation.save();
      emitToUser(readerId, "conversationUpdated", {
        conversationId: conversation._id,
        unreadCount: 0,
      });
      return res.status(200).json({ success: true, updated: 1 });
    }

    const otherParticipant = conversation.participants.find(
      (p) => p.toString() !== readerId.toString()
    );
    const targetSenderId = otherParticipant ? otherParticipant.toString() : senderId;

    const updateResult = await Message.updateMany(
      { senderId: targetSenderId, receiverId: readerId, status: { $ne: "seen" } },
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

    emitToUser(targetSenderId, "messagesRead", { readerId });
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
    const { id: messageId } = req.params;
    if (!mongoose.isValidObjectId(messageId)) {
      return res.status(400).json({ success: false, message: "Invalid message" });
    }
    const { emoji } = req.body;
    if (emoji !== null && !MESSAGE_REACTIONS.has(emoji)) {
      return res.status(400).json({ success: false, message: "Unsupported message reaction" });
    }

    const message = await Message.findById(messageId);
    if (!message) {
      return res.status(404).json({ success: false, message: "Message not found" });
    }

    // Verify participant / authorization
    let conversation = null;
    if (message.conversationId) {
      conversation = await Conversation.findOne({
        _id: message.conversationId,
        participants: req.id,
      });
    } else {
      conversation = await Conversation.findOne({
        messages: message._id,
        participants: req.id,
      });
    }

    const isSender = message.senderId?.toString() === req.id.toString();
    const isReceiver = message.receiverId && message.receiverId.toString() === req.id.toString();

    if (!conversation && !isSender && !isReceiver) {
      return res.status(403).json({ success: false, message: "Unauthorized to react to this message" });
    }

    const existing = message.reactions.find(
      (reaction) => reaction.userId.toString() === req.id.toString(),
    );
    if (existing) message.reactions.pull(existing._id);
    if (emoji && existing?.emoji !== emoji) {
      message.reactions.push({ userId: req.id, emoji });
    }
    await message.save();
    await message.populate("reactions.userId", "username fullName profilePicture");

    const actorUser = await User.findById(req.id).select("username fullName profilePicture");

    const update = {
      messageId: message._id,
      conversationId: conversation?._id || message.conversationId,
      actorId: req.id.toString(),
      actorName: actorUser?.fullName || actorUser?.username || "Someone",
      actor: actorUser,
      senderId: message.senderId?.toString(),
      receiverId: message.receiverId?.toString(),
      emoji: emoji && existing?.emoji !== emoji ? emoji : null,
      reactions: message.reactions.map((reaction) => ({
        userId: reaction.userId,
        emoji: reaction.emoji,
      })),
    };

    if (conversation && conversation.participants) {
      emitToConversation(conversation.participants, "messageReactionUpdated", update);
    } else {
      emitToUser(message.senderId, "messageReactionUpdated", update);
      if (message.receiverId) {
        emitToUser(message.receiverId, "messageReactionUpdated", update);
      }
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

    let conversation = null;
    if (message.conversationId) {
      conversation = await Conversation.findOne({
        _id: message.conversationId,
        participants: userId,
      });
    } else {
      conversation = await Conversation.findOne({
        messages: message._id,
        participants: userId,
      });
    }

    const isSender = message.senderId?.toString() === userId.toString();
    const isReceiver = message.receiverId && message.receiverId.toString() === userId.toString();
    const isGroupAdmin = conversation?.admins?.some((adm) => adm.toString() === userId.toString()) ||
                         conversation?.creator?.toString() === userId.toString();

    if (!isSender && !isReceiver && !conversation) {
      return res.status(403).json({ success: false, message: "Unauthorized" });
    }

    if (deleteType === "everyone") {
      if (!isSender && !isGroupAdmin) {
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

      const deletePayload = {
        messageId: message._id,
        conversationId: conversation?._id || message.conversationId,
        deletedAt: message.deletedAt,
      };

      if (conversation && conversation.participants) {
        emitToConversation(conversation.participants, "messageDeletedForEveryone", deletePayload);
      } else {
        emitToUser(message.senderId, "messageDeletedForEveryone", deletePayload);
        if (message.receiverId) {
          emitToUser(message.receiverId, "messageDeletedForEveryone", deletePayload);
        }
      }

      const conv = conversation || (await Conversation.findOne({ messages: message._id }));
      if (conv && conv.lastMessage?.toString() === message._id.toString()) {
        const updatePayload = {
          conversationId: conv._id,
          lastMessage: message,
          isGroup: conv.isGroup,
        };
        if (conv.isGroup && conv.participants) {
          emitToConversation(conv.participants, "conversationUpdated", updatePayload);
        } else {
          emitToUser(message.senderId, "conversationUpdated", updatePayload);
          if (message.receiverId) emitToUser(message.receiverId, "conversationUpdated", updatePayload);
        }
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
        conversationId: conversation?._id || message.conversationId,
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

export const deleteMultipleMessages = async (req, res) => {
  try {
    const { messageIds, deleteType } = req.body;
    const userId = req.id;
    if (!Array.isArray(messageIds) || messageIds.length === 0) {
      return res.status(400).json({ success: false, message: "No messages specified" });
    }

    const messages = await Message.find({ _id: { $in: messageIds } });
    if (!messages.length) {
      return res.status(404).json({ success: false, message: "Messages not found" });
    }

    const processedIds = [];
    for (const message of messages) {
      let conversation = null;
      if (message.conversationId) {
        conversation = await Conversation.findOne({
          _id: message.conversationId,
          participants: userId,
        });
      } else {
        conversation = await Conversation.findOne({
          messages: message._id,
          participants: userId,
        });
      }

      const isSender = message.senderId?.toString() === userId.toString();
      const isReceiver = message.receiverId && message.receiverId.toString() === userId.toString();
      const isGroupAdmin = conversation?.admins?.some((adm) => adm.toString() === userId.toString()) ||
                           conversation?.creator?.toString() === userId.toString();

      if (!isSender && !isReceiver && !conversation) continue;

      if (deleteType === "everyone" && (isSender || isGroupAdmin)) {
        message.isDeletedForEveryone = true;
        message.message = "This message was deleted";
        message.mediaUrl = "";
        message.mediaType = "text";
        message.storyRef = null;
        message.reactions = [];
        message.deletedAt = new Date();
        await message.save();

        const deletePayload = {
          messageId: message._id,
          conversationId: conversation?._id || message.conversationId,
          deletedAt: message.deletedAt,
        };

        if (conversation && conversation.participants) {
          emitToConversation(conversation.participants, "messageDeletedForEveryone", deletePayload);
        } else {
          emitToUser(message.senderId, "messageDeletedForEveryone", deletePayload);
          if (message.receiverId) {
            emitToUser(message.receiverId, "messageDeletedForEveryone", deletePayload);
          }
        }
        processedIds.push(message._id);
      } else {
        // Delete for me
        if (!message.deletedFor.some((id) => id.toString() === userId.toString())) {
          message.deletedFor.push(userId);
          await message.save();
        }
        emitToUser(userId, "messageDeletedForMe", {
          messageId: message._id,
          conversationId: conversation?._id || message.conversationId,
        });
        processedIds.push(message._id);
      }
    }

    return res.status(200).json({
      success: true,
      message: `Deleted ${processedIds.length} message(s)`,
      processedIds,
      deleteType,
    });
  } catch (error) {
    console.error("deleteMultipleMessages error:", error);
    return res.status(500).json({ success: false, message: "Unable to delete selected messages" });
  }
};

export const clearConversationMessages = async (req, res) => {
  try {
    const { userId: otherUserId } = req.params;
    const currentUserId = req.id;
    const { deleteForEveryone = true } = req.body || {};

    if (!mongoose.isValidObjectId(otherUserId)) {
      return res.status(400).json({ success: false, message: "Invalid user ID" });
    }

    // Find conversation document between both users
    const conversation = await Conversation.findOne({
      participants: { $all: [currentUserId, otherUserId] },
    });

    if (conversation) {
      if (deleteForEveryone) {
        // Permanently delete all message documents from MongoDB
        await Message.deleteMany({
          _id: { $in: conversation.messages },
        });
        conversation.messages = [];
        conversation.lastMessage = null;
        conversation.lastMessageAt = new Date();
        await conversation.save();

        emitToUser(currentUserId, "conversationCleared", {
          otherUserId,
          conversationId: conversation._id,
        });
        emitToUser(otherUserId, "conversationCleared", {
          otherUserId: currentUserId,
          conversationId: conversation._id,
        });
      } else {
        await Message.updateMany(
          { _id: { $in: conversation.messages } },
          { $addToSet: { deletedFor: currentUserId } }
        );
        emitToUser(currentUserId, "conversationCleared", {
          otherUserId,
          conversationId: conversation._id,
        });
      }
    } else {
      if (deleteForEveryone) {
        await Message.deleteMany({
          $or: [
            { senderId: currentUserId, receiverId: otherUserId },
            { senderId: otherUserId, receiverId: currentUserId },
          ],
        });
        emitToUser(currentUserId, "conversationCleared", { otherUserId });
        emitToUser(otherUserId, "conversationCleared", { otherUserId: currentUserId });
      } else {
        await Message.updateMany(
          {
            $or: [
              { senderId: currentUserId, receiverId: otherUserId },
              { senderId: otherUserId, receiverId: currentUserId },
            ],
          },
          { $addToSet: { deletedFor: currentUserId } }
        );
        emitToUser(currentUserId, "conversationCleared", { otherUserId });
      }
    }

    return res.status(200).json({
      success: true,
      message: "Chat history permanently deleted from database",
    });
  } catch (error) {
    console.error("clearConversationMessages error:", error);
    return res.status(500).json({ success: false, message: "Unable to clear chat history" });
  }
};

export const togglePinMessage = async (req, res) => {
  try {
    const { userId: otherUserId, messageId } = req.params;
    const currentUserId = req.id;

    if (!mongoose.isValidObjectId(otherUserId) || !mongoose.isValidObjectId(messageId)) {
      return res.status(400).json({ success: false, message: "Invalid IDs" });
    }

    // Try finding by direct conversation ID (Group or direct)
    let conversation = await Conversation.findOne({
      _id: otherUserId,
      participants: currentUserId,
    });

    if (!conversation) {
      // Fallback for 1-on-1 where otherUserId is the recipient's user ID
      conversation = await Conversation.findOne({
        isGroup: false,
        participants: { $all: [currentUserId, otherUserId] },
      });
    }

    if (!conversation) {
      return res.status(404).json({ success: false, message: "Conversation not found" });
    }

    const isCurrentlyPinned = conversation.pinnedMessage?.toString() === messageId.toString();
    const newPinnedId = isCurrentlyPinned ? null : messageId;

    conversation.pinnedMessage = newPinnedId;
    await conversation.save();

    let populatedPinned = null;
    if (newPinnedId) {
      populatedPinned = await Message.findById(newPinnedId);
    }

    if (conversation.isGroup && conversation.participants) {
      emitToConversation(conversation.participants, "conversationPinnedUpdated", {
        conversationId: conversation._id,
        otherUserId: conversation._id,
        pinnedMessage: populatedPinned,
      });
    } else {
      emitToUser(currentUserId, "conversationPinnedUpdated", {
        conversationId: conversation._id,
        otherUserId,
        pinnedMessage: populatedPinned,
      });
      emitToUser(otherUserId, "conversationPinnedUpdated", {
        conversationId: conversation._id,
        otherUserId: currentUserId,
        pinnedMessage: populatedPinned,
      });
    }

    return res.status(200).json({
      success: true,
      pinnedMessage: populatedPinned,
      isPinned: !isCurrentlyPinned,
      message: isCurrentlyPinned ? "Message unpinned" : "Message pinned to top",
    });
  } catch (error) {
    console.error("togglePinMessage error:", error);
    return res.status(500).json({ success: false, message: "Unable to pin message" });
  }
};

export const forwardMessages = async (req, res) => {
  try {
    const { messageIds, targetUserIds } = req.body;
    const currentUserId = req.id;

    if (
      !Array.isArray(messageIds) ||
      !Array.isArray(targetUserIds) ||
      !messageIds.length ||
      !targetUserIds.length
    ) {
      return res.status(400).json({ success: false, message: "Please select messages and recipient users" });
    }

    const sourceMessages = await Message.find({ _id: { $in: messageIds } });
    if (!sourceMessages.length) {
      return res.status(404).json({ success: false, message: "Source messages not found" });
    }

    const results = [];

    for (const targetId of targetUserIds) {
      if (!mongoose.isValidObjectId(targetId)) continue;

      // Check if target is a group conversation
      const groupConv = await Conversation.findOne({
        _id: targetId,
        isGroup: true,
        participants: currentUserId,
      });

      if (groupConv) {
        for (const src of sourceMessages) {
          const newMsg = await Message.create({
            conversationId: groupConv._id,
            senderId: currentUserId,
            message: src.message || "",
            mediaType: src.mediaType || "text",
            mediaUrl: src.mediaUrl || "",
            audioDuration: src.audioDuration || 0,
            isForwarded: true,
            status: "delivered",
          });

          groupConv.messages.push(newMsg._id);
          groupConv.lastMessage = newMsg._id;
          groupConv.lastMessageAt = new Date();
          await newMsg.populate("senderId", "username fullName profilePicture");

          emitToConversation(groupConv.participants, "newMessage", {
            newMessage: newMsg,
            conversationId: groupConv._id,
            isGroup: true,
          });
          results.push(newMsg);
        }
        await groupConv.save();
        continue;
      }

      // 1-on-1 conversation
      let conversation = await Conversation.findOne({
        isGroup: false,
        participants: { $all: [currentUserId, targetId] },
      });
      if (!conversation) {
        conversation = await Conversation.create({
          participants: [currentUserId, targetId],
          messages: [],
        });
      }

      for (const src of sourceMessages) {
        const newMsg = await Message.create({
          senderId: currentUserId,
          receiverId: targetId,
          message: src.message || "",
          mediaType: src.mediaType || "text",
          mediaUrl: src.mediaUrl || "",
          audioDuration: src.audioDuration || 0,
          isForwarded: true,
          status: "sent",
        });

        conversation.messages.push(newMsg._id);
        conversation.lastMessage = newMsg._id;
        conversation.lastMessageAt = new Date();

        emitToUser(targetId, "newMessage", newMsg);
        emitToUser(currentUserId, "newMessage", newMsg);
        results.push(newMsg);
      }
      await conversation.save();
    }

    return res.status(200).json({
      success: true,
      message: `Forwarded ${sourceMessages.length} message(s) successfully`,
      count: results.length,
    });
  } catch (error) {
    console.error("forwardMessages error:", error);
    return res.status(500).json({ success: false, message: "Unable to forward messages" });
  }
};

export const getStarredMessages = async (req, res) => {
  try {
    const { userId: otherUserId } = req.params;
    const currentUserId = req.id;

    const query = {
      starredBy: currentUserId,
      deletedFor: { $ne: currentUserId },
    };

    if (otherUserId && mongoose.isValidObjectId(otherUserId)) {
      const groupConv = await Conversation.findOne({
        _id: otherUserId,
        isGroup: true,
        participants: currentUserId,
      });

      if (groupConv) {
        query.conversationId = groupConv._id;
      } else {
        query.$or = [
          { senderId: currentUserId, receiverId: otherUserId },
          { senderId: otherUserId, receiverId: currentUserId },
        ];
      }
    }

    const messages = await Message.find(query).sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      messages,
    });
  } catch (error) {
    console.error("getStarredMessages error:", error);
    return res.status(500).json({ success: false, message: "Unable to load starred messages" });
  }
};


/* ═══════════════════════════════════════════════════════════════════════
   GROUP MANAGEMENT CONTROLLERS
   ═══════════════════════════════════════════════════════════════════════ */

export const createGroup = async (req, res) => {
  try {
    const creatorId = req.id;
    const { groupName, groupDescription } = req.body;
    let participantIds = req.body.participantIds;

    if (!groupName || groupName.trim().length < 2) {
      return res.status(400).json({ success: false, message: "Group name must be at least 2 characters long" });
    }

    if (typeof participantIds === "string") {
      try {
        participantIds = JSON.parse(participantIds);
      } catch (e) {
        participantIds = participantIds.split(",").map((id) => id.trim());
      }
    }

    if (!Array.isArray(participantIds)) {
      participantIds = [];
    }

    const allParticipants = Array.from(
      new Set([creatorId.toString(), ...participantIds.map((id) => id?.toString?.() || id)])
    ).filter((id) => mongoose.isValidObjectId(id));

    if (allParticipants.length < 2) {
      return res.status(400).json({ success: false, message: "Please select at least 1 other member for the group" });
    }

    let groupAvatar = "";
    if (req.file) {
      try {
        const uploadBuffer = await sharp(req.file.buffer)
          .rotate()
          .resize({ width: 500, height: 500, fit: "cover" })
          .jpeg({ quality: 85 })
          .toBuffer();

        const uploadResult = await new Promise((resolve, reject) => {
          cloudinary.uploader
            .upload_stream(
              { folder: "nova/groups", resource_type: "image" },
              (error, result) => (error ? reject(error) : resolve(result)),
            )
            .end(uploadBuffer);
        });
        groupAvatar = uploadResult.secure_url;
      } catch (err) {
        console.warn("Group avatar upload failed:", err?.message);
      }
    }

    const creatorUser = await User.findById(creatorId).select("username fullName");

    const group = await Conversation.create({
      isGroup: true,
      groupName: groupName.trim(),
      groupDescription: groupDescription?.trim() || "",
      groupAvatar,
      creator: creatorId,
      admins: [creatorId],
      admin: creatorId,
      participants: allParticipants,
      lastMessageAt: new Date(),
      unreadCounts: allParticipants.map((id) => ({ user: id, count: 0 })),
    });

    const systemMessage = await Message.create({
      conversationId: group._id,
      senderId: creatorId,
      message: `${creatorUser?.fullName || creatorUser?.username || "Someone"} created the group "${group.groupName}"`,
      messageType: "system",
      mediaType: "text",
      status: "delivered",
    });

    group.messages.push(systemMessage._id);
    group.lastMessage = systemMessage._id;
    await group.save();

    const populatedGroup = await Conversation.findById(group._id)
      .populate("participants", "username fullName profilePicture lastSeen whoCanMessage")
      .populate("admins", "username fullName profilePicture")
      .populate("creator", "username fullName profilePicture")
      .populate("lastMessage");

    const groupPayload = {
      _id: populatedGroup._id,
      isGroup: true,
      groupName: populatedGroup.groupName,
      groupDescription: populatedGroup.groupDescription,
      groupAvatar: populatedGroup.groupAvatar,
      creator: populatedGroup.creator,
      admins: populatedGroup.admins,
      admin: populatedGroup.admin,
      participants: populatedGroup.participants,
      user: {
        _id: populatedGroup._id,
        isGroup: true,
        username: populatedGroup.groupName,
        fullName: populatedGroup.groupName,
        profilePicture: populatedGroup.groupAvatar || "",
        groupDescription: populatedGroup.groupDescription,
        participants: populatedGroup.participants,
        admins: populatedGroup.admins,
        creator: populatedGroup.creator,
        admin: populatedGroup.admin,
      },
      lastMessage: populatedGroup.lastMessage,
      lastMessageAt: populatedGroup.lastMessageAt,
      unreadCount: 0,
    };

    emitToConversation(allParticipants, "newGroupCreated", groupPayload);

    return res.status(201).json({
      success: true,
      message: "Group created successfully",
      group: groupPayload,
    });
  } catch (error) {
    console.error("createGroup error:", error);
    return res.status(500).json({ success: false, message: "Unable to create group" });
  }
};

export const getGroupDetails = async (req, res) => {
  try {
    const groupId = req.params.id;
    if (!mongoose.isValidObjectId(groupId)) {
      return res.status(400).json({ success: false, message: "Invalid group ID" });
    }

    const group = await Conversation.findOne({
      _id: groupId,
      isGroup: true,
      participants: req.id,
    })
      .populate("participants", "username fullName profilePicture lastSeen bio")
      .populate("admins", "username fullName profilePicture")
      .populate("creator", "username fullName profilePicture");

    if (!group) {
      return res.status(404).json({ success: false, message: "Group not found or you are not a member" });
    }

    return res.status(200).json({ success: true, group });
  } catch (error) {
    console.error("getGroupDetails error:", error);
    return res.status(500).json({ success: false, message: "Unable to get group details" });
  }
};

export const updateGroup = async (req, res) => {
  try {
    const groupId = req.params.id;
    const userId = req.id;
    const { groupName, groupDescription, removeAvatar } = req.body;

    if (!mongoose.isValidObjectId(groupId)) {
      return res.status(400).json({ success: false, message: "Invalid group ID" });
    }

    const group = await Conversation.findOne({
      _id: groupId,
      isGroup: true,
      participants: userId,
    });

    if (!group) {
      return res.status(404).json({ success: false, message: "Group not found" });
    }

    const isAdmin = (group.admins || []).some((a) => a.toString() === userId.toString());
    if (!isAdmin) {
      return res.status(403).json({ success: false, message: "Only group admins can edit group info" });
    }

    if (groupName && groupName.trim()) {
      group.groupName = groupName.trim();
    }
    if (groupDescription !== undefined) {
      group.groupDescription = groupDescription.trim();
    }

    if (req.file) {
      const uploadBuffer = await sharp(req.file.buffer)
        .rotate()
        .resize({ width: 500, height: 500, fit: "cover" })
        .jpeg({ quality: 85 })
        .toBuffer();

      const uploadResult = await new Promise((resolve, reject) => {
        cloudinary.uploader
          .upload_stream(
            { folder: "nova/groups", resource_type: "image" },
            (error, result) => (error ? reject(error) : resolve(result)),
          )
          .end(uploadBuffer);
      });
      group.groupAvatar = uploadResult.secure_url;
    } else if (removeAvatar === "true") {
      group.groupAvatar = "";
    }

    const adminUser = await User.findById(userId).select("username fullName");
    const sysMsg = await Message.create({
      conversationId: group._id,
      senderId: userId,
      message: `${adminUser?.fullName || adminUser?.username || "Admin"} updated group information`,
      messageType: "system",
      mediaType: "text",
      status: "delivered",
    });

    group.messages.push(sysMsg._id);
    group.lastMessage = sysMsg._id;
    group.lastMessageAt = new Date();
    await group.save();

    const populatedGroup = await Conversation.findById(group._id)
      .populate("participants", "username fullName profilePicture lastSeen whoCanMessage")
      .populate("admins", "username fullName profilePicture")
      .populate("creator", "username fullName profilePicture")
      .populate("lastMessage");

    const groupPayload = {
      _id: populatedGroup._id,
      isGroup: true,
      groupName: populatedGroup.groupName,
      groupDescription: populatedGroup.groupDescription,
      groupAvatar: populatedGroup.groupAvatar,
      creator: populatedGroup.creator,
      admins: populatedGroup.admins,
      admin: populatedGroup.admin,
      participants: populatedGroup.participants,
      user: {
        _id: populatedGroup._id,
        isGroup: true,
        username: populatedGroup.groupName,
        fullName: populatedGroup.groupName,
        profilePicture: populatedGroup.groupAvatar || "",
        groupDescription: populatedGroup.groupDescription,
        participants: populatedGroup.participants,
        admins: populatedGroup.admins,
        creator: populatedGroup.creator,
        admin: populatedGroup.admin,
      },
      lastMessage: populatedGroup.lastMessage,
      lastMessageAt: populatedGroup.lastMessageAt,
    };

    emitToConversation(group.participants, "groupUpdated", groupPayload);
    emitToConversation(group.participants, "newMessage", { newMessage: sysMsg, conversationId: group._id, isGroup: true });

    return res.status(200).json({ success: true, message: "Group updated successfully", group: groupPayload });
  } catch (error) {
    console.error("updateGroup error:", error);
    return res.status(500).json({ success: false, message: "Unable to update group" });
  }
};

export const addGroupMembers = async (req, res) => {
  try {
    const groupId = req.params.id;
    const userId = req.id;
    let { memberIds } = req.body;

    if (!mongoose.isValidObjectId(groupId)) {
      return res.status(400).json({ success: false, message: "Invalid group ID" });
    }

    const group = await Conversation.findOne({
      _id: groupId,
      isGroup: true,
      participants: userId,
    });

    if (!group) {
      return res.status(404).json({ success: false, message: "Group not found" });
    }

    const isAdmin = (group.admins || []).some((a) => a.toString() === userId.toString());
    if (!isAdmin) {
      return res.status(403).json({ success: false, message: "Only group admins can add members" });
    }

    if (typeof memberIds === "string") {
      try { memberIds = JSON.parse(memberIds); } catch (e) { memberIds = memberIds.split(","); }
    }
    if (!Array.isArray(memberIds)) memberIds = [];

    const existingSet = new Set(group.participants.map((p) => p.toString()));
    const newMembers = memberIds
      .map((id) => id?.toString?.() || id)
      .filter((id) => mongoose.isValidObjectId(id) && !existingSet.has(id));

    if (newMembers.length === 0) {
      return res.status(400).json({ success: false, message: "Selected users are already members of this group" });
    }

    for (const id of newMembers) {
      group.participants.push(id);
      group.unreadCounts.push({ user: id, count: 0 });
    }

    const adminUser = await User.findById(userId).select("username fullName");
    const addedUsers = await User.find({ _id: { $in: newMembers } }).select("username fullName");
    const names = addedUsers.map((u) => u.fullName || u.username).join(", ");

    const sysMsg = await Message.create({
      conversationId: group._id,
      senderId: userId,
      message: `${adminUser?.fullName || adminUser?.username || "Admin"} added ${names}`,
      messageType: "system",
      mediaType: "text",
      status: "delivered",
    });

    group.messages.push(sysMsg._id);
    group.lastMessage = sysMsg._id;
    group.lastMessageAt = new Date();
    await group.save();

    const populatedGroup = await Conversation.findById(group._id)
      .populate("participants", "username fullName profilePicture lastSeen whoCanMessage")
      .populate("admins", "username fullName profilePicture")
      .populate("creator", "username fullName profilePicture")
      .populate("lastMessage");

    const groupPayload = {
      _id: populatedGroup._id,
      isGroup: true,
      groupName: populatedGroup.groupName,
      groupDescription: populatedGroup.groupDescription,
      groupAvatar: populatedGroup.groupAvatar,
      creator: populatedGroup.creator,
      admins: populatedGroup.admins,
      admin: populatedGroup.admin,
      participants: populatedGroup.participants,
      user: {
        _id: populatedGroup._id,
        isGroup: true,
        username: populatedGroup.groupName,
        fullName: populatedGroup.groupName,
        profilePicture: populatedGroup.groupAvatar || "",
        groupDescription: populatedGroup.groupDescription,
        participants: populatedGroup.participants,
        admins: populatedGroup.admins,
        creator: populatedGroup.creator,
        admin: populatedGroup.admin,
      },
      lastMessage: populatedGroup.lastMessage,
      lastMessageAt: populatedGroup.lastMessageAt,
    };

    emitToConversation(group.participants, "groupUpdated", groupPayload);
    emitToConversation(group.participants, "newMessage", { newMessage: sysMsg, conversationId: group._id, isGroup: true });
    emitToConversation(newMembers, "newGroupCreated", groupPayload);

    return res.status(200).json({ success: true, message: "Members added successfully", group: groupPayload });
  } catch (error) {
    console.error("addGroupMembers error:", error);
    return res.status(500).json({ success: false, message: "Unable to add members" });
  }
};

export const removeGroupMember = async (req, res) => {
  try {
    const groupId = req.params.id;
    const memberId = req.params.memberId;
    const userId = req.id;

    if (!mongoose.isValidObjectId(groupId) || !mongoose.isValidObjectId(memberId)) {
      return res.status(400).json({ success: false, message: "Invalid ID" });
    }

    const group = await Conversation.findOne({
      _id: groupId,
      isGroup: true,
      participants: userId,
    });

    if (!group) {
      return res.status(404).json({ success: false, message: "Group not found" });
    }

    const isAdmin = (group.admins || []).some((a) => a.toString() === userId.toString());
    if (!isAdmin) {
      return res.status(403).json({ success: false, message: "Only group admins can remove members" });
    }

    if (group.creator && group.creator.toString() === memberId.toString()) {
      return res.status(400).json({ success: false, message: "Group creator cannot be removed" });
    }

    group.participants = group.participants.filter((p) => p.toString() !== memberId.toString());
    group.admins = group.admins.filter((a) => a.toString() !== memberId.toString());
    group.unreadCounts = group.unreadCounts.filter((u) => u.user.toString() !== memberId.toString());

    const adminUser = await User.findById(userId).select("username fullName");
    const targetUser = await User.findById(memberId).select("username fullName");

    const sysMsg = await Message.create({
      conversationId: group._id,
      senderId: userId,
      message: `${adminUser?.fullName || adminUser?.username || "Admin"} removed ${targetUser?.fullName || targetUser?.username || "a member"}`,
      messageType: "system",
      mediaType: "text",
      status: "delivered",
    });

    group.messages.push(sysMsg._id);
    group.lastMessage = sysMsg._id;
    group.lastMessageAt = new Date();
    await group.save();

    const populatedGroup = await Conversation.findById(group._id)
      .populate("participants", "username fullName profilePicture lastSeen whoCanMessage")
      .populate("admins", "username fullName profilePicture")
      .populate("creator", "username fullName profilePicture")
      .populate("lastMessage");

    const groupPayload = {
      _id: populatedGroup._id,
      isGroup: true,
      groupName: populatedGroup.groupName,
      groupDescription: populatedGroup.groupDescription,
      groupAvatar: populatedGroup.groupAvatar,
      creator: populatedGroup.creator,
      admins: populatedGroup.admins,
      admin: populatedGroup.admin,
      participants: populatedGroup.participants,
      user: {
        _id: populatedGroup._id,
        isGroup: true,
        username: populatedGroup.groupName,
        fullName: populatedGroup.groupName,
        profilePicture: populatedGroup.groupAvatar || "",
        groupDescription: populatedGroup.groupDescription,
        participants: populatedGroup.participants,
        admins: populatedGroup.admins,
        creator: populatedGroup.creator,
        admin: populatedGroup.admin,
      },
      lastMessage: populatedGroup.lastMessage,
      lastMessageAt: populatedGroup.lastMessageAt,
    };

    emitToConversation(group.participants, "groupUpdated", groupPayload);
    emitToConversation(group.participants, "newMessage", { newMessage: sysMsg, conversationId: group._id, isGroup: true });
    emitToUser(memberId, "removedFromGroup", { groupId });

    return res.status(200).json({ success: true, message: "Member removed", group: groupPayload });
  } catch (error) {
    console.error("removeGroupMember error:", error);
    return res.status(500).json({ success: false, message: "Unable to remove member" });
  }
};

export const leaveGroup = async (req, res) => {
  try {
    const groupId = req.params.id;
    const userId = req.id;

    if (!mongoose.isValidObjectId(groupId)) {
      return res.status(400).json({ success: false, message: "Invalid group ID" });
    }

    const group = await Conversation.findOne({
      _id: groupId,
      isGroup: true,
      participants: userId,
    });

    if (!group) {
      return res.status(404).json({ success: false, message: "Group not found or you are not a member" });
    }

    group.participants = group.participants.filter((p) => p.toString() !== userId.toString());
    group.admins = group.admins.filter((a) => a.toString() !== userId.toString());
    group.unreadCounts = group.unreadCounts.filter((u) => u.user.toString() !== userId.toString());

    if (group.admins.length === 0 && group.participants.length > 0) {
      group.admins.push(group.participants[0]);
      group.admin = group.participants[0];
    }

    const leavingUser = await User.findById(userId).select("username fullName");
    const sysMsg = await Message.create({
      conversationId: group._id,
      senderId: userId,
      message: `${leavingUser?.fullName || leavingUser?.username || "A member"} left the group`,
      messageType: "system",
      mediaType: "text",
      status: "delivered",
    });

    group.messages.push(sysMsg._id);
    group.lastMessage = sysMsg._id;
    group.lastMessageAt = new Date();
    await group.save();

    const populatedGroup = await Conversation.findById(group._id)
      .populate("participants", "username fullName profilePicture lastSeen whoCanMessage")
      .populate("admins", "username fullName profilePicture")
      .populate("creator", "username fullName profilePicture")
      .populate("lastMessage");

    const groupPayload = {
      _id: populatedGroup._id,
      isGroup: true,
      groupName: populatedGroup.groupName,
      groupDescription: populatedGroup.groupDescription,
      groupAvatar: populatedGroup.groupAvatar,
      creator: populatedGroup.creator,
      admins: populatedGroup.admins,
      admin: populatedGroup.admin,
      participants: populatedGroup.participants,
      user: {
        _id: populatedGroup._id,
        isGroup: true,
        username: populatedGroup.groupName,
        fullName: populatedGroup.groupName,
        profilePicture: populatedGroup.groupAvatar || "",
        groupDescription: populatedGroup.groupDescription,
        participants: populatedGroup.participants,
        admins: populatedGroup.admins,
        creator: populatedGroup.creator,
        admin: populatedGroup.admin,
      },
      lastMessage: populatedGroup.lastMessage,
      lastMessageAt: populatedGroup.lastMessageAt,
    };

    emitToConversation(group.participants, "groupUpdated", groupPayload);
    emitToConversation(group.participants, "newMessage", { newMessage: sysMsg, conversationId: group._id, isGroup: true });
    emitToUser(userId, "removedFromGroup", { groupId });

    return res.status(200).json({ success: true, message: "You left the group" });
  } catch (error) {
    console.error("leaveGroup error:", error);
    return res.status(500).json({ success: false, message: "Unable to leave group" });
  }
};

export const promoteToAdmin = async (req, res) => {
  try {
    const groupId = req.params.id;
    const memberId = req.params.memberId;
    const userId = req.id;

    if (!mongoose.isValidObjectId(groupId) || !mongoose.isValidObjectId(memberId)) {
      return res.status(400).json({ success: false, message: "Invalid ID" });
    }

    const group = await Conversation.findOne({
      _id: groupId,
      isGroup: true,
      participants: userId,
    });

    if (!group) {
      return res.status(404).json({ success: false, message: "Group not found" });
    }

    const isAdmin = (group.admins || []).some((a) => a.toString() === userId.toString());
    if (!isAdmin) {
      return res.status(403).json({ success: false, message: "Only group admins can promote members" });
    }

    if (!group.participants.some((p) => p.toString() === memberId.toString())) {
      return res.status(400).json({ success: false, message: "User is not a member of this group" });
    }

    if (group.admins.some((a) => a.toString() === memberId.toString())) {
      return res.status(400).json({ success: false, message: "User is already an admin" });
    }

    group.admins.push(memberId);

    const adminUser = await User.findById(userId).select("username fullName");
    const targetUser = await User.findById(memberId).select("username fullName");

    const sysMsg = await Message.create({
      conversationId: group._id,
      senderId: userId,
      message: `${adminUser?.fullName || adminUser?.username || "Admin"} promoted ${targetUser?.fullName || targetUser?.username} to Admin`,
      messageType: "system",
      mediaType: "text",
      status: "delivered",
    });

    group.messages.push(sysMsg._id);
    group.lastMessage = sysMsg._id;
    group.lastMessageAt = new Date();
    await group.save();

    const populatedGroup = await Conversation.findById(group._id)
      .populate("participants", "username fullName profilePicture lastSeen whoCanMessage")
      .populate("admins", "username fullName profilePicture")
      .populate("creator", "username fullName profilePicture")
      .populate("lastMessage");

    const groupPayload = {
      _id: populatedGroup._id,
      isGroup: true,
      groupName: populatedGroup.groupName,
      groupDescription: populatedGroup.groupDescription,
      groupAvatar: populatedGroup.groupAvatar,
      creator: populatedGroup.creator,
      admins: populatedGroup.admins,
      admin: populatedGroup.admin,
      participants: populatedGroup.participants,
      user: {
        _id: populatedGroup._id,
        isGroup: true,
        username: populatedGroup.groupName,
        fullName: populatedGroup.groupName,
        profilePicture: populatedGroup.groupAvatar || "",
        groupDescription: populatedGroup.groupDescription,
        participants: populatedGroup.participants,
        admins: populatedGroup.admins,
        creator: populatedGroup.creator,
        admin: populatedGroup.admin,
      },
      lastMessage: populatedGroup.lastMessage,
      lastMessageAt: populatedGroup.lastMessageAt,
    };

    emitToConversation(group.participants, "groupUpdated", groupPayload);
    emitToConversation(group.participants, "newMessage", { newMessage: sysMsg, conversationId: group._id, isGroup: true });

    return res.status(200).json({ success: true, message: "Promoted to admin", group: groupPayload });
  } catch (error) {
    console.error("promoteToAdmin error:", error);
    return res.status(500).json({ success: false, message: "Unable to promote to admin" });
  }
};

export const demoteAdmin = async (req, res) => {
  try {
    const groupId = req.params.id;
    const memberId = req.params.memberId;
    const userId = req.id;

    if (!mongoose.isValidObjectId(groupId) || !mongoose.isValidObjectId(memberId)) {
      return res.status(400).json({ success: false, message: "Invalid ID" });
    }

    const group = await Conversation.findOne({
      _id: groupId,
      isGroup: true,
      participants: userId,
    });

    if (!group) {
      return res.status(404).json({ success: false, message: "Group not found" });
    }

    const isAdmin = (group.admins || []).some((a) => a.toString() === userId.toString());
    if (!isAdmin) {
      return res.status(403).json({ success: false, message: "Only group admins can dismiss admins" });
    }

    if (group.creator && group.creator.toString() === memberId.toString()) {
      return res.status(400).json({ success: false, message: "Group creator cannot be dismissed as admin" });
    }

    group.admins = group.admins.filter((a) => a.toString() !== memberId.toString());

    const adminUser = await User.findById(userId).select("username fullName");
    const targetUser = await User.findById(memberId).select("username fullName");

    const sysMsg = await Message.create({
      conversationId: group._id,
      senderId: userId,
      message: `${adminUser?.fullName || adminUser?.username || "Admin"} removed ${targetUser?.fullName || targetUser?.username} as Admin`,
      messageType: "system",
      mediaType: "text",
      status: "delivered",
    });

    group.messages.push(sysMsg._id);
    group.lastMessage = sysMsg._id;
    group.lastMessageAt = new Date();
    await group.save();

    const populatedGroup = await Conversation.findById(group._id)
      .populate("participants", "username fullName profilePicture lastSeen whoCanMessage")
      .populate("admins", "username fullName profilePicture")
      .populate("creator", "username fullName profilePicture")
      .populate("lastMessage");

    const groupPayload = {
      _id: populatedGroup._id,
      isGroup: true,
      groupName: populatedGroup.groupName,
      groupDescription: populatedGroup.groupDescription,
      groupAvatar: populatedGroup.groupAvatar,
      creator: populatedGroup.creator,
      admins: populatedGroup.admins,
      admin: populatedGroup.admin,
      participants: populatedGroup.participants,
      user: {
        _id: populatedGroup._id,
        isGroup: true,
        username: populatedGroup.groupName,
        fullName: populatedGroup.groupName,
        profilePicture: populatedGroup.groupAvatar || "",
        groupDescription: populatedGroup.groupDescription,
        participants: populatedGroup.participants,
        admins: populatedGroup.admins,
        creator: populatedGroup.creator,
        admin: populatedGroup.admin,
      },
      lastMessage: populatedGroup.lastMessage,
      lastMessageAt: populatedGroup.lastMessageAt,
    };

    emitToConversation(group.participants, "groupUpdated", groupPayload);
    emitToConversation(group.participants, "newMessage", { newMessage: sysMsg, conversationId: group._id, isGroup: true });

    return res.status(200).json({ success: true, message: "Admin dismissed", group: groupPayload });
  } catch (error) {
    console.error("demoteAdmin error:", error);
    return res.status(500).json({ success: false, message: "Unable to dismiss admin" });
  }
};

export const deleteConversation = async (req, res) => {
  try {
    const currentUserId = req.id;
    const { id: targetId } = req.params;

    if (!mongoose.isValidObjectId(targetId)) {
      return res.status(400).json({ success: false, message: "Invalid ID" });
    }

    // Try finding by conversation _id or by participants (1-on-1)
    let conversation = await Conversation.findOne({
      _id: targetId,
      participants: currentUserId,
    });

    if (!conversation) {
      conversation = await Conversation.findOne({
        isGroup: false,
        participants: { $all: [currentUserId, targetId] },
      });
    }

    if (!conversation) {
      return res.status(404).json({ success: false, message: "Conversation not found" });
    }

    if (conversation.isGroup) {
      conversation.participants = conversation.participants.filter(
        (p) => p.toString() !== currentUserId.toString()
      );
      conversation.admins = conversation.admins.filter(
        (a) => a.toString() !== currentUserId.toString()
      );

      if (conversation.participants.length === 0) {
        await Message.deleteMany({ _id: { $in: conversation.messages } });
        await Conversation.findByIdAndDelete(conversation._id);
      } else {
        // If creator left and no admins, make first participant admin
        if (conversation.admins.length === 0 && conversation.participants.length > 0) {
          conversation.admins.push(conversation.participants[0]);
          conversation.admin = conversation.participants[0];
        }
        await conversation.save();
      }

      return res.status(200).json({
        success: true,
        message: "You have left the group",
        conversationId: conversation._id,
      });
    }

    // For 1-on-1: "DELETE FOR ME ONLY"
    // 1. Mark existing messages in this conversation as deletedFor currentUserId
    if (conversation.messages && conversation.messages.length > 0) {
      await Message.updateMany(
        { _id: { $in: conversation.messages } },
        { $addToSet: { deletedFor: currentUserId } }
      );
    }

    // 2. Add currentUserId to conversation.deletedFor so it hides from their left inbox
    await Conversation.updateOne(
      { _id: conversation._id },
      {
        $addToSet: { deletedFor: currentUserId },
        $set: {
          "unreadCounts.$[elem].count": 0,
        },
      },
      {
        arrayFilters: [{ "elem.user": currentUserId }],
      }
    );

    // 3. Clear message notifications for currentUserId
    await Notification.deleteMany({
      recipient: currentUserId,
      type: "message",
      conversationId: conversation._id,
    });

    // NOTE: Opponent's messages & history are NOT deleted. Opponent is untouched!
    // Emit only to current user so any active window/tab of current user updates
    emitToUser(currentUserId, "conversationDeleted", {
      conversationId: conversation._id,
      targetUserId: targetId,
    });

    return res.status(200).json({
      success: true,
      message: "Chat deleted for you",
      conversationId: conversation._id,
    });
  } catch (error) {
    console.error("deleteConversation error:", error);
    return res.status(500).json({ success: false, message: "Unable to delete chat" });
  }
};
