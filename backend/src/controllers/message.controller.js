import mongoose from "mongoose";
import fs from "fs";
import Message from "../models/Message.js";
import Chat from "../models/Chat.js";
import cloudinary from "../lib/cloudinary.js";

const getMessageOrThrow = async (messageId) => {
  if (!mongoose.Types.ObjectId.isValid(messageId)) {
    const error = new Error("Invalid message ID");
    error.status = 400;
    throw error;
  }
  const message = await Message.findById(messageId);
  if (!message) {
    const error = new Error("Message not found");
    error.status = 404;
    throw error;
  }
  return message;
};

export const getMessagesByChatId = async (req, res) => {
  try {
    const user = req.user;
    const chatId = req.params.chatId;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    if (!mongoose.Types.ObjectId.isValid(chatId)) {
      return res.status(400).json({ message: "Invalid chat ID" });
    }

    if (!chatId) {
      return res.status(400).json({ message: "Chat ID is required" });
    }

    const chat = await Chat.findById(chatId);
    if (!chat) {
      return res.status(404).json({ message: "Chat not found" });
    }

    if (!chat.members.some((member) => member.equals(user._id))) {
      return res.status(403).json({ message: "Unauthorized" });
    }

    const messages = await Message.find({ chat: chatId })
      .populate("senderId", "fullName avatar")
      .populate({
        path: "replyTo",
        select: "text",
        populate: { path: "senderId", select: "fullName" },
      })
      .skip(skip)
      .limit(limit)
      .sort({ createdAt: -1 });

    const totalMessages = await Message.countDocuments({ chatId: chatId });

    res.status(200).json({
      messages,
      currentPage: page,
      totalPages: Math.ceil(totalMessages / limit),
      totalMessages,
    });
  } catch (error) {
    console.log("Error getting messages by chat ID controller:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

export const sendMessage = async (req, res) => {
  try {
    const user = req.user;
    const chatId = req.params.chatId;
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    if (!mongoose.Types.ObjectId.isValid(chatId)) {
      return res.status(400).json({ message: "Invalid chat ID" });
    }

    if (!chatId) {
      return res.status(400).json({ message: "Chat ID is required" });
    }

    const chat = await Chat.findById(chatId);
    if (!chat) {
      return res.status(404).json({ message: "Chat not found" });
    }

    if (!chat.members.some((member) => member.equals(user._id))) {
      return res.status(403).json({ message: "Unauthorized" });
    }

    const { messageType, text, replyTo } = req.body;

    const allowedMessageTypes = ["text", "image", "video", "audio", "file"];
    if (!allowedMessageTypes.includes(messageType)) {
      return res.status(400).json({ message: "Invalid message type" });
    }

    if (messageType === "text" && !text) {
      return res
        .status(400)
        .json({ message: "Text is required for text messages" });
    }

    let contentData = text;
    if (messageType !== "text") {
      if (!req.files || req.files.length === 0)
        return res
          .status(400)
          .json({ message: "File is required for file messages" });

      const uploadPromises = req.files.map((file) =>
        cloudinary.uploader.upload(file.path, {
          folder: "messages",
          resource_type: "auto",
        }),
      );

      const uploadResults = await Promise.all(uploadPromises);

      const formattedFiles = uploadResults.map((result, index) => ({
        publicId: result.public_id,
        url: result.secure_url,
        name: req.files[index].originalname,
        size: result.bytes,
      }));

      if (messageType === "image") {
        contentData = formattedFiles; // array of images
      } else {
        contentData = formattedFiles[0]; // single file
      }

      // Delete temporary uploaded files
      req.files.forEach((file) => {
        if (fs.existsSync(file.path)) fs.unlinkSync(file.path);
      });
    }

    const messageData = new Message({
      senderId: user._id,
      chatId: chatId,
      messageType,
      [messageType]: contentData,
      replyTo: replyTo || null,
    });

    const newMessage = await messageData.save();

    // Update lastMessage field in Chat model
    await Chat.findByIdAndUpdate(chatId, { latestMessage: newMessage._id });

    const populatedMessage = await Message.findById(newMessage._id).populate(
      "senderId",
      "fullName avatar",
    );

    // TODO: Socket.io

    res.status(201).json(populatedMessage);
  } catch (error) {
    console.log("Error sending message controller:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

export const deleteMessage = async (req, res) => {
  try {
    const user = req.user;
    const messageId = req.params.messageId;
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const message = await getMessageOrThrow(messageId);

    if (!message.senderId.equals(user._id)) {
      return res.status(403).json({ message: "Unauthorized" });
    }

    // update isDeleted field
    message.isDeleted = true;
    await message.save();

    // TODO: Socket.io

    // Update lastMessage field in Chat model
    await Chat.findByIdAndUpdate(
      message.chat,
      { latestMessage: null },
      { new: true },
    );

    res.status(200).json({ message: "Message deleted successfully" });
  } catch (error) {
    console.log("Error deleting message controller:", error);
    res
      .status(error.status || 500)
      .json({ message: error.message || "Internal server error" });
  }
};

export const reactToMessage = async (req, res) => {
  try {
    const user = req.user;
    const messageId = req.params.messageId;
    const { type } = req.body;

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const message = await getMessageOrThrow(messageId);

    const chat = await Chat.findById(message.chat);
    if (!chat.members.some((member) => member.equals(user._id))) {
      return res.status(403).json({ message: "Unauthorized" });
    }

    const existingIndex = message.reactions.findIndex((r) =>
      r.userId.equals(user._id),
    );

    if (existingIndex !== -1) {
      if (message.reactions[existingIndex].type === type) {
        message.reactions.splice(existingIndex, 1);
      } else {
        message.reactions[existingIndex].type = type;
      }
    } else {
      message.reactions.push({ userId: user._id, type });
    }

    await message.save();

    res.status(200).json({ message: "Message reacted successfully" });
  } catch (error) {
    console.log("Error reacting to message controller:", error);
    res
      .status(error.status || 500)
      .json({ message: error.message || "Internal server error" });
  }
};
