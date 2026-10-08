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
import { authCookieOptions, clearAuthCookie } from "../utils/authCookie.js";

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
    const [users, total] = await Promise.all([
      User.find(filter)
        .select("username fullName profilePicture bio followers following")
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
    const token = jwt.sign(
      { userId: user._id },
      environment.authentication.jwtSecret,
      { expiresIn: "1d" },
    );
    const safeUser = user.toObject();
    delete safeUser.password;

    return res
      .cookie("token", token, {
        ...authCookieOptions,
        maxAge: 24 * 60 * 60 * 1000,
      })
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

    const token = await jwt.sign(
      { userId: user._id },
      environment.authentication.jwtSecret,
      { expiresIn: "1d" },
    );

    // populate each post if in the posts array
    const populatedPosts = await Promise.all(
      user.posts.map(async (postId) => {
        const post = await Post.findById(postId);
        if (post.author.equals(user._id)) {
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
      .cookie("token", token, {
        ...authCookieOptions,
        maxAge: 1 * 24 * 60 * 60 * 1000,
      })
      .json({
        message: `Welcome back ${user.fullName?.trim() || "to Nova"}`,
        success: true,
        user,
      });
  } catch (error) {
    console.log(error);
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
    console.log(error);
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
    const userId = req.params.id;
    let user = await User.findById(userId)
      .select("-password")
      .populate({ path: "posts", createdAt: -1 })
      .populate("bookmarks")
      .populate("followers", "username fullName profilePicture")
      .populate("following", "username fullName profilePicture");
    return res.status(200).json({
      user,
      success: true,
    });
  } catch (error) {
    console.log(error);
  }
};

export const editProfile = async (req, res) => {
  try {
    const userId = req.id;
    const { username, fullName, bio, gender, dateOfBirth, website } = req.body;
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
    if (profilePicture) {
      const cloudResponse = await cloudinary.uploader.upload(
        getDataUri(profilePicture),
        { folder: "nova/profile-photos" },
      );
      user.profilePicture = cloudResponse.secure_url;
    }
    if (coverPicture) {
      const cloudResponse = await cloudinary.uploader.upload(
        getDataUri(coverPicture),
        { folder: "nova/cover-photos" },
      );
      user.coverPicture = cloudResponse.secure_url;
    }

    await user.save();

    return res.status(200).json({
      message: "Profile updated.",
      success: true,
      user,
    });
  } catch (error) {
    console.log(error);
  }
};
export const getSuggestedUsers = async (req, res) => {
  try {
    const suggestedUsers = await User.find({ _id: { $ne: req.id } }).select(
      "-password",
    );
    if (!suggestedUsers) {
      return res.status(400).json({
        message: "Currently do not have any users",
      });
    }
    return res.status(200).json({
      success: true,
      users: suggestedUsers,
    });
  } catch (error) {
    console.log(error);
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
    const isFollowing = user.following.includes(jiskoFollowKrunga);
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
    console.log(error);
  }
};
