import express from "express";
import cookieParser from "cookie-parser";
import path from "path";

import authRouter from "./routes/auth.route.js";
import userRouter from "./routes/user.route.js";
import friendRouter from "./routes/friend.route.js";
import chatRouter from "./routes/chat.route.js";
import messageRouter from "./routes/message.route.js";
import { ENV } from "./lib/env.js";
import { arcjectProtection } from "./middleware/arcject.middleware.js";

const app = express();
const __dirname = path.resolve();

app.use(express.json()); // for parsing application/json
app.use(cookieParser());

app.use("/api/auth", authRouter);
app.use("/api/users", userRouter);
app.use("/api/friends", friendRouter);
app.use("/api/chats", chatRouter);
app.use("/api/message", messageRouter);

// Rate limit
app.use(arcjectProtection);

// make ready for deployment
if (ENV.NODE_ENV === "production") {
  app.use(express.static(path.join(__dirname, "../frontend/dist")));

  app.get("*", (_, res) => {
    res.sendFile(path.resolve(__dirname, "../frontend", "dist", "index.html"));
  });
}

export default app;
