import request from "supertest";
import express from "express";
import cookieParser from "cookie-parser";
import mongoose from "mongoose";
import path from "path";
import { protectRoute } from "../../src/middleware/auth.middleware.js";
import { clearDatabase, closeDatabase, connect } from "../db_handler.js";
import { signup } from "../../src/controllers/auth.controller.js";
import {
  deleteMessage,
  reactToMessage,
  sendMessage,
} from "../../src/controllers/message.controller.js";
import Message from "../../src/models/Message.js";
import { createChat } from "../../src/controllers/chat.controller.js";
import { uploadFile } from "../../src/middleware/upload.middleware.js";

const app = express();
app.use(express.json());
app.use(cookieParser());

const routes = {
  signup: "/api/auth/signup",
  chat: "/api/chats",
  messages: "/api/messages",
};
app.post(routes.signup, signup);

app.use(protectRoute);

app.post(routes.chat, createChat);
app.post(
  `${routes.chat}/:chatId/messages`,
  uploadFile.array("files", 20),
  sendMessage,
);
app.patch(`${routes.messages}/:messageId`, deleteMessage);
app.patch(`${routes.messages}/:messageId/react`, reactToMessage);

const getChatMessagePath = (id) => `${routes.chat}/${id}/messages`;
const getMessagePathWithId = (id) => `${routes.messages}/${id}`;
const getReactPath = (id) => `${routes.messages}/${id}/react`;

describe("Message Integration Tests", () => {
  let chatId, messageId;
  let userA_Token;
  let userB_Token, userB_Id;
  let userC_Id;
  let userD_Token;

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

    const userB = await createUser("User B", "b@test.com");
    userB_Token = userB.token;
    userB_Id = userB.id;

    const userC = await createUser("User C", "c@test.com");
    userC_Id = userC.id;

    const userD = await createUser("User D", "d@test.com");
    userD_Token = userD.token;

    // Setup chat
    const res = await request(app)
      .post(routes.chat)
      .set("Cookie", userA_Token)
      .send({ members: [userB_Id, userC_Id], isGroup: true });

    chatId = res.body._id;
    const res2 = await request(app)
      .post(getChatMessagePath(chatId))
      .set("Cookie", userA_Token)
      .send({ messageType: "text", text: "Hello" });

    messageId = res2.body._id;
  });

  describe(`PATCH ${routes.messages}/:messageId/ (delete message)`, () => {
    it("should delete text message successfully", async () => {
      const res = await request(app)
        .patch(getMessagePathWithId(messageId))
        .set("Cookie", userA_Token);

      expect(res.status).toBe(200);
      expect(res.body.message).toBe("Message deleted successfully");

      const deletedMessage = await Message.findById(messageId);
      expect(deletedMessage.isDeleted).toBe(true);
    });

    it("should delete file message successfully", async () => {
      const message = await request(app)
        .post(getChatMessagePath(chatId))
        .set("Cookie", userB_Token)
        .attach("files", path.join(__dirname, "../data/test.jpg"))
        .field("messageType", "image");

      messageId = message.body._id;

      const res = await request(app)
        .patch(getMessagePathWithId(messageId))
        .set("Cookie", userB_Token);

      expect(res.status).toBe(200);
      expect(res.body.message).toBe("Message deleted successfully");

      const deletedMessage = await Message.findById(messageId);
      expect(deletedMessage.isDeleted).toBe(true);
    });

    it("should return 404 if message not found", async () => {
      const res = await request(app)
        .patch(getMessagePathWithId(new mongoose.Types.ObjectId().toString()))
        .set("Cookie", userA_Token);

      expect(res.status).toBe(404);
      expect(res.body.message).toBe("Message not found");
    });

    it("should return 403 if user is not the sender", async () => {
      const res = await request(app)
        .patch(getMessagePathWithId(messageId))
        .set("Cookie", userB_Token);

      expect(res.status).toBe(403);
      expect(res.body.message).toBe("Unauthorized");
    });
  });

  describe(`PATCH ${routes.messages}/:messageId/react (react to message)`, () => {
    it("should react to a message successfully", async () => {
      const res = await request(app)
        .patch(getReactPath(messageId))
        .set("Cookie", userB_Token)
        .send({ type: "like" });

      expect(res.status).toBe(200);
      expect(res.body.message).toBe("Message reacted successfully");

      const message = await Message.findById(messageId);
      expect(message.reactions.length).toBe(1);
      expect(message.reactions[0].type).toBe("like");
      expect(message.reactions[0].userId.toString()).toBe(userB_Id);
    });

    it("should change react to a message if already reacted another type", async () => {
      const res = await request(app)
        .patch(getReactPath(messageId))
        .set("Cookie", userB_Token)
        .send({ type: "like" });

      expect(res.status).toBe(200);
      expect(res.body.message).toBe("Message reacted successfully");

      const message = await Message.findById(messageId);
      expect(message.reactions.length).toBe(1);
      expect(message.reactions[0].type).toBe("like");
      expect(message.reactions[0].userId.toString()).toBe(userB_Id);

      const res2 = await request(app)
        .patch(getReactPath(messageId))
        .set("Cookie", userB_Token)
        .send({ type: "love" });

      expect(res2.status).toBe(200);
      expect(res2.body.message).toBe("Message reacted successfully");

      const message2 = await Message.findById(messageId);
      expect(message2.reactions.length).toBe(1);
      expect(message2.reactions[0].type).toBe("love");
      expect(message2.reactions[0].userId.toString()).toBe(userB_Id);
    });

    it("should remove react to a message if already reacted same type", async () => {
      const res = await request(app)
        .patch(getReactPath(messageId))
        .set("Cookie", userB_Token)
        .send({ type: "like" });

      expect(res.status).toBe(200);
      expect(res.body.message).toBe("Message reacted successfully");

      const message = await Message.findById(messageId);
      expect(message.reactions.length).toBe(1);
      expect(message.reactions[0].type).toBe("like");
      expect(message.reactions[0].userId.toString()).toBe(userB_Id);

      const res2 = await request(app)
        .patch(getReactPath(messageId))
        .set("Cookie", userB_Token)
        .send({ type: "like" });

      expect(res2.status).toBe(200);
      expect(res2.body.message).toBe("Message reacted successfully");

      const message2 = await Message.findById(messageId);
      expect(message2.reactions.length).toBe(0);
    });

    it("should return 404 if message not found", async () => {
      const res = await request(app)
        .patch(getReactPath(new mongoose.Types.ObjectId().toString()))
        .set("Cookie", userA_Token)
        .send({ type: "like" });
      expect(res.status).toBe(404);
      expect(res.body.message).toBe("Message not found");
    });

    it("should return 403 if user is not in the chat", async () => {
      const res = await request(app)
        .patch(getReactPath(messageId))
        .set("Cookie", userD_Token)
        .send({ type: "like" });

      expect(res.status).toBe(403);
      expect(res.body.message).toBe("Unauthorized");
    });

    it("should return 400 if invalid react type", async () => {
      const res = await request(app)
        .patch(getReactPath(messageId))
        .set("Cookie", userA_Token)
        .send({ type: "invalid" });

      expect(res.status).toBe(400);
      expect(res.body.message).toBe("Invalid reaction type");
    });
  });
});
