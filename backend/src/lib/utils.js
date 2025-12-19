import jwt from "jsonwebtoken";

export const generateToken = (userId, res) => {
  const token = jwt.sign({ userId }, process.env.JWT_SECRET, {
    expiresIn: "7d",
  });

  res.cookie("jwt", token, {
    httpOnly: true, // accessible only by the web server
    secure: process.env.NODE_ENV !== "development",
    sameSite: "strict", // cookie sent only over HTTPS
    maxAge: 1000 * 60 * 60 * 24 * 7, // 7 days
  });

  return token;
};
