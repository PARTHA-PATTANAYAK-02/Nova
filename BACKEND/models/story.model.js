import mongoose from "mongoose";

const storySchema = new mongoose.Schema(
  {
    image: { type: String, required: true },
    // Kept so the scheduled expiry job can remove the Cloudinary asset too.
    imagePublicId: { type: String, required: true },
    caption: { type: String, default: "", trim: true, maxlength: 500 },
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
