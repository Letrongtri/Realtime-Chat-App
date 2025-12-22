import jwt from "jsonwebtoken";
import { protectRoute } from "../../middleware/auth.middleware.js";
import User from "../../src/models/User.js";

jest.mock("jsonwebtoken");
jest.mock("../../src/models/User.js");

jest.mock("../../src/lib/env.js", () => ({
  ENV: { JWT_SECRET: "test_secret" },
}));

describe("Auth Middleware - protectRoute", () => {
  let req, res, next;

  beforeEach(() => {
    req = {
      cookies: {},
    };
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };
    next = jest.fn();
    jest.clearAllMocks();
  });

  it("should return 401 if no token is provided", async () => {
    await protectRoute(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({
      message: "Unauthorized - No token provided",
    });
    expect(next).not.toHaveBeenCalled();
  });

  it("should return 401 if token is invalid", async () => {
    req.cookies.jwt = "invalid_token";
    jwt.verify.mockImplementation(() => null); // Giả lập verify thất bại

    await protectRoute(req, res, next);

    expect(jwt.verify).toHaveBeenCalledWith("invalid_token", "test_secret");
    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({
      message: "Unauthorized - Invalid token",
    });
  });

  it("should return 404 if user is not found", async () => {
    req.cookies.jwt = "valid_token";
    jwt.verify.mockReturnValue({ userId: "user_123" });

    // Mock User.findById(...).select(...) trả về null
    User.findById.mockReturnValue({
      select: jest.fn().mockResolvedValue(null),
    });

    await protectRoute(req, res, next);

    expect(User.findById).toHaveBeenCalledWith("user_123");
    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({
      message: "Unauthorized - User not found",
    });
  });

  it("should call next() and attach user to req if everything is valid", async () => {
    req.cookies.jwt = "valid_token";
    const mockUser = { _id: "user_123", email: "test@test.com" };

    jwt.verify.mockReturnValue({ userId: "user_123" });
    User.findById.mockReturnValue({
      select: jest.fn().mockResolvedValue(mockUser),
    });

    await protectRoute(req, res, next);

    expect(req.user).toEqual(mockUser);
    expect(next).toHaveBeenCalled();
  });

  it("should return 500 if an internal error occurs", async () => {
    req.cookies.jwt = "valid_token";
    jwt.verify.mockImplementation(() => {
      throw new Error("Unexpected error");
    });

    await protectRoute(req, res, next);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({ message: "Server error" });
  });
});
