import mongoose from "mongoose";
import { User } from "../models/user.model.js";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import getDataUri from "../utils/datauri.js";
import cloudinary from "../utils/cloudinary.js";
import { Post } from "../models/post.model.js";
import { getReceiverSocketId, io } from "../socket/socket.js";
import { createAndEmitNotification } from "../utils/notifications.js";
import { environment } from "../config/environment.js";
import { validateEmailDeliverability } from "../utils/emailValidation.js";
import { consumeOtp, discardOtp, issueOtp, verifyOtp } from "../utils/emailOtp.js";
import { sendOtpEmail } from "../utils/emailjs.js";
import { deleteAccountAndRelatedData } from "../utils/accountDeletion.js";
import {
  accessTokenCookieOptions,
  refreshTokenCookieOptions,
  clearAuthCookie,
} from "../utils/authCookie.js";
import { generateAccessToken, generateRefreshToken } from "../utils/token.js";

const escapeRegex = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const normalizeEmail = (email) => email?.trim().toLowerCase();
const normalizeUsername = (username) => username?.trim().toLowerCase();
const isValidPassword = (password) =>
  typeof password === "string" && password.length >= 6;
const isValidUsername = (username) =>
  typeof username === "string" && username.trim().length >= 3 && username.trim().length <= 30;
const isValidEmailFormat = (email) =>
  typeof email === "string" && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

const sendOtpForPurpose = async ({ email, purpose }) => {
  const { code, expiresInMinutes } = await issueOtp({ email, purpose });
  try {
    await sendOtpEmail({ email, code, purpose, expiresInMinutes });
  } catch (error) {
    await discardOtp({ email, purpose });
    throw error;
  }
  return expiresInMinutes;
};

export const searchUsers = async (req, res) => {
  try {
    const query = req.query.q?.trim() || "";
    const type = req.query.type || ""; // "collab" | "tag" | ""
    const page = Math.max(Number.parseInt(req.query.page, 10) || 1, 1);
    const limit = Math.min(
      Math.max(Number.parseInt(req.query.limit, 10) || 20, 1),
      20,
    );

    if (query.length < 2) {
      return res.status(200).json({ success: true, users: [], page, limit });
    }

    const searchRegex = new RegExp(`^${escapeRegex(query)}`, "i");
    const filter = {
      _id: { $ne: req.id },
      $or: [{ username: searchRegex }, { fullName: searchRegex }],
    };

    if (type === "collab") {
      // Must be mutual followers: current user follows candidate AND candidate follows current user
      const currentUser = await User.findById(req.id).select("following followers");
      const followingSet = new Set((currentUser?.following || []).map((id) => (id?._id || id)?.toString()));
      const mutualIds = (currentUser?.followers || [])
        .map((id) => (id?._id || id)?.toString())
        .filter((id) => id && id !== req.id.toString() && followingSet.has(id));

      filter._id = { $in: mutualIds };
    } else if (type === "tag") {
      // Check candidate's taggingPrivacy settings
      filter.taggingPrivacy = { $ne: "no_one" };
      filter.$and = [
        {
          $or: [
            { taggingPrivacy: { $in: ["everyone", null] } },
            { taggingPrivacy: "following", following: req.id },
          ],
        },
      ];
    }

    const [users, total] = await Promise.all([
      User.find(filter)
        .select("username fullName profilePicture bio followers following taggingPrivacy whoCanMessage")
        .sort({ username: 1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      User.countDocuments(filter),
    ]);

    return res.status(200).json({
      success: true,
      users,
      page,
      limit,
      total,
      hasMore: page * limit < total,
    });
  } catch (error) {
    console.error("searchUsers error:", error);
    return res.status(500).json({
      success: false,
      message: "Unable to search users",
    });
  }
};

export const register = async (req, res) => {
  return res.status(410).json({
    success: false,
    message: "Complete email verification before creating an account.",
  });
};

export const requestRegistrationOtp = async (req, res) => {
  try {
    const email = normalizeEmail(req.body.email);
    const fullName = req.body.fullName?.trim();
    const { password } = req.body;

    if (
      !fullName ||
      fullName.length > 80 ||
      !isValidEmailFormat(email) ||
      !isValidPassword(password)
    ) {
      return res.status(400).json({
        success: false,
        message: "Enter your name, a valid email address, and a password with at least 6 characters.",
      });
    }

    const emailInUse = await User.exists({ email });
    if (emailInUse) {
      return res.status(409).json({ success: false, message: "An account already uses this email." });
    }

    let validation;
    try {
      validation = await validateEmailDeliverability(email);
    } catch (error) {
      console.error("Abstract email validation failed:", {
        statusCode: error.statusCode || 503,
        message: error.message,
      });
      return res.status(error.statusCode || 503).json({
        success: false,
        message: error.message || "Email verification is temporarily unavailable. Please try again shortly.",
      });
    }
    if (!validation.valid) {
      return res.status(400).json({
        success: false,
        message: validation.invalidMessage,
      });
    }

    const expiresInMinutes = await sendOtpForPurpose({
      email,
      purpose: "registration",
    });
    return res.status(200).json({
      success: true,
      message: "A verification code has been sent to your email.",
      expiresInMinutes,
    });
  } catch (error) {
    console.error("requestRegistrationOtp error:", error);
    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || "Unable to send a verification code.",
    });
  }
};

