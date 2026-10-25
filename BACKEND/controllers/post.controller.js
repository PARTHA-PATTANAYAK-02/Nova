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
  let uploadedPublicId;
  let resourceType = "image";
  try {
    const caption = typeof req.body.caption === "string" ? req.body.caption.trim() : "";
    const image = req.file;
    const authorId = req.id;

    if (!image) return res.status(400).json({ success: false, message: "Media file required" });
    const isVideo = image.mimetype?.startsWith("video/");
    const isImage = image.mimetype?.startsWith("image/");
    if (!isVideo && !isImage) {
      return res.status(400).json({ success: false, message: "Choose an image or video file" });
    }
    if (isVideo && image.size > 50 * 1024 * 1024) {
      return res.status(413).json({ success: false, message: "Videos must be 50 MB or smaller" });
    }
    if (isImage && image.size > 10 * 1024 * 1024) {
      return res.status(413).json({ success: false, message: "Images must be 10 MB or smaller" });
    }
    if (caption.length > 2200) {
      return res.status(400).json({ success: false, message: "Caption can be up to 2,200 characters" });
    }

    const uploadBuffer = isVideo
      ? image.buffer
      : await sharp(image.buffer)
          .rotate()
          .resize({ width: 1600, height: 1600, fit: "inside", withoutEnlargement: true })
          .jpeg({ quality: 84, mozjpeg: true })
          .toBuffer();
    resourceType = isVideo ? "video" : "image";
    const cloudResponse = await new Promise((resolve, reject) => {
      cloudinary.uploader
        .upload_stream(
          { folder: "nova/posts", resource_type: resourceType },
          (error, result) => (error ? reject(error) : resolve(result)),
        )
        .end(uploadBuffer);
    });
    uploadedPublicId = cloudResponse.public_id;
    const post = await Post.create({
      caption,
      image: cloudResponse.secure_url,
      mediaType: resourceType,
      mediaPublicId: uploadedPublicId,
      author: authorId,
    });
    const user = await User.findById(authorId);
    if (user) {
      user.posts.push(post._id);
      await user.save();
    }

    await post.populate({ path: "author", select: "-password" });

    io.emit("newPost", post);

    return res.status(201).json({
      message: "New post added",
      post,
      success: true,
    });
  } catch (error) {
    if (uploadedPublicId) {
      try {
        await cloudinary.uploader.destroy(uploadedPublicId, {
          resource_type: resourceType,
          invalidate: true,
        });
      } catch (cleanupError) {
        console.error("Unable to remove failed post upload:", cleanupError);
      }
    }
    console.error("addNewPost error:", error);
    return res.status(500).json({ success: false, message: "Unable to create post" });
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
        path: "repostOf",
        populate: { path: "author", select: "username fullName profilePicture" },
      })
      .populate({
        path: "comments",
        options: { sort: { createdAt: 1 } },
        populate: [
          { path: "author", select: "username fullName profilePicture" },
          {
            path: "replies",
            populate: { path: "author", select: "username fullName profilePicture" },
          },
        ],
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
    console.error("getAllPost error:", error);
    return res.status(500).json({ success: false, message: "Internal server error" });
  }
};
export const getPostById = async (req, res) => {
  try {
    const post = await Post.findById(req.params.id)
      .populate({ path: "author", select: "username fullName profilePicture" })
      .populate({
        path: "repostOf",
        populate: { path: "author", select: "username fullName profilePicture" },
      })
      .populate({
        path: "comments",
        options: { sort: { createdAt: 1 } },
        populate: [
          { path: "author", select: "username fullName profilePicture" },
          {
            path: "replies",
            populate: { path: "author", select: "username fullName profilePicture" },
          },
        ],
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
    console.error("getUserPost error:", error);
    return res.status(500).json({ success: false, message: "Internal server error" });
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
    const hasLiked = post.likes.some((id) => id.toString() === likeKrneWalaUserKiId.toString());
    if (!hasLiked) {
      post.likes.push(likeKrneWalaUserKiId);
      await post.save();
    }

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
  } catch (error) {
    console.error("likePost error:", error);
    return res.status(500).json({ success: false, message: "Internal server error" });
  }
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

    // dislike logic started
    post.likes = post.likes.filter((id) => id.toString() !== likeKrneWalaUserKiId.toString());
    await post.save();

    await emitPostUpdated(postId);

    return res.status(200).json({ message: "Post disliked", success: true });
  } catch (error) {
    console.error("dislikePost error:", error);
    return res.status(500).json({ success: false, message: "Internal server error" });
  }
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

    const parentCommentId = req.body.parentCommentId;

    const comment = await Comment.create({
      text,
      author: commentKrneWalaUserKiId,
      post: postId,
      parentId: parentCommentId || null,
    });

    if (parentCommentId) {
      await Comment.findByIdAndUpdate(parentCommentId, {
        $push: { replies: comment._id },
      });
    } else {
      post.comments.push(comment._id);
      await post.save();
    }

    await comment.populate({
      path: "author",
      select: "username fullName profilePicture",
    });

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

    const comments = await Comment.find({ post: postId, parentId: null })
      .populate("author", "username profilePicture fullName")
      .populate({
        path: "replies",
        populate: { path: "author", select: "username profilePicture fullName" },
      });

    if (!comments)
      return res
        .status(404)
        .json({ message: "No comments found for this post", success: false });

    return res.status(200).json({ success: true, comments });
  } catch (error) {
    console.error("getCommentsOfPost error:", error);
    return res.status(500).json({ success: false, message: "Internal server error" });
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

    if (post.mediaPublicId) {
      try {
        await cloudinary.uploader.destroy(post.mediaPublicId, {
          resource_type: post.mediaType === "video" ? "video" : "image",
          invalidate: true,
        });
      } catch (cleanupError) {
        console.error("Unable to remove deleted post media:", cleanupError);
      }
    }

    io.emit("postDeleted", postId);

    return res.status(200).json({
      success: true,
      message: "Post deleted",
    });
  } catch (error) {
    console.error("deletePost error:", error);
    return res.status(500).json({ success: false, message: "Internal server error" });
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
    if (!user) {
      return res.status(404).json({ message: "User not found", success: false });
    }

    const isBookmarked = user.bookmarks.some((id) => id.toString() === post._id.toString());
    if (isBookmarked) {
      user.bookmarks = user.bookmarks.filter((id) => id.toString() !== post._id.toString());
      await user.save();
      return res.status(200).json({
        type: "unsaved",
        message: "Post removed from bookmark",
        success: true,
      });
    } else {
      user.bookmarks.push(post._id);
      await user.save();
      return res
        .status(200)
        .json({ type: "saved", message: "Post bookmarked", success: true });
    }
  } catch (error) {
    console.error("bookmarkPost error:", error);
    return res.status(500).json({ success: false, message: "Internal server error" });
  }
};

