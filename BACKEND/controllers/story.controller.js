import sharp from "sharp";
import mongoose from "mongoose";
import cloudinary from "../utils/cloudinary.js";
import { Story } from "../models/story.model.js";
import { User } from "../models/user.model.js";
import { Post } from "../models/post.model.js";
import { Highlight } from "../models/highlight.model.js";
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
      poll: story.poll?.question
        ? {
            question: story.poll.question,
            options: (story.poll.options || []).map((opt, optIdx) => ({
              _id: opt._id || String(optIdx),
              text: opt.text,
              voteCount: (opt.votes || []).length,
              votedByMe: (opt.votes || []).some(
                (vId) => (vId?._id || vId)?.toString() === viewerId?.toString()
              ),
            })),
            totalVotes: (story.poll.options || []).reduce(
              (acc, opt) => acc + (opt.votes?.length || 0),
              0
            ),
          }
        : null,
      questionSticker: story.questionSticker?.question
        ? {
            question: story.questionSticker.question,
            responsesCount: (story.questionSticker.responses || []).length,
            responses: isStoryAuthor
              ? (story.questionSticker.responses || []).map((r) => ({
                  _id: r._id,
                  response: r.response,
                  user:
                    r.userId && typeof r.userId === "object"
                      ? {
                          _id: r.userId._id,
                          username: r.userId.username,
                          fullName: r.userId.fullName,
                          profilePicture: r.userId.profilePicture,
                        }
                      : null,
                  createdAt: r.createdAt,
                }))
              : [],
          }
        : null,
      sharedPost: story.sharedPost
        ? {
            _id: story.sharedPost._id,
            image: story.sharedPost.image,
            mediaType: story.sharedPost.mediaType || "image",
            caption: story.sharedPost.caption,
            author: story.sharedPost.author
              ? {
                  _id: story.sharedPost.author._id,
                  username: story.sharedPost.author.username,
                  fullName: story.sharedPost.author.fullName,
                  profilePicture: story.sharedPost.author.profilePicture,
                }
              : null,
          }
        : null,
      viewedByMe:
        story.views?.some((view) => getReferenceId(view.userId) === viewerId?.toString()) ||
        false,
      reactionByMe:
        story.reactions?.find((reaction) => getReferenceId(reaction.userId) === viewerId?.toString())
          ?.emoji || null,
      reactions: (story.reactions || []).map(({ emoji }) => emoji),
      reactionDetails: isStoryAuthor
        ? (story.reactions || []).map((reaction) => ({
            emoji: reaction.emoji,
            user:
              reaction.userId && typeof reaction.userId === "object"
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

/* ═══ CREATE STORY (supports Poll, Question Sticker, & Save to Highlights) ═══ */
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

    // Parse Interactive Stickers (Poll / Question Sticker) if provided
    let pollData = undefined;
    if (req.body.poll) {
      try {
        const parsedPoll = typeof req.body.poll === "string" ? JSON.parse(req.body.poll) : req.body.poll;
        if (parsedPoll?.question && Array.isArray(parsedPoll?.options) && parsedPoll.options.length >= 2) {
          pollData = {
            question: parsedPoll.question.trim(),
            options: parsedPoll.options.map((opt) => ({
              text: typeof opt === "string" ? opt.trim() : opt.text?.trim() || "",
              votes: [],
            })),
          };
        }
      } catch (err) {
        console.error("Poll parse error:", err);
      }
    }

    let questionStickerData = undefined;
    if (req.body.questionSticker) {
      try {
        const parsedQuestion =
          typeof req.body.questionSticker === "string"
            ? JSON.parse(req.body.questionSticker)
            : req.body.questionSticker;
        if (parsedQuestion?.question) {
          questionStickerData = {
            question: parsedQuestion.question.trim(),
            responses: [],
          };
        }
      } catch (err) {
        console.error("Question sticker parse error:", err);
      }
    }

    const story = await Story.create({
      image: uploadResult.secure_url,
      mediaType: resourceType,
      imagePublicId: uploadedPublicId,
      resourceType,
      audience,
      caption,
      poll: pollData,
      questionSticker: questionStickerData,
      author: req.id,
      expiresAt: new Date(Date.now() + STORY_LIFETIME_MS),
    });

    // If user selected to save to Highlight during creation
    const highlightName = req.body.highlightName?.trim();
    const highlightId = req.body.highlightId?.trim();
    if (highlightName || highlightId) {
      try {
        let highlight;
        if (highlightId && mongoose.isValidObjectId(highlightId)) {
          highlight = await Highlight.findOne({ _id: highlightId, author: req.id });
        }
        if (!highlight && highlightName) {
          highlight = await Highlight.create({
            author: req.id,
            name: highlightName,
            cover: story.image,
            stories: [],
          });
        }
        if (highlight) {
          highlight.stories.push({
            storyId: story._id,
            image: story.image,
            mediaType: story.mediaType,
            caption: story.caption,
            poll: story.poll,
            questionSticker: story.questionSticker,
            createdAt: story.createdAt,
          });
          if (!highlight.cover) highlight.cover = story.image;
          await highlight.save();

          story.highlightIds.push(highlight._id);
          await story.save();
        }
      } catch (hlErr) {
        console.error("Error auto-adding story to highlight:", hlErr);
      }
    }

    await story.populate({ path: "author", select: "username fullName profilePicture" });

    // Emit realtime event to followers so their story bar updates
    const authorUser = await User.findById(req.id).select("followers");
    if (authorUser?.followers) {
      authorUser.followers.forEach((followerId) => {
        emitToUser(followerId, "newStory", { authorId: req.id });
      });
    }

    return res.status(201).json({
      success: true,
      message: "Story shared",
      story: serializeStoryGroups([story], req.id)[0],
    });
  } catch (error) {
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

/* ═══ SHARE POST TO STORY ═══ */
export const sharePostToStory = async (req, res) => {
  try {
    const {
      postId,
      caption = "",
      audience = "public",
      highlightName,
      highlightId,
    } = req.body;

    if (!mongoose.isValidObjectId(postId)) {
      return res.status(400).json({ success: false, message: "Invalid post ID" });
    }

    const post = await Post.findById(postId).populate("author", "username fullName profilePicture");
    if (!post) {
      return res.status(404).json({ success: false, message: "Post not found" });
    }

    const safeAudience = audience === "followers" ? "followers" : "public";

    const story = await Story.create({
      image: post.image,
      mediaType: post.mediaType || "image",
      imagePublicId: post.mediaPublicId || "shared_post",
      resourceType: post.mediaType || "image",
      audience: safeAudience,
      caption: caption.trim(),
      sharedPost: post._id,
      author: req.id,
      expiresAt: new Date(Date.now() + STORY_LIFETIME_MS),
    });

    // If user chose to save to Highlight during share
    const cleanHlName = highlightName?.trim();
    const cleanHlId = highlightId?.trim();
    if (cleanHlName || cleanHlId) {
      try {
        let highlight;
        if (cleanHlId && mongoose.isValidObjectId(cleanHlId)) {
          highlight = await Highlight.findOne({ _id: cleanHlId, author: req.id });
        }
        if (!highlight && cleanHlName) {
          highlight = await Highlight.create({
            author: req.id,
            name: cleanHlName,
            cover: post.image,
            stories: [],
          });
        }
        if (highlight) {
          highlight.stories.push({
            storyId: story._id,
            image: story.image,
            mediaType: story.mediaType,
            caption: story.caption,
            sharedPost: story.sharedPost,
            createdAt: story.createdAt,
          });
          if (!highlight.cover) highlight.cover = story.image;
          await highlight.save();

          story.highlightIds.push(highlight._id);
          await story.save();
        }
      } catch (hlErr) {
        console.error("Error auto-adding shared story to highlight:", hlErr);
      }
    }

    await story.populate({ path: "author", select: "username fullName profilePicture" });
    await story.populate({
      path: "sharedPost",
      populate: { path: "author", select: "username fullName profilePicture" },
    });

    // Notify followers
    const authorUser = await User.findById(req.id).select("followers");
    if (authorUser?.followers) {
      authorUser.followers.forEach((followerId) => {
        emitToUser(followerId, "newStory", { authorId: req.id });
      });
    }

    return res.status(201).json({
      success: true,
      message: "Post shared to your story!",
      story: serializeStoryGroups([story], req.id)[0],
    });
  } catch (error) {
    console.error("sharePostToStory error:", error);
    return res.status(500).json({ success: false, message: "Unable to share post to story" });
  }
};

/* ═══ VOTE ON STORY POLL ═══ */
export const voteStoryPoll = async (req, res) => {
  try {
    const storyId = req.params.id;
    const { optionIndex } = req.body;

    if (!mongoose.isValidObjectId(storyId)) {
      return res.status(400).json({ success: false, message: "Invalid story ID" });
    }

    const story = await Story.findById(storyId);
    if (!story || !story.poll?.question) {
      return res.status(404).json({ success: false, message: "Story poll not found" });
    }

    const options = story.poll.options;
    if (typeof optionIndex !== "number" || optionIndex < 0 || optionIndex >= options.length) {
      return res.status(400).json({ success: false, message: "Invalid poll option index" });
    }

    // Remove user's previous vote from all options
    options.forEach((opt) => {
      opt.votes = (opt.votes || []).filter((vId) => vId.toString() !== req.id.toString());
    });

    // Add vote to chosen option
    options[optionIndex].votes.push(req.id);
    await story.save();

    const formattedPoll = {
      question: story.poll.question,
      options: options.map((opt, idx) => ({
        _id: opt._id || String(idx),
        text: opt.text,
        voteCount: opt.votes.length,
        votedByMe: opt.votes.some((vId) => vId.toString() === req.id.toString()),
      })),
      totalVotes: options.reduce((acc, opt) => acc + opt.votes.length, 0),
    };

    // Broadcast poll update to viewers in real time
    io.emit("storyPollUpdated", {
      storyId: story._id,
      poll: formattedPoll,
    });

    return res.status(200).json({
      success: true,
      message: "Vote recorded",
      poll: formattedPoll,
    });
  } catch (error) {
    console.error("voteStoryPoll error:", error);
    return res.status(500).json({ success: false, message: "Unable to record vote" });
  }
};

/* ═══ RESPOND TO QUESTION STICKER (Ask Me Anything) ═══ */
export const respondToQuestionSticker = async (req, res) => {
  try {
    const storyId = req.params.id;
    const { response } = req.body;

    if (!mongoose.isValidObjectId(storyId)) {
      return res.status(400).json({ success: false, message: "Invalid story ID" });
    }
    if (!response?.trim()) {
      return res.status(400).json({ success: false, message: "Response cannot be empty" });
    }

    const story = await Story.findById(storyId);
    if (!story || !story.questionSticker?.question) {
      return res.status(404).json({ success: false, message: "Question sticker not found" });
    }

    story.questionSticker.responses.push({
      userId: req.id,
      response: response.trim(),
      createdAt: new Date(),
    });
    await story.save();

    // Notify author
    const sender = await User.findById(req.id).select("username fullName profilePicture");
    emitToUser(story.author, "notification", {
      type: "story_question_response",
      userId: req.id,
      storyId: story._id,
      message: `${sender?.fullName || sender?.username || "Someone"} answered your story question: "${response.trim()}"`,
      createdAt: new Date(),
    });

    return res.status(200).json({
      success: true,
      message: "Response sent to author!",
    });
  } catch (error) {
    console.error("respondToQuestionSticker error:", error);
    return res.status(500).json({ success: false, message: "Unable to send response" });
  }
};

/* ═══ HIGHLIGHTS MANAGEMENT ═══ */
export const createHighlight = async (req, res) => {
  try {
    const { name, storyId, storyIds, cover } = req.body;
    if (!name?.trim()) {
      return res.status(400).json({ success: false, message: "Highlight name is required" });
    }

    let initialStories = [];
    let coverUrl = cover || "";

    const rawIds = Array.isArray(storyIds) ? storyIds : storyId ? [storyId] : [];
    const validIds = rawIds.filter((id) => mongoose.isValidObjectId(id));

    if (validIds.length > 0) {
      const stories = await Story.find({ _id: { $in: validIds } });
      for (const story of stories) {
        initialStories.push({
          storyId: story._id,
          image: story.image,
          mediaType: story.mediaType,
          caption: story.caption,
          poll: story.poll,
          questionSticker: story.questionSticker,
          sharedPost: story.sharedPost,
          createdAt: story.createdAt,
        });
      }
      if (!coverUrl && initialStories[0]?.image) {
        coverUrl = initialStories[0].image;
      }
    }

    // If no stories were selected but a cover image was provided
    if (initialStories.length === 0 && coverUrl) {
      initialStories.push({
        image: coverUrl,
        mediaType: "image",
        caption: name.trim(),
        createdAt: new Date(),
      });
    }

    const highlight = await Highlight.create({
      author: req.id,
      name: name.trim(),
      cover: coverUrl,
      stories: initialStories,
    });

    if (validIds.length > 0) {
      await Story.updateMany(
        { _id: { $in: validIds } },
        { $addToSet: { highlightIds: highlight._id } }
      );
    }

    return res.status(201).json({
      success: true,
      message: "Highlight created!",
      highlight,
    });
  } catch (error) {
    console.error("createHighlight error:", error);
    return res.status(500).json({ success: false, message: "Unable to create highlight" });
  }
};

export const getUserHighlights = async (req, res) => {
  try {
    const userId = req.params.userId;
    if (!mongoose.isValidObjectId(userId)) {
      return res.status(400).json({ success: false, message: "Invalid user ID" });
    }

    const highlights = await Highlight.find({ author: userId })
      .populate({
        path: "stories.sharedPost",
        populate: { path: "author", select: "username fullName profilePicture" },
      })
      .sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      highlights,
    });
  } catch (error) {
    console.error("getUserHighlights error:", error);
    return res.status(500).json({ success: false, message: "Unable to load highlights" });
  }
};

export const getHighlightById = async (req, res) => {
  try {
    const highlightId = req.params.id;
    if (!mongoose.isValidObjectId(highlightId)) {
      return res.status(400).json({ success: false, message: "Invalid highlight ID" });
    }

    const highlight = await Highlight.findById(highlightId)
      .populate("author", "username fullName profilePicture")
      .populate({
        path: "stories.sharedPost",
        populate: { path: "author", select: "username fullName profilePicture" },
      });
    if (!highlight) {
      return res.status(404).json({ success: false, message: "Highlight not found" });
    }

    return res.status(200).json({
      success: true,
      highlight,
    });
  } catch (error) {
    console.error("getHighlightById error:", error);
    return res.status(500).json({ success: false, message: "Unable to load highlight" });
  }
};

export const addStoryToHighlight = async (req, res) => {
  try {
    const highlightId = req.params.id;
    const { storyId } = req.body;

    if (!mongoose.isValidObjectId(highlightId) || !mongoose.isValidObjectId(storyId)) {
      return res.status(400).json({ success: false, message: "Invalid IDs" });
    }

    const highlight = await Highlight.findOne({ _id: highlightId, author: req.id });
    if (!highlight) {
      return res.status(404).json({ success: false, message: "Highlight not found" });
    }

    const story = await Story.findById(storyId);
    if (!story) {
      return res.status(404).json({ success: false, message: "Story not found" });
    }

    // Check if story is already added
    const alreadyExists = highlight.stories.some(
      (s) => (s.storyId || s._id)?.toString() === story._id.toString()
    );

    if (!alreadyExists) {
      highlight.stories.push({
        storyId: story._id,
        image: story.image,
        mediaType: story.mediaType,
        caption: story.caption,
        poll: story.poll,
        questionSticker: story.questionSticker,
        sharedPost: story.sharedPost,
        createdAt: story.createdAt,
      });
      if (!highlight.cover) highlight.cover = story.image;
      await highlight.save();

      await Story.findByIdAndUpdate(story._id, {
        $addToSet: { highlightIds: highlight._id },
      });
    }

    return res.status(200).json({
      success: true,
      message: "Added to highlight!",
      highlight,
    });
  } catch (error) {
    console.error("addStoryToHighlight error:", error);
    return res.status(500).json({ success: false, message: "Unable to add to highlight" });
  }
};

export const deleteHighlight = async (req, res) => {
  try {
    const highlightId = req.params.id;
    if (!mongoose.isValidObjectId(highlightId)) {
      return res.status(400).json({ success: false, message: "Invalid highlight ID" });
    }

    const highlight = await Highlight.findOne({ _id: highlightId, author: req.id });
    if (!highlight) {
      return res.status(404).json({ success: false, message: "Highlight not found" });
    }

    await Highlight.deleteOne({ _id: highlightId });
    await Story.updateMany(
      { highlightIds: highlightId },
      { $pull: { highlightIds: highlightId } }
    );

    return res.status(200).json({
      success: true,
      message: "Highlight deleted",
    });
  } catch (error) {
    console.error("deleteHighlight error:", error);
    return res.status(500).json({ success: false, message: "Unable to delete highlight" });
  }
};

/* ═══ MY STORIES ARCHIVE FOR HIGHLIGHTS ═══ */
export const getMyStoriesArchive = async (req, res) => {
  try {
    const stories = await Story.find({ author: req.id })
      .sort({ createdAt: -1 })
      .limit(60);
    return res.status(200).json({
      success: true,
      stories: stories.map((s) => ({
        _id: s._id,
        image: s.image,
        mediaType: s.mediaType || "image",
        caption: s.caption || "",
        createdAt: s.createdAt,
        expiresAt: s.expiresAt,
        poll: s.poll,
        questionSticker: s.questionSticker,
        sharedPost: s.sharedPost,
      })),
    });
  } catch (error) {
    console.error("getMyStoriesArchive error:", error);
    return res.status(500).json({ success: false, message: "Unable to load stories" });
  }
};


/* ═══ FEED STORIES ═══ */
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
      .populate({ path: "reactions.userId", select: "username fullName profilePicture" })
      .populate({
        path: "sharedPost",
        populate: { path: "author", select: "username fullName profilePicture" },
      })
      .populate({ path: "questionSticker.responses.userId", select: "username fullName profilePicture" });

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

    // Only destroy Cloudinary asset if this story isn't saved to highlights or a shared post
    if (
      (!story.highlightIds || story.highlightIds.length === 0) &&
      !story.sharedPost
    ) {
      try {
        const publicId = story.imagePublicId;
        if (publicId && publicId !== "shared_post") {
          await cloudinary.uploader.destroy(publicId, {
            resource_type: story.resourceType === "video" ? "video" : "image",
          });
        }
      } catch (destroyError) {
        console.error("Cloudinary asset deletion error during deleteStory:", destroyError);
      }
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
      .populate({ path: "reactions.userId", select: "username fullName profilePicture" })
      .populate({
        path: "sharedPost",
        populate: { path: "author", select: "username fullName profilePicture" },
      })
      .populate({ path: "questionSticker.responses.userId", select: "username fullName profilePicture" });

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
