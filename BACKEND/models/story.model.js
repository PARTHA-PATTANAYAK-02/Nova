import mongoose from "mongoose";

const storySchema = new mongoose.Schema(
  {
    image: { type: String, required: true },
    mediaType: { type: String, enum: ["image", "video"], default: "image" },
    imagePublicId: { type: String, required: true },
    resourceType: { type: String, enum: ["image", "video"], default: "image" },
    audience: { type: String, enum: ["public", "followers"], default: "public" },
    caption: { type: String, default: "", trim: true, maxlength: 500 },
    views: [
      {
        userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
        viewedAt: { type: Date, default: Date.now },
      },
    ],
    reactions: [
      {
        userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
        emoji: { type: String, required: true },
      },
    ],
    /* Interactive Stickers */
    poll: {
      question: { type: String, default: "", trim: true },
      options: [
        {
          text: { type: String, default: "", trim: true },
          votes: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
        },
      ],
    },
    questionSticker: {
      question: { type: String, default: "", trim: true },
      responses: [
        {
          userId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
          response: { type: String, default: "", trim: true },
          createdAt: { type: Date, default: Date.now },
        },
      ],
    },
    /* Share Post to Story */
    sharedPost: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Post",
      default: null,
    },
    /* Highlights reference */
    highlightIds: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Highlight",
      },
    ],
    author: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    expiresAt: { type: Date, required: true },
  },
  { timestamps: true }
);

storySchema.index({ author: 1, expiresAt: 1 });
storySchema.index({ expiresAt: 1 });

export const Story = mongoose.model("Story", storySchema);
