import { Router } from "express";

// Import controller functions for handling message-related routes
import { addFriend, getFriends, sendMessage } from "../controllers/message.controller.js";

// Import middleware to protect routes
import protectRoutes from "../middleware/auth.middleware.js";

// Create a new router instance
const router = Router();

// Route to add a friend, protected by authentication middleware
router.post("/add-friend", protectRoutes, addFriend);

// Route to get the list of friends, protected by authentication middleware
router.get("/get-friends", protectRoutes, getFriends);

// Route to send a message, protected by authentication middleware
router.post("/send-message", protectRoutes, sendMessage);

// Export the router to be used in other parts of the application
export default router;