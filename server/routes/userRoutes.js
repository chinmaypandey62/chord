import express from 'express';
import { getUserProfile, updateUserProfile } from '../controllers/userController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

// Apply protect middleware to all routes in this file
router.use(protect); 

// Define routes
router.route('/profile').get(getUserProfile).put(updateUserProfile);
// Add other user-related routes here if needed

export default router;
