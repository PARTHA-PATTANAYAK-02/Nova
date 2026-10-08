import mongoose from "mongoose";
import { environment } from "../config/environment.js";
import cloudinary from "./cloudinary.js";
import { Comment } from "../models/comment.model.js";
import { Conversation } from "../models/conversation.model.js";
import { EmailOtp } from "../models/emailOtp.model.js";
import { Message } from "../models/message.model.js";
import { Notification } from "../models/notification.model.js";
import { Post } from "../models/post.model.js";
import { Story } from "../models/story.model.js";
import { User } from "../models/user.model.js";

const withSession = (query, session) => (session ? query.session(session) : query);
const operationOptions = (session) => (session ? { session } : {});

const cloudinaryPublicIdFromUrl = (fileUrl) => {
  if (!fileUrl || !environment.cloudinary.cloudName) return null;

  try {
    const url = new URL(fileUrl);
    if (url.hostname !== "res.cloudinary.com") return null;

    const uploadPrefix = `/${environment.cloudinary.cloudName}/image/upload/`;
    if (!url.pathname.startsWith(uploadPrefix)) return null;

    const assetPath = decodeURIComponent(url.pathname.slice(uploadPrefix.length))
      .replace(/^v\d+\//, "")
      .replace(/\.[^.]+$/, "");
    return assetPath || null;
  } catch {
    return null;
  }
};

const cleanAccountRecords = async ({ userId, email, profilePicture, coverPicture, session }) => {
  const options = operationOptions(session);
  // Keep operations sequential while a Mongo transaction is active. Mongoose
  // explicitly does not support parallel queries on the same session.
  const posts = await withSession(
    Post.find({ author: userId }).select("_id image mediaType mediaPublicId"),
    session,
  ).lean();
  const stories = await withSession(
    Story.find({ author: userId }).select("_id imagePublicId resourceType"),
    session,
  ).lean();
  const conversations = await withSession(
    Conversation.find({ participants: userId }).select("_id messages"),
    session,
  ).lean();

  const postIds = posts.map((post) => post._id);
  const conversationIds = conversations.map((conversation) => conversation._id);
  const conversationMessageIds = conversations.flatMap(
    (conversation) => conversation.messages || [],
  );
  const comments = await withSession(
    Comment.find({
      $or: [{ author: userId }, ...(postIds.length ? [{ post: { $in: postIds } }] : [])],
    }).select("_id"),
    session,
  ).lean();
  const commentIds = comments.map((comment) => comment._id);

  const userMessageIds = (
    await withSession(
      Message.find({ $or: [{ senderId: userId }, { receiverId: userId }] }).select("_id"),
      session,
    ).lean()
  ).map((message) => message._id);
  const messageIds = [...new Set([...conversationMessageIds, ...userMessageIds].map(String))];

  const notificationFilters = [
    { recipient: userId },
    { actor: userId },
    ...(postIds.length ? [{ postId: { $in: postIds } }] : []),
    ...(messageIds.length ? [{ messageId: { $in: messageIds } }] : []),
    ...(conversationIds.length
      ? [{ conversationId: { $in: conversationIds } }]
      : []),
  ];

  // Remove every relationship, saved post and authored-post reference from
  // surviving accounts before the user and posts disappear.
  await User.updateMany(
    { _id: { $ne: userId } },
    {
      $pull: {
        followers: userId,
        following: userId,
        ...(postIds.length ? { bookmarks: { $in: postIds }, posts: { $in: postIds } } : {}),
      },
    },
    options,
  );
  await Post.updateMany(
    { _id: { $nin: postIds } },
    {
      $pull: {
        likes: userId,
        ...(commentIds.length ? { comments: { $in: commentIds } } : {}),
      },
    },
    options,
  );
  await Story.updateMany(
    { author: { $ne: userId } },
    {
      $pull: {
        views: { userId },
        reactions: { userId },
      },
    },
    options,
  );
  await Notification.deleteMany({ $or: notificationFilters }, options);
  await Message.deleteMany(
    {
      $or: [
        { senderId: userId },
        { receiverId: userId },
        ...(messageIds.length ? [{ _id: { $in: messageIds } }] : []),
      ],
    },
    options,
  );
  await Conversation.deleteMany({ participants: userId }, options);
  await Comment.deleteMany(
    {
      $or: [
        { author: userId },
        ...(postIds.length ? [{ post: { $in: postIds } }] : []),
      ],
    },
    options,
  );
  await Post.deleteMany({ author: userId }, options);
  await Story.deleteMany({ author: userId }, options);
  await EmailOtp.deleteMany({ email }, options);
  await User.deleteOne({ _id: userId }, options);

  return {
    postIds: postIds.map(String),
    mediaAssets: [
      ...stories.map((story) => ({
        publicId: story.imagePublicId,
        resourceType: story.resourceType === "video" ? "video" : "image",
      })),
      ...posts.map((post) => ({
        publicId: post.mediaPublicId || cloudinaryPublicIdFromUrl(post.image),
        resourceType: post.mediaType === "video" ? "video" : "image",
      })),
      { publicId: cloudinaryPublicIdFromUrl(profilePicture), resourceType: "image" },
      { publicId: cloudinaryPublicIdFromUrl(coverPicture), resourceType: "image" },
    ].filter((asset) => asset.publicId),
  };
};

const transactionUnavailable = (error) =>
  /Transaction numbers are only allowed|replica set|mongos/i.test(error?.message || "");

export const deleteAccountAndRelatedData = async ({
  userId,
  email,
  profilePicture,
  coverPicture,
}) => {
  const session = await mongoose.startSession();
  let result;

  try {
    await session.withTransaction(async () => {
      result = await cleanAccountRecords({
        userId,
        email,
        profilePicture,
        coverPicture,
        session,
      });
    });
  } catch (error) {
    if (!transactionUnavailable(error)) throw error;

    // Local standalone MongoDB does not support transactions. The same ordered
    // cleanup still keeps development and self-hosted installs functional.
    console.warn("MongoDB transactions unavailable; using account cleanup fallback.");
    result = await cleanAccountRecords({
      userId,
      email,
      profilePicture,
      coverPicture,
      session: null,
    });
  } finally {
    await session.endSession();
  }

  const cloudinaryResults = await Promise.allSettled(
    [...new Map(
      result.mediaAssets.map((asset) => [`${asset.resourceType}:${asset.publicId}`, asset]),
    ).values()].map((asset) =>
      cloudinary.uploader.destroy(asset.publicId, {
        resource_type: asset.resourceType,
        invalidate: true,
      }),
    ),
  );
  cloudinaryResults.forEach((cloudResult) => {
    if (cloudResult.status === "rejected") {
      console.error("Could not remove a deleted account's story asset:", cloudResult.reason);
    }
  });

  return result;
};
