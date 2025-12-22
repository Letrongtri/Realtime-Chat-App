import {
  updateProfile,
  searchUsers,
  deleteProfile,
  getUserById,
} from "../../src/controllers/user.controller.js";
import cloudinary from "../../src/lib/cloudinary.js";
import User from "../../src/models/User.js";

jest.mock("../../src/models/User.js");
jest.mock("../../src/lib/cloudinary.js", () => ({
  uploader: {
    upload: jest.fn(),
    destroy: jest.fn(),
  },
}));

describe("User Controller", () => {
  let req, res;
  const mockUser = {
    _id: "user123",
    email: "old@test.com",
    fullName: "Old User",
    avatar: { publicId: "avatar123", url: "http://avatar.url" },
    save: jest.fn(),
    remove: jest.fn(),
  };

  beforeEach(() => {
    req = { user: mockUser, body: {}, file: null };
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
      cookie: jest.fn(),
    };
    User.findByIdAndDelete = jest.fn();
    User.findById = jest.fn();
    jest.clearAllMocks();
  });

  describe("updateProfile", () => {
    it("should return 404 if user not found", async () => {
      req.user = null;

      await updateProfile(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({ message: "User not found" });
    });

    it("should return 400 if email is invalid", async () => {
      req.body.email = "invalid-email";

      await updateProfile(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ message: "Email is invalid" });
    });

    it("should return 400 if email already exists", async () => {
      req.body.email = "new@test.com";
      User.findOne.mockResolvedValue({ email: "new@test.com" });

      await updateProfile(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        message: "Email already exists",
      });
    });

    it("should update email if valid and unique", async () => {
      req.body.email = "new@test.com";
      User.findOne.mockResolvedValue(null);

      await updateProfile(req, res);

      expect(mockUser.email).toBe("new@test.com");
      expect(mockUser.save).toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(200);
    });

    it("should upload avatar if file provided", async () => {
      req.file = { path: "temp/path" };
      cloudinary.uploader.upload.mockResolvedValue({
        secure_url: "http://url",
        public_id: "pid",
      });

      await updateProfile(req, res);

      expect(cloudinary.uploader.upload).toHaveBeenCalledWith("temp/path", {
        folder: "avatars",
      });
      expect(mockUser.avatar.url).toBe("http://url");
    });
  });

  describe("searchUsers", () => {
    it("should return users matching query", async () => {
      req.query = { query: "John" };
      const mockResult = [{ fullName: "John Doe" }];

      User.find.mockReturnValue({
        select: jest.fn().mockResolvedValue(mockResult),
      });

      await searchUsers(req, res);

      expect(User.find).toHaveBeenCalledWith({
        $or: [
          { fullName: { $regex: "John", $options: "i" } },
          { email: { $regex: "John", $options: "i" } },
        ],
      });
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(mockResult);
    });
  });

  describe("deleteUser", () => {
    it("should return 404 if user not found", async () => {
      req.user = null;

      await deleteProfile(req, res);
      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({ message: "User not found" });
    });

    it("should delete user", async () => {
      User.findByIdAndDelete.mockResolvedValue(true);

      await deleteProfile(req, res);

      expect(User.findByIdAndDelete).toHaveBeenCalledWith("user123");
      expect(res.cookie).toHaveBeenCalledWith("jwt", "", { maxAge: 0 });
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        message: "Profile deleted successfully",
      });
    });

    it("should delete avatar if exists", async () => {
      mockUser.avatar = { url: "http://url", publicId: "pid" };
      await deleteProfile(req, res);
      expect(cloudinary.uploader.destroy).toHaveBeenCalledWith("pid");
    });
  });

  describe("getUserById", () => {
    it("should return 404 if user not found", async () => {
      User.findById.mockReturnValue({
        select: jest.fn().mockResolvedValue(null),
      });

      req.params = { id: "user123" };

      await getUserById(req, res);

      expect(User.findById).toHaveBeenCalledWith("user123");
      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({ message: "User not found" });
    });

    it("should return user profile", async () => {
      User.findById.mockReturnValue({
        select: jest.fn().mockResolvedValue(mockUser),
      });

      req.params = { id: "user123" };

      await getUserById(req, res);

      expect(User.findById).toHaveBeenCalledWith("user123");
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(mockUser);
    });
  });
});
