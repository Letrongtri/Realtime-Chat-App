import mongoose from "mongoose";
import cloudinary from "../lib/cloudinary.js";
import { generateGroupName } from "../lib/utils.js";
import Chat from "../models/Chat.js";
import User from "../models/User.js";
import Message from "../models/Message.js";

export const getAllChats = async (req, res) => {
  try {
    const user = req.user;
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const chats = await Chat.find({ members: { $in: [user._id] } })
      .populate("members", "fullName avatar")
      .populate("latestMessage")
      .sort({ updatedAt: -1 });
    res.status(200).json(chats);
  } catch (error) {
    console.log("Error getting all chats controller:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

export const createChat = async (req, res) => {
  try {
    const user = req.user;
    if (!user) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    let { members, isGroup, groupName } = req.body;

    if (!members || !Array.isArray(members) || members.length === 0) {
      return res.status(400).json({ message: "Members are required" });
    }

    // đảm bảo user nằm trong members
    const userIdStr = user._id.toString();
    members = [...new Set([...members.map(String), userIdStr])];

    if (!isGroup && members.length !== 2) {
      return res
        .status(400)
        .json({ message: "Private chat must have exactly 2 members" });
    }

    if (isGroup && members.length < 3) {
      return res
        .status(400)
        .json({ message: "Group chat must have at least 3 members" });
    }

    if (!isGroup) {
      // check existing chat
      const existingChat = await Chat.findOne({
        isGroup,
        members: { $size: members.length, $all: members },
      });

      if (existingChat) {
        return res.status(400).json({ message: "Chat already exists" });
      }
    }

    let groupAdmin;
    if (isGroup) {
      groupAdmin = user._id;

      if (!groupName) {
        const users = await User.find({ _id: { $in: members } }, "fullName");

        groupName = generateGroupName(users);
      }
    }

    const chat = await Chat.create({
      members,
      isGroup,
      groupName,
      groupAdmin,
    });

    res.status(201).json(chat);
  } catch (error) {
    console.error("Error creating chat:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

export const getChatById = async (req, res) => {
  try {
    const chat = await Chat.findById(req.params.chatId).populate("members");
    if (!chat) {
      return res.status(404).json({ message: "Chat not found" });
    }

    if (!chat.members.some((member) => member.equals(req.user._id))) {
      return res.status(403).json({ message: "Unauthorized" });
    }

    res.status(200).json(chat);
  } catch (error) {
    console.log("Error getting chat by ID controller:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

export const updateChat = async (req, res) => {
  try {
    const user = req.user;
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const chatId = req.params.chatId;
    const chat = await Chat.findById(chatId);
    if (!chat) {
      return res.status(404).json({ message: "Chat not found" });
    }

    if (!chat.isGroup) {
      return res
        .status(400)
        .json({ message: "Private chat cannot be updated" });
    }

    if (!chat.members.some((member) => member.equals(user._id))) {
      return res.status(403).json({ message: "Unauthorized" });
    }

    const { members, groupName, groupAdmin } = req.body;

    if (groupAdmin && !chat.groupAdmin.equals(user._id)) {
      return res.status(403).json({ message: "Only group admin can update" });
    }

    const updates = {};

    if (members) {
      updates.members = members;
    }

    if (groupName) {
      updates.groupName = groupName;
    }

    if (groupAdmin) {
      updates.groupAdmin = groupAdmin;
    }

    if (req.file) {
      if (chat.groupAvatar?.publicId) {
        await cloudinary.uploader.destroy(chat.groupAvatar.publicId);
      }

      const uploadRes = await cloudinary.uploader.upload(req.file.path, {
        folder: "group_avatars",
      });

      updates.groupAvatar = {
        publicId: uploadRes.public_id,
        url: uploadRes.secure_url,
      };
    }

    const updatedChat = await Chat.findByIdAndUpdate(
      chatId,
      { $set: updates },
      { new: true },
    );

    res.status(200).json(updatedChat);
  } catch (error) {
    console.log("Error updating chat controller:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

export const deleteChat = async (req, res) => {
  const user = req.user;
  const { chatId } = req.params;

  if (!user) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  if (!mongoose.Types.ObjectId.isValid(chatId)) {
    return res.status(400).json({ message: "Invalid chat ID" });
  }

  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const chat = await Chat.findById(chatId).session(session);
    if (!chat) {
      await session.abortTransaction();
      return res.status(404).json({ message: "Chat not found" });
    }

    if (!chat.isGroup) {
      await session.abortTransaction();
      return res.status(400).json({ message: "Cannot delete private chat" });
    }

    if (!chat.groupAdmin.equals(user._id)) {
      await session.abortTransaction();
      return res.status(403).json({ message: "Only admin can delete group" });
    }

    // xoá avatar group
    if (chat.groupAvatar?.publicId) {
      await cloudinary.uploader.destroy(chat.groupAvatar.publicId);
    }

    // xoá messages liên quan
    await Message.updateMany(
      { chat: chatId },
      { $set: { isDeleted: true } },
    ).session(session);

    // xoá chat
    await Chat.deleteOne({ _id: chatId }).session(session);

    await session.commitTransaction();

    res.status(200).json({ message: "Chat deleted successfully" });
  } catch (error) {
    await session.abortTransaction();
    console.error("Delete chat error:", error);
    res.status(500).json({ message: "Internal server error" });
  } finally {
    session.endSession();
  }
};

export const leaveChat = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const userId = req.user._id;
    const { chatId } = req.params;
    const { newAdminId } = req.body;

    const chat = await Chat.findById(chatId).session(session);

    if (!chat) {
      await session.abortTransaction();
      return res.status(404).json({ message: "Chat not found" });
    }

    if (!chat.isGroup) {
      await session.abortTransaction();
      return res.status(400).json({ message: "Private chat cannot be left" });
    }

    if (!chat.members.some((m) => m.equals(userId))) {
      await session.abortTransaction();
      return res
        .status(403)
        .json({ message: "You are not a member of this group" });
    }

    const isParamAdmin = chat.groupAdmin.equals(userId);

    if (isParamAdmin) {
      if (chat.members.length > 1 && !newAdminId) {
        await session.abortTransaction();
        return res
          .status(400)
          .json({ message: "Please appoint a new admin before leaving" });
      }

      if (newAdminId) {
        if (!chat.members.some((m) => m.equals(newAdminId))) {
          await session.abortTransaction();
          return res
            .status(400)
            .json({ message: "New admin must be a member of the group" });
        }
      }
    }

    const updateData = { $pull: { members: userId } };
    if (isParamAdmin && newAdminId) {
      updateData.groupAdmin = newAdminId;
    }

    const updatedChat = await Chat.findByIdAndUpdate(chatId, updateData, {
      new: true,
      session: session,
    });

    if (updatedChat.members.length === 0) {
      // xoá avatar group
      if (chat.groupAvatar?.publicId) {
        await cloudinary.uploader.destroy(chat.groupAvatar.publicId);
      }

      // xoá messages liên quan
      await Message.updateMany(
        { chat: chatId },
        { $set: { isDeleted: true } },
      ).session(session);

      await Chat.findByIdAndDelete(chatId).session(session);

      await session.commitTransaction();
      return res
        .status(200)
        .json({ message: "Group deleted as no members left" });
    }

    await session.commitTransaction();
    res.status(200).json(updatedChat);
  } catch (error) {
    await session.abortTransaction();
    console.log("Error leaving chat:", error);
    res.status(500).json({ message: "Internal server error" });
  } finally {
    session.endSession();
  }
};
