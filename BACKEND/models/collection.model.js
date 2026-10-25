import mongoose from "mongoose";

const collectionSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 50,
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    coverImage: {
      type: String,
      default: "",
    },
    posts: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Post",
      },
    ],
    isPrivate: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

collectionSchema.index({ user: 1, createdAt: -1 });

export const Collection = mongoose.model("Collection", collectionSchema);
