import cloudinary from "../lib/cloudinary.js";
import User from "../models/User.js";

export const updateProfile = async (req, res) => {
  try {
    const user = req.user;
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    if (req.body.fullName) user.fullName = req.body.fullName;
    if (req.body.email && req.body.email !== user.email) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(req.body.email)) {
        return res.status(400).json({ message: "Email is invalid" });
      }

      const emailExists = await User.findOne({ email: req.body.email });
      if (emailExists) {
        return res.status(400).json({ message: "Email already exists" });
      }

      user.email = req.body.email;
    }

    if (req.file) {
      if (user.avatar?.publicId) {
        await cloudinary.uploader.destroy(user.avatar.publicId);
      }

      const uploadRes = await cloudinary.uploader.upload(req.file.path, {
        folder: "avatars",
      });

      if (!uploadRes) {
        return res.status(500).json({ message: "Failed to upload avatar" });
      }

      const avatarUrl = uploadRes.secure_url;
      user.avatar = {
        url: avatarUrl,
        publicId: uploadRes.public_id,
      };
    }

    await user.save();

    res.status(200).json({
      message: "Profile updated successfully",
      user: {
        _id: user._id,
        fullName: user.fullName,
        email: user.email,
        avatar: user.avatar,
      },
    });
  } catch (error) {
    console.log("Error updating profile controller:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

export const deleteProfile = async (req, res) => {
  try {
    const user = req.user;
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    if (user.avatar?.publicId) {
      await cloudinary.uploader.destroy(user.avatar.publicId);
    }

    await User.findByIdAndDelete(user._id);

    res.cookie("jwt", "", { maxAge: 0 });
    res.status(200).json({ message: "Profile deleted successfully" });
  } catch (error) {
    console.log("Error deleting profile controller:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

export const searchUsers = async (req, res) => {
  try {
    const { query } = req.query;
    const users = await User.find({
      $or: [
        { fullName: { $regex: query, $options: "i" } },
        { email: { $regex: query, $options: "i" } },
      ],
    }).select("-password");
    res.status(200).json(users);
  } catch (error) {
    console.log("Error searching users controller:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

export const getUserById = async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select("-password");
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    res.status(200).json(user);
  } catch (error) {
    console.log("Error getting user by ID controller:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};
