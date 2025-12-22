import mongoose from "mongoose";
import Chat from "../../src/models/Chat.js";
import cloudinary from "../../src/lib/cloudinary.js";
import Message from "../../src/models/Message.js";
import {
  getAllChats,
  createChat,
  deleteChat,
  getChatById,
  updateChat,
  leaveChat,
} from "../../src/controllers/chat.controller.js";
import User from "../../src/models/User.js";
import { generateGroupName } from "../../src/lib/utils.js";

jest.mock("../../src/models/Chat.js");
jest.mock("../../src/models/Message.js");
jest.mock("../../src/lib/cloudinary.js", () => ({
  uploader: { destroy: jest.fn() },
}));

describe("Chat Controller", () => {
  let req, res;
  const mockUser1 = { _id: new mongoose.Types.ObjectId(), fullName: "User 1" };
  const mockUser2 = { _id: new mongoose.Types.ObjectId(), fullName: "User 2" };
  const mockUser3 = { _id: new mongoose.Types.ObjectId(), fullName: "User 3" };

  beforeEach(() => {
    req = { user: mockUser1, body: {}, params: {} };
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };
    User.find = jest.fn();
    jest.clearAllMocks();
  });

  describe("getAllChats", () => {
    it("should return chats for the user", async () => {
      // Mock chain: find -> populate -> sort
      const mockChats = [{ _id: "chat1" }];
      const sortMock = jest.fn().mockResolvedValue(mockChats);
      const populateMock = jest.fn().mockReturnValue({ sort: sortMock });
      Chat.find.mockReturnValue({ populate: populateMock });

      await getAllChats(req, res);

      expect(Chat.find).toHaveBeenCalledWith({
        members: { $in: [mockUser1._id] },
      });
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(mockChats);
    });
  });

  describe("createChat", () => {
    it("should fail if members array is missing", async () => {
      req.body = {};
      await createChat(req, res);
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ message: "Members is required" });
    });

    it("should fail if members array is less than 2 in a private chat", async () => {
      req.body = { members: [req.user._id], isGroup: false };

      await createChat(req, res);
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        message: "Private chat must have exactly 2 members",
      });
    });

    it("should fail if members array is less than 3 in a group chat", async () => {
      req.body = { members: [mockUser2._id], isGroup: true };

      await createChat(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        message: "Group chat must have at least 3 members",
      });
    });

    it("should fail if members already have a private chat", async () => {
      req.body = {
        members: [req.user._id, mockUser2._id],
        isGroup: false,
      };

      Chat.findOne.mockResolvedValue({ _id: "existingChat", isGroup: false });

      await createChat(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        message: "Chat already exists",
      });
    });

    it("should create a private chat if valid", async () => {
      req.body = {
        members: [req.user._id, mockUser2._id],
        isGroup: false,
      };

      Chat.findOne.mockResolvedValue(null);
      Chat.create.mockResolvedValue({ _id: "newChat", isGroup: false });

      await createChat(req, res);

      expect(Chat.create).toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(201);
    });

    it("should create a group chat if valid", async () => {
      req.body = {
        members: [mockUser2._id, mockUser3._id],
        isGroup: true,
      };

      Chat.findOne.mockResolvedValue(null);
      User.find.mockResolvedValue([mockUser2, mockUser3, mockUser1]);

      const expectedGroupName = generateGroupName([
        mockUser2,
        mockUser3,
        mockUser1,
      ]);
      Chat.create.mockResolvedValue({
        _id: "newChatId",
        members: [mockUser2._id, mockUser3._id, mockUser1._id],
        isGroup: true,
        groupAdmin: mockUser1._id,
        groupName: expectedGroupName,
      });

      await createChat(req, res);

      expect(Chat.create).toHaveBeenCalledWith({
        members: [
          mockUser2._id.toString(),
          mockUser3._id.toString(),
          mockUser1._id.toString(),
        ],
        isGroup: true,
        groupName: expectedGroupName,
        groupAdmin: mockUser1._id,
      });

      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith({
        _id: "newChatId",
        members: [mockUser2._id, mockUser3._id, mockUser1._id],
        isGroup: true,
        groupAdmin: mockUser1._id,
        groupName: expectedGroupName,
      });
    });
  });

  describe("getChatById", () => {
    it("should fail if chatId is not found", async () => {
      req.params.chatId = "invalidChatId";
      Chat.findById.mockReturnValue({
        populate: jest.fn().mockResolvedValue(null),
      });

      await getChatById(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({ message: "Chat not found" });
    });

    it("should fail if user is not a member of the chat", async () => {
      const chatId = new mongoose.Types.ObjectId();
      req.params.chatId = chatId;

      const mockChat = {
        _id: chatId,
        isGroup: false,
        members: [mockUser2._id, mockUser3._id],
      };

      Chat.findById.mockReturnValue({
        populate: jest.fn().mockResolvedValue(mockChat),
      });

      await getChatById(req, res);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({ message: "Unauthorized" });
    });

    it("should return a chat", async () => {
      const chatId = new mongoose.Types.ObjectId();
      req.params.chatId = chatId;

      const mockChat = {
        _id: chatId,
        isGroup: false,
        members: [mockUser1._id, mockUser3._id],
      };

      Chat.findById.mockReturnValue({
        populate: jest.fn().mockResolvedValue(mockChat),
      });

      await getChatById(req, res);

      expect(Chat.findById).toHaveBeenCalledWith(chatId);
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(mockChat);
    });
  });

  describe("updateChat", () => {
    it("should fail if chatId is not found", async () => {
      req.params.chatId = "invalidChatId";
      Chat.findById.mockResolvedValue(null);

      await updateChat(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({ message: "Chat not found" });
    });

    it("should fail if chat is not a group chat", async () => {
      const chatId = new mongoose.Types.ObjectId();
      req.params.chatId = chatId;

      req.body = { groupName: "New Group Name" };

      const mockChat = {
        _id: chatId,
        isGroup: false,
        members: [mockUser1._id, mockUser3._id],
      };

      Chat.findById.mockResolvedValue(mockChat);

      await updateChat(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        message: "Private chat cannot be updated",
      });
    });

    it("should fail if user is not a member of the chat", async () => {
      const chatId = new mongoose.Types.ObjectId();
      req.params.chatId = chatId;

      req.body = { groupName: "New Group Name" };

      const mockChat = {
        _id: chatId,
        isGroup: true,
        groupAdmin: mockUser2._id,
        groupName: "Test Group",
        members: [mockUser2._id, mockUser3._id],
      };

      Chat.findById.mockResolvedValue(mockChat);

      await updateChat(req, res);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({ message: "Unauthorized" });
    });

    it("should fail if user is not a group admin update admin", async () => {
      const chatId = new mongoose.Types.ObjectId();
      const adminId = new mongoose.Types.ObjectId();
      const userId = req.user._id;

      req.params.chatId = chatId;
      req.body = { groupAdmin: userId };

      const mockChat = {
        _id: chatId,
        isGroup: true,
        groupAdmin: adminId,
        groupName: "Test Group",
        members: [userId, adminId, mockUser2._id, mockUser3._id],
      };

      Chat.findById.mockResolvedValue(mockChat);

      await updateChat(req, res);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({
        message: "Only group admin can update",
      });
    });

    it("should update a chat", async () => {
      const chatId = new mongoose.Types.ObjectId();
      const newMemberId = new mongoose.Types.ObjectId();
      req.params.chatId = chatId;

      req.body = {
        groupName: "Updated Group Name",
        groupAdmin: newMemberId,
        members: [mockUser1._id, mockUser2._id, mockUser3._id, newMemberId],
      };

      const mockChat = {
        _id: chatId,
        isGroup: true,
        groupAdmin: req.user._id,
        groupName: "Test Group",
        members: [req.user._id, mockUser2._id, mockUser3._id],
      };

      Chat.findById.mockResolvedValue(mockChat);
      Chat.findByIdAndUpdate.mockResolvedValue({
        _id: chatId,
        isGroup: true,
        ...req.body,
      });

      await updateChat(req, res);

      expect(Chat.findByIdAndUpdate).toHaveBeenCalledWith(
        chatId,
        { $set: req.body },
        { new: true },
      );
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        _id: chatId,
        isGroup: true,
        groupAdmin: req.body.groupAdmin,
        groupName: req.body.groupName,
        members: req.body.members,
      });
    });
  });

  describe("deleteChat", () => {
    const mockSession = {
      startTransaction: jest.fn(),
      abortTransaction: jest.fn(),
      commitTransaction: jest.fn(),
      endSession: jest.fn(),
    };

    beforeEach(() => {
      mongoose.startSession = jest.fn().mockResolvedValue(mockSession);
      jest.clearAllMocks();
    });

    it("should return 400 if chatId is invalid", async () => {
      req.params.chatId = "invalid-id";

      await deleteChat(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ message: "Invalid chat ID" });
      expect(mongoose.startSession).not.toHaveBeenCalled();
    });

    it("should return 404 if chat not found", async () => {
      req.params.chatId = new mongoose.Types.ObjectId().toString();

      Chat.findById.mockReturnValue({
        session: jest.fn().mockResolvedValue(null),
      });

      await deleteChat(req, res);

      expect(mockSession.abortTransaction).toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({ message: "Chat not found" });
      expect(mockSession.endSession).toHaveBeenCalled();
    });

    it("should fail if chat is not a group chat", async () => {
      const chatId = new mongoose.Types.ObjectId();
      req.params.chatId = chatId;

      const mockChat = {
        _id: chatId,
        isGroup: false,
      };

      Chat.findById.mockReturnValue({
        session: jest.fn().mockResolvedValue(mockChat),
      });

      await deleteChat(req, res);

      expect(mockSession.abortTransaction).toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        message: "Cannot delete private chat",
      });
    });

    it("should fail if user is not group admin", async () => {
      const chatId = new mongoose.Types.ObjectId();
      req.params.chatId = chatId;

      const mockChat = {
        _id: chatId,
        isGroup: true,
        groupAdmin: mockUser2._id,
        groupName: "Test Group",
        members: [req.user._id, mockUser2._id, mockUser3._id],
      };

      Chat.findById.mockReturnValue({
        session: jest.fn().mockResolvedValue(mockChat),
      });

      await deleteChat(req, res);

      expect(mockSession.abortTransaction).toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({
        message: "Only admin can delete group",
      });
    });

    it("should delete group chat if user is admin", async () => {
      const chatId = new mongoose.Types.ObjectId();
      req.params.chatId = chatId;

      const mockSession = {
        startTransaction: jest.fn(),
        abortTransaction: jest.fn(),
        commitTransaction: jest.fn(),
        endSession: jest.fn(),
      };
      mongoose.startSession = jest.fn().mockResolvedValue(mockSession);

      const mockChat = {
        _id: chatId,
        isGroup: true,
        groupAdmin: mockUser1._id,
        groupAvatar: { publicId: "pid" },
      };

      // Mock findById to support session chaining
      Chat.findById.mockReturnValue({
        session: jest.fn().mockResolvedValue(mockChat),
      });
      Message.deleteMany.mockReturnValue({
        session: jest.fn().mockResolvedValue({}),
      });
      Chat.deleteOne.mockReturnValue({
        session: jest.fn().mockResolvedValue({}),
      });

      await deleteChat(req, res);

      expect(cloudinary.uploader.destroy).toHaveBeenCalledWith("pid");
      expect(mockSession.commitTransaction).toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(200);
    });
  });

  describe("leaveChat", () => {
    const mockSession = {
      startTransaction: jest.fn(),
      abortTransaction: jest.fn(),
      commitTransaction: jest.fn(),
      endSession: jest.fn(),
    };

    beforeEach(() => {
      mongoose.startSession = jest.fn().mockResolvedValue(mockSession);
      jest.clearAllMocks();
    });

    const mockFindByIdSession = (data) => {
      Chat.findById.mockReturnValue({
        session: jest.fn().mockResolvedValue(data),
      });
    };

    it("should return 404 if chat not found", async () => {
      mockFindByIdSession(null);

      await leaveChat(req, res);

      expect(mockSession.abortTransaction).toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({ message: "Chat not found" });
    });

    it("should return 400 if it is a private chat", async () => {
      mockFindByIdSession({ isGroup: false });

      await leaveChat(req, res);

      expect(mockSession.abortTransaction).toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        message: "Private chat cannot be left",
      });
    });

    it("should return 403 if user is not a member", async () => {
      const mockChat = {
        isGroup: true,
        members: [new mongoose.Types.ObjectId()],
      };

      mockChat.members[0].equals = (id) =>
        mockChat.members[0].toString() === id.toString();

      mockFindByIdSession(mockChat);

      await leaveChat(req, res);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({
        message: "You are not a member of this group",
      });
    });

    it("should fail if admin leaves without appointing new admin", async () => {
      const mockChat = {
        isGroup: true,
        groupAdmin: req.user._id,
        members: [req.user._id, mockUser2._id, mockUser3._id],
      };

      mockChat.groupAdmin.equals = (id) =>
        mockChat.groupAdmin.toString() === id.toString();
      mockChat.members.forEach(
        (m) => (m.equals = (id) => m.toString() === id.toString()),
      );

      mockFindByIdSession(mockChat);

      await leaveChat(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        message: "Please appoint a new admin before leaving",
      });
    });

    it("should fail if new admin is not in the group", async () => {
      req.body.newAdminId = new mongoose.Types.ObjectId(); // ID lạ hoắc

      const mockChat = {
        isGroup: true,
        groupAdmin: req.user._id,
        members: [req.user._id, mockUser2._id, mockUser3._id],
      };
      mockChat.groupAdmin.equals = (id) =>
        mockChat.groupAdmin.toString() === id.toString();
      mockChat.members.forEach(
        (m) => (m.equals = (id) => m.toString() === id.toString()),
      );

      mockFindByIdSession(mockChat);

      await leaveChat(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        message: "New admin must be a member of the group",
      });
    });

    it("should succeed: Admin leaves and appoints valid successor", async () => {
      req.params.chatId = new mongoose.Types.ObjectId();
      req.body.newAdminId = mockUser2._id;

      const mockChat = {
        _id: req.params.chatId,
        isGroup: true,
        groupAdmin: req.user._id,
        members: [req.user._id, mockUser2._id, mockUser3._id],
      };
      mockChat.groupAdmin.equals = (id) =>
        mockChat.groupAdmin.toString() === id.toString();
      mockChat.members.forEach(
        (m) => (m.equals = (id) => m.toString() === id.toString()),
      );

      mockFindByIdSession(mockChat);

      const updatedChatMock = {
        members: [mockUser2._id, mockUser3._id],
        groupAdmin: mockUser2._id,
      };
      Chat.findByIdAndUpdate.mockReturnValue(updatedChatMock);

      Chat.findByIdAndUpdate.mockResolvedValue(updatedChatMock);

      await leaveChat(req, res);

      // Kiểm tra gọi update đúng data
      expect(Chat.findByIdAndUpdate).toHaveBeenCalledWith(
        expect.anything(),
        {
          $pull: { members: req.user._id },
          groupAdmin: mockUser2._id,
        },
        expect.objectContaining({ session: mockSession }),
      );
      expect(mockSession.commitTransaction).toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(200);
    });

    it("should succeed: Member leaves (not admin)", async () => {
      req.params.chatId = new mongoose.Types.ObjectId();
      const mockChat = {
        _id: req.params.chatId,
        isGroup: true,
        groupAdmin: mockUser2._id,
        members: [req.user._id, mockUser2._id, mockUser3._id],
      };
      mockChat.groupAdmin.equals = (id) =>
        mockChat.groupAdmin.toString() === id.toString();
      mockChat.members.forEach(
        (m) => (m.equals = (id) => m.toString() === id.toString()),
      );

      mockFindByIdSession(mockChat);

      const updatedChatMock = { members: [mockUser2._id, mockUser3._id] };
      Chat.findByIdAndUpdate.mockResolvedValue(updatedChatMock);

      await leaveChat(req, res);

      expect(Chat.findByIdAndUpdate).toHaveBeenCalledWith(
        expect.anything(),
        { $pull: { members: req.user._id } },
        expect.anything(),
      );
      expect(res.status).toHaveBeenCalledWith(200);
    });

    it("should delete group if last member leaves", async () => {
      const mockChat = {
        isGroup: true,
        groupAdmin: req.user._id,
        members: [req.user._id],
      };
      mockChat.groupAdmin.equals = (id) =>
        mockChat.groupAdmin.toString() === id.toString();
      mockChat.members.forEach(
        (m) => (m.equals = (id) => m.toString() === id.toString()),
      );

      mockFindByIdSession(mockChat);

      // Update trả về mảng rỗng
      const updatedChatMock = { members: [] };
      Chat.findByIdAndUpdate.mockResolvedValue(updatedChatMock);

      // Mock Delete (có chain session)
      Chat.findByIdAndDelete.mockReturnValue({
        session: jest.fn().mockResolvedValue({}),
      });

      await leaveChat(req, res);

      expect(Chat.findByIdAndDelete).toHaveBeenCalled();
      expect(mockSession.commitTransaction).toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        message: "Group deleted as no members left",
      });
    });

    it("should handle error and abort transaction", async () => {
      // Giả lập lỗi DB
      Chat.findById.mockImplementation(() => {
        throw new Error("DB Connection Failed");
      });

      await leaveChat(req, res);

      expect(mockSession.abortTransaction).toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(500);
      expect(mockSession.endSession).toHaveBeenCalled();
    });
  });
});
