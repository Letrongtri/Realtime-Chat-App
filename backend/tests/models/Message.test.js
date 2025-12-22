import mongoose from "mongoose";
import Message from "../../src/models/Message.js";
import * as dbHandler from "../db_handler.js";

beforeAll(async () => {
  await dbHandler.connect();
  await Message.init();
});
afterEach(async () => await dbHandler.clearDatabase());
afterAll(async () => await dbHandler.closeDatabase());

describe("Message Model Test", () => {
  const baseData = {
    senderId: new mongoose.Types.ObjectId(),
    chatId: new mongoose.Types.ObjectId(),
  };

  it("should create a text message successfully", async () => {
    const msg = new Message({
      ...baseData,
      messageType: "text",
      text: "Hello World",
    });

    await expect(msg.save()).resolves.toMatchObject({
      text: "Hello World",
    });
  });

  it("should fail validation if text message has no text content", async () => {
    const msg = new Message({
      ...baseData,
      messageType: "text",
      // Missing text
    });

    await expect(msg.save()).rejects.toMatchObject({
      errors: {
        text: expect.any(Object),
      },
    });
  });

  it("should create an image message successfully", async () => {
    const msg = new Message({
      ...baseData,
      messageType: "image",
      image: [
        {
          publicId: "image/image.png",
          url: "image.png",
          name: "image.png",
          size: 1024,
        },
      ],
    });

    await expect(msg.save()).resolves.toMatchObject({
      image: [
        {
          publicId: "image/image.png",
          url: "image.png",
          name: "image.png",
          size: 1024,
        },
      ],
    });
  });

  it("should fail validation if image message has no image content", async () => {
    const msg = new Message({
      ...baseData,
      messageType: "image",
      // Missing image array
    });

    await expect(msg.save()).rejects.toMatchObject({
      errors: {
        image: expect.any(Object),
      },
    });
  });

  it("should fail validation with invalid messageType enum", async () => {
    const msg = new Message({
      ...baseData,
      messageType: "hologram",
      text: "Invalid type",
    });

    await expect(msg.save()).rejects.toMatchObject({
      errors: {
        messageType: expect.any(Object),
      },
    });
  });
});
