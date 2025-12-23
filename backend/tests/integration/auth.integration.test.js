import request from "supertest";
import express from "express";
import cookieParser from "cookie-parser";
import {
  signup,
  login,
  logout,
} from "../../src/controllers/auth.controller.js";
import { protectRoute } from "../../src/middleware/auth.middleware.js";
import { clearDatabase, closeDatabase, connect } from "../db_handler.js";

// Create mock express app
const app = express();
app.use(express.json());
app.use(cookieParser());

// Define routes
const routes = {
  signup: "/api/auth/signup",
  login: "/api/auth/login",
  logout: "/api/auth/logout",
  check: "/api/auth/check",
};
app.post(routes.signup, signup);
app.post(routes.login, login);
app.post(routes.logout, logout);
app.get(routes.check, protectRoute, (req, res) => {
  res.status(200).json(req.user);
});

describe("Auth Integration Tests", () => {
  beforeAll(async () => await connect());
  afterEach(async () => await clearDatabase());
  afterAll(async () => await closeDatabase());

  describe(`POST ${routes.signup}`, () => {
    it("should register a new user and return token", async () => {
      const res = await request(app).post(routes.signup).send({
        fullName: "Test User",
        email: "test@example.com",
        password: "password123",
      });

      expect(res.status).toBe(201);
      expect(res.body.user).toHaveProperty("email", "test@example.com");
      expect(res.headers["set-cookie"]).toBeDefined();
    });

    it("should prevent duplicate emails", async () => {
      await request(app).post(routes.signup).send({
        fullName: "User 1",
        email: "duplicate@example.com",
        password: "password123",
      });

      // Try to register user with the same email
      const res = await request(app).post(routes.signup).send({
        fullName: "User 2",
        email: "duplicate@example.com",
        password: "password123",
      });

      expect(res.status).toBe(400);
      expect(res.body.message).toMatch(/already exists/);
    });
  });

  describe(`POST ${routes.login}`, () => {
    beforeEach(async () => {
      await request(app).post(routes.signup).send({
        fullName: "Login User",
        email: "login@example.com",
        password: "password123",
      });
    });

    it("should login successfully with correct credentials", async () => {
      const res = await request(app).post(routes.login).send({
        email: "login@example.com",
        password: "password123",
      });

      expect(res.status).toBe(200);
      expect(res.headers["set-cookie"]).toBeDefined();
    });

    it("should reject incorrect password", async () => {
      const res = await request(app).post(routes.login).send({
        email: "login@example.com",
        password: "wrongpassword",
      });

      expect(res.status).toBe(401);
    });
  });

  describe(`POST ${routes.logout}`, () => {
    it("should logout successfully", async () => {
      const signupRes = await request(app).post(routes.signup).send({
        fullName: "Logout User",
        email: "logout@example.com",
        password: "password123",
      });
      const cookie = signupRes.headers["set-cookie"];

      const res = await request(app).post(routes.logout).set("Cookie", cookie);

      expect(res.status).toBe(200);
      expect(res.body.message).toBe("Logout successful");
    });

    it("should return 401 if not logged in", async () => {
      const res = await request(app).post(routes.logout);
      expect(res.status).toBe(401);
    });
  });

  describe("Middleware: protectRoute", () => {
    it("should block access without token", async () => {
      const res = await request(app).get("/api/auth/check");
      expect(res.status).toBe(401);
    });

    it("should allow access with valid token", async () => {
      // 1. Login để lấy cookie
      const signupRes = await request(app).post("/api/auth/signup").send({
        fullName: "Auth User",
        email: "auth@example.com",
        password: "123456",
      });
      const cookie = signupRes.headers["set-cookie"];

      // 2. Gửi request kèm cookie
      const res = await request(app)
        .get("/api/auth/check")
        .set("Cookie", cookie);

      expect(res.status).toBe(200);
      expect(res.body.email).toBe("auth@example.com");
    });
  });
});