export const verifyRegistrationOtp = async (req, res) => {
  try {
    const email = normalizeEmail(req.body.email);
    const fullName = req.body.fullName?.trim();
    const { password, otp } = req.body;

    if (
      !fullName ||
      fullName.length > 80 ||
      !isValidEmailFormat(email) ||
      !isValidPassword(password)
    ) {
      return res.status(400).json({ success: false, message: "Your registration details are incomplete." });
    }

    const emailInUse = await User.exists({ email });
    if (emailInUse) {
      return res.status(409).json({
        success: false,
        message: "An account already uses this email.",
      });
    }

    const verification = await consumeOtp({ email, purpose: "registration", code: otp });
    if (!verification.valid) {
      return res.status(400).json({ success: false, message: verification.message });
    }

    const hashedPassword = await bcrypt.hash(password, 12);
    const user = await User.create({ email, fullName, password: hashedPassword });
    const token = generateAccessToken(user._id);
    const refreshToken = generateRefreshToken(user._id);
    const safeUser = user.toObject();
    delete safeUser.password;

    return res
      .cookie("token", token, accessTokenCookieOptions)
      .cookie("refreshToken", refreshToken, refreshTokenCookieOptions)
      .status(201)
      .json({
        success: true,
        message: "Email verified. Welcome to Nova!",
        user: safeUser,
      });
  } catch (error) {
    console.error("verifyRegistrationOtp error:", error);
    return res.status(500).json({ success: false, message: "Unable to create your account. Please try again." });
  }
};

export const checkUsernameAvailability = async (req, res) => {
  try {
    const username = normalizeUsername(req.query.username);
    if (!isValidUsername(username)) {
      return res.status(400).json({
        success: false,
        available: false,
        message: "Username must be 3–30 characters.",
      });
    }

    const existingUser = await User.exists({
      username: new RegExp(`^${escapeRegex(username)}$`, "i"),
      _id: { $ne: req.id },
    });
    return res.status(200).json({
      success: true,
      available: !existingUser,
      message: existingUser ? "That username is already taken." : "Username is available.",
    });
  } catch (error) {
    console.error("checkUsernameAvailability error:", error);
    return res.status(500).json({
      success: false,
      message: "Unable to check username availability.",
    });
  }
};

export const requestPasswordResetOtp = async (req, res) => {
  try {
    const email = normalizeEmail(req.body.email);
    if (!isValidEmailFormat(email)) {
      return res.status(400).json({ success: false, message: "Enter a valid email address." });
    }

    const user = await User.findOne({ email }).select("_id");
    if (!user) {
      return res.status(404).json({ success: false, message: "No Nova account was found for this email." });
    }

    const expiresInMinutes = await sendOtpForPurpose({
      email,
      purpose: "password-reset",
    });
    return res.status(200).json({
      success: true,
      message: "A password reset code has been sent to your email.",
      expiresInMinutes,
    });
  } catch (error) {
    console.error("requestPasswordResetOtp error:", error);
    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || "Unable to send a password reset code.",
    });
  }
};

