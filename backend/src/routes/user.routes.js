import express from "express";

import {
  loginUser,
  registerUser,
  getCurrentUser,
} from "../controllers/user.controller.js";

import verifyjwt from "../middleware/auth.middleware.js";

const router = express.Router();

router.post("/register", registerUser);

router.post("/login", loginUser);

router.get("/current-user", verifyjwt, getCurrentUser);

export default router;