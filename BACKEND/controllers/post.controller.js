import sharp from "sharp";
import cloudinary from "../utils/cloudinary.js";
import { Post } from "../models/post.model.js";
import { User } from "../models/user.model.js";
import { Comment } from "../models/comment.model.js";
import { getReceiverSocketId, io } from "../socket/socket.js";
import { createAndEmitNotification } from "../utils/notifications.js";

// Emit the fully populated post to every connected user so all open feeds,
// comment dialogs and notification deep-links stay up to date in real time.
export const emitPostUpdated = async (postId) => {
  try {
    const post = await Post.findById(postId)
      .populate({ path: "author", select: "username fullName profilePicture" })
      .populate({
        path: "comments",
        options: { sort: { createdAt: 1 } },
        populate: {
          path: "author",
          select: "username fullName profilePicture",
        },
      });
    if (post) io.emit("postUpdated", post);
  } catch (error) {
    console.error("emitPostUpdated error:", error);
  }
};

export const addNewPost = async (req, res) => {
  try {
    const { caption } = req.body;
    const image = req.file;
    const authorId = req.id;

    if (!image) return res.status(400).json({ message: "Image required" });

    // image upload
    const optimizedImageBuffer = await sharp(image.buffer)
      .resize({ width: 800, height: 800, fit: "inside" })
      .toFormat("jpeg", { quality: 80 })
      .toBuffer();

    // buffer to data uri
    const fileUri = `data:image/jpeg;base64,${optimizedImageBuffer.toString(
      "base64",
    )}`;
    const cloudResponse = await cloudinary.uploader.upload(fileUri);
    const post = await Post.create({
      caption,
      image: cloudResponse.secure_url,
      author: authorId,
    });
    const user = await User.findById(authorId);
    if (user) {
      user.posts.push(post._id);
      await user.save();
    }

    await post.populate({ path: "author", select: "-password" });

    io.emit("postUpdated", { ...post.toObject(), comments: [] });

    return res.status(201).json({
      message: "New post added",
      post,
      success: true,
    });
  } catch (error) {
    console.log(error);
  }
};
export const getAllPost = async (req, res) => {
  try {
    const page = Math.max(Number.parseInt(req.query.page, 10) || 1, 1);
    const limit = Math.min(
      Math.max(Number.parseInt(req.query.limit, 10) || 10, 1),
      20,
    );
    const posts = await Post.find()
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .populate({ path: "author", select: "username fullName profilePicture" })
      .populate({
        path: "comments",
        sort: { createdAt: -1 },
        populate: {
          path: "author",
          select: "username fullName profilePicture",
        },
      });
    const total = await Post.countDocuments();
    return res.status(200).json({
      posts,
      page,
      limit,
      total,
      hasMore: page * limit < total,
      success: true,
    });
  } catch (error) {
    console.log(error);
  }
};
export const getPostById = async (req, res) => {
  try {
    const post = await Post.findById(req.params.id)
      .populate({ path: "author", select: "username fullName profilePicture" })
      .populate({
        path: "comments",
        options: { sort: { createdAt: 1 } },
        populate: {
          path: "author",
          select: "username fullName profilePicture",
        },
      });
    if (!post)
      return res
        .status(404)
        .json({ message: "Post not found", success: false });
    return res.status(200).json({ post, success: true });
  } catch (error) {
    console.error("getPostById error:", error);
    return res
      .status(500)
      .json({ message: "Unable to load post", success: false });
  }
};

