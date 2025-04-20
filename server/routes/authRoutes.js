import express from "express";
import { protect } from "../middleware/authMiddleware.js";
import { login, register, logout, checkAuth } from "../controllers/authController.js";

const router = express.Router();

// POST /api/auth/login
router.post("/login", login);

// POST /api/auth/register
router.post("/register", register);

// POST /api/auth/logout
router.post("/logout", logout);

// GET /api/auth/check-auth (protected route)
router.get("/verify", protect, checkAuth);

export default router;
