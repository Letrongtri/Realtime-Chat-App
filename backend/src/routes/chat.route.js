import express from "express";
import { protectRoute } from "../../middleware/auth.middleware.js";
import {
  createChat,
  deleteChat,
  getAllChats,
  getChatById,
  updateChat,
  leaveChat,
} from "../controllers/chat.controller.js";
import { uploadFile } from "../../middleware/upload.middleware.js";

const router = express.Router();

router.use(protectRoute);

router.get("/", getAllChats);
router.post("/", createChat);

router.get("/:chatId", getChatById);
router.put("/:chatId", updateChat); // change group name, add members
router.delete("/:chatId", deleteChat); // delete group
router.put("/:chatId/leave", leaveChat);

export default router;
