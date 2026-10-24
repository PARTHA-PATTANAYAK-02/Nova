import mongoose from "mongoose";

const messageSchema = new mongoose.Schema(
  {
    senderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    receiverId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    message: {
      type: String,
      trim: true,
      default: "",
    },
    mediaType: {
      type: String,
      enum: ["text", "image", "video", "audio"],
      default: "text",
    },
    mediaUrl: {
      type: String,
      default: "",
    },
    audioDuration: {
      type: Number,
      default: 0,
    },
    storyRef: {
      storyId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Story",
      },
      image: {
        type: String,
        default: null,
      },
      mediaType: {
        type: String,
        default: "image",
      },
      isUnavailable: {
        type: Boolean,
        default: false,
      },
      isDeleted: {
        type: Boolean,
        default: false,
      },
    },
    replyTo: {
      messageId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Message",
      },
      senderId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
      message: {
        type: String,
        maxlength: 5000,
      },
    },
    status: {
      type: String,
      enum: ["sent", "delivered", "seen"],
      default: "sent",
    },
    readAt: {
      type: Date,
    },
    deletedFor: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    }],
    isDeletedForEveryone: {
      type: Boolean,
      default: false,
    },
    deletedAt: {
      type: Date,
    },
    reactions: [{
      userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true,
      },
      emoji: {
        type: String,
        required: true,
      },
    }],
    starredBy: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    }],
  },
  { timestamps: true },
);

messageSchema.index({ senderId: 1, receiverId: 1, createdAt: -1 });
export const Message = mongoose.model("Message", messageSchema);
