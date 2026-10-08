import express, { urlencoded } from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import { environment } from "./config/environment.js";
import connectDB from "./utils/db.js";
import userRoute from "./routes/user.route.js";
import postRoute from "./routes/post.route.js";
import messageRoute from "./routes/message.route.js";
import storyRoute from "./routes/story.route.js";
import { removeLegacyStoryTtlIndex, startStoryCleanup } from "./utils/storyCleanup.js";
import { app, server } from "./socket/socket.js";

const { server: serverConfig, client: clientConfig, runtime } = environment;

//middlewares
app.use(express.json());
app.use(cookieParser());
app.use(urlencoded({ extended: true }));
const corsOptions = {
  origin: (origin, callback) =>
    callback(
      null,
      !runtime.isProduction ||
        !origin ||
        clientConfig.allowedOrigins.includes(origin),
    ),
  credentials: true,
};
app.use(cors(corsOptions));

// yha pr apni api ayengi
app.use("/api/v1/user", userRoute);
app.use("/api/v1/post", postRoute);
app.use("/api/v1/message", messageRoute);
app.use("/api/v1/story", storyRoute);

const startServer = async () => {
  const databaseConnected = await connectDB();
  if (!databaseConnected) {
    console.error("Server was not started because MongoDB is unavailable.");
    process.exitCode = 1;
    return;
  }

  await removeLegacyStoryTtlIndex();
  startStoryCleanup();
  server.listen(serverConfig.port, serverConfig.host, () => {
    console.log(
      `Server listening at http://${serverConfig.host}:${serverConfig.port}`,
    );
  });
};

startServer();
