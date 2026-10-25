import { Collection } from "../models/collection.model.js";
import { Post } from "../models/post.model.js";
import { User } from "../models/user.model.js";
import mongoose from "mongoose";

// Get all collections for the current user
export const getUserCollections = async (req, res) => {
  try {
    const userId = req.id;

    const collections = await Collection.find({ user: userId })
      .sort({ updatedAt: -1 })
      .populate({
        path: "posts",
        select: "image mediaType likes comments createdAt",
        options: { sort: { createdAt: -1 } },
      });

    return res.status(200).json({
      success: true,
      collections,
    });
  } catch (error) {
    console.error("getUserCollections error:", error);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

// Get single collection by ID with full post details
export const getCollectionById = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({ success: false, message: "Invalid collection ID" });
    }

    const collection = await Collection.findById(id).populate({
      path: "posts",
      options: { sort: { createdAt: -1 } },
      populate: [
        { path: "author", select: "username profilePicture fullName" },
        { path: "comments", populate: { path: "author", select: "username profilePicture" } },
      ],
    });

    if (!collection) {
      return res.status(404).json({ success: false, message: "Collection not found" });
    }

    // Only owner can view private collections
    if (collection.user.toString() !== req.id.toString() && collection.isPrivate) {
      return res.status(403).json({ success: false, message: "Access denied" });
    }

    return res.status(200).json({
      success: true,
      collection,
    });
  } catch (error) {
    console.error("getCollectionById error:", error);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

// Create a new collection
export const createCollection = async (req, res) => {
  try {
    const userId = req.id;
    const { name, coverImage, initialPostId } = req.body;

    const trimmedName = name?.trim();
    if (!trimmedName) {
      return res.status(400).json({ success: false, message: "Collection name is required" });
    }

    let initialCover = coverImage || "";
    const posts = [];

    if (initialPostId && mongoose.isValidObjectId(initialPostId)) {
      const post = await Post.findById(initialPostId);
      if (post) {
        posts.push(post._id);
        if (!initialCover) {
          initialCover = post.image;
        }

        // Also ensure user's general bookmarks includes this post
        await User.findByIdAndUpdate(userId, {
          $addToSet: { bookmarks: post._id },
        });
      }
    }

    const collection = await Collection.create({
      name: trimmedName,
      user: userId,
      coverImage: initialCover,
      posts,
    });

    return res.status(201).json({
      success: true,
      message: `Collection "${trimmedName}" created`,
      collection,
    });
  } catch (error) {
    console.error("createCollection error:", error);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

// Toggle a post in a collection (add if not present, remove if present)
export const togglePostInCollection = async (req, res) => {
  try {
    const userId = req.id;
    const { id: collectionId } = req.params;
    const { postId } = req.body;

    if (!mongoose.isValidObjectId(collectionId) || !mongoose.isValidObjectId(postId)) {
      return res.status(400).json({ success: false, message: "Invalid IDs" });
    }

    const collection = await Collection.findOne({ _id: collectionId, user: userId });
    if (!collection) {
      return res.status(404).json({ success: false, message: "Collection not found" });
    }

    const post = await Post.findById(postId);
    if (!post) {
      return res.status(404).json({ success: false, message: "Post not found" });
    }

    const hasPost = collection.posts.some((pId) => pId.toString() === postId.toString());
    let action = "added";

    if (hasPost) {
      collection.posts = collection.posts.filter((pId) => pId.toString() !== postId.toString());
      action = "removed";
    } else {
      collection.posts.unshift(post._id);
      if (!collection.coverImage) {
        collection.coverImage = post.image;
      }
      // Also ensure it is in general bookmarks
      await User.findByIdAndUpdate(userId, {
        $addToSet: { bookmarks: post._id },
      });
    }

    await collection.save();

    return res.status(200).json({
      success: true,
      action,
      message: action === "added" ? `Saved to "${collection.name}"` : `Removed from "${collection.name}"`,
      collection,
    });
  } catch (error) {
    console.error("togglePostInCollection error:", error);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

// Delete a collection
export const deleteCollection = async (req, res) => {
  try {
    const userId = req.id;
    const { id } = req.params;

    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({ success: false, message: "Invalid collection ID" });
    }

    const collection = await Collection.findOneAndDelete({ _id: id, user: userId });
    if (!collection) {
      return res.status(404).json({ success: false, message: "Collection not found" });
    }

    return res.status(200).json({
      success: true,
      message: `Collection "${collection.name}" deleted`,
    });
  } catch (error) {
    console.error("deleteCollection error:", error);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

// Update / Rename collection
export const updateCollection = async (req, res) => {
  try {
    const userId = req.id;
    const { id } = req.params;
    const { name, coverImage } = req.body;

    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({ success: false, message: "Invalid collection ID" });
    }

    const collection = await Collection.findOne({ _id: id, user: userId });
    if (!collection) {
      return res.status(404).json({ success: false, message: "Collection not found" });
    }

    if (name?.trim()) collection.name = name.trim();
    if (coverImage !== undefined) collection.coverImage = coverImage;

    await collection.save();

    return res.status(200).json({
      success: true,
      message: "Collection updated",
      collection,
    });
  } catch (error) {
    console.error("updateCollection error:", error);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};
