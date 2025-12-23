import request from "supertest";
import express from "express";
import cookieParser from "cookie-parser";
import { protectRoute } from "../../src/middleware/auth.middleware.js";
import { clearDatabase, closeDatabase, connect } from "../db_handler.js";
import { signup } from "../../src/controllers/auth.controller.js";
import {
  acceptFriendRequest,
  addFriend,
  declineFriendRequest,
  getAllFriends,
  getPendingFriendRequest,
  removeFriend,
} from "../../src/controllers/friend.controller.js";
import FriendRequest from "../../src/models/FriendRequest.js";
import mongoose from "mongoose";
import Chat from "../../src/models/Chat.js";
import User from "../../src/models/User.js";

const app = express();
app.use(express.json());
app.use(cookieParser());

const routes = {
  signup: "/api/auth/signup",
  friends: "/api/friends",
  pending: "/api/friends/pending",
  request: "/api/friends/request",
};
app.post(routes.signup, signup);

app.use(protectRoute);

app.get(routes.friends, getAllFriends);
app.get(routes.pending, getPendingFriendRequest);
app.post(routes.request, addFriend);
app.post(`${routes.request}/:requestId/accept`, acceptFriendRequest);
app.post(`${routes.request}/:requestId/decline`, declineFriendRequest);
app.delete(`${routes.friends}/:friendId`, removeFriend);

const getAcceptPath = (reqId) => `${routes.request}/${reqId}/accept`;
const getDeclinePath = (reqId) => `${routes.request}/${reqId}/decline`;
const getRemoveFriendPath = (friendId) => `${routes.friends}/${friendId}`;

