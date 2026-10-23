import sharp from "sharp";
import mongoose from "mongoose";
import cloudinary from "../utils/cloudinary.js";
import { Story } from "../models/story.model.js";
import { User } from "../models/user.model.js";
import { Message } from "../models/message.model.js";
import { Conversation } from "../models/conversation.model.js";
import { emitToUser, getReceiverSocketId, io } from "../socket/socket.js";

const STORY_LIFETIME_MS = 24 * 60 * 60 * 1000;
const STORY_REACTIONS = new Set(["❤️", "🥰", "😂", "😮", "😢", "🔥"]);
const getReferenceId = (value) => (value?._id || value)?.toString();

// Extracts duration from MP4/MOV or WebM/MKV buffer directly without external dependencies
const getVideoDurationFromBuffer = (buffer) => {
  if (!Buffer.isBuffer(buffer) || buffer.length < 16) return null;

  try {
    // 1. MP4 / MOV container (ISO BMFF): scan boxes for 'moov' -> 'mvhd'
    let offset = 0;
    while (offset + 8 <= buffer.length) {
      let size = buffer.readUInt32BE(offset);
      const type = buffer.toString("ascii", offset + 4, offset + 8);
      let headerSize = 8;
      if (size === 1) {
        if (offset + 16 > buffer.length) break;
        size = Number(buffer.readBigUInt64BE(offset + 8));
        headerSize = 16;
      } else if (size === 0) {
        size = buffer.length - offset;
      }
      if (size < headerSize) break;

      if (type === "moov") {
        let subOffset = offset + headerSize;
        const moovEnd = Math.min(offset + size, buffer.length);
        while (subOffset + 8 <= moovEnd) {
          let subSize = buffer.readUInt32BE(subOffset);
          const subType = buffer.toString("ascii", subOffset + 4, subOffset + 8);
          let subHeaderSize = 8;
          if (subSize === 1) {
            if (subOffset + 16 > moovEnd) break;
            subSize = Number(buffer.readBigUInt64BE(subOffset + 8));
            subHeaderSize = 16;
          } else if (subSize === 0) {
            subSize = moovEnd - subOffset;
          }
          if (subSize < subHeaderSize) break;

          if (subType === "mvhd") {
            const version = buffer.readUInt8(subOffset + subHeaderSize);
            if (version === 0 && subOffset + subHeaderSize + 20 <= moovEnd) {
              const timescale = buffer.readUInt32BE(subOffset + subHeaderSize + 12);
              const duration = buffer.readUInt32BE(subOffset + subHeaderSize + 16);
              if (timescale > 0) return duration / timescale;
            } else if (version === 1 && subOffset + subHeaderSize + 32 <= moovEnd) {
              const timescale = buffer.readUInt32BE(subOffset + subHeaderSize + 20);
              const duration = Number(buffer.readBigUInt64BE(subOffset + subHeaderSize + 24));
              if (timescale > 0) return duration / timescale;
            }
          }
          subOffset += subSize;
        }
      }
      offset += size;
    }
  } catch {
    // Continue fallback check
  }

  try {
    // 2. WebM / Matroska EBML: search for Duration element [0x44, 0x89]
    for (let i = 0; i < Math.min(buffer.length - 10, 50000); i++) {
      if (buffer[i] === 0x44 && buffer[i + 1] === 0x89) {
        const lenByte = buffer[i + 2];
        if (lenByte === 0x84 && i + 7 <= buffer.length) {
          const dur = buffer.readFloatBE(i + 3);
          if (Number.isFinite(dur) && dur > 0) return dur > 1000 ? dur / 1000 : dur;
        } else if (lenByte === 0x88 && i + 11 <= buffer.length) {
          const dur = buffer.readDoubleBE(i + 3);
          if (Number.isFinite(dur) && dur > 0) return dur > 1000 ? dur / 1000 : dur;
        }
      }
    }
  } catch {
    // Ignore fallback errors
  }

  return null;
};

