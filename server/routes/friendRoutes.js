import express from 'express';
import { protect } from '../middleware/authMiddleware.js';
import { 
    sendFriendRequest, 
    respondToFriendRequest, 
    getFriends, 
    getFriendRequests,
    removeFriend
} from '../controllers/friendController.js';

const router = express.Router();

// All friend routes should be protected
router.use(protect);

// Route to get the list of friends for the logged-in user
router.get('/', getFriends); 

// Route to get pending friend requests for the logged-in user
router.get('/requests', getFriendRequests);

// Route to send a friend request to another user
router.post('/send', sendFriendRequest); 

// Route to accept or reject a friend request
router.post('/respond', respondToFriendRequest); 

// Route to remove a friend
router.post('/remove', removeFriend);

export default router;