describe("Friend Integration Tests", () => {
  let userA_Token, userA_Id;
  let userB_Token, userB_Id;
  let userC_Token, userC_Id;

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
  });

  describe(`POST ${routes.request}`, () => {
    it("should send a friend request successfully", async () => {
      const res = await request(app)
        .post(routes.request)
        .set("Cookie", userA_Token)
        .send({ receiverId: userB_Id, requestMessage: "Hi B" });

      expect(res.status).toBe(200);
      expect(res.body.message).toBe("Friend request sent successfully");

      // Verify DB
      const reqInDb = await FriendRequest.findOne({
        senderId: userA_Id,
        receiverId: userB_Id,
      });
      expect(reqInDb).toBeTruthy();
      expect(reqInDb.status).toBe("pending");
    });

    it("should return 400 if adding self", async () => {
      const res = await request(app)
        .post(routes.request)
        .set("Cookie", userA_Token)
        .send({ receiverId: userA_Id, requestMessage: "Hi A" });
      expect(res.status).toBe(400);
    });

    it("should return 404 if user not found", async () => {
      const res = await request(app)
        .post(routes.request)
        .set("Cookie", userA_Token)
        .send({
          receiverId: new mongoose.Types.ObjectId(),
          requestMessage: "Hi B",
        });
      expect(res.status).toBe(404);
    });

    it("should return 400 if friend already exists", async () => {
      await request(app)
        .post(routes.request)
        .set("Cookie", userA_Token)
        .send({ receiverId: userB_Id, requestMessage: "Hi B" });

      const res = await request(app)
        .post(routes.request)
        .set("Cookie", userA_Token)
        .send({ receiverId: userB_Id, requestMessage: "Hi B" });
      expect(res.status).toBe(400);
    });
  });

  describe(`POST ${routes.request}/:requestId/accept`, () => {
    let requestId;

    beforeEach(async () => {
      // A send request to B
      await request(app)
        .post(routes.request)
        .set("Cookie", userA_Token)
        .send({ receiverId: userB_Id, requestMessage: "Hi B" });

      const reqInDb = await FriendRequest.findOne({
        senderId: userA_Id,
        receiverId: userB_Id,
      });
      requestId = reqInDb._id.toString();
    });

    it("should accept request, update friend lists, and create chat", async () => {
      // B accept request
      const res = await request(app)
        .post(getAcceptPath(requestId))
        .set("Cookie", userB_Token);

      expect(res.status).toBe(200);
      expect(res.body.message).toBe("Friend request accepted successfully");
      expect(res.body.chatId).toBeDefined();

      // Check status of request
      const updatedReq = await FriendRequest.findById(requestId);
      expect(updatedReq.status).toBe("accepted");

      // Check friend lists of A and B
      const userA = await User.findById(userA_Id).populate("friends");
      const userB = await User.findById(userB_Id).populate("friends");

      expect(userA.friends[0]._id.toString()).toBe(userB_Id);
      expect(userB.friends[0]._id.toString()).toBe(userA_Id);

      // Check created chat between A and B
      const chat = await Chat.findById(res.body.chatId);
      expect(chat).toBeTruthy();
      expect(chat.isGroup).toBe(false);
      expect(chat.members.map((id) => id.toString())).toContain(userA_Id);
      expect(chat.members.map((id) => id.toString())).toContain(userB_Id);
    });

    it("should return 404 if request not found", async () => {
      const res = await request(app)
        .post(getAcceptPath(new mongoose.Types.ObjectId()))
        .set("Cookie", userB_Token);
      expect(res.status).toBe(404);
    });

    it("should fail if sender tries to accept their own request", async () => {
      const res = await request(app)
        .post(getAcceptPath(requestId))
        .set("Cookie", userA_Token);

      expect(res.status).toBe(403);
    });

    it("should return 400 if request is already handled", async () => {
      await FriendRequest.findOneAndUpdate(
        { _id: requestId },
        { status: "declined" },
      );

      const res = await request(app)
        .post(getAcceptPath(requestId))
        .set("Cookie", userB_Token);
      expect(res.status).toBe(400);
    });
  });

  describe(`POST ${routes.request}/:requestId/decline`, () => {
    let requestId;

    beforeEach(async () => {
      // A send request to B
      await request(app)
        .post(routes.request)
        .set("Cookie", userA_Token)
        .send({ receiverId: userB_Id, requestMessage: "Hi B" });

      const reqInDb = await FriendRequest.findOne({
        senderId: userA_Id,
        receiverId: userB_Id,
      });
      requestId = reqInDb._id.toString();
    });

    it("should decline request", async () => {
      const res = await request(app)
        .post(getDeclinePath(requestId))
        .set("Cookie", userB_Token);

      expect(res.status).toBe(200);
      expect(res.body.message).toBe("Friend request declined successfully");

      const updatedReq = await FriendRequest.findById(requestId);
      expect(updatedReq.status).toBe("declined");
    });

    it("should return 404 if request not found", async () => {
      const res = await request(app)
        .post(getDeclinePath(new mongoose.Types.ObjectId()))
        .set("Cookie", userB_Token);
      expect(res.status).toBe(404);
    });

    it("should fail if user is not the receiver", async () => {
      const res = await request(app)
        .post(getDeclinePath(requestId))
        .set("Cookie", userC_Token);

      expect(res.status).toBe(403);
    });

    it("should return 400 if request is already handled", async () => {
      await FriendRequest.findOneAndUpdate(
        { _id: requestId },
        { status: "accepted" },
      );

      const res = await request(app)
        .post(getDeclinePath(requestId))
        .set("Cookie", userB_Token);
      expect(res.status).toBe(400);
    });
  });

  describe(`DELETE ${routes.friends}/:friendId`, () => {
    beforeEach(async () => {
      // Setup: A and B are friends
      await request(app)
        .post(routes.request)
        .set("Cookie", userA_Token)
        .send({ receiverId: userB_Id });

      const reqInDb = await FriendRequest.findOne({
        senderId: userA_Id,
        receiverId: userB_Id,
      });

      await request(app)
        .post(getAcceptPath(reqInDb._id))
        .set("Cookie", userB_Token);
    });

    it("should remove friend from both users lists (Transaction)", async () => {
      // A try to remove B from list friends
      const res = await request(app)
        .delete(getRemoveFriendPath(userB_Id))
        .set("Cookie", userA_Token);

      expect(res.status).toBe(200);
      expect(res.body.message).toBe("Friend removed successfully");

      const userA = await User.findById(userA_Id).populate("friends");
      expect(userA.friends).toHaveLength(0);

      const userB = await User.findById(userB_Id).populate("friends");
      expect(userB.friends).toHaveLength(0);
    });

    it("should return 400 if users are not friends", async () => {
      const res = await request(app)
        .delete(getRemoveFriendPath(userC_Id))
        .set("Cookie", userA_Token);

      expect(res.status).toBe(400);
      expect(res.body.message).toMatch(/Not friends/);
    });
  });

  describe(`GET ${routes.pending}`, () => {
    it("should return list of pending requests for receiver", async () => {
      // A send request to B
      await request(app)
        .post(routes.request)
        .set("Cookie", userA_Token)
        .send({ receiverId: userB_Id });

      // C send request to B
      await request(app)
        .post(routes.request)
        .set("Cookie", userC_Token)
        .send({ receiverId: userB_Id });

      // B get pending requests
      const res = await request(app)
        .get(routes.pending)
        .set("Cookie", userB_Token);

      expect(res.status).toBe(200);
      expect(res.body).toHaveLength(2);

      // Check request from A
      const reqFromA = res.body.find((r) => r.senderId === userA_Id);
      expect(reqFromA).toBeTruthy();
    });
  });

  describe(`GET ${routes.friends}`, () => {
    beforeEach(async () => {
      // Setup: A and B are friends
      await request(app)
        .post(routes.request)
        .set("Cookie", userA_Token)
        .send({ receiverId: userB_Id });

      const reqInDb = await FriendRequest.findOne({
        senderId: userA_Id,
        receiverId: userB_Id,
      });

      await request(app)
        .post(getAcceptPath(reqInDb._id))
        .set("Cookie", userB_Token);
    });

    it("should return list of friends for user", async () => {
      const res = await request(app)
        .get(routes.friends)
        .set("Cookie", userA_Token);

      expect(res.status).toBe(200);
      expect(res.body.friends).toHaveLength(1);
      expect(res.body.friends[0]._id.toString()).toBe(userB_Id);
    });
  });
});