const getViewableStory = async (storyId, viewerId) => {
  const story = await Story.findOne({
    _id: storyId,
    expiresAt: { $gt: new Date() },
  });
  if (!story) return { story: null, forbidden: false };
  if (story.author.toString() === viewerId.toString() || story.audience === "public") {
    return { story, forbidden: false };
  }
  const viewer = await User.findById(viewerId).select("following");
  const followsAuthor = viewer?.following.some(
    (followingId) => followingId.toString() === story.author.toString(),
  );
  return { story: followsAuthor ? story : null, forbidden: !followsAuthor };
};

const serializeStoryGroups = (stories, viewerId) => {
  const byAuthor = new Map();

  stories.forEach((story) => {
    if (!story.author?._id) return;
    const authorId = story.author._id.toString();
    if (!byAuthor.has(authorId)) {
      byAuthor.set(authorId, {
        _id: authorId,
        user: {
          _id: authorId,
          username: story.author.username,
          fullName: story.author.fullName,
          profilePicture: story.author.profilePicture,
        },
        items: [],
      });
    }

    const isStoryAuthor = authorId === viewerId?.toString();
    byAuthor.get(authorId).items.push({
      _id: story._id,
      image: story.image,
      mediaType: story.mediaType || "image",
      caption: story.caption,
      createdAt: story.createdAt,
      expiresAt: story.expiresAt,
      viewedByMe: story.views?.some((view) => getReferenceId(view.userId) === viewerId?.toString()) || false,
      reactionByMe: story.reactions?.find((reaction) => getReferenceId(reaction.userId) === viewerId?.toString())?.emoji || null,
      reactions: (story.reactions || []).map(({ emoji }) => emoji),
      reactionDetails: isStoryAuthor
        ? (story.reactions || []).map((reaction) => ({
            emoji: reaction.emoji,
            user: reaction.userId && typeof reaction.userId === "object"
              ? {
                  _id: reaction.userId._id,
                  username: reaction.userId.username,
                  fullName: reaction.userId.fullName,
                  profilePicture: reaction.userId.profilePicture,
                }
              : null,
          }))
        : [],
    });
  });

  return [...byAuthor.values()];
};

