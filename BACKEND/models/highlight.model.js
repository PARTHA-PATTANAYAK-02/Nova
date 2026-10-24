import mongoose from "mongoose";

const highlightSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 50,
    },
    cover: {
      type: String,
      default: "",
    },
    author: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    stories: [
      {
        storyId: { type: mongoose.Schema.Types.ObjectId, ref: "Story" },
        image: { type: String, required: true },
        mediaType: { type: String, enum: ["image", "video"], default: "image" },
        caption: { type: String, default: "" },
        poll: {
          question: { type: String, default: "" },
          options: [
            {
              text: { type: String, default: "" },
              votes: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
            },
          ],
        },
        questionSticker: {
          question: { type: String, default: "" },
          responses: [
            {
              userId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
              response: { type: String, default: "" },
              createdAt: { type: Date, default: Date.now },
            },
          ],
        },
        sharedPost: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Post",
        },
        createdAt: { type: Date, default: Date.now },
      },
    ],
  },
  { timestamps: true }
);

highlightSchema.index({ author: 1, createdAt: -1 });

export const Highlight = mongoose.model("Highlight", highlightSchema);
