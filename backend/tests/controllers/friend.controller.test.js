import {
  addFriend,
  acceptFriendRequest,
  getAllFriends,
  getPendingFriendRequest,
  declineFriendRequest,
  removeFriend,
} from "../../src/controllers/friend.controller.js";
import User from "../../src/models/User.js";
import FriendRequest from "../../src/models/FriendRequest.js";
import Chat from "../../src/models/Chat.js";

jest.mock("../../src/models/User.js");
jest.mock("../../src/models/FriendRequest.js");
jest.mock("../../src/models/Chat.js");

import mongoose from "mongoose";

jest.spyOn(mongoose, "startSession").mockResolvedValue({
  startTransaction: jest.fn(),
  commitTransaction: jest.fn(),
  abortTransaction: jest.fn(),
  endSession: jest.fn(),
});

describe("Friend Controller", () => {
  let req, res;
  const mockUser = { _id: "user1", fullName: "User 1", save: jest.fn() };

  beforeEach(() => {
    req = { user: mockUser, body: {}, params: {} };
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };
    jest.clearAllMocks();
  });

  describe("getAllFriends", () => {
    it("should return friends", async () => {
      User.findById.mockReturnValue({
        populate: jest.fn().mockReturnValue({
          select: jest.fn().mockResolvedValue({
            friends: ["friend1", "friend2"],
          }),
        }),
      });

      await getAllFriends(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        friends: ["friend1", "friend2"],
      });
    });
  });

  describe("getPendingFriendRequest", () => {
    it("should return pending friend requests", async () => {
      FriendRequest.find.mockResolvedValue([{ _id: "req1" }]);

      await getPendingFriendRequest(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith([{ _id: "req1" }]);
    });
  });

  describe("addFriend", () => {
    it("should fail if receiverId is missing", async () => {
      await addFriend(req, res);
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        message: "Receiver ID is required",
      });
    });

    it("should fail if adding self", async () => {
      req.body.receiverId = "user1";
      await addFriend(req, res);
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        message: "Cannot add yourself as a friend",
      });
    });

    it("should fail if receiverId does not exist", async () => {
      req.body.receiverId = "user2";
      User.findById.mockResolvedValue(null);
      await addFriend(req, res);
      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({ message: "Friend not found" });
    });

    it("should fail if already friends", async () => {
      req.body.receiverId = "user2";
      User.findById.mockResolvedValue({ _id: "user2" });
      User.findOne.mockResolvedValue({ _id: "user1" });

      await addFriend(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ message: "Already friends" });
    });

    it("should fail if friend request already exists", async () => {
      req.body.receiverId = "user2";
      User.findById.mockResolvedValue({ _id: "user2" });
      User.findOne.mockResolvedValue(null);
      FriendRequest.findOne.mockResolvedValue({
        _id: "req1",
        senderId: "user1",
        receiverId: "user2",
      });

      await addFriend(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        message: "Friend request already sent",
      });
    });

    it("should create friend request if valid", async () => {
      req.body.receiverId = "user2";
      User.findById.mockResolvedValue({ _id: "user2" }); // Receiver exists
      User.findOne.mockResolvedValue(null); // Not friends yet
      FriendRequest.findOne.mockResolvedValue(null); // No pending request
      FriendRequest.create.mockResolvedValue({});

      await addFriend(req, res);

      expect(FriendRequest.create).toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(200);
    });
  });

  describe("acceptFriendRequest", () => {
    it("should fail if requestId is missing", async () => {
      await acceptFriendRequest(req, res);
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        message: "Request ID is required",
      });
    });

    it("should fail if friend request does not exist", async () => {
      req.params.requestId = "req1";
      FriendRequest.findById.mockResolvedValue(null);
      await acceptFriendRequest(req, res);
      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({
        message: "Friend request not found",
      });
    });

    it("should fail if request receiver is not authorized", async () => {
      req.params.requestId = "req1";
      const mockRequest = {
        _id: "req1",
        senderId: "sender1",
        receiverId: { equals: (id) => id === "user2" },
      };

      FriendRequest.findById.mockResolvedValue(mockRequest);
      await acceptFriendRequest(req, res);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({ message: "Unauthorized" });
    });

    it("should fail if request is not pending", async () => {
      req.params.requestId = "req1";
      const mockRequest = {
        _id: "req1",
        senderId: "sender1",
        receiverId: { equals: (id) => id === "user1" }, // Mock equals method
        status: "accepted",
      };

      FriendRequest.findById.mockResolvedValue(mockRequest);
      await acceptFriendRequest(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        message: "Friend request already handled",
      });
    });

    it("should handle acceptance and create chat", async () => {
      req.params.requestId = "req1";
      const mockRequest = {
        _id: "req1",
        senderId: "sender1",
        receiverId: { equals: (id) => id === "user1" },
        status: "pending",
        save: jest.fn(),
      };

      FriendRequest.findById.mockResolvedValue(mockRequest);
      User.findByIdAndUpdate.mockResolvedValue({}); // Update friend lists

      // Mock Chat creation
      Chat.findOne.mockResolvedValue(null);
      const saveChatMock = jest.fn();
      Chat.mockImplementation(() => ({ save: saveChatMock, _id: "chat1" }));

      await acceptFriendRequest(req, res);

      expect(mockRequest.status).toBe("accepted");
      expect(mockRequest.save).toHaveBeenCalled();
      expect(User.findByIdAndUpdate).toHaveBeenCalledTimes(2);
      expect(saveChatMock).toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(200);
    });
  });

  describe("declineFriendRequest", () => {
    it("should fail if requestId is missing", async () => {
      await declineFriendRequest(req, res);
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        message: "Request ID is required",
      });
    });

    it("should fail if friend request does not exist", async () => {
      req.params.requestId = "req1";
      FriendRequest.findById.mockResolvedValue(null);
      await declineFriendRequest(req, res);
      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({
        message: "Friend request not found",
      });
    });

    it("should fail if request receiver is not authorized", async () => {
      req.params.requestId = "req1";
      const mockRequest = {
        _id: "req1",
        senderId: "sender1",
        receiverId: { equals: (id) => id === "user2" },
      };

      FriendRequest.findById.mockResolvedValue(mockRequest);
      await declineFriendRequest(req, res);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({ message: "Unauthorized" });
    });

    it("should fail if request is not pending", async () => {
      req.params.requestId = "req1";
      const mockRequest = {
        _id: "req1",
        senderId: "sender1",
        receiverId: { equals: (id) => id === "user1" },
        status: "accepted",
      };

      FriendRequest.findById.mockResolvedValue(mockRequest);
      await declineFriendRequest(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        message: "Friend request already handled",
      });
    });

    it("should handle decline and update friend lists", async () => {
      req.params.requestId = "req1";
      const mockRequest = {
        _id: "req1",
        senderId: "sender1",
        receiverId: { equals: (id) => id === "user1" },
        status: "pending",
        save: jest.fn(),
      };

      FriendRequest.findById.mockResolvedValue(mockRequest);

      await declineFriendRequest(req, res);

      expect(mockRequest.status).toBe("declined");
      expect(mockRequest.save).toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(200);
    });
  });

  describe("removeFriend", () => {
    const mockSessionQuery = (result) => ({
      session: jest.fn().mockResolvedValue(result),
    });

    it("should fail if friend is not found", async () => {
      req.user = { _id: new mongoose.Types.ObjectId() };
      req.params.friendId = new mongoose.Types.ObjectId().toString();

      User.findById.mockReturnValue(mockSessionQuery(null));

      await removeFriend(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({ message: "Friend not found" });
    });

    it("should fail if not friends", async () => {
      const userId = new mongoose.Types.ObjectId();
      const friendId = new mongoose.Types.ObjectId();

      req.user = { _id: userId };
      req.params.friendId = friendId.toString();

      User.findById.mockReturnValue(mockSessionQuery({ _id: friendId }));

      User.exists.mockResolvedValue(null);

      await removeFriend(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ message: "Not friends" });
    });

    it("should remove friend", async () => {
      const userId = new mongoose.Types.ObjectId();
      const friendId = new mongoose.Types.ObjectId();

      req.user = { _id: userId };
      req.params.friendId = friendId.toString();

      User.findById.mockReturnValue(mockSessionQuery({ _id: friendId }));

      User.exists.mockResolvedValue(true);
      User.updateOne.mockResolvedValue({ acknowledged: true });

      await removeFriend(req, res);

      expect(User.updateOne).toHaveBeenCalledTimes(2);
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        message: "Friend removed successfully",
      });
    });
  });
});
