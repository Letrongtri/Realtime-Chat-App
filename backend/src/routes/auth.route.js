import express from "express";

const router = express.Router();

router.get("/signin", (req, res) => {
  res.send("Signin");
});

router.get("/signup", (req, res) => {
  res.send("Signup");
});

router.get("/signout", (req, res) => {
  res.send("Signout");
});

export default router;
