import { jest } from "@jest/globals";

// Mock Cloudinary global
jest.mock("../src/lib/cloudinary.js", () => ({
  uploader: {
    upload: jest.fn().mockResolvedValue({
      public_id: "test_public_id",
      secure_url: "http://test-image-url.com/img.png",
    }),
    destroy: jest.fn().mockResolvedValue({ result: "ok" }),
  },
}));

// Mock Email handler
jest.mock("../src/emails/emailHandlers.js", () => ({
  sendWelcomeEmail: jest.fn(),
}));
