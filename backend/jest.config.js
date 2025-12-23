export default {
  testEnvironment: "node",
  transform: {
    "^.+\\.js$": "babel-jest", // Dùng babel để biến đổi code JS
  },
  testTimeout: 30000, // Tăng thời gian chờ (mặc định 5s đôi khi không đủ connect DB)
  verbose: true, // Hiển thị chi tiết log
  setupFilesAfterEnv: ["<rootDir>/tests/setup.js"],
};
