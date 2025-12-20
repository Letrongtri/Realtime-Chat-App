import bcrypt from "bcryptjs";
import User from "../models/User.js";
import { generateToken } from "../lib/utils.js";
import { sendWelcomeEmail } from "../emails/emailHandlers.js";
import { ENV } from "../lib/env.js";
import cloudinary from "../lib/cloudinary.js";

export const signup = async (req, res) => {
  const { fullName, email, password } = req.body;

  try {
    const name = typeof fullName === "string" ? fullName.trim() : "";
    const mail = typeof email === "string" ? email.trim().toLowerCase() : "";
    const pass = typeof password === "string" ? password : "";

    if (!name || !mail || !pass) {
      return res.status(400).json({ message: "All fields are required" });
    }

    if (pass.length < 6) {
      return res
        .status(400)
        .json({ message: "Password must be at least 6 characters long" });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(mail)) {
      return res.status(400).json({ message: "Email is invalid" });
    }

    const user = await User.findOne({ email: mail });
    if (user) {
      return res.status(400).json({ message: "Email already exists" });
    }

    // hash pw
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(pass, salt);

    const newUser = new User({
      fullName: name,
      email: mail,
      password: hashedPassword,
    });
    if (newUser) {
      await newUser.save();
      generateToken(newUser._id, res);

      res.status(201).json({
        message: "Signup successful",
        user: {
          _id: newUser._id,
          fullName: newUser.fullName,
          email: newUser.email,
          avatar: newUser.avatar,
        },
      });

      // send welcome email
      const clientUrl = ENV.CLIENT_URL;
      if (clientUrl) {
        await sendWelcomeEmail(mail, name, clientUrl);
      }
    } else {
      res.status(400).json({ message: "Signup failed" });
    }
  } catch (error) {
    console.log("Error signing up controller:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

export const login = async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ message: "All fields are required" });
  }

  try {
    const user = await User.findOne({ email: email });

    if (!user) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    generateToken(user._id, res);
    res.status(200).json({
      message: "Login successful",
      user: {
        _id: user._id,
        fullName: user.fullName,
        email: user.email,
        avatar: user.avatar,
      },
    });
  } catch (error) {
    console.log("Error logging in controller:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

export const logout = async (_, res) => {
  try {
    res.cookie("jwt", "", { maxAge: 0 });
    res.status(200).json({ message: "Logout successful" });
  } catch (error) {
    console.log("Error logging out controller:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

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
