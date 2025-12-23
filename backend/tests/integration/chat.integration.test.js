import request from "supertest";
import express from "express";
import cookieParser from "cookie-parser";
import mongoose from "mongoose";
import path from "path";
import { protectRoute } from "../../src/middleware/auth.middleware.js";
import { clearDatabase, closeDatabase, connect } from "../db_handler.js";
import { signup } from "../../src/controllers/auth.controller.js";
import Chat from "../../src/models/Chat.js";
import {
  createChat,
  deleteChat,
  getAllChats,
  getChatById,
  leaveChat,
  updateChat,
} from "../../src/controllers/chat.controller.js";
import {
  getMessagesByChatId,
  sendMessage,
} from "../../src/controllers/message.controller.js";
import {
  uploadAvatar,
  uploadFile,
} from "../../src/middleware/upload.middleware.js";
import cloudinary from "../../src/lib/cloudinary.js";
import Message from "../../src/models/Message.js";

const app = express();
app.use(express.json());
app.use(cookieParser());

const routes = {
  signup: "/api/auth/signup",
  chat: "/api/chats",
};
app.post(routes.signup, signup);

app.use(protectRoute);

app.get(routes.chat, getAllChats);
app.post(routes.chat, createChat);
app.get(`${routes.chat}/:chatId`, getChatById);
app.put(`${routes.chat}/:chatId`, uploadAvatar.single("avatar"), updateChat);
app.delete(`${routes.chat}/:chatId`, deleteChat);
app.put(`${routes.chat}/:chatId/leave`, leaveChat);

app.get(`${routes.chat}/:chatId/messages`, getMessagesByChatId);
app.post(
  `${routes.chat}/:chatId/messages`,
  uploadFile.array("files", 20),
  sendMessage,
);

const getChatPathWithId = (id) => `${routes.chat}/${id}`;
const getLeaveChatPath = (id) => `${routes.chat}/${id}/leave`;
const getChatMessagePath = (id) => `${routes.chat}/${id}/messages`;