export const verifyPasswordResetOtp = async (req, res) => {
  try {
    const email = normalizeEmail(req.body.email);
    const { otp } = req.body;
    if (!isValidEmailFormat(email)) {
      return res.status(400).json({ success: false, message: "Enter a valid email address." });
    }

    const userExists = await User.exists({ email });
    if (!userExists) {
      return res.status(404).json({ success: false, message: "No Nova account was found for this email." });
    }

    const verification = await verifyOtp({ email, purpose: "password-reset", code: otp });
    if (!verification.valid) {
      return res.status(400).json({ success: false, message: verification.message });
    }

    return res.status(200).json({ success: true, message: "Verification code confirmed." });
  } catch (error) {
    console.error("verifyPasswordResetOtp error:", error);
    return res.status(500).json({ success: false, message: "Unable to verify that code." });
  }
};

export const resetPasswordWithOtp = async (req, res) => {
  try {
    const email = normalizeEmail(req.body.email);
    const { otp, newPassword } = req.body;
    if (!isValidEmailFormat(email) || !isValidPassword(newPassword)) {
      return res.status(400).json({
        success: false,
        message: "Enter a valid email and a password with at least 6 characters.",
      });
    }

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ success: false, message: "No Nova account was found for this email." });
    }

    const verification = await consumeOtp({
      email,
      purpose: "password-reset",
      code: otp,
      requireVerified: true,
    });
    if (!verification.valid) {
      return res.status(400).json({ success: false, message: verification.message });
    }

    user.password = await bcrypt.hash(newPassword, 12);
    await user.save();
    return res.status(200).json({
      success: true,
      message: "Your password has been reset. You can now use it to sign in or delete your account.",
    });
  } catch (error) {
    console.error("resetPasswordWithOtp error:", error);
    return res.status(500).json({ success: false, message: "Unable to reset your password." });
  }
};

export const deleteAccount = async (req, res) => {
  try {
    const { password } = req.body;
    if (!password) {
      return res.status(400).json({ success: false, message: "Enter your password to delete your account." });
    }

    const user = await User.findById(req.id);
    if (!user) {
      return res.status(404).json({ success: false, message: "Account not found." });
    }
    const passwordMatches = await bcrypt.compare(password, user.password);
    if (!passwordMatches) {
      return res.status(401).json({
        success: false,
        message: "That password is incorrect. Reset it first if you no longer remember it.",
      });
    }

    const { postIds } = await deleteAccountAndRelatedData({
      userId: user._id,
      email: user.email,
      profilePicture: user.profilePicture,
      coverPicture: user.coverPicture,
    });
    io.emit("accountDeleted", { userId: user._id.toString(), postIds });

    clearAuthCookie(res);
    return res
      .status(200)
      .json({ success: true, message: "Your account and its data have been permanently deleted." });
  } catch (error) {
    console.error("deleteAccount error:", error);
    return res.status(500).json({ success: false, message: "Unable to delete your account. Please try again." });
  }
};
export const login = async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(401).json({
        message: "Something is missing, please check!",
        success: false,
      });
    }
    let user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({
        message: "Incorrect email or password",
        success: false,
      });
    }
    const isPasswordMatch = await bcrypt.compare(password, user.password);
    if (!isPasswordMatch) {
      return res.status(401).json({
        message: "Incorrect email or password",
        success: false,
      });
    }

    const token = generateAccessToken(user._id);
    const refreshToken = generateRefreshToken(user._id);

    // populate each post if in the posts array
    const populatedPosts = await Promise.all(
      user.posts.map(async (postId) => {
        const post = await Post.findById(postId);
        if (post && post.author?.equals(user._id)) {
          return post;
        }
        return null;
      }),
    );
    user = {
      _id: user._id,
      username: user.username,
      email: user.email,
      fullName: user.fullName,
      profilePicture: user.profilePicture,
      coverPicture: user.coverPicture,
      bio: user.bio,
      followers: user.followers,
      following: user.following,
      dateOfBirth: user.dateOfBirth,
      website: user.website,
      bookmarks: user.bookmarks,
      posts: populatedPosts,
    };
    return res
      .cookie("token", token, accessTokenCookieOptions)
      .cookie("refreshToken", refreshToken, refreshTokenCookieOptions)
      .json({
        message: `Welcome back ${user.fullName?.trim() || "to Nova"}`,
        success: true,
        user,
      });
  } catch (error) {
    console.error("login error:", error);
    return res.status(500).json({ success: false, message: "Login failed" });
  }
};

