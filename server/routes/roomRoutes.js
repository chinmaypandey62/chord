import express from 'express';
import { protect } from '../middleware/authMiddleware.js';
import { createRoom, getRoomsForUser, joinRoom, getRoom } from '../controllers/roomController.js'; // Adjust path if necessary

const router = express.Router();

// All room routes should be protected
router.use(protect);

// Route to get rooms for the logged-in user
router.get('/', getRoomsForUser); // Ensure this uses the imported function

// Route to create a new room (e.g., a DM room between two users)
router.post('/create', createRoom); 

// Route to join an existing room
router.post('/join', joinRoom);

// Route to get room info by ID
router.get('/:roomId', getRoom); 

export default router;