export const createStory = async (req, res) => {
  let uploadedPublicId;
  let uploadedResourceType = "image";
  try {
    const image = req.file;
    const caption = typeof req.body.caption === "string" ? req.body.caption.trim() : "";
    const audience = req.body.audience || "followers";
    if (!["public", "followers"].includes(audience)) {
      return res.status(400).json({ success: false, message: "Choose public or followers-only visibility" });
    }

    if (!image) {
      return res.status(400).json({ success: false, message: "Story media required" });
    }
    const isVideo = image.mimetype?.startsWith("video/");
    const isImage = image.mimetype?.startsWith("image/");
    if (!isVideo && !isImage) {
      return res.status(400).json({ success: false, message: "Choose a photo or video story" });
    }
    if (isImage && image.size > 10 * 1024 * 1024) {
      return res.status(413).json({ success: false, message: "Images must be 10 MB or smaller" });
    }
    if (isVideo && image.size > 20 * 1024 * 1024) {
      return res.status(413).json({ success: false, message: "Story videos must be 20 MB or smaller" });
    }
    if (caption.length > 500) {
      return res.status(400).json({ success: false, message: "Caption can be up to 500 characters" });
    }

    if (isVideo) {
      const clientDuration = Number(req.body.duration);
      if (Number.isFinite(clientDuration) && clientDuration > 30) {
        return res.status(400).json({ success: false, message: "Story videos must be 30 seconds or shorter" });
      }

      const bufferDuration = getVideoDurationFromBuffer(image.buffer);
      if (Number.isFinite(bufferDuration) && bufferDuration > 30.5) {
        return res.status(400).json({ success: false, message: "Story videos must be 30 seconds or shorter" });
      }
    }

    const uploadBuffer = isVideo
      ? image.buffer
      : await sharp(image.buffer)
          .rotate()
          .resize({ width: 1440, height: 2560, fit: "inside", withoutEnlargement: true })
          .jpeg({ quality: 84, mozjpeg: true })
          .toBuffer();
    const resourceType = isVideo ? "video" : "image";
    uploadedResourceType = resourceType;
    const uploadResult = await new Promise((resolve, reject) => {
      cloudinary.uploader
        .upload_stream(
          { folder: "nova/stories", resource_type: resourceType },
          (error, result) => (error ? reject(error) : resolve(result)),
        )
        .end(uploadBuffer);
    });
    uploadedPublicId = uploadResult.public_id;
    if (isVideo && (!Number.isFinite(uploadResult.duration) || uploadResult.duration > 30)) {
      await cloudinary.uploader.destroy(uploadedPublicId, {
        resource_type: "video",
        invalidate: true,
      });
      uploadedPublicId = null;
      return res.status(400).json({ success: false, message: "Story videos must be 30 seconds or shorter" });
    }

    const story = await Story.create({
      image: uploadResult.secure_url,
      mediaType: resourceType,
      imagePublicId: uploadedPublicId,
      resourceType,
      audience,
      caption,
      author: req.id,
      expiresAt: new Date(Date.now() + STORY_LIFETIME_MS),
    });
    await story.populate({ path: "author", select: "username fullName profilePicture" });

    return res.status(201).json({
      success: true,
      message: "Story shared",
      story: serializeStoryGroups([story], req.id)[0],
    });
  } catch (error) {
    // Avoid keeping a Cloudinary asset if its database record could not be made.
    if (uploadedPublicId) {
      try {
        await cloudinary.uploader.destroy(uploadedPublicId, {
          resource_type: uploadedResourceType,
          invalidate: true,
        });
      } catch (cleanupError) {
        console.error("Unable to remove failed story upload:", cleanupError);
      }
    }
    console.error("createStory error:", error);
    return res.status(500).json({ success: false, message: "Unable to share story" });
  }
};

export const getStoriesForFeed = async (req, res) => {
  try {
    const requestedUserIds = String(req.query.userIds || "")
      .split(",")
      .map((id) => id.trim())
      .filter((id) => mongoose.isValidObjectId(id))
      .slice(0, 20);

    const currentUser = await User.findById(req.id).select("following");
    if (!currentUser) {
      return res.status(401).json({ success: false, message: "User not found" });
    }
    const ownAndFollowedIds = [req.id, ...currentUser.following];
    const storyFilter = requestedUserIds.length
      ? {
          $or: [
            { author: { $in: ownAndFollowedIds.filter((id) => requestedUserIds.includes(id.toString())) } },
            { author: { $in: requestedUserIds }, audience: "public" },
          ],
        }
      : { author: { $in: ownAndFollowedIds } };
    const stories = await Story.find({
      ...storyFilter,
      expiresAt: { $gt: new Date() },
    })
      .sort({ createdAt: -1 })
      .populate({ path: "author", select: "username fullName profilePicture" })
      .populate({ path: "reactions.userId", select: "username fullName profilePicture" });

    return res.status(200).json({
      success: true,
      stories: serializeStoryGroups(stories, req.id),
    });
  } catch (error) {
    console.error("getStoriesForFeed error:", error);
    return res.status(500).json({ success: false, message: "Unable to load stories" });
  }
};

export const markStoryViewed = async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ success: false, message: "Invalid story" });
    }
    const { story, forbidden } = await getViewableStory(req.params.id, req.id);
    if (!story) {
      return res.status(forbidden ? 403 : 404).json({
        success: false,
        message: forbidden ? "Only followers can view this story" : "Story not found",
      });
    }
    await Story.updateOne(
      { _id: story._id, "views.userId": { $ne: req.id } },
      { $push: { views: { userId: req.id, viewedAt: new Date() } } },
    );
    return res.status(200).json({ success: true });
  } catch (error) {
    console.error("markStoryViewed error:", error);
    return res.status(500).json({ success: false, message: "Unable to mark story as viewed" });
  }
};

