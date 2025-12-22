import User from "../../src/models/User.js";
import * as dbHandler from "../db_handler.js";

beforeAll(async () => {
  await dbHandler.connect();
  await User.init();
});
afterEach(async () => await dbHandler.clearDatabase());
afterAll(async () => await dbHandler.closeDatabase());

describe("User Model Test", () => {
  it("should create a user successfully with valid fields", async () => {
    const validUser = new User({
      fullName: "Nguyen Van A",
      email: "nguyenvana@example.com",
      password: "password123",
    });
    const savedUser = await validUser.save();
    expect(savedUser._id).toBeDefined();
    expect(savedUser.email).toBe("nguyenvana@example.com");
  });

  it("should fail to create user without required fields", async () => {
    const invalidUser = new User({}); // Thiếu fullName, email, password

    await expect(invalidUser.save()).rejects.toMatchObject({
      errors: {
        fullName: expect.any(Object),
        email: expect.any(Object),
        password: expect.any(Object),
      },
    });
  });

  it("should fail if email is not unique", async () => {
    const user1 = new User({
      fullName: "User 1",
      email: "duplicate@example.com",
      password: "password123",
    });
    await user1.save();

    await expect(
      User.create({
        fullName: "User 2",
        email: "duplicate@example.com",
        password: "password456",
      }),
    ).rejects.toMatchObject({
      code: 11000,
    });
  });

  it("should fail if password is less than 6 characters", async () => {
    const shortPassUser = new User({
      fullName: "User Short",
      email: "short@example.com",
      password: "123",
    });

    await expect(shortPassUser.save()).rejects.toMatchObject({
      errors: {
        password: expect.any(Object),
      },
    });
  });
});
