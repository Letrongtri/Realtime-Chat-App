import bcrypt from "bcryptjs";
import User from "../models/User.js";
import { generateToken } from "../lib/utils.js";

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
    } else {
      res.status(400).json({ message: "Signup failed" });
    }
  } catch (error) {
    console.log("Error signing up controller:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};
