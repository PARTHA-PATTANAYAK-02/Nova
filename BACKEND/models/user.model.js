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
    followers: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
    following: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
    posts: [{ type: mongoose.Schema.Types.ObjectId, ref: "Post" }],
    bookmarks: [{ type: mongoose.Schema.Types.ObjectId, ref: "Post" }],
  },
  { timestamps: true },
);

userSchema.index({ username: 1 }, { unique: true, sparse: true });
userSchema.index({ fullName: 1 });

export const User = mongoose.model("User", userSchema);
