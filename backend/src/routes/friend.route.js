import express from "express";
import { protectRoute } from "../../middleware/auth.middleware.js";
import {
  acceptFriendRequest,
  addFriend,
  declineFriendRequest,
  getAllFriends,
  getPendingFriendRequest,
  removeFriend,
} from "../controllers/friend.controller.js";

const router = express.Router();

router.use(protectRoute);

router.get("/", getAllFriends);

router.get("/pending", getPendingFriendRequest);

router.post("/requests", addFriend);
router.post("/requests/:requestId/accept", acceptFriendRequest);
router.post("/requests/:requestId/decline", declineFriendRequest);

router.delete("/:friendId", removeFriend);

export default router;