export const getPostsByTag = async (req, res) => {
  try {
    const rawTag = req.params.tag?.trim().replace(/^#/, "");
    if (!rawTag) {
      return res.status(400).json({ success: false, message: "Hashtag is required" });
    }

    const escapedTag = rawTag.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const tagRegex = new RegExp(`#${escapedTag}(\\b|[\\s.,!?;:]|$)`, "i");

    const posts = await Post.find({ caption: { $regex: tagRegex } })
      .sort({ createdAt: -1 })
      .populate("author", "username profilePicture fullName")
      .populate({
        path: "comments",
        options: { sort: { createdAt: -1 } },
        populate: {
          path: "author",
          select: "username profilePicture fullName",
        },
      });

    return res.status(200).json({
      success: true,
      tag: rawTag,
      count: posts.length,
      posts,
    });
  } catch (error) {
    console.error("getPostsByTag error:", error);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

/* ══════════════ EXPLORE FEED & TRENDING HASHTAGS ══════════════ */
export const getExploreFeed = async (req, res) => {
  try {
    const posts = await Post.find()
      .sort({ createdAt: -1 })
      .limit(60)
      .populate("author", "username profilePicture fullName")
      .populate({
        path: "repostOf",
        populate: { path: "author", select: "username fullName profilePicture" },
      })
      .populate({
        path: "comments",
        options: { sort: { createdAt: 1 } },
        populate: {
          path: "author",
          select: "username fullName profilePicture",
        },
      });

    const tagCounts = {};
    const hashtagRegex = /#([\p{L}\p{N}_]+)/gu;
    for (const post of posts) {
      if (post.caption) {
        const matches = post.caption.matchAll(hashtagRegex);
        for (const match of matches) {
          const t = match[1].toLowerCase();
          tagCounts[t] = (tagCounts[t] || 0) + 1;
        }
      }
    }

    const fallbackTags = ["photography", "art", "vibes", "coding", "design", "travel", "nature", "music", "lifestyle"];
    fallbackTags.forEach((t) => {
      if (!tagCounts[t]) tagCounts[t] = 1;
    });

    const trendingTags = Object.entries(tagCounts)
      .map(([tag, count]) => ({ tag, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 15);

    return res.status(200).json({
      success: true,
      trendingTags,
      posts,
    });
  } catch (error) {
    console.error("getExploreFeed error:", error);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

/* ══════════════ TOGGLE PIN POST (MAX 3) ══════════════ */
export const togglePinPost = async (req, res) => {
  try {
    const postId = req.params.id;
    const userId = req.id;

    const post = await Post.findById(postId);
    if (!post) {
      return res.status(404).json({ success: false, message: "Post not found" });
    }

    if (post.author.toString() !== userId.toString()) {
      return res.status(403).json({ success: false, message: "You can only pin your own posts" });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    if (!user.pinnedPosts) user.pinnedPosts = [];
    const isPinned = user.pinnedPosts.some((id) => id.toString() === postId.toString());

    if (isPinned) {
      user.pinnedPosts = user.pinnedPosts.filter((id) => id.toString() !== postId.toString());
      await user.save();
      return res.status(200).json({
        success: true,
        isPinned: false,
        message: "Post unpinned from profile",
        pinnedPosts: user.pinnedPosts,
      });
    } else {
      if (user.pinnedPosts.length >= 3) {
        return res.status(400).json({
          success: false,
          message: "You can only pin up to 3 posts to your profile.",
        });
      }
      user.pinnedPosts.unshift(post._id);
      await user.save();
      return res.status(200).json({
        success: true,
        isPinned: true,
        message: "Post pinned to your profile! 📌",
        pinnedPosts: user.pinnedPosts,
      });
    }
  } catch (error) {
    console.error("togglePinPost error:", error);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

/* ══════════════ TOGGLE REPOST ══════════════ */
export const toggleRepost = async (req, res) => {
  try {
    const postId = req.params.id;
    const userId = req.id;

    const post = await Post.findById(postId);
    if (!post) {
      return res.status(404).json({ success: false, message: "Post not found" });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    if (!post.reposts) post.reposts = [];
    const hasReposted = post.reposts.some((id) => id.toString() === userId.toString());

    if (hasReposted) {
      post.reposts = post.reposts.filter((id) => id.toString() !== userId.toString());
      await post.save();

      user.posts = (user.posts || []).filter((id) => id.toString() !== postId.toString());
      await user.save();

      await emitPostUpdated(postId);
      return res.status(200).json({
        success: true,
        reposted: false,
        repostCount: post.reposts.length,
        message: "Repost removed",
      });
    } else {
      post.reposts.push(userId);
      await post.save();

      if (!user.posts.some((id) => id.toString() === postId.toString())) {
        user.posts.unshift(postId);
        await user.save();
      }

      if (post.author.toString() !== userId.toString()) {
        try {
          await createAndEmitNotification({
            recipient: post.author.toString(),
            actor: userId,
            type: "repost",
            postId,
          });
        } catch (err) {}
      }

      await emitPostUpdated(postId);
      return res.status(200).json({
        success: true,
        reposted: true,
        repostCount: post.reposts.length,
        message: "Reposted to your profile! 🔁",
      });
    }
  } catch (error) {
    console.error("toggleRepost error:", error);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

/* ══════════════ QUOTE POST ══════════════ */
export const quotePost = async (req, res) => {
  try {
    const postId = req.params.id;
    const userId = req.id;
    const caption = req.body.caption?.trim() || "";

    const originalPost = await Post.findById(postId).populate("author", "username fullName profilePicture");
    if (!originalPost) {
      return res.status(404).json({ success: false, message: "Post not found" });
    }

    let targetPost = originalPost;
    // Prevent recursive nesting loops: if quoting a post that itself quotes another post, flatten to root post
    if (originalPost.repostOf) {
      const rootPost = await Post.findById(originalPost.repostOf).populate("author", "username fullName profilePicture");
      if (rootPost) {
        targetPost = rootPost;
      }
    }

    const quotedPost = await Post.create({
      caption,
      image: targetPost.image,
      mediaType: targetPost.mediaType || "image",
      author: userId,
      repostOf: targetPost._id,
    });

    const user = await User.findById(userId);
    if (user) {
      user.posts.unshift(quotedPost._id);
      await user.save();
    }

    if (!originalPost.reposts) originalPost.reposts = [];
    if (!originalPost.reposts.some((id) => id.toString() === userId.toString())) {
      originalPost.reposts.push(userId);
      await originalPost.save();
    }

    await quotedPost.populate([
      { path: "author", select: "username fullName profilePicture" },
      {
        path: "repostOf",
        populate: { path: "author", select: "username fullName profilePicture" },
      },
    ]);

    if (originalPost.author?._id?.toString() !== userId.toString()) {
      try {
        await createAndEmitNotification({
          recipient: originalPost.author._id.toString(),
          actor: userId,
          type: "repost",
          postId: originalPost._id,
        });
      } catch (err) {}
    }

    return res.status(201).json({
      success: true,
      post: quotedPost,
      message: "Quote shared successfully! 💬",
    });
  } catch (error) {
    console.error("quotePost error:", error);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

/* ══════════════ LIKE / UNLIKE COMMENT ══════════════ */
export const toggleLikeComment = async (req, res) => {
  try {
    const commentId = req.params.id;
    const userId = req.id;

    const comment = await Comment.findById(commentId);
    if (!comment) {
      return res.status(404).json({ success: false, message: "Comment not found" });
    }

    if (!comment.likes) comment.likes = [];
    const hasLiked = comment.likes.some((id) => id.toString() === userId.toString());

    if (hasLiked) {
      comment.likes = comment.likes.filter((id) => id.toString() !== userId.toString());
      await comment.save();
      return res.status(200).json({
        success: true,
        liked: false,
        likeCount: comment.likes.length,
      });
    } else {
      comment.likes.push(userId);
      await comment.save();
      return res.status(200).json({
        success: true,
        liked: true,
        likeCount: comment.likes.length,
      });
    }
  } catch (error) {
    console.error("toggleLikeComment error:", error);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};
