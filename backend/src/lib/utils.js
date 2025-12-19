import jwt from "jsonwebtoken";

export const generateToken = (userId, res) => {
  const { JWT_SECRET, NODE_ENV } = process.env;
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