export const reactToStory = async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ success: false, message: "Invalid story" });
    }
    const { emoji } = req.body;
    if (emoji !== null && !STORY_REACTIONS.has(emoji)) {
      return res.status(400).json({ success: false, message: "Unsupported story reaction" });
    }
    const { story, forbidden } = await getViewableStory(req.params.id, req.id);
    if (!story) {
      return res.status(forbidden ? 403 : 404).json({
        success: false,
        message: forbidden ? "Only followers can react to this story" : "Story not found",
      });
    }
    const existing = story.reactions.find((reaction) => reaction.userId.toString() === req.id.toString());
    if (existing) story.reactions.pull(existing._id);
    if (emoji && existing?.emoji !== emoji) story.reactions.push({ userId: req.id, emoji });
    await story.save();
    await story.populate({ path: "reactions.userId", select: "username fullName profilePicture" });
    const reactionDetails = story.reactions.map((reaction) => ({
      emoji: reaction.emoji,
      user: {
        _id: reaction.userId._id,
        username: reaction.userId.username,
        fullName: reaction.userId.fullName,
        profilePicture: reaction.userId.profilePicture,
      },
    }));
    const reactor = reactionDetails.find((r) => r.user?._id?.toString() === req.id.toString());
    const update = {
      storyId: story._id,
      reactions: story.reactions.map((reaction) => ({
        userId: reaction.userId._id,
        emoji: reaction.emoji,
      })),
      reactionDetails: reactionDetails,
      latestReaction: emoji && reactor ? {
        emoji,
        user: reactor.user,
      } : null,
    };
    emitToUser(story.author, "storyReactionUpdated", update);
    if (story.author.toString() !== req.id.toString()) {
      emitToUser(req.id, "storyReactionUpdated", {
        storyId: story._id,
        reactions: update.reactions,
        reactionDetails: reactionDetails,
      });
      if (emoji && reactor) {
        emitToUser(story.author, "notification", {
          type: "story_reaction",
          userId: req.id,
          storyId: story._id,
          emoji,
          user: reactor.user,
          message: `${reactor.user?.fullName || reactor.user?.username || "Someone"} reacted ${emoji} to your story`,
          createdAt: new Date(),
        });
      }
    }
    return res.status(200).json({
      success: true,
      emoji: emoji && existing?.emoji !== emoji ? emoji : null,
      reactionDetails: story.author.toString() === req.id.toString() ? reactionDetails : [],
    });
  } catch (error) {
    console.error("reactToStory error:", error);
    return res.status(500).json({ success: false, message: "Unable to react to story" });
  }
};

