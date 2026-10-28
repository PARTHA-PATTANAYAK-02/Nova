import { Server } from "socket.io";
import express from "express";
import http from "http";
import jwt from "jsonwebtoken";
import { environment } from "../config/environment.js";
import { User } from "../models/user.model.js";

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
  }

  io.emit("getOnlineUsers", Object.keys(userSocketMap));

  socket.on("typing", ({ receiverId, conversationId, participantIds } = {}) => {
    if (participantIds && Array.isArray(participantIds)) {
      emitToConversation(participantIds, "userTyping", { userId, conversationId }, userId);
    } else if (receiverId) {
      for (const socketId of getReceiverSocketIds(receiverId)) {
        io.to(socketId).emit("userTyping", { userId, conversationId });
      }
    }
  });

  socket.on("stopTyping", ({ receiverId, conversationId, participantIds } = {}) => {
    if (participantIds && Array.isArray(participantIds)) {
      emitToConversation(participantIds, "userStoppedTyping", { userId, conversationId }, userId);
    } else if (receiverId) {
      for (const socketId of getReceiverSocketIds(receiverId)) {
        io.to(socketId).emit("userStoppedTyping", { userId, conversationId });
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