export const refreshToken = async (req, res) => {
  try {
    const rawRefreshToken = req.cookies?.refreshToken;
    const rawAccessToken = req.cookies?.token;

    // 1. Try refresh token verification
    if (rawRefreshToken) {
      try {
        const decode = jwt.verify(
          rawRefreshToken,
          environment.authentication.jwtSecret,
        );
        if (decode?.userId) {
          const user = await User.findById(decode.userId).select("-password");
          if (user) {
            const newAccessToken = generateAccessToken(user._id);
            const newRefreshToken = generateRefreshToken(user._id);

            return res
              .cookie("token", newAccessToken, accessTokenCookieOptions)
              .cookie("refreshToken", newRefreshToken, refreshTokenCookieOptions)
              .status(200)
              .json({
                success: true,
                message: "Session renewed successfully",
                user,
              });
          }
        }
      } catch (refreshErr) {
        // Refresh token expired or invalid; fall through to access token fallback
      }
    }

    // 2. Fallback: if access token is still valid, renew both cookies seamlessly
    if (rawAccessToken) {
      try {
        const decodeAccess = jwt.verify(
          rawAccessToken,
          environment.authentication.jwtSecret,
        );
        if (decodeAccess?.userId) {
          const user = await User.findById(decodeAccess.userId).select("-password");
          if (user) {
            const newAccessToken = generateAccessToken(user._id);
            const newRefreshToken = generateRefreshToken(user._id);

            return res
              .cookie("token", newAccessToken, accessTokenCookieOptions)
              .cookie("refreshToken", newRefreshToken, refreshTokenCookieOptions)
              .status(200)
              .json({
                success: true,
                message: "Session renewed successfully",
                user,
              });
          }
        }
      } catch (accessErr) {
        // Both tokens invalid
      }
    }

    // 3. Both tokens are missing or invalid: clear cookies and return session expired
    clearAuthCookie(res);
    return res.status(401).json({
      success: false,
      message: "Session expired. Please log in again.",
    });
  } catch (error) {
    clearAuthCookie(res);
    return res.status(401).json({
      success: false,
      message: "Session expired. Please log in again.",
    });
  }
};

export const logout = async (_, res) => {
  try {
    clearAuthCookie(res);
    return res.json({
      message: "Logged out successfully.",
      success: true,
    });
  } catch (error) {
    console.error("logout error:", error);
    return res.status(500).json({ success: false, message: "Logout failed" });
  }
};

export const logoutOtherSessions = async (req, res) => {
  try {
    const { password } = req.body;
    if (!password) {
      return res.status(400).json({
        success: false,
        message: "Enter your password to log out other sessions.",
      });
    }

    const user = await User.findById(req.id);
    if (!user) {
      return res.status(404).json({ success: false, message: "Account not found." });
    }

    const passwordMatches = await bcrypt.compare(password, user.password);
    if (!passwordMatches) {
      return res.status(401).json({
        success: false,
        message: "Incorrect password. Verification failed.",
      });
    }

    const newAccessToken = generateAccessToken(user._id);
    const newRefreshToken = generateRefreshToken(user._id);

    return res
      .cookie("token", newAccessToken, accessTokenCookieOptions)
      .cookie("refreshToken", newRefreshToken, refreshTokenCookieOptions)
      .status(200)
      .json({
        success: true,
        message: "All other sessions have been logged out successfully.",
      });
  } catch (error) {
    console.error("logoutOtherSessions error:", error);
    return res.status(500).json({ success: false, message: "Unable to log out other sessions." });
  }
};

