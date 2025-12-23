import express from "express";
import { protectRoute } from "../middleware/auth.middleware.js";
import { uploadAvatar } from "../middleware/upload.middleware.js";
import {
  updateProfile,
  deleteProfile,
  searchUsers,
  getUserById,
} from "../controllers/user.controller.js";

const router = express.Router();

router.get("/profile", protectRoute, (req, res) => {
  res.status(200).json(req.user);
});
router.put(
  "/profile",
  protectRoute,
  uploadAvatar.single("avatar"),
  updateProfile,
);
router.delete("/profile", protectRoute, deleteProfile);

router.get("/search", searchUsers);
router.get("/:id", getUserById);

export default router;