export const getUserPost = async (req, res) => {
  try {
    const authorId = req.id;
    const posts = await Post.find({ author: authorId })
      .sort({ createdAt: -1 })
      .populate({
        path: "author",
        select: "username fullName profilePicture",
      })
      .populate({
        path: "comments",
        sort: { createdAt: -1 },
        populate: {
          path: "author",
          select: "username fullName profilePicture",
        },
      });
    return res.status(200).json({
      posts,
      success: true,
    });
  } catch (error) {
    console.log(error);
  }
};
export const likePost = async (req, res) => {
  try {
    const likeKrneWalaUserKiId = req.id;
    const postId = req.params.id;
    const post = await Post.findById(postId);
    if (!post)
      return res
        .status(404)
        .json({ message: "Post not found", success: false });

    // like logic started
    await post.updateOne({ $addToSet: { likes: likeKrneWalaUserKiId } });
    await post.save();

    // implement socket io for real time notification
    const postOwnerId = post.author.toString();
    if (postOwnerId !== likeKrneWalaUserKiId) {
      await createAndEmitNotification({
        recipient: postOwnerId,
        actor: likeKrneWalaUserKiId,
        type: "like",
        postId,
      });
    }

    await emitPostUpdated(postId);

    return res.status(200).json({ message: "Post liked", success: true });
  } catch (error) {}
};
export const dislikePost = async (req, res) => {
  try {
    const likeKrneWalaUserKiId = req.id;
    const postId = req.params.id;
    const post = await Post.findById(postId);
    if (!post)
      return res
        .status(404)
        .json({ message: "Post not found", success: false });

    // like logic started
    await post.updateOne({ $pull: { likes: likeKrneWalaUserKiId } });
    await post.save();

    await emitPostUpdated(postId);

    return res.status(200).json({ message: "Post disliked", success: true });
  } catch (error) {}
};
export const addComment = async (req, res) => {
  try {
    const postId = req.params.id;
    const commentKrneWalaUserKiId = req.id;

    const text = req.body.text?.trim();

    const post = await Post.findById(postId);

    if (!post) {
      return res
        .status(404)
        .json({ message: "Post not found", success: false });
    }

    if (!text)
      return res
        .status(400)
        .json({ message: "text is required", success: false });

    const comment = await Comment.create({
      text,
      author: commentKrneWalaUserKiId,
      post: postId,
    });

    await comment.populate({
      path: "author",
      select: "username fullName profilePicture",
    });

    post.comments.push(comment._id);
    await post.save();

    const postOwnerId = post.author.toString();
    if (postOwnerId !== commentKrneWalaUserKiId) {
      try {
        await createAndEmitNotification({
          recipient: postOwnerId,
          actor: commentKrneWalaUserKiId,
          type: "comment",
          postId,
        });
      } catch (notificationError) {
        console.error("comment notification error:", notificationError);
      }
    }

    await emitPostUpdated(postId);

    return res.status(201).json({
      message: "Comment Added",
      comment,
      success: true,
    });
  } catch (error) {
    console.error("addComment error:", error);
    return res.status(500).json({
      message: "Unable to add comment",
      success: false,
    });
  }
};
export const getCommentsOfPost = async (req, res) => {
  try {
    const postId = req.params.id;

    const comments = await Comment.find({ post: postId }).populate(
      "author",
      "username profilePicture",
    );

    if (!comments)
      return res
        .status(404)
        .json({ message: "No comments found for this post", success: false });

    return res.status(200).json({ success: true, comments });
  } catch (error) {
    console.log(error);
  }
};
export const deletePost = async (req, res) => {
  try {
    const postId = req.params.id;
    const authorId = req.id;

    const post = await Post.findById(postId);
    if (!post)
      return res
        .status(404)
        .json({ message: "Post not found", success: false });

    // check if the logged-in user is the owner of the post
    if (post.author.toString() !== authorId)
      return res.status(403).json({ message: "Unauthorized" });

    // delete post
    await Post.findByIdAndDelete(postId);

    // remove the post id from the user's post
    let user = await User.findById(authorId);
    user.posts = user.posts.filter((id) => id.toString() !== postId);
    await user.save();

    // delete associated comments
    await Comment.deleteMany({ post: postId });

    io.emit("postDeleted", postId);

    return res.status(200).json({
      success: true,
      message: "Post deleted",
    });
  } catch (error) {
    console.log(error);
  }
};
export const bookmarkPost = async (req, res) => {
  try {
    const postId = req.params.id;
    const authorId = req.id;
    const post = await Post.findById(postId);
    if (!post)
      return res
        .status(404)
        .json({ message: "Post not found", success: false });

    const user = await User.findById(authorId);
    if (user.bookmarks.includes(post._id)) {
      // already bookmarked -> remove from the bookmark
      await user.updateOne({ $pull: { bookmarks: post._id } });
      await user.save();
      return res.status(200).json({
        type: "unsaved",
        message: "Post removed from bookmark",
        success: true,
      });
    } else {
      // bookmark krna pdega
      await user.updateOne({ $addToSet: { bookmarks: post._id } });
      await user.save();
      return res
        .status(200)
        .json({ type: "saved", message: "Post bookmarked", success: true });
    }
  } catch (error) {
    console.log(error);
  }
};