export const getCurrentUser = async (req, res) => {
  try {
    const user = await User.findById(req.id).select("-password");
    if (!user) {
      clearAuthCookie(res);
      return res.status(401).json({
        success: false,
        message: "Your session is no longer valid. Please sign in again.",
      });
    }

    return res.status(200).json({ success: true, user });
  } catch (error) {
    console.error("getCurrentUser error:", error);
    return res.status(500).json({
      success: false,
      message: "Unable to verify your session. Please try again.",
    });
  }
};

export const getProfile = async (req, res) => {
  try {
    const identifier = req.params.id?.trim();
    if (!identifier) {
      return res.status(400).json({ message: "Identifier is required", success: false });
    }

    const cleanUsername = identifier.replace(/^@/, "");
    const isObjectId = mongoose.isValidObjectId(identifier);
    const query = isObjectId
      ? {
          $or: [
            { _id: identifier },
            { username: { $regex: new RegExp(`^${escapeRegex(cleanUsername)}$`, "i") } },
          ],
        }
      : { username: { $regex: new RegExp(`^${escapeRegex(cleanUsername)}$`, "i") } };

    let user = await User.findOne(query)
      .select("-password")
      .populate({
        path: "posts",
        options: { sort: { createdAt: -1 } },
        populate: [
          { path: "author", select: "username fullName profilePicture" },
          {
            path: "repostOf",
            populate: { path: "author", select: "username fullName profilePicture" },
          },
        ],
      })
      .populate({
        path: "pinnedPosts",
        populate: [
          { path: "author", select: "username fullName profilePicture" },
          {
            path: "repostOf",
            populate: { path: "author", select: "username fullName profilePicture" },
          },
        ],
      })
      .populate("bookmarks")
      .populate("followers", "username fullName profilePicture")
      .populate("following", "username fullName profilePicture");

    if (!user) {
      // Check if identifier was an old username of any user
      user = await User.findOne({
        previousUsernames: cleanUsername.toLowerCase(),
      })
        .select("-password")
        .populate({
          path: "posts",
          options: { sort: { createdAt: -1 } },
          populate: [
            { path: "author", select: "username fullName profilePicture" },
            {
              path: "repostOf",
              populate: { path: "author", select: "username fullName profilePicture" },
            },
          ],
        })
        .populate({
          path: "pinnedPosts",
          populate: [
            { path: "author", select: "username fullName profilePicture" },
            {
              path: "repostOf",
              populate: { path: "author", select: "username fullName profilePicture" },
            },
          ],
        })
        .populate("bookmarks")
        .populate("followers", "username fullName profilePicture")
        .populate("following", "username fullName profilePicture");
    }

    if (!user) {
      return res.status(404).json({
        message: "User not found",
        success: false,
      });
    }

    const requesterId = req.id?.toString();
    const isOwner = user._id.toString() === requesterId;
    const isFollowing = (user.followers || []).some(
      (f) => (f?._id || f)?.toString() === requesterId
    );

    const isPrivateLocked = Boolean(user.isPrivate && !isOwner && !isFollowing);

    const userObj = user.toObject();
    userObj.followersCount = (user.followers || []).length;
    userObj.followingCount = (user.following || []).length;

    // Fetch posts where this user is tagged or collaborator
    const taggedPosts = await Post.find({
      $or: [
        { "taggedUsers.user": user._id },
        { collaborators: user._id },
      ],
    })
      .sort({ createdAt: -1 })
      .populate({ path: "author", select: "username fullName profilePicture" })
      .populate({ path: "collaborators", select: "username fullName profilePicture" })
      .populate({
        path: "repostOf",
        populate: { path: "author", select: "username fullName profilePicture" },
      })
      .populate({ path: "taggedUsers.user", select: "username fullName profilePicture" });

    userObj.taggedPosts = taggedPosts || [];

    // Also include collab posts in user's main posts if not already present
    const collabPosts = await Post.find({
      collaborators: user._id,
      author: { $ne: user._id },
    })
      .sort({ createdAt: -1 })
      .populate({ path: "author", select: "username fullName profilePicture" })
      .populate({ path: "collaborators", select: "username fullName profilePicture" })
      .populate({
        path: "repostOf",
        populate: { path: "author", select: "username fullName profilePicture" },
      })
      .populate({ path: "taggedUsers.user", select: "username fullName profilePicture" });

    if (collabPosts.length > 0 && Array.isArray(userObj.posts)) {
      const postIds = new Set((userObj.posts || []).map((p) => p._id?.toString()));
      for (const cp of collabPosts) {
        if (!postIds.has(cp._id?.toString())) {
          userObj.posts.push(cp);
          postIds.add(cp._id?.toString());
        }
      }
      userObj.posts.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    }

    if (isPrivateLocked) {
      userObj.posts = [];
      userObj.pinnedPosts = [];
      userObj.bookmarks = [];
      userObj.taggedPosts = [];
      userObj.isPrivateLocked = true;
      userObj.followers = [];
      userObj.following = [];
      userObj.dateOfBirth = null;
    } else {
      userObj.isPrivateLocked = false;
    }

    if (user.showLastSeen === false && !isOwner) {
      userObj.lastSeen = null;
    }

    return res.status(200).json({
      user: userObj,
      success: true,
    });
  } catch (error) {
    console.error("getProfile error:", error);
    return res.status(500).json({
      message: "Failed to fetch user profile",
      success: false,
    });
  }
};

