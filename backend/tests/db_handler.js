import mongoose from "mongoose";
import { MongoMemoryReplSet } from "mongodb-memory-server";

let mongod;

// Kết nối đến DB ảo trong RAM
export const connect = async () => {
  mongod = await MongoMemoryReplSet.create({
    replSet: { count: 1, storageEngine: "wiredTiger" },
  });
  const uri = mongod.getUri();
  await mongoose.connect(uri);
};

// Ngắt kết nối và đóng DB sau khi test xong
export const closeDatabase = async () => {
  await mongoose.connection.dropDatabase();
  await mongoose.connection.close();
  await mongod.stop();
};

// Xóa dữ liệu giữa các test case (để test case này không ảnh hưởng test case kia)
export const clearDatabase = async () => {
  const collections = mongoose.connection.collections;
  for (const key in collections) {
    const collection = collections[key];
    await collection.deleteMany();
  }
};
