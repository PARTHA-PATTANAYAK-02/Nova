import mongoose from "mongoose";
const postSchema = new mongoose.Schema({
  caption: { type: String, default: "" },
  image: { type: String, required: true },
  mediaType: { type: String, enum: ["image", "video"], default: "image" },
  mediaPublicId: { type: String },
  author: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  likes: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
  comments: [{ type: mongoose.Schema.Types.ObjectId, ref: "Comment" }],
  reposts: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
  repostOf: { type: mongoose.Schema.Types.ObjectId, ref: "Post", default: null },
}, { timestamps: true });

postSchema.index({ createdAt: -1 });
postSchema.index({ author: 1, createdAt: -1 });

export const Post = mongoose.model("Post", postSchema);
