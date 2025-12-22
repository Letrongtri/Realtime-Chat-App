import mongoose from "mongoose";
import FriendRequest from "../../src/models/FriendRequest.js";
import * as dbHandler from "../db_handler.js";

beforeAll(async () => {
  await dbHandler.connect();
  await FriendRequest.init();
});
afterEach(async () => await dbHandler.clearDatabase());
afterAll(async () => await dbHandler.closeDatabase());

describe("FriendRequest Model Test", () => {
  it("should create a request with default status pending", async () => {
    const req = new FriendRequest({
      senderId: new mongoose.Types.ObjectId(),
      receiverId: new mongoose.Types.ObjectId(),
    });
    const savedReq = await req.save();
    expect(savedReq.status).toBe("pending");
  });

  it("should create a request with request message", async () => {
    const req = new FriendRequest({
      senderId: new mongoose.Types.ObjectId(),
      receiverId: new mongoose.Types.ObjectId(),
      requestMessage: "Hello",
    });
    const savedReq = await req.save();
    expect(savedReq.requestMessage).toBe("Hello");
  });

  it("should fail without senderId and receiverId", async () => {
    const req = new FriendRequest({});

    await expect(req.save()).rejects.toMatchObject({
      errors: {
        senderId: expect.any(Object),
        receiverId: expect.any(Object),
      },
    });
  });

  it("should accept valid status enum values", async () => {
    const req = new FriendRequest({
      senderId: new mongoose.Types.ObjectId(),
      receiverId: new mongoose.Types.ObjectId(),
      status: "accepted",
    });

    const savedReq = await req.save();
    expect(savedReq.status).toBe("accepted");
  });

  it("should fail with invalid status value", async () => {
    const req = new FriendRequest({
      senderId: new mongoose.Types.ObjectId(),
      receiverId: new mongoose.Types.ObjectId(),
      status: "blocked", // Không nằm trong enum
    });

    await expect(req.save()).rejects.toMatchObject({
      errors: {
        status: expect.any(Object),
      },
    });
  });
});
