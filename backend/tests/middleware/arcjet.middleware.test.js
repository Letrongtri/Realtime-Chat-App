import { isSpoofedBot } from "@arcjet/inspect";
import aj from "../../src/lib/arcject.js";
import { arcjectProtection } from "../../middleware/arcject.middleware.js";

// Mock dependencies
jest.mock("../../src/lib/arcject.js", () => ({
  protect: jest.fn(),
}));

jest.mock("@arcjet/inspect", () => ({
  isSpoofedBot: jest.fn(),
}));

describe("Arcjet Middleware", () => {
  let req, res, next;

  beforeEach(() => {
    req = {};
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };
    next = jest.fn();
    jest.clearAllMocks();
  });

  it("should return 429 if rate limit is exceeded", async () => {
    aj.protect.mockResolvedValue({
      isDenied: () => true,
      reason: {
        isRateLimit: () => true,
        isBot: () => false,
      },
    });

    await arcjectProtection(req, res, next);

    expect(res.status).toHaveBeenCalledWith(429);
    expect(res.json).toHaveBeenCalledWith({
      message: "Too Many Requests. Try again later",
    });
    expect(next).not.toHaveBeenCalled();
  });

  it("should return 403 if detected as a bot", async () => {
    aj.protect.mockResolvedValue({
      isDenied: () => true,
      reason: {
        isRateLimit: () => false,
        isBot: () => true,
      },
    });

    await arcjectProtection(req, res, next);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith({ message: "No bots allowed" });
  });

  it("should return 403 if denied for other reasons", async () => {
    aj.protect.mockResolvedValue({
      isDenied: () => true,
      reason: {
        isRateLimit: () => false,
        isBot: () => false,
      },
    });

    await arcjectProtection(req, res, next);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith({ message: "Forbidden" });
  });

  it("should return 403 if isSpoofedBot returns true", async () => {
    aj.protect.mockResolvedValue({
      isDenied: () => false,
      results: ["some_result"],
    });
    isSpoofedBot.mockReturnValue(true);

    await arcjectProtection(req, res, next);

    expect(isSpoofedBot).toHaveBeenCalledWith("some_result", 0, [
      "some_result",
    ]);
    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith({ message: "Forbidden" });
  });

  it("should call next() if request is allowed", async () => {
    aj.protect.mockResolvedValue({
      isDenied: () => false,
      results: ["clean_result"],
    });
    isSpoofedBot.mockReturnValue(false);

    await arcjectProtection(req, res, next);

    expect(next).toHaveBeenCalled();
  });

  it("should call next() even if an error occurs (Fail Open)", async () => {
    aj.protect.mockRejectedValue(new Error("Arcjet down"));

    await arcjectProtection(req, res, next);

    expect(next).toHaveBeenCalled();
  });
});
