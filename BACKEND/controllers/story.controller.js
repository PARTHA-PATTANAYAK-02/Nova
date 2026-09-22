import sharp from "sharp";
import mongoose from "mongoose";
import cloudinary from "../utils/cloudinary.js";
import { Story } from "../models/story.model.js";
import { User } from "../models/user.model.js";

const STORY_LIFETIME_MS = 24 * 60 * 60 * 1000;

const serializeStoryGroups = (stories) => {
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

    byAuthor.get(authorId).items.push({
      _id: story._id,
      image: story.image,
      caption: story.caption,
      createdAt: story.createdAt,
      expiresAt: story.expiresAt,
    });
  });

  return [...byAuthor.values()];
};

export const createStory = async (req, res) => {
  let uploadedPublicId;
  try {
    const image = req.file;
    const caption = typeof req.body.caption === "string" ? req.body.caption.trim() : "";

    if (!image) {
      return res.status(400).json({ success: false, message: "Image required" });
    }
    if (!image.mimetype?.startsWith("image/")) {
      return res.status(400).json({ success: false, message: "Only image stories are supported" });
    }
    if (image.size > 10 * 1024 * 1024) {
      return res.status(400).json({ success: false, message: "Image must be 10 MB or smaller" });
    }
    if (caption.length > 500) {
      return res.status(400).json({ success: false, message: "Caption can be up to 500 characters" });
    }

    const optimizedImage = await sharp(image.buffer)
      .rotate()
      .resize({ width: 1440, height: 2560, fit: "inside", withoutEnlargement: true })
      .jpeg({ quality: 84, mozjpeg: true })
      .toBuffer();
    const fileUri = `data:image/jpeg;base64,${optimizedImage.toString("base64")}`;
    const uploadResult = await cloudinary.uploader.upload(fileUri, {
      folder: "nova/stories",
      resource_type: "image",
    });
    uploadedPublicId = uploadResult.public_id;

    const story = await Story.create({
      image: uploadResult.secure_url,
      imagePublicId: uploadedPublicId,
      caption,
      author: req.id,
      expiresAt: new Date(Date.now() + STORY_LIFETIME_MS),
    });
    await story.populate({ path: "author", select: "username fullName profilePicture" });

    return res.status(201).json({
      success: true,
      message: "Story shared",
      story: serializeStoryGroups([story])[0],
    });
  } catch (error) {
    // Avoid keeping a Cloudinary asset if its database record could not be made.
    if (uploadedPublicId) {
      try {
        await cloudinary.uploader.destroy(uploadedPublicId, {
          resource_type: "image",
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

    let visibleAuthorIds = requestedUserIds;
    if (requestedUserIds.length === 0) {
      const currentUser = await User.findById(req.id).select("following");
      if (!currentUser) {
        return res.status(401).json({ success: false, message: "User not found" });
      }
      visibleAuthorIds = [req.id, ...currentUser.following];
    }
    const stories = await Story.find({
      author: { $in: visibleAuthorIds },
      expiresAt: { $gt: new Date() },
    })
      .sort({ createdAt: 1 })
      .populate({ path: "author", select: "username fullName profilePicture" });

    return res.status(200).json({
      success: true,
      stories: serializeStoryGroups(stories),
    });
  } catch (error) {
    console.error("getStoriesForFeed error:", error);
    return res.status(500).json({ success: false, message: "Unable to load stories" });
  }
};
