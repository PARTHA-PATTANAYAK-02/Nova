import mongoose from "mongoose";
import { environment } from "../config/environment.js";
import { User } from "../models/user.model.js";

const ensureSparseUsernameIndex = async () => {
  const indexes = await User.collection.indexes().catch((error) => {
    if (error.codeName === "NamespaceNotFound") return [];
    throw error;
  });
  const usernameIndex = indexes.find(
    (index) =>
      index.key?.username === 1 && Object.keys(index.key).length === 1,
  );

  if (usernameIndex && (!usernameIndex.unique || !usernameIndex.sparse)) {
    await User.collection.dropIndex(usernameIndex.name);
  }

  await User.collection.createIndex(
    { username: 1 },
    { unique: true, sparse: true, name: "username_1" },
  );
};

const connectDB = async () => {
  if (!environment.database.mongoUri) {
    console.error("MongoDB connection failed: MONGODB_URI is not configured.");
    return false;
  }

  try {
    await mongoose.connect(environment.database.mongoUri, {
      serverSelectionTimeoutMS: 10_000,
      connectTimeoutMS: 10_000,
    });
    await ensureSparseUsernameIndex();
    console.log("mongodb connected successfully.");
    return true;
  } catch (error) {
    console.error("MongoDB connection failed:", error.message);
    return false;
  }
};
export default connectDB;
