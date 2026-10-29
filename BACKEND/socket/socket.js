import { Server } from "socket.io";
import express from "express";
import http from "http";
import jwt from "jsonwebtoken";
import { environment } from "../config/environment.js";
import { User } from "../models/user.model.js";
import { Conversation } from "../models/conversation.model.js";

const app = express();

const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: (origin, callback) =>
      callback(
        null,
        !environment.runtime.isProduction ||
          !origin ||
          environment.client.allowedOrigins.includes(origin),
      ),
    methods: ["GET", "POST"],
    credentials: true,
  },
});

io.use((socket, next) => {
  const cookieHeader = socket.handshake.headers.cookie || "";
  const token = cookieHeader
    .split(";")
    .map((cookie) => cookie.trim())
    .find((cookie) => cookie.startsWith("token="))
    ?.split("=")[1];

  if (!token) return next(new Error("Unauthorized socket connection"));

  try {
    const decoded = jwt.verify(token, environment.authentication.jwtSecret);
    socket.userId = decoded.userId;
    next();
  } catch (error) {
    next(new Error("Invalid socket authentication"));
  }
});

const userSocketMap = {}; // userId -> array of socket ids

export const getReceiverSocketIds = (receiverId) => userSocketMap[receiverId] || [];

export const getReceiverSocketId = (receiverId) =>
  getReceiverSocketIds(receiverId)[0];

export const emitToUser = (userId, event, data) => {
  if (!userId) return;
  const socketIds = getReceiverSocketIds(userId?.toString?.() || userId);
  for (const socketId of socketIds) {
    io.to(socketId).emit(event, data);
  }
};

export const emitToConversation = (participantIds, event, data, excludeUserId = null) => {
  if (!Array.isArray(participantIds)) return;
  for (const pid of participantIds) {
    const idStr = pid?._id?.toString() || pid?.toString();
    if (excludeUserId && idStr === excludeUserId.toString()) continue;
    emitToUser(idStr, event, data);
  }
};

io.on("connection", (socket) => {
  const userId = socket.userId;
  if (userId) {
    if (!userSocketMap[userId]) userSocketMap[userId] = [];
    userSocketMap[userId].push(socket.id);

    // Cache user summary on socket for instant typing broadcasts without DB lookups
    User.findById(userId)
      .select("username fullName profilePicture")
      .lean()
      .then((u) => {
        if (u) {
          socket.user = {
            _id: u._id,
            username: u.username,
            fullName: u.fullName,
            profilePicture: u.profilePicture,
          };
        }
      })
      .catch((err) => console.error("Error fetching socket user info:", err));
  }

  io.emit("getOnlineUsers", Object.keys(userSocketMap));

  socket.on("typing", async ({ receiverId, conversationId, participantIds } = {}) => {
    const typingUser = socket.user || { _id: userId };
    const payload = {
      userId,
      conversationId,
      user: typingUser,
    };

    if (participantIds && Array.isArray(participantIds) && participantIds.length > 0) {
      emitToConversation(participantIds, "userTyping", payload, userId);
    } else if (conversationId) {
      // Fallback: look up conversation participants if participantIds wasn't passed
      try {
        const conv = await Conversation.findById(conversationId).select("participants").lean();
        if (conv?.participants) {
          emitToConversation(conv.participants, "userTyping", payload, userId);
        }
      } catch (err) {
        console.error("Error looking up conversation for typing:", err);
      }
    } else if (receiverId) {
      for (const socketId of getReceiverSocketIds(receiverId)) {
        io.to(socketId).emit("userTyping", payload);
      }
    }
  });

  socket.on("stopTyping", async ({ receiverId, conversationId, participantIds } = {}) => {
    const payload = { userId, conversationId };
    if (participantIds && Array.isArray(participantIds) && participantIds.length > 0) {
      emitToConversation(participantIds, "userStoppedTyping", payload, userId);
    } else if (conversationId) {
      try {
        const conv = await Conversation.findById(conversationId).select("participants").lean();
        if (conv?.participants) {
          emitToConversation(conv.participants, "userStoppedTyping", payload, userId);
        }
      } catch (err) {
        console.error("Error looking up conversation for stopTyping:", err);
      }
    } else if (receiverId) {
      for (const socketId of getReceiverSocketIds(receiverId)) {
        io.to(socketId).emit("userStoppedTyping", payload);
      }
    }
  });

  socket.on("disconnect", () => {
    if (userId) {
      userSocketMap[userId] = (userSocketMap[userId] || []).filter(
        (id) => id !== socket.id,
      );
      if (userSocketMap[userId].length === 0) {
        delete userSocketMap[userId];
        const lastSeen = new Date();
        User.findByIdAndUpdate(userId, { lastSeen }).catch((err) =>
          console.error("Error updating user lastSeen on disconnect:", err)
        );
        io.emit("userLastSeen", { userId, lastSeen: lastSeen.toISOString() });
      }
    }
    io.emit("getOnlineUsers", Object.keys(userSocketMap));
  });
});

export { app, server, io };
