import express from "express";
import { protectRoute } from "../../middleware/auth.middleware.js";
import {
  deleteMessage,
  reactToMessage,
} from "../controllers/message.controller.js";

const router = express.Router();

router.use(protectRoute);

router.patch("/:messageId", deleteMessage);
router.patch("/:messageId/react", reactToMessage);

export default router;
