import mongoose from "mongoose";

const messageSchema = new mongoose.Schema(
  {
    senderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    chatId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Chat",
      required: true,
    },
    messageType: {
      type: String,
      enum: ["text", "image", "video", "audio", "file"],
      default: "text",
      required: true,
    },
    text: {
      type: String,
      required: function () {
        return this.messageType === "text";
      },
    },
    image: {
      type: [Object],
      validate: {
        validator: function (v) {
          return (
            this.messageType !== "image" || (Array.isArray(v) && v.length > 0)
          );
        },
        message: "Image message must contain at least one image",
      },
    },
    video: {
      type: Object,
      required: function () {
        return this.messageType === "video";
      },
    },
    audio: {
      type: Object,
      required: function () {
        return this.messageType === "audio";
      },
    },
    file: {
      type: Object,
      required: function () {
        return this.messageType === "file";
      },
    },
    reactions: [
      {
        userId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
        },
        type: {
          type: String,
          enum: ["like", "love", "haha", "wow", "sad", "angry"],
        },
      },
    ],
    repliedTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Chat",
    },
    isDeleted: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  },
);

messageSchema.index({ chatId: 1, createdAt: -1 });

export default mongoose.model("Message", messageSchema);
