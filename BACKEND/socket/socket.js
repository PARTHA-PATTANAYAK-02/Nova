import { Server } from "socket.io";
import express from "express";
import http from "http";
import jwt from "jsonwebtoken";
import { environment } from "../config/environment.js";

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

const userSocketMap = {}; // userId -> array of socket ids (a user can be connected from multiple devices)

export const getReceiverSocketIds = (receiverId) => userSocketMap[receiverId] || [];

export const getReceiverSocketId = (receiverId) =>
  getReceiverSocketIds(receiverId)[0];

io.on("connection", (socket) => {
  const userId = socket.userId;
  if (userId) {
    if (!userSocketMap[userId]) userSocketMap[userId] = [];
    userSocketMap[userId].push(socket.id);
  }

  io.emit("getOnlineUsers", Object.keys(userSocketMap));

  socket.on("typing", ({ receiverId } = {}) => {
    for (const socketId of getReceiverSocketIds(receiverId)) {
      io.to(socketId).emit("userTyping", { userId });
    }
  });

  socket.on("stopTyping", ({ receiverId } = {}) => {
    for (const socketId of getReceiverSocketIds(receiverId)) {
      io.to(socketId).emit("userStoppedTyping", { userId });
    }
  });

  socket.on("disconnect", () => {
    if (userId) {
      userSocketMap[userId] = (userSocketMap[userId] || []).filter(
        (id) => id !== socket.id,
      );
      if (userSocketMap[userId].length === 0) delete userSocketMap[userId];
    }
    io.emit("getOnlineUsers", Object.keys(userSocketMap));
  });
});

export { app, server, io };
