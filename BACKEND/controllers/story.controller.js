import sharp from "sharp";
import mongoose from "mongoose";
import cloudinary from "../utils/cloudinary.js";
import { Story } from "../models/story.model.js";
import { User } from "../models/user.model.js";
import { getReceiverSocketId, io } from "../socket/socket.js";

const STORY_LIFETIME_MS = 24 * 60 * 60 * 1000;
const STORY_REACTIONS = new Set(["❤️", "🥰", "😂", "😮", "😢", "🔥"]);
const getReferenceId = (value) => (value?._id || value)?.toString();

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
    const update = {
      storyId: story._id,
      reactions: story.reactions.map((reaction) => ({
        userId: reaction.userId._id,
        emoji: reaction.emoji,
      })),
      reactionDetails: story.author.toString() === req.id.toString() ? reactionDetails : undefined,
    };
    const ownerSocketId = getReceiverSocketId(story.author.toString());
    if (ownerSocketId) io.to(ownerSocketId).emit("storyReactionUpdated", update);
    if (story.author.toString() !== req.id.toString()) {
      const actorSocketId = getReceiverSocketId(req.id.toString());
      if (actorSocketId) io.to(actorSocketId).emit("storyReactionUpdated", {
        storyId: story._id,
        reactions: update.reactions,
      });
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
