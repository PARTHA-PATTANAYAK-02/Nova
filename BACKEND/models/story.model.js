import mongoose from "mongoose";

const storySchema = new mongoose.Schema(
  {
    image: { type: String, required: true },
    mediaType: { type: String, enum: ["image", "video"], default: "image" },
    // Kept so the scheduled expiry job can remove the Cloudinary asset too.
    imagePublicId: { type: String, required: true },
    resourceType: { type: String, enum: ["image", "video"], default: "image" },
    audience: { type: String, enum: ["public", "followers"], default: "public" },
    caption: { type: String, default: "", trim: true, maxlength: 500 },
    views: [{
      userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
      viewedAt: { type: Date, default: Date.now },
    }],
    reactions: [{
      userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
      emoji: { type: String, required: true },
    }],
    author: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    // The expiry job deletes the Cloudinary file first and this record second.
    expiresAt: { type: Date, required: true },
  },
  { timestamps: true },
);

storySchema.index({ author: 1, expiresAt: 1 });

export const Story = mongoose.model("Story", storySchema);
