import http from "http";
import express from "express";
import { Server } from "socket.io";
import { ENV } from "./env.js";
import { socketAuthMiddleware } from "../middleware/socket.auth.middleware.js";

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: ENV.CLIENT_URL,
    credentials: true,
  },
});

io.use(socketAuthMiddleware);

// this is for storing online user
const userSocketMap = {}; // {userId: socketId}

io.on("connection", (socket) => {
  console.log(`User connected: ${socket.userId}`);
  userSocketMap[socket.userId] = socket.id;

  //   io.emit() will send event to all connected users
  io.emit("onlineUsers", Object.keys(userSocketMap));

  socket.on("disconnect", () => {
    console.log(`User disconnected: ${socket.userId}`);
    delete userSocketMap[socket.userId];

    io.emit("onlineUsers", Object.keys(userSocketMap));
  });
});

export { io, app, server };
