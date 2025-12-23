import mongoose from "mongoose";
import fs from "fs";
import {
  sendMessage,
  getMessagesByChatId,
  deleteMessage,
  reactToMessage,
} from "../../src/controllers/message.controller.js";
import Message from "../../src/models/Message.js";
import Chat from "../../src/models/Chat.js";
import cloudinary from "../../src/lib/cloudinary.js";

jest.mock("../../src/models/Message.js");
jest.mock("../../src/models/Chat.js");
jest.mock("fs");
jest.mock("../../src/lib/cloudinary.js", () => ({
  uploader: { upload: jest.fn() },
}));

describe("Message Controller", () => {
  let req, res;
  const mockUser1 = { _id: new mongoose.Types.ObjectId(), fullName: "User 1" };
  const mockUser2 = { _id: new mongoose.Types.ObjectId(), fullName: "User 2" };
  const mockId = new mongoose.Types.ObjectId();

  beforeEach(() => {
    req = { user: mockUser1, params: {}, query: {}, body: {} };
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };
    jest.clearAllMocks();
  });

  describe("getMessagesByChatId", () => {
    it("should return 404 if chat not found", async () => {
      req.params.chatId = new mongoose.Types.ObjectId();

      Chat.findById.mockResolvedValue(null);
      await getMessagesByChatId(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({ message: "Chat not found" });
    });

    it("should return 403 if user is not a member of the chat", async () => {
      req.params.chatId = mockId;
      req.user = { _id: new mongoose.Types.ObjectId() };

      const mockChat = { members: [mockUser1._id, mockUser2._id] };
      mockChat.members[0].equals = (id) =>
        id.toString() === mockUser2._id.toString();
      Chat.findById.mockResolvedValue(mockChat);
      await getMessagesByChatId(req, res);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({ message: "Unauthorized" });
    });

    it("should return messages for the chat", async () => {
      req.params.chatId = mockId._id;
      req.query = { page: 1, limit: 10 };

      const mockMessages = [
        { _id: "msg1", senderId: mockUser1._id, chatId: mockId, text: "Hello" },
        {
          _id: "msg2",
          senderId: mockUser2._id,
          chatId: mockId,
          text: "Hi",
          replyTo: "msg1",
        },
      ];
      const mockQuery = {
        populate: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        sort: jest.fn().mockResolvedValue(mockMessages),
      };

      const mockChat = { members: [mockUser1._id, mockUser2._id] };
      mockChat.members[0].equals = (id) =>
        id.toString() === mockUser1._id.toString();
      Chat.findById.mockResolvedValue(mockChat);

      Message.find.mockReturnValue(mockQuery);
      Message.countDocuments.mockResolvedValue(2);

      await getMessagesByChatId(req, res);

      expect(Message.find).toHaveBeenCalledWith({ chatId: mockId });
      expect(mockQuery.populate).toHaveBeenNthCalledWith(
        1,
        "senderId",
        "fullName avatar",
      );
      expect(mockQuery.populate).toHaveBeenNthCalledWith(2, {
        path: "replyTo",
        select: "text",
        populate: { path: "senderId", select: "fullName" },
      });
      expect(mockQuery.skip).toHaveBeenCalledWith(0);
      expect(mockQuery.limit).toHaveBeenCalledWith(10);
      expect(mockQuery.sort).toHaveBeenCalledWith({ createdAt: -1 });

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        messages: mockMessages,
        currentPage: req.query.page,
        totalPages: Math.ceil(mockMessages.length / req.query.limit),
        totalMessages: mockMessages.length,
      });
    });
  });

  describe("sendMessage", () => {
    beforeEach(() => {
      req.params = { chatId: mockId };

      const mockChat = { members: [req.user._id, mockUser2._id] };
      mockChat.members[0].equals = (id) =>
        id.toString() === req.user._id.toString();
      Chat.findById.mockResolvedValue(mockChat);

      jest.clearAllMocks();
    });

    it("should return 400 if message type is invalid", async () => {
      req.body = { messageType: "invalid" };
      await sendMessage(req, res);
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        message: "Invalid message type",
      });
    });

    it("should return 400 if message type is text and text is missing", async () => {
      req.body = { messageType: "text" };
      await sendMessage(req, res);
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        message: "Text is required for text messages",
      });
    });

    it("should return 400 if message type is not text and file is missing", async () => {
      req.body = { messageType: "file" };
      await sendMessage(req, res);
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        message: "File is required for file messages",
      });
    });

    it("should send a text message successfully", async () => {
      req.body = { messageType: "text", text: "Hello" };

      const mockChat = { members: [mockUser1._id] };
      mockChat.members[0].equals = (id) =>
        id.toString() === mockUser1._id.toString(); // Helper

      Chat.findById.mockResolvedValue(mockChat);
      Chat.findByIdAndUpdate.mockResolvedValue({});

      const mockSave = jest.fn().mockResolvedValue({ _id: "msg1" });
      Message.mockImplementation(() => ({ save: mockSave }));
      Message.findById.mockReturnValue({
        populate: jest.fn().mockResolvedValue({}),
      });

      await sendMessage(req, res);

      expect(mockSave).toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(201);
    });

    it("should upload image and send message", async () => {
      req.body = { messageType: "image" };
      req.files = [{ path: "path/to/img", originalname: "img.png" }];

      // Mock Chat validation
      const mockChat = { members: [mockUser1._id] };
      mockChat.members[0].equals = () => true;
      Chat.findById.mockResolvedValue(mockChat);

      // Mock Cloudinary
      cloudinary.uploader.upload.mockResolvedValue({
        public_id: "pid",
        secure_url: "url",
        bytes: 100,
      });

      // Mock File System
      fs.existsSync.mockReturnValue(true);
      fs.unlinkSync.mockReturnValue({});

      // Mock Message Save
      const mockSave = jest.fn().mockResolvedValue({ _id: "msg1" });
      Message.mockImplementation(() => ({ save: mockSave }));
      Message.findById.mockReturnValue({
        populate: jest.fn().mockResolvedValue({}),
      });
      Chat.findByIdAndUpdate.mockResolvedValue({});

      await sendMessage(req, res);

      expect(cloudinary.uploader.upload).toHaveBeenCalled();
      expect(fs.unlinkSync).toHaveBeenCalled();
      expect(mockSave).toHaveBeenCalled();
    });
  });

  describe("deleteMessage", () => {
    it("should return 404 if message is not found", async () => {
      req.params.messageId = mockId;
      Message.findById.mockResolvedValue(null);

      await deleteMessage(req, res);
      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({ message: "Message not found" });
    });

    it("should return 403 if user is not the sender of the message", async () => {
      req.params.messageId = mockId;
      const mockMessage = { senderId: new mongoose.Types.ObjectId() };
      Message.findById.mockResolvedValue(mockMessage);

      await deleteMessage(req, res);
      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({ message: "Unauthorized" });
    });

    it("should update isDeleted field of message", async () => {
      req.params.messageId = mockId;
      const mockMessage = {
        _id: mockId,
        senderId: req.user._id,
        chatId: mockId,
        isDeleted: false,
        save: jest.fn().mockResolvedValue(true),
      };
      mockMessage.senderId.equals = () => true;
      Message.findById.mockResolvedValue(mockMessage);

      const mockChat = {
        members: [mockUser1._id, mockUser2._id],
        lastestMessage: mockMessage,
      };
      Chat.findByIdAndUpdate.mockResolvedValue(mockChat);

      await deleteMessage(req, res);

      expect(mockMessage.isDeleted).toBe(true);
      expect(mockMessage.save).toHaveBeenCalled();
      expect(Chat.findByIdAndUpdate).toHaveBeenCalledWith(
        mockChat._id,
        { latestMessage: null },
        { new: true },
      );
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        message: "Message deleted successfully",
      });
    });
  });

  describe("reactToMessage", () => {
    beforeEach(() => {
      req.params.messageId = mockId;
      req.body = { type: "like" };
      jest.clearAllMocks();
    });

    it("should return 403 if user is not the memeber of the chat", async () => {
      Message.findById.mockResolvedValue({});
      const newUser = {
        _id: new mongoose.Types.ObjectId(),
        fullName: "User 3",
      };
      const mockChat = { _id: mockId, members: [mockUser2._id, newUser._id] };

      Chat.findById.mockResolvedValue(mockChat);

      await reactToMessage(req, res);
      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({ message: "Unauthorized" });
    });

    it("should react to the message", async () => {
      const mockMessage = {
        _id: mockId,
        senderId: req.user._id,
        chatId: mockId,
        messageType: "text",
        text: "Hello",
        reactions: [],
        isDeleted: false,
        save: jest.fn().mockResolvedValue(true),
      };
      Message.findById.mockResolvedValue(mockMessage);
      const mockChat = { _id: mockId, members: [req.user._id, mockUser2._id] };

      Chat.findById.mockResolvedValue(mockChat);

      await reactToMessage(req, res);

      expect(mockMessage.reactions).toContainEqual({
        userId: req.user._id,
        type: req.body.type,
      });

      expect(mockMessage.save).toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        message: "Message reacted successfully",
      });
    });

    it("should remove reaction from the message if reaction already exists", async () => {
      const mockReaction = {
        userId: req.user._id,
        type: req.body.type,
      };

      const mockMessage = {
        _id: mockId,
        senderId: req.user._id,
        chatId: mockId,
        messageType: "text",
        text: "Hello",
        reactions: [mockReaction],
        isDeleted: false,
        save: jest.fn().mockResolvedValue(true),
      };

      Message.findById.mockResolvedValue(mockMessage);
      const mockChat = { _id: mockId, members: [req.user._id, mockUser2._id] };

      Chat.findById.mockResolvedValue(mockChat);

      await reactToMessage(req, res);

      expect(mockMessage.reactions).not.toContainEqual(mockReaction);
      expect(mockMessage.save).toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        message: "Message reacted successfully",
      });
    });

    it("should change reaction from the message if reaction already exists but with different type", async () => {
      const mockReaction = {
        userId: req.user._id,
        type: "angry",
      };

      const mockMessage = {
        _id: mockId,
        senderId: req.user._id,
        chatId: mockId,
        messageType: "text",
        text: "Hello",
        reactions: [mockReaction],
        isDeleted: false,
        save: jest.fn().mockResolvedValue(true),
      };

      Message.findById.mockResolvedValue(mockMessage);
      const mockChat = { _id: mockId, members: [req.user._id, mockUser2._id] };

      Chat.findById.mockResolvedValue(mockChat);

      await reactToMessage(req, res);

      expect(mockMessage.reactions).toContainEqual({
        userId: req.user._id,
        type: req.body.type,
      });
      expect(mockMessage.save).toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        message: "Message reacted successfully",
      });
    });
  });
});