export const verifyPassword = async (req, res) => {
  try {
    const userId = req.id;
    const { password } = req.body;
    if (!password) {
      return res.status(400).json({
        message: "Password is required.",
        success: false,
      });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        message: "User not found.",
        success: false,
      });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({
        message: "Incorrect password. Please try again.",
        success: false,
      });
    }

    return res.status(200).json({
      message: "Password verified.",
      success: true,
    });
  } catch (error) {
    console.error("verifyPassword error:", error);
    return res.status(500).json({
      message: "Failed to verify password.",
      success: false,
    });
  }
};

export const editProfile = async (req, res) => {
  try {
    const userId = req.id;
    const { username, fullName, bio, gender, dateOfBirth, website, country } = req.body;
    const profilePicture = req.files?.profilePhoto?.[0];
    const coverPicture = req.files?.coverPhoto?.[0];

    const user = await User.findById(userId).select("-password");
    if (!user) {
      return res.status(404).json({
        message: "User not found.",
        success: false,
      });
    }
    if (
      username !== undefined &&
      normalizeUsername(username) !== normalizeUsername(user.username || "")
    ) {
      const normalizedUsername = normalizeUsername(username);
      if (normalizedUsername && !isValidUsername(normalizedUsername)) {
        return res.status(400).json({
          message: "Username must be 3–30 characters.",
          success: false,
        });
      }
      if (normalizedUsername) {
        const existingUser = await User.findOne({
          username: new RegExp(`^${escapeRegex(normalizedUsername)}$`, "i"),
          _id: { $ne: userId },
        });
        if (existingUser) {
          return res.status(409).json({
            message: "That username is already taken.",
            success: false,
          });
        }
        const oldUsername = normalizeUsername(user.username || "");
        if (oldUsername && oldUsername !== normalizedUsername) {
          if (!user.previousUsernames) user.previousUsernames = [];
          if (!user.previousUsernames.includes(oldUsername)) {
            user.previousUsernames.push(oldUsername);
          }
        }
        user.username = normalizedUsername;
      }
    }
    if (fullName !== undefined) user.fullName = fullName.trim();
    if (bio !== undefined) user.bio = bio.trim();
    if (gender !== undefined && gender !== "") user.gender = gender;
    if (dateOfBirth !== undefined && dateOfBirth !== "") {
      const parsedDate = new Date(dateOfBirth);
      if (Number.isNaN(parsedDate.getTime())) {
        return res.status(400).json({
          message: "Please provide a valid date of birth.",
          success: false,
        });
      }
      if (parsedDate > new Date()) {
        return res.status(400).json({
          message: "Date of birth cannot be in the future.",
          success: false,
        });
      }
      user.dateOfBirth = parsedDate;
    }
    if (website !== undefined) user.website = website.trim();
    if (country !== undefined) user.country = country.trim();

    if (req.body.socialLinks !== undefined) {
      try {
        const parsed = typeof req.body.socialLinks === "string"
          ? JSON.parse(req.body.socialLinks)
          : req.body.socialLinks;
        user.socialLinks = {
          instagram: parsed?.instagram?.trim() || "",
          github: parsed?.github?.trim() || "",
          twitter: parsed?.twitter?.trim() || "",
          youtube: parsed?.youtube?.trim() || "",
          linkedin: parsed?.linkedin?.trim() || "",
        };
      } catch (e) {
        user.socialLinks = {
          instagram: req.body.instagram?.trim() || user.socialLinks?.instagram || "",
          github: req.body.github?.trim() || user.socialLinks?.github || "",
          twitter: req.body.twitter?.trim() || user.socialLinks?.twitter || "",
          youtube: req.body.youtube?.trim() || user.socialLinks?.youtube || "",
          linkedin: req.body.linkedin?.trim() || user.socialLinks?.linkedin || "",
        };
      }
    }

    if (req.body.featuredSocialPlatforms !== undefined) {
      try {
        const parsed = typeof req.body.featuredSocialPlatforms === "string"
          ? JSON.parse(req.body.featuredSocialPlatforms)
          : req.body.featuredSocialPlatforms;
        if (Array.isArray(parsed)) {
          user.featuredSocialPlatforms = parsed.slice(0, 2);
        }
      } catch (e) {
        // ignore invalid json
      }
    }

    if (req.body.isPrivate !== undefined) {
      user.isPrivate = req.body.isPrivate === "true" || req.body.isPrivate === true;
    }
    if (req.body.showLastSeen !== undefined) {
      user.showLastSeen = req.body.showLastSeen === "true" || req.body.showLastSeen === true;
    }
    if (req.body.whoCanMessage !== undefined && ["everyone", "followers", "no_one"].includes(req.body.whoCanMessage)) {
      user.whoCanMessage = req.body.whoCanMessage;
    }
    if (req.body.taggingPrivacy !== undefined && ["everyone", "following", "no_one"].includes(req.body.taggingPrivacy)) {
      user.taggingPrivacy = req.body.taggingPrivacy;
    }
    const isAllowedStaticImage = (file) => {
      if (!file) return false;
      const mime = (file.mimetype || "").toLowerCase();
      const name = (file.originalname || "").toLowerCase();
      const ext = name.includes(".") ? name.substring(name.lastIndexOf(".")).toLowerCase() : "";
      if (mime === "image/gif" || ext === ".gif") return false;
      const allowedExts = [".jpg", ".jpeg", ".png", ".webp"];
      const allowedMimes = ["image/jpeg", "image/png", "image/webp", "image/jpg"];
      return allowedExts.includes(ext) && allowedMimes.includes(mime);
    };

    if (profilePicture && isAllowedStaticImage(profilePicture)) {
      const cloudResponse = await cloudinary.uploader.upload(
        getDataUri(profilePicture),
        { folder: "nova/profile-photos" },
      );
      user.profilePicture = cloudResponse.secure_url;
    }
    if (coverPicture && isAllowedStaticImage(coverPicture)) {
      const cloudResponse = await cloudinary.uploader.upload(
        getDataUri(coverPicture),
        { folder: "nova/cover-photos" },
      );
      user.coverPicture = cloudResponse.secure_url;
    }

    await user.save();

    if (req.body.whoCanMessage !== undefined && io) {
      io.emit("userPrivacyChanged", {
        userId: user._id.toString(),
        whoCanMessage: user.whoCanMessage,
      });
    }

    return res.status(200).json({
      message: "Profile updated.",
      success: true,
      user,
    });
  } catch (error) {
    console.error("editProfile error:", error);
    return res.status(500).json({ success: false, message: "Profile update failed" });
  }
};
export const getSuggestedUsers = async (req, res) => {
  try {
    const type = req.query.type || "";

    if (type === "collab") {
      // Return mutual followers for collaboration
      const currentUser = await User.findById(req.id).select("following followers");
      const followingSet = new Set((currentUser?.following || []).map((id) => (id?._id || id)?.toString()));
      const mutualIds = (currentUser?.followers || [])
        .map((id) => (id?._id || id)?.toString())
        .filter((id) => id && id !== req.id.toString() && followingSet.has(id));

      const collabCandidates = await User.find({ _id: { $in: mutualIds } })
        .select("username fullName profilePicture bio")
        .limit(15);

      return res.status(200).json({
        success: true,
        users: collabCandidates || [],
      });
    }

    if (type === "tag") {
      // Return users who allow tagging
      const candidates = await User.find({
        _id: { $ne: req.id },
        taggingPrivacy: { $ne: "no_one" },
        $or: [
          { taggingPrivacy: { $in: ["everyone", null] } },
          { taggingPrivacy: "following", following: req.id },
        ],
      })
        .select("username fullName profilePicture bio")
        .limit(15);

      return res.status(200).json({
        success: true,
        users: candidates || [],
      });
    }

    const currentUser = await User.findById(req.id).select("following");
    const followingIds = (currentUser?.following || []).map((id) => (id?._id || id)?.toString());
    const excludedIds = [req.id, ...followingIds];

    // Priority 1: Users the current user doesn't follow yet
    let suggestedUsers = await User.find({ _id: { $nin: excludedIds } })
      .select("-password")
      .limit(10);

    // Fallback: If no unfollowed users exist, show other community users so the section is never blank
    if (!suggestedUsers || suggestedUsers.length === 0) {
      suggestedUsers = await User.find({ _id: { $ne: req.id } })
        .select("-password")
        .limit(10);
    }

    return res.status(200).json({
      success: true,
      users: suggestedUsers || [],
    });
  } catch (error) {
    console.error("getSuggestedUsers error:", error);
    return res.status(500).json({
      message: "Failed to fetch suggested users",
      success: false,
    });
  }
};
export const followOrUnfollow = async (req, res) => {
  try {
    const followKrneWala = req.id; // patel
    const jiskoFollowKrunga = req.params.id; // shivani
    if (followKrneWala === jiskoFollowKrunga) {
      return res.status(400).json({
        message: "You cannot follow/unfollow yourself",
        success: false,
      });
    }

    const user = await User.findById(followKrneWala);
    const targetUser = await User.findById(jiskoFollowKrunga);

    if (!user || !targetUser) {
      return res.status(400).json({
        message: "User not found",
        success: false,
      });
    }
    // mai check krunga ki follow krna hai ya unfollow
    const isFollowing = (user.following || []).some((id) => (id?._id || id)?.toString() === jiskoFollowKrunga.toString());
    if (isFollowing) {
      // unfollow logic ayega
      await Promise.all([
        User.updateOne(
          { _id: followKrneWala },
          { $pull: { following: jiskoFollowKrunga } },
        ),
        User.updateOne(
          { _id: jiskoFollowKrunga },
          { $pull: { followers: followKrneWala } },
        ),
      ]);

      return res
        .status(200)
        .json({ message: "Unfollowed successfully", success: true });
    } else {
      // follow logic ayega
      await Promise.all([
        User.updateOne(
          { _id: followKrneWala },
          { $push: { following: jiskoFollowKrunga } },
        ),
        User.updateOne(
          { _id: jiskoFollowKrunga },
          { $push: { followers: followKrneWala } },
        ),
      ]);

      await createAndEmitNotification({
        recipient: jiskoFollowKrunga,
        actor: followKrneWala,
        type: "follow",
      });
      return res
        .status(200)
        .json({ message: "followed successfully", success: true });
    }
  } catch (error) {
    console.error("followOrUnfollow error:", error);
    return res.status(500).json({ success: false, message: "Failed to update follow status" });
  }
};
