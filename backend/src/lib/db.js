import mongoose from "mongoose";

export const connectDB = async () => {
  try {
    const mongoURI = process.env.MONGO_URI;
    if (!mongoURI) {
      throw new Error("MONGO_URI is not defined");
    }

    const conn = await mongoose.connect(mongoURI);
    console.log("MongoDB connected:", conn.connection.host);
  } catch (error) {
    console.log("Error connection to MongoDB", error);
    process.exit(1); // status 1 for error, 0 for success
  }
};
