import express, { urlencoded } from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import dotenv from "dotenv";
import connectDB from "./utils/db.js";
import userRoute from "./routes/user.route.js";
import postRoute from "./routes/post.route.js";
import messageRoute from "./routes/message.route.js";
import storyRoute from "./routes/story.route.js";
import { removeLegacyStoryTtlIndex, startStoryCleanup } from "./utils/storyCleanup.js";
import { app, server } from "./socket/socket.js";
dotenv.config();

const PORT = process.env.PORT || 8000;
const HOST = process.env.HOST || "0.0.0.0";
const isProduction = process.env.NODE_ENV === "production";
const allowedOrigins = (process.env.CLIENT_URLS || "http://localhost:5173")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

//middlewares
app.use(express.json());
app.use(cookieParser());
app.use(urlencoded({ extended: true }));
const corsOptions = {
  origin: (origin, callback) =>
    callback(null, !isProduction || !origin || allowedOrigins.includes(origin)),
  credentials: true,
};
app.use(cors(corsOptions));

// yha pr apni api ayengi
app.use("/api/v1/user", userRoute);
app.use("/api/v1/post", postRoute);
app.use("/api/v1/message", messageRoute);
app.use("/api/v1/story", storyRoute);

server.listen(PORT, HOST, async () => {
  const databaseConnected = await connectDB();
  if (databaseConnected) {
    await removeLegacyStoryTtlIndex();
    startStoryCleanup();
  }
  console.log(`Server listening at http://${HOST}:${PORT}`);
});
