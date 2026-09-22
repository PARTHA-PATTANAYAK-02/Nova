import mongoose from "mongoose";

const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("mongodb connected successfully.");
    return true;
  } catch (error) {
    console.log(error);
    return false;
  }
};
export default connectDB;