export const replyToStory = async (req, res) => {
  try {
    const storyId = req.params.id;
    const senderId = req.id;
    const text = req.body.message?.trim();

    if (!mongoose.isValidObjectId(storyId)) {
      return res.status(400).json({ success: false, message: "Invalid story" });
    }
    if (!text) {
      return res.status(400).json({ success: false, message: "Reply message cannot be empty" });
    }

    const { story, forbidden } = await getViewableStory(storyId, senderId);
    if (!story) {
      return res.status(forbidden ? 403 : 404).json({
        success: false,
        message: forbidden ? "Only followers can reply to this story" : "Story not found",
      });
    }

    const receiverId = story.author.toString();
    if (senderId === receiverId) {
      return res.status(400).json({ success: false, message: "You cannot reply to your own story" });
    }

    const sender = await User.findById(senderId).select("username fullName profilePicture");
    if (!sender) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    const storyReplyText = `💬 Replied to story: ${text}`;

    let conversation = await Conversation.findOne({
      participants: { $all: [senderId, receiverId] },
    });
    if (!conversation) {
      conversation = await Conversation.create({
        participants: [senderId, receiverId],
        unreadCounts: [
          { user: senderId, count: 0 },
          { user: receiverId, count: 0 },
        ],
      });
    }

    const newMessage = await Message.create({
      senderId,
      receiverId,
      message: storyReplyText,
      status: "delivered",
      storyRef: {
        storyId: story._id,
        image: story.image,
        mediaType: story.mediaType,
      },
    });

    conversation.messages.push(newMessage._id);
    conversation.lastMessage = newMessage._id;
    conversation.lastMessageAt = newMessage.createdAt;
    await conversation.save();

    emitToUser(receiverId, "newMessage", newMessage);
    emitToUser(receiverId, "storyReplyReceived", {
      storyId: story._id,
      sender: {
        _id: sender._id,
        username: sender.username,
        fullName: sender.fullName,
        profilePicture: sender.profilePicture,
      },
      message: text,
      createdAt: new Date(),
    });

    return res.status(200).json({
      success: true,
      message: "Story reply sent",
      data: newMessage,
    });
  } catch (error) {
    console.error("replyToStory error:", error);
    return res.status(500).json({ success: false, message: "Unable to reply to story" });
  }
};

export const deleteStory = async (req, res) => {
  try {
    const storyId = req.params.id;
    if (!mongoose.isValidObjectId(storyId)) {
      return res.status(400).json({ success: false, message: "Invalid story ID" });
    }

    const story = await Story.findById(storyId);
    if (!story) {
      return res.status(404).json({ success: false, message: "Story not found" });
    }

    if (story.author.toString() !== req.id.toString()) {
      return res.status(403).json({ success: false, message: "You are not authorized to delete this story" });
    }

    // Remove from Cloudinary if possible
    try {
      const publicId = story.imagePublicId;
      if (publicId) {
        await cloudinary.uploader.destroy(publicId, {
          resource_type: story.resourceType === "video" ? "video" : "image",
        });
      }
    } catch (destroyError) {
      console.error("Cloudinary asset deletion error during deleteStory:", destroyError);
    }

    await Story.deleteOne({ _id: story._id });

    // Instantly wipe story image and mark unavailable/deleted in all messages referencing this story
    await Message.updateMany(
      { "storyRef.storyId": story._id },
      {
        $set: {
          "storyRef.image": null,
          "storyRef.isUnavailable": true,
          "storyRef.isDeleted": true,
        },
      }
    );

    // Broadcast deletion in real time to all connected clients
    io.emit("storyDeleted", {
      storyId: story._id,
      authorId: story.author,
    });
    io.emit("storyRefUnavailable", {
      storyId: story._id,
      isDeleted: true,
    });

    return res.status(200).json({
      success: true,
      message: "Story deleted successfully",
    });
  } catch (error) {
    console.error("deleteStory error:", error);
    return res.status(500).json({ success: false, message: "Unable to delete story" });
  }
};

export const getStoryById = async (req, res) => {
  try {
    const storyId = req.params.id;
    if (!mongoose.isValidObjectId(storyId)) {
      return res.status(400).json({ success: false, message: "Invalid story ID" });
    }

    const story = await Story.findOne({
      _id: storyId,
      expiresAt: { $gt: new Date() },
    })
      .populate({ path: "author", select: "username fullName profilePicture" })
      .populate({ path: "reactions.userId", select: "username fullName profilePicture" });

    if (!story) {
      return res.status(404).json({
        success: false,
        message: "This story is no longer available.",
      });
    }

    const serialized = serializeStoryGroups([story], req.id);
    return res.status(200).json({
      success: true,
      story: serialized[0] || null,
    });
  } catch (error) {
    console.error("getStoryById error:", error);
    return res.status(500).json({ success: false, message: "Unable to load story" });
  }
};
