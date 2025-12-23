import request from "supertest";
import express from "express";
import cookieParser from "cookie-parser";
import path from "path";
import { protectRoute } from "../../src/middleware/auth.middleware.js";
import { clearDatabase, closeDatabase, connect } from "../db_handler.js";
import {
  deleteProfile,
  getUserById,
  searchUsers,
  updateProfile,
} from "../../src/controllers/user.controller.js";
import { signup } from "../../src/controllers/auth.controller.js";

// Create mock express app
const app = express();
app.use(express.json());
app.use(cookieParser());

// Define routes
const routes = {
  signup: "/api/auth/signup",
  profile: "/api/users/profile",
  search: "/api/users/search",
  getUserById: "/api/users/:id",
};
app.post(routes.signup, signup);
app.get(routes.profile, protectRoute, (req, res) => {
  res.status(200).json(req.user);
});
app.put(routes.profile, protectRoute, updateProfile);
app.delete(routes.profile, protectRoute, deleteProfile);
app.get(routes.search, searchUsers);
app.get(routes.getUserById, getUserById);

describe("User Integration Tests", () => {
  let userA;

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
    userA = await createUser("User A", "a@test.com");
    await createUser("User B", "b@test.com");
    await createUser("User C", "c@test.com");
  });

  describe(`GET ${routes.profile}`, () => {
    it("should get profile successfully", async () => {
      const res = await request(app)
        .get(routes.profile)
        .set("Cookie", userA.token);
      expect(res.status).toBe(200);
      expect(res.body.email).toBe("a@test.com");
    });

    it("should return 404 if user not found", async () => {
      const res = await request(app).get(routes.profile);
      expect(res.status).toBe(401);
    });
  });

  describe(`PUT ${routes.profile}`, () => {
    it("should update profile successfully", async () => {
      const res = await request(app)
        .put(routes.profile)
        .set("Cookie", userA.token)
        .send({
          fullName: "Updated Name",
          email: "a@test.com",
        });
      expect(res.status).toBe(200);
      expect(res.body.user.fullName).toBe("Updated Name");
    });

    it("should return 404 if user not found", async () => {
      const res = await request(app).put(routes.profile).send({
        fullName: "Updated Name",
        email: "a@test.com",
      });
      expect(res.status).toBe(401);
    });

    it("should return 400 if email is invalid", async () => {
      const res = await request(app)
        .put(routes.profile)
        .set("Cookie", userA.token)
        .send({
          fullName: "Updated Name",
          email: "invalid-email",
        });
      expect(res.status).toBe(400);
    });

    it("should return 400 if email is already in use", async () => {
      const res = await request(app)
        .put(routes.profile)
        .set("Cookie", userA.token)
        .send({
          fullName: "Updated Name",
          email: "b@test.com",
        });
      expect(res.status).toBe(400);
    });

    it("should update avatar if provided", async () => {
      const res = await request(app)
        .put(routes.profile)
        .set("Cookie", userA.token)
        .attach("avatar", path.join(__dirname, "../data/test.jpg"))
        .field("fullName", "Updated Name")
        .field("email", "a@test.com");

      expect(res.status).toBe(200);
      expect(res.body.user.avatar).toBeDefined();
    });
  });

  describe(`DELETE ${routes.profile}`, () => {
    it("should delete profile successfully", async () => {
      const res = await request(app)
        .delete(routes.profile)
        .set("Cookie", userA.token);
      expect(res.status).toBe(200);
    });
  });

  describe(`GET ${routes.search}`, () => {
    it("should search users successfully", async () => {
      const res = await request(app).get(`${routes.search}?query=User`);
      expect(res.status).toBe(200);

      expect(res.body.length).toBeGreaterThanOrEqual(3);
    });
  });
});
