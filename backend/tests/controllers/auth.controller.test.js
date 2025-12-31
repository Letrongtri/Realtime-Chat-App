import bcrypt from "bcryptjs";
import {
  changePassword,
  login,
  logout,
  signup,
} from "../../src/controllers/auth.controller.js";
import User from "../../src/models/User.js";
import { generateToken } from "../../src/lib/utils.js";

// Mock dependencies
jest.mock("bcryptjs");
jest.mock("../../src/models/User.js");
jest.mock("../../src/lib/utils.js");
jest.mock("../../src/emails/emailHandlers.js");
jest.mock("../../src/lib/env.js", () => ({
  ENV: {
    CLIENT_URL: "http://localhost:3000",
    RESEND_API_KEY: "test_api_key",
    RESEND_SENDER_NAME: "test_sender_name",
    RESEND_SENDER_EMAIL: "test_sender_email",
  },
}));

describe("Auth Controller", () => {
  let req, res;

  beforeEach(() => {
    req = { body: {} };
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
      cookie: jest.fn(),
    };
    jest.clearAllMocks();
  });

  describe("signup", () => {
    it("should return 400 if fields are missing", async () => {
      req.body = { fullName: "", email: "", password: "" };
      await signup(req, res);
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        message: "All fields are required",
      });
    });

    it("should return 400 if email is invalid", async () => {
      req.body = { fullName: "Test", email: "test@test", password: "Abc1234" };
      await signup(req, res);
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ message: "Email is invalid" });
    });

    it("should return 400 if password is too short", async () => {
      req.body = { fullName: "Test", email: "test@test.com", password: "123" };
      await signup(req, res);
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        message: "Password must be at least 6 characters long",
      });
    });

    it("should return 400 if email already exists", async () => {
      req.body = {
        fullName: "Test",
        email: "test@test.com",
        password: "Abc1234",
      };
      User.findOne.mockResolvedValue({ email: "test@test.com" });
      await signup(req, res);
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        message: "Email already exists",
      });
    });

    it("should create user and return 201 on success", async () => {
      req.body = {
        fullName: "Test",
        email: "test@test.com",
        password: "password123",
      };

      User.findOne.mockResolvedValue(null);
      bcrypt.genSalt.mockResolvedValue("salt");
      bcrypt.hash.mockResolvedValue("hashedPass");

      // Mock User constructor and save
      const mockSave = jest.fn();
      User.mockImplementation(() => ({
        _id: "user123",
        fullName: "Test",
        email: "test@test.com",
        save: mockSave,
      }));

      await signup(req, res);

      expect(mockSave).toHaveBeenCalled();
      expect(generateToken).toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(201);
    });
  });

  describe("login", () => {
    it("should return 400 if fields are missing", async () => {
      req.body = { email: "", password: "" };
      await login(req, res);
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        message: "All fields are required",
      });
    });

    it("should return 401 if user not found", async () => {
      req.body = { email: "wrong@test.com", password: "password" };
      User.findOne.mockResolvedValue(null);

      await login(req, res);
      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({ message: "Invalid credentials" });
    });

    it("should return 401 if password is incorrect", async () => {
      req.body = { email: "test@test.com", password: "wrongPassword" };
      const mockUser = {
        _id: "user123",
        password: "hashedPassword",
        fullName: "Test",
        email: "test@test.com",
      };

      User.findOne.mockResolvedValue(mockUser);
      bcrypt.compare.mockResolvedValue(false);

      await login(req, res);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({ message: "Invalid credentials" });
    });

    it("should return 200 and token on success", async () => {
      req.body = { email: "test@test.com", password: "password" };
      const mockUser = {
        _id: "user123",
        password: "hashedPassword",
        fullName: "Test",
        email: "test@test.com",
      };

      User.findOne.mockResolvedValue(mockUser);
      bcrypt.compare.mockResolvedValue(true);

      await login(req, res);

      expect(generateToken).toHaveBeenCalledWith("user123", res);
      expect(res.status).toHaveBeenCalledWith(200);
    });
  });

  describe("changePassword", () => {
    it("should return 400 if fields are missing", async () => {
      req.body = { oldPassword: "", newPassword: "" };
      await changePassword(req, res);
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        message: "All fields are required",
      });
    });

    it("should return 404 if user not found", async () => {
      req.body = { oldPassword: "oldPassword", newPassword: "newPassword" };
      req.user = null;

      await changePassword(req, res);
      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({ message: "User not found" });
    });

    it("should return 400 if new password is invalid", async () => {
      req.body = { oldPassword: "oldPassword", newPassword: "123" };
      req.user = {
        fullName: "Test",
        email: "test@test.com",
        password: "oldPassword",
      };
      await changePassword(req, res);
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        message: "Password must be at least 6 characters long",
      });
    });

    it("should return 400 if new password is same as old password", async () => {
      req.body = { oldPassword: "oldPassword", newPassword: "oldPassword" };
      req.user = {
        fullName: "Test",
        email: "test@test.com",
        password: "oldPassword",
      };

      await changePassword(req, res);
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        message: "New password must be different",
      });
    });

    it("should return 401 if old password is incorrect", async () => {
      req.body = { oldPassword: "wrongPassword", newPassword: "newPassword" };
      req.user = {
        fullName: "Test",
        email: "test@test.com",
        password: "oldPassword",
        save: jest.fn(),
      };

      User.findOne.mockReturnValue({
        select: jest.fn().mockResolvedValue({
          password: "oldPassword",
        }),
      });

      bcrypt.compare.mockResolvedValue(false);
      bcrypt.genSalt.mockResolvedValue("salt");
      bcrypt.hash.mockResolvedValue("newPassword");

      await changePassword(req, res);
      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({ message: "Invalid credentials" });
    });

    it("should return 200 on success", async () => {
      req.body = { oldPassword: "oldPassword", newPassword: "newPassword" };
      req.user = {
        fullName: "Test",
        email: "test@test.com",
        password: "oldPassword",
        save: jest.fn(),
      };

      User.findOne.mockReturnValue({
        select: jest.fn().mockResolvedValue({
          password: "oldPassword",
        }),
      });

      bcrypt.compare.mockResolvedValue(true);
      bcrypt.genSalt.mockResolvedValue("salt");
      bcrypt.hash.mockResolvedValue("newPassword");

      await changePassword(req, res);
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        message: "Password changed successfully",
      });
    });
  });

  describe("logout", () => {
    it("should clear cookie and return 200", async () => {
      req.cookies = { jwt: "token" };
      await logout(req, res);
      expect(res.cookie).toHaveBeenCalledWith("jwt", "", { maxAge: 0 });
      expect(res.status).toHaveBeenCalledWith(200);
    });
  });
});
