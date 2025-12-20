import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
  {
    fullName: {
      type: String,
      required: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
    },
    password: {
      type: String,
      required: true,
      minlength: 6,
    },
    avatar: {
      type: Object,
      default: {},
    },
  },
  {
    timestamps: true, // created_at, updated_at
  },
);

export default mongoose.model("User", userSchema);
