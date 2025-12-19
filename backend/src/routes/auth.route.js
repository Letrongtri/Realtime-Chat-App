import express from "express";
import { signup } from "../controllers/auth.controller.js";

const router = express.Router();

router.get("/signin", (req, res) => {
  res.send("Signin");
});

router.post("/signup", signup);

router.get("/signout", (req, res) => {
  res.send("Signout");
});

export default router;