describe("Chat Integration Tests", () => {
  let userA_Token, userA_Id;
  let userB_Token, userB_Id;
  let userC_Token, userC_Id;
  let userD_Token, userD_Id;

  beforeAll(async () => await connect());
  afterEach(async () => await clearDatabase());
  afterAll(async () => await closeDatabase());

  const createUser = async (name, email) => {
    const res = await request(app).post(routes.signup).send({
      fullName: name,
      email: email,
      password: "password123",
    });
    return {
      token: res.headers["set-cookie"],
      id: res.body.user._id,
    };
  };

  beforeEach(async () => {
    const userA = await createUser("User A", "a@test.com");
    userA_Token = userA.token;
    userA_Id = userA.id;

    const userB = await createUser("User B", "b@test.com");
    userB_Token = userB.token;
    userB_Id = userB.id;

    const userC = await createUser("User C", "c@test.com");
    userC_Token = userC.token;
    userC_Id = userC.id;

    const userD = await createUser("User D", "d@test.com");
    userD_Token = userD.token;
    userD_Id = userD.id;
  });

  describe(`POST ${routes.chat} (create chat)`, () => {
    it("should create a new private chat", async () => {
      const res = await request(app)
        .post(routes.chat)
        .set("Cookie", userA_Token)
        .send({ members: [userB_Id], isGroup: false });

      expect(res.status).toBe(201);

      const chat = await Chat.findById(res.body._id);
      expect(chat).toBeTruthy();
      expect(chat.isGroup).toBe(false);
      expect(chat.members.map((id) => id.toString())).toContain(userA_Id);
      expect(chat.members.map((id) => id.toString())).toContain(userB_Id);
    });

    it("should create a new group chat", async () => {
      const res = await request(app)
        .post(routes.chat)
        .set("Cookie", userA_Token)
        .send({ members: [userB_Id, userC_Id], isGroup: true });

      expect(res.status).toBe(201);

      const chat = await Chat.findById(res.body._id);
      expect(chat).toBeTruthy();
      expect(chat.isGroup).toBe(true);
      expect(chat.groupAdmin.toString()).toBe(userA_Id);
      expect(chat.groupName).toBe("A, B, C");
      expect(chat.members.map((id) => id.toString())).toContain(userA_Id);
      expect(chat.members.map((id) => id.toString())).toContain(userB_Id);
      expect(chat.members.map((id) => id.toString())).toContain(userC_Id);
    });

    it("should return 400 if no members", async () => {
      const res = await request(app)
        .post(routes.chat)
        .set("Cookie", userA_Token)
        .send({ members: [] });
      expect(res.status).toBe(400);
      expect(res.body.message).toBe("Members are required");
    });

    it("should return 400 if members not equals 2 in private chat", async () => {
      const res = await request(app)
        .post(routes.chat)
        .set("Cookie", userA_Token)
        .send({ members: [userB_Id, userC_Id], isGroup: false });

      expect(res.status).toBe(400);
      expect(res.body.message).toBe("Private chat must have exactly 2 members");
    });

    it("should return 400 if members less than 3 in group chat", async () => {
      const res = await request(app)
        .post(routes.chat)
        .set("Cookie", userA_Token)
        .send({ members: [userB_Id], isGroup: true });
      expect(res.status).toBe(400);
      expect(res.body.message).toBe("Group chat must have at least 3 members");
    });

    it("should return 400 if chat already existed", async () => {
      await request(app)
        .post(routes.chat)
        .set("Cookie", userA_Token)
        .send({ members: [userB_Id], isGroup: false });

      const res = await request(app)
        .post(routes.chat)
        .set("Cookie", userA_Token)
        .send({ members: [userB_Id], isGroup: false });

      expect(res.status).toBe(400);
      expect(res.body.message).toBe("Chat already exists");
    });
  });

  describe(`GET ${routes.chat} (get all chats)`, () => {
    beforeEach(async () => {
      await request(app)
        .post(routes.chat)
        .set("Cookie", userA_Token)
        .send({ members: [userB_Id], isGroup: false });

      await request(app)
        .post(routes.chat)
        .set("Cookie", userA_Token)
        .send({ members: [userC_Id], isGroup: false });

      await request(app)
        .post(routes.chat)
        .set("Cookie", userA_Token)
        .send({ members: [userB_Id, userC_Id], isGroup: true });
    });

    it("should get all chats", async () => {
      const res = await request(app)
        .get(routes.chat)
        .set("Cookie", userA_Token);

      expect(res.status).toBe(200);
      expect(res.body.length).toBe(3);
    });
  });

  describe(`GET ${routes.chat}/:chatId (get chat by id)`, () => {
    let chatId;
    beforeEach(async () => {
      await request(app)
        .post(routes.chat)
        .set("Cookie", userA_Token)
        .send({ members: [userB_Id, userC_Id], isGroup: true });

      const chat = await Chat.findOne({
        members: [userB_Id, userC_Id, userA_Id],
      });
      chatId = chat._id.toString();
    });

    it("should get chat", async () => {
      const res = await request(app)
        .get(getChatPathWithId(chatId))
        .set("Cookie", userA_Token);

      expect(res.status).toBe(200);
      expect(res.body._id).toBe(chatId);
      expect(res.body.isGroup).toBe(true);
    });

    it("should return 404 if chat not found", async () => {
      const res = await request(app)
        .get(getChatPathWithId(new mongoose.Types.ObjectId().toString()))
        .set("Cookie", userA_Token);

      expect(res.status).toBe(404);
      expect(res.body.message).toBe("Chat not found");
    });

    it("should return 403 if user not in chat", async () => {
      await request(app)
        .post(routes.chat)
        .set("Cookie", userB_Token)
        .send({ members: [userC_Id], isGroup: false });

      const chat = await Chat.findOne({
        members: [userC_Id, userB_Id],
      });

      const id = chat._id.toString();

      const res = await request(app)
        .get(getChatPathWithId(id))
        .set("Cookie", userA_Token);

      expect(res.status).toBe(403);
      expect(res.body.message).toBe("Unauthorized");
    });
  });

  describe(`PUT ${routes.chat}/:chatId (update chat)`, () => {
    let chatId;
    beforeEach(async () => {
      await request(app)
        .post(routes.chat)
        .set("Cookie", userA_Token)
        .send({ members: [userB_Id, userC_Id], isGroup: true });

      const chat = await Chat.findOne({
        members: [userB_Id, userC_Id, userA_Id],
      });
      chatId = chat._id.toString();
    });

    it("should update chat", async () => {
      const res = await request(app)
        .put(getChatPathWithId(chatId))
        .set("Cookie", userA_Token)
        .send({
          groupName: "Updated",
          groupAdmin: userB_Id,
          members: [userA_Id, userB_Id, userC_Id, userD_Id],
        });

      expect(res.status).toBe(200);
      expect(res.body.isGroup).toBe(true);
      expect(res.body.groupName).toBe("Updated");
      expect(res.body.groupAdmin).toBe(userB_Id);
      expect(res.body.members.length).toBe(4);
    });

    it("should update chat with new group avatar", async () => {
      const res = await request(app)
        .put(getChatPathWithId(chatId))
        .set("Cookie", userA_Token)
        .attach("avatar", path.join(__dirname, "../data/test.jpg"))
        .field("groupName", "Updated");

      expect(res.status).toBe(200);

      expect(res.body.groupAvatar).toBeDefined();
    });

    it("should return 404 if chat not found", async () => {
      const res = await request(app)
        .put(getChatPathWithId(new mongoose.Types.ObjectId().toString()))
        .set("Cookie", userA_Token)
        .send({ groupName: "test" });

      expect(res.status).toBe(404);
      expect(res.body.message).toBe("Chat not found");
    });

    it("should return 400 if group is private group", async () => {
      await request(app)
        .post(routes.chat)
        .set("Cookie", userA_Token)
        .send({ members: [userB_Id], isGroup: false });

      const chat = await Chat.findOne({
        members: [userB_Id, userA_Id],
      });
      chatId = chat._id.toString();

      const res = await request(app)
        .put(getChatPathWithId(chatId))
        .set("Cookie", userA_Token)
        .send({ groupName: "Updated" });

      expect(res.status).toBe(400);
      expect(res.body.message).toBe("Private chat cannot be updated");
    });

    it("should return 403 if user not in chat", async () => {
      const res = await request(app)
        .put(getChatPathWithId(chatId))
        .set("Cookie", userD_Token)
        .send({ groupName: "test" });

      expect(res.status).toBe(403);
      expect(res.body.message).toBe("Unauthorized");
    });

    it("should return 403 if not admin update new group admin", async () => {
      const res = await request(app)
        .put(getChatPathWithId(chatId))
        .set("Cookie", userB_Token)
        .send({ groupAdmin: userC_Id });

      expect(res.status).toBe(403);
      expect(res.body.message).toBe("Only group admin can update");
    });
  });

  describe(`DELETE ${routes.chat}/:chatId (delete chat)`, () => {
    let chatId;
    beforeEach(async () => {
      await request(app)
        .post(routes.chat)
        .set("Cookie", userA_Token)
        .send({ members: [userB_Id, userC_Id], isGroup: true });

      const chat = await Chat.findOne({
        members: [userB_Id, userC_Id, userA_Id],
      });
      chatId = chat._id.toString();
    });

    it("should delete chat", async () => {
      const res = await request(app)
        .delete(getChatPathWithId(chatId))
        .set("Cookie", userA_Token);

      expect(res.status).toBe(200);
      expect(res.body.message).toBe("Chat deleted successfully");

      const deletedChat = await Chat.findById(chatId);
      expect(deletedChat).toBeNull();
    });

    it("should return 404 if chat not found", async () => {
      const res = await request(app)
        .delete(getChatPathWithId(new mongoose.Types.ObjectId().toString()))
        .set("Cookie", userA_Token);

      expect(res.status).toBe(404);
      expect(res.body.message).toBe("Chat not found");
    });

    it("should return 400 if delete private chat", async () => {
      await request(app)
        .post(routes.chat)
        .set("Cookie", userA_Token)
        .send({ members: [userB_Id], isGroup: false });

      const chat = await Chat.findOne({
        members: [userB_Id, userA_Id],
      });
      chatId = chat._id.toString();

      const res = await request(app)
        .delete(getChatPathWithId(chatId))
        .set("Cookie", userA_Token);

      expect(res.status).toBe(400);
      expect(res.body.message).toBe("Cannot delete private chat");
    });

    it("should return 403 if not admin delete chat", async () => {
      const res = await request(app)
        .delete(getChatPathWithId(chatId))
        .set("Cookie", userB_Token);

      expect(res.status).toBe(403);
      expect(res.body.message).toBe("Only admin can delete group");
    });

    it("should delete group avatar if group is deleted", async () => {
      const updatedChat = await request(app)
        .put(getChatPathWithId(chatId))
        .set("Cookie", userA_Token)
        .attach("avatar", path.join(__dirname, "../data/test.jpg"));

      const res = await request(app)
        .delete(getChatPathWithId(chatId))
        .set("Cookie", userA_Token);

      expect(res.status).toBe(200);
      expect(cloudinary.uploader.destroy).toHaveBeenCalledWith(
        updatedChat.body.groupAvatar.publicId,
      );
    });
  });

  describe(`PUT ${routes.chats}/:chatId/leave (leave chats)`, () => {
    let chatId;
    beforeEach(async () => {
      await request(app)
        .post(routes.chat)
        .set("Cookie", userA_Token)
        .send({ members: [userB_Id, userC_Id], isGroup: true });

      const chat = await Chat.findOne({
        members: [userB_Id, userC_Id, userA_Id],
      });
      chatId = chat._id.toString();
    });

    it("should leave chat successfully if user is not admin", async () => {
      const res = await request(app)
        .put(getLeaveChatPath(chatId))
        .set("Cookie", userB_Token);

      expect(res.status).toBe(200);
      expect(res.body.members).toHaveLength(2);
      expect(res.body.members).not.toContain(userB_Id);
      expect(res.body.groupAdmin).toBe(userA_Id);
    });

    it("should leave chat and set new group admin successfully if user is admin", async () => {
      const res = await request(app)
        .put(getLeaveChatPath(chatId))
        .set("Cookie", userA_Token)
        .send({ newAdminId: userB_Id });

      expect(res.status).toBe(200);
      expect(res.body.members).toHaveLength(2);
      expect(res.body.members).not.toContain(userA_Id);
      expect(res.body.groupAdmin).toBe(userB_Id);
    });

    it("should delete the chat if no one left", async () => {
      await Chat.updateOne(
        { _id: chatId },
        { groupAvatar: { publicId: "test", url: "test" } },
      );

      await request(app)
        .put(getLeaveChatPath(chatId))
        .set("Cookie", userB_Token);
      await request(app)
        .put(getLeaveChatPath(chatId))
        .set("Cookie", userC_Token);

      const res = await request(app)
        .put(getLeaveChatPath(chatId))
        .set("Cookie", userA_Token);

      expect(res.status).toBe(200);
      expect(res.body.message).toBe("Group deleted as no members left");

      expect(cloudinary.uploader.destroy).toHaveBeenCalledWith("test");

      const deletedChat = await Chat.findById(chatId);
      expect(deletedChat).toBeNull();
    });

    it("should return 404 if chat not found", async () => {
      const res = await request(app)
        .put(getLeaveChatPath(new mongoose.Types.ObjectId().toString()))
        .set("Cookie", userA_Token);

      expect(res.status).toBe(404);
      expect(res.body.message).toBe("Chat not found");
    });

    it("should return 400 if the chat is private", async () => {
      await request(app)
        .post(routes.chat)
        .set("Cookie", userA_Token)
        .send({ members: [userB_Id], isGroup: false });

      const chat = await Chat.findOne({
        members: [userB_Id, userA_Id],
      });
      chatId = chat._id.toString();

      const res = await request(app)
        .put(getLeaveChatPath(chatId))
        .set("Cookie", userA_Token);

      expect(res.status).toBe(400);
      expect(res.body.message).toBe("Private chat cannot be left");
    });

    it("should return 403 if user not in chat", async () => {
      const res = await request(app)
        .put(getLeaveChatPath(chatId))
        .set("Cookie", userD_Token);

      expect(res.status).toBe(403);
      expect(res.body.message).toBe("You are not a member of this group");
    });

    it("should return 400 if user is admin and don't appoint new admin", async () => {
      const res = await request(app)
        .put(getLeaveChatPath(chatId))
        .set("Cookie", userA_Token);

      expect(res.status).toBe(400);
      expect(res.body.message).toBe(
        "Please appoint a new admin before leaving",
      );
    });

    it("should return 400 if new admin is not in the group", async () => {
      const res = await request(app)
        .put(getLeaveChatPath(chatId))
        .set("Cookie", userA_Token)
        .send({ newAdminId: userD_Id });

      expect(res.status).toBe(400);
      expect(res.body.message).toBe("New admin must be a member of the group");
    });
  });

  describe(`POST ${routes.chat}/:chatId/messages (send message)`, () => {
    let chatId;
    beforeEach(async () => {
      await request(app)
        .post(routes.chat)
        .set("Cookie", userA_Token)
        .send({ members: [userB_Id, userC_Id], isGroup: true });

      const chat = await Chat.findOne({
        members: [userB_Id, userC_Id, userA_Id],
      });
      chatId = chat._id.toString();
    });

    it("should send text message successfully", async () => {
      const res = await request(app)
        .post(getChatMessagePath(chatId))
        .set("Cookie", userA_Token)
        .send({ messageType: "text", text: "Hello" });

      expect(res.status).toBe(201);

      const message = await Message.findOne({ chatId });
      expect(message.messageType).toBe("text");
      expect(message.text).toBe("Hello");
      expect(message.senderId.toString()).toBe(userA_Id);
    });

    it("should send image message successfully", async () => {
      const res = await request(app)
        .post(getChatMessagePath(chatId))
        .set("Cookie", userA_Token)
        .attach("files", path.join(__dirname, "../data/test.jpg"))
        .field("messageType", "image");

      expect(res.status).toBe(201);
      expect(cloudinary.uploader.upload).toHaveBeenCalled();

      const message = await Message.findOne({ chatId });
      expect(message.messageType).toBe("image");
      expect(message.image).toBeDefined();
      expect(message.senderId.toString()).toBe(userA_Id);
    });

    it("should return 404 if chat not found", async () => {
      const res = await request(app)
        .post(getChatMessagePath(new mongoose.Types.ObjectId().toString()))
        .set("Cookie", userA_Token)
        .send({ messageType: "text", text: "Hello" });

      expect(res.status).toBe(404);
      expect(res.body.message).toBe("Chat not found");
    });

    it("should return 403 if user not in chat", async () => {
      const res = await request(app)
        .post(getChatMessagePath(chatId))
        .set("Cookie", userD_Token)
        .send({ messageType: "text", text: "Hello" });

      expect(res.status).toBe(403);
      expect(res.body.message).toBe("Unauthorized");
    });

    it("should return 400 if invalid message type", async () => {
      const res = await request(app)
        .post(getChatMessagePath(chatId))
        .set("Cookie", userA_Token)
        .send({ messageType: "invalid", text: "Hello" });

      expect(res.status).toBe(400);
      expect(res.body.message).toBe("Invalid message type");
    });

    it("should return 400 if text is missing in text message", async () => {
      const res = await request(app)
        .post(getChatMessagePath(chatId))
        .set("Cookie", userA_Token)
        .send({ messageType: "text" });

      expect(res.status).toBe(400);
      expect(res.body.message).toBe("Text is required for text messages");
    });

    it("should return 400 if file is missing in file message", async () => {
      const res = await request(app)
        .post(getChatMessagePath(chatId))
        .set("Cookie", userA_Token)
        .field({ messageType: "image", text: "Hello" });

      expect(res.status).toBe(400);
      expect(res.body.message).toBe("File is required for file messages");
    });
  });

  describe(`GET ${routes.chat}/:chatId/messages (get messages by chat id)`, () => {
    let chatId;
    beforeEach(async () => {
      await request(app)
        .post(routes.chat)
        .set("Cookie", userA_Token)
        .send({ members: [userB_Id, userC_Id], isGroup: true });

      const chat = await Chat.findOne({
        members: [userB_Id, userC_Id, userA_Id],
      });
      chatId = chat._id.toString();

      await request(app)
        .post(getChatMessagePath(chatId))
        .set("Cookie", userA_Token)
        .send({ messageType: "text", text: "Hello" });

      await request(app)
        .post(getChatMessagePath(chatId))
        .set("Cookie", userB_Token)
        .attach("files", path.join(__dirname, "../data/test.jpg"))
        .field("messageType", "image");

      await request(app)
        .post(getChatMessagePath(chatId))
        .set("Cookie", userC_Token)
        .send({ messageType: "text", text: "So funny" });
    });

    it("should get messages successfully", async () => {
      const res = await request(app)
        .get(`${getChatMessagePath(chatId)}?limit=2&page=1`)
        .set("Cookie", userA_Token);

      expect(res.status).toBe(200);
      expect(res.body.messages).toHaveLength(2);
      expect(res.body.currentPage).toBe(1);
      expect(res.body.totalPages).toBe(2);
      expect(res.body.totalMessages).toBe(3);
    });

    it("should return 404 if chat not found", async () => {
      const res = await request(app)
        .get(getChatMessagePath(new mongoose.Types.ObjectId().toString()))
        .set("Cookie", userA_Token);

      expect(res.status).toBe(404);
      expect(res.body.message).toBe("Chat not found");
    });

    it("should return 403 if user not in chat", async () => {
      const res = await request(app)
        .get(getChatMessagePath(chatId))
        .set("Cookie", userD_Token);

      expect(res.status).toBe(403);
      expect(res.body.message).toBe("Unauthorized");
    });

    it("should return 400 if invalid limit", async () => {
      const res = await request(app)
        .get(`${getChatMessagePath(chatId)}?limit=invalid&page=1`)
        .set("Cookie", userA_Token);

      expect(res.status).toBe(400);
      expect(res.body.message).toBe("Invalid page or limit");
    });

    it("should return 400 if invalid page", async () => {
      const res = await request(app)
        .get(`${getChatMessagePath(chatId)}?limit=2&page=invalid`)
        .set("Cookie", userA_Token);

      expect(res.status).toBe(400);
      expect(res.body.message).toBe("Invalid page or limit");
    });
  });
});
