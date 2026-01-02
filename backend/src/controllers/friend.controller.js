import mongoose from "mongoose";
import FriendRequest from "../models/FriendRequest.js";
import User from "../models/User.js";
import Chat from "../models/Chat.js";

export const getAllFriends = async (req, res) => {
  try {
    const user = req.user;
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    const friends = await User.findById(user._id)
      .populate("friends")
      .select("friends");
    res.status(200).json(friends);
  } catch (error) {
    console.log("Error getting all friends controller:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

export const getPendingFriendRequest = async (req, res) => {
  try {
    const user = req.user;
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const friends = await FriendRequest.find({
      receiverId: user._id,
      status: "pending",
    }).populate("senderId");

    res.status(200).json(friends);
  } catch (error) {
    console.log("Error getting pending friend request controller:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

export const addFriend = async (req, res) => {
  try {
    const user = req.user;
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const { receiverId, requestMessage } = req.body;
    if (!receiverId) {
      return res.status(400).json({ message: "Receiver ID is required" });
    }

    if (receiverId.toString() === user._id.toString()) {
      return res
        .status(400)
        .json({ message: "Cannot add yourself as a friend" });
    }

    const friend = await User.findById(receiverId);
    if (!friend) {
      return res.status(404).json({ message: "Friend not found" });
    }

    const existingFriendship = await User.findOne({
      _id: user._id,
      friends: receiverId,
    });
    if (existingFriendship) {
      return res.status(400).json({ message: "Already friends" });
    }

    const existingRequest = await FriendRequest.findOne({
      senderId: user._id,
      receiverId: receiverId,
      status: "pending",
    });
    if (existingRequest) {
      return res.status(400).json({ message: "Friend request already sent" });
    }

    await FriendRequest.create({
      senderId: user._id,
      receiverId,
      requestMessage,
    });

    res.status(200).json({ message: "Friend request sent successfully" });
  } catch (error) {
    console.log("Error adding friend controller:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

export const acceptFriendRequest = async (req, res) => {
  try {
    const user = req.user;
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const { requestId } = req.params;
    if (!requestId) {
      return res.status(400).json({ message: "Request ID is required" });
    }

    const request = await FriendRequest.findById(requestId);
    if (!request) {
      return res.status(404).json({ message: "Friend request not found" });
    }

    if (!request.receiverId.equals(user._id)) {
      return res.status(403).json({ message: "Unauthorized" });
    }

    if (request.status !== "pending") {
      return res
        .status(400)
        .json({ message: "Friend request already handled" });
    }

    request.status = "accepted";
    await request.save();

    await User.findByIdAndUpdate(request.senderId, {
      $addToSet: { friends: user._id },
    });

    await User.findByIdAndUpdate(user._id, {
      $addToSet: { friends: request.senderId },
    });

    // Create a chat between the two users
    let chat = await Chat.findOne({
      isGroup: false,
      members: { $all: [user._id, request.senderId] },
    });
    if (!chat) {
      chat = new Chat({
        isGroup: false,
        members: [user._id, request.senderId],
      });
      await chat.save();
    }

    res.status(200).json({
      message: "Friend request accepted successfully",
      chatId: chat._id,
    });
  } catch (error) {
    console.log("Error accepting friend request controller:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

export const declineFriendRequest = async (req, res) => {
  try {
    const user = req.user;
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const { requestId } = req.params;
    if (!requestId) {
      return res.status(400).json({ message: "Request ID is required" });
    }

    const request = await FriendRequest.findById(requestId);
    if (!request) {
      return res.status(404).json({ message: "Friend request not found" });
    }

    if (!request.receiverId.equals(user._id)) {
      return res.status(403).json({ message: "Unauthorized" });
    }

    if (request.status !== "pending") {
      return res
        .status(400)
        .json({ message: "Friend request already handled" });
    }

    request.status = "declined";
    await request.save();

    res.status(200).json({ message: "Friend request declined successfully" });
  } catch (error) {
    console.log("Error declining friend request controller:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

export const removeFriend = async (req, res) => {
  const { friendId } = req.params;
  const user = req.user;

  if (!user) {
    return res.status(404).json({ message: "User not found" });
  }

  if (!mongoose.Types.ObjectId.isValid(friendId)) {
    return res.status(400).json({ message: "Invalid friend ID" });
  }

  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const friend = await User.findById(friendId).session(session);
    if (!friend) {
      await session.abortTransaction();
      return res.status(404).json({ message: "Friend not found" });
    }

    const isFriend = await User.exists(
      { _id: user._id, friends: friendId },
      { session },
    );

    if (!isFriend) {
      await session.abortTransaction();
      return res.status(400).json({ message: "Not friends" });
    }

    await User.updateOne(
      { _id: user._id },
      { $pull: { friends: friendId } },
      { session },
    );

    await User.updateOne(
      { _id: friendId },
      { $pull: { friends: user._id } },
      { session },
    );

    await session.commitTransaction();

    res.status(200).json({ message: "Friend removed successfully" });
  } catch (error) {
    await session.abortTransaction();
    console.error("Remove friend error:", error);
    res.status(500).json({ message: "Internal server error" });
  } finally {
    session.endSession();
  }
};
