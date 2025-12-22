import jwt from "jsonwebtoken";
import { ENV } from "./env.js";

export const generateToken = (userId, res) => {
  const { JWT_SECRET, NODE_ENV } = ENV;
  if (!JWT_SECRET) {
    throw new Error("JWT_SECRET is not defined");
  }

  const token = jwt.sign({ userId }, JWT_SECRET, {
    expiresIn: "7d",
  });

  res.cookie("jwt", token, {
    httpOnly: true, // accessible only by the web server
    secure: NODE_ENV !== "development",
    sameSite: "strict", // cookie sent only over HTTPS
    maxAge: 1000 * 60 * 60 * 24 * 7, // 7 days
  });

  return token;
};

export const generateGroupName = (users, maxLength = 40) => {
  const lastNames = users.map((u) => {
    const parts = u.fullName.trim().split(/\s+/);
    return parts[parts.length - 1];
  });

  let name = "";
  let count = 0;

  for (let i = 0; i < lastNames.length; i++) {
    const next = count === 0 ? lastNames[i] : `${name}, ${lastNames[i]}`;

    if (next.length > maxLength) {
      const remaining = lastNames.length - count;
      name += ` +${remaining} người khác`;
      break;
    }

    name = next;
    count++;
  }

  return name;
};
