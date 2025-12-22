import mongoose from "mongoose";
import Chat from "../../src/models/Chat.js";
import * as dbHandler from "../db_handler.js";

beforeAll(async () => {
  await dbHandler.connect();
  await Chat.init();
});
afterEach(async () => await dbHandler.clearDatabase());
afterAll(async () => await dbHandler.closeDatabase());

describe("Chat Model Test", () => {
  it("should create a private chat (not group) without group fields", async () => {
    const chat = new Chat({
      members: [new mongoose.Types.ObjectId()],
      isGroup: false,
    });

    await expect(chat.save()).resolves.toMatchObject({
      isGroup: false,
    });
  });

  it("should fail to create a group chat without groupName", async () => {
    const chat = new Chat({
      isGroup: true,
      groupAdmin: new mongoose.Types.ObjectId(),
    });

    await expect(chat.save()).rejects.toMatchObject({
      errors: {
        groupName: expect.any(Object),
      },
    });
  });

  it("should create a group chat successfully with all required fields", async () => {
    const chat = new Chat({
      isGroup: true,
      groupName: "Dev Team",
      groupAdmin: new mongoose.Types.ObjectId(),
    });

    await expect(chat.save()).resolves.toMatchObject({
      isGroup: true,
      groupName: "Dev Team",
    });
  });

  it("should fail group chat without groupAdmin", async () => {
    const chat = new Chat({
      isGroup: true,
      groupName: "No Admin Group",
    });

    await expect(chat.save()).rejects.toMatchObject({
      errors: {
        groupAdmin: expect.any(Object),
      },
    });
  });
});
