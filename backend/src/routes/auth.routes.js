import { Router } from "express";
import { loginAuth, registerAuth, logoutAuth, updateProfile, checkAuth } from "../controllers/auth.controller.js";
import protectRoutes from "../middleware/auth.middleware.js";
const router = Router();

router.post("/login", loginAuth);

router.post("/signup", registerAuth);

router.post("/logout", logoutAuth);

router.post("/update-profile", protectRoutes, updateProfile);

router.get("/check", protectRoutes, checkAuth);

export default router;