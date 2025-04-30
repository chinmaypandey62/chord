import express from "express";
import { protect } from "../middleware/authMiddleware.js";
import * as authController from "../controllers/authController.js";

const router = express.Router();

// POST /api/auth/login
router.post("/login", authController.login);

// POST /api/auth/register
router.post("/register", authController.register);

// POST /api/auth/logout
router.post("/logout", authController.logout);

// GET /api/auth/verify (protected route)
router.get('/verify', protect, authController.verifyToken);

export default router;
