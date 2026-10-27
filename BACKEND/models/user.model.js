import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
  {
    username: { type: String, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    password: { type: String, required: true },
    fullName: { type: String, default: "", trim: true, maxlength: 80 },
    profilePicture: { type: String, default: "" },
    coverPicture: { type: String, default: "" },
    bio: { type: String, default: "", maxlength: 300 },
    gender: { type: String, enum: ["male", "female"] },
    dateOfBirth: { type: Date },
    website: { type: String, default: "", trim: true, maxlength: 120 },
    country: { type: String, default: "", trim: true, maxlength: 80 },
    socialLinks: {
      instagram: { type: String, default: "", trim: true },
      github: { type: String, default: "", trim: true },
      twitter: { type: String, default: "", trim: true },
      youtube: { type: String, default: "", trim: true },
      linkedin: { type: String, default: "", trim: true },
    },
    featuredSocialPlatforms: [{ type: String, trim: true }],
    followers: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
    following: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
    posts: [{ type: mongoose.Schema.Types.ObjectId, ref: "Post" }],
    bookmarks: [{ type: mongoose.Schema.Types.ObjectId, ref: "Post" }],
    pinnedPosts: [{ type: mongoose.Schema.Types.ObjectId, ref: "Post" }],
    previousUsernames: [{ type: String, trim: true, lowercase: true }],
    lastSeen: { type: Date, default: Date.now },
    isPrivate: { type: Boolean, default: false },
    showLastSeen: { type: Boolean, default: true },
    whoCanMessage: { type: String, enum: ["everyone", "followers"], default: "everyone" },
    taggingPrivacy: { type: String, enum: ["everyone", "following", "no_one"], default: "everyone" },
    blockedUsers: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
  },
  { timestamps: true },
);

userSchema.index({ username: 1 }, { unique: true, sparse: true });
userSchema.index({ previousUsernames: 1 });
userSchema.index({ fullName: 1 });

export const User = mongoose.model("User", userSchema);
