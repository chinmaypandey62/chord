import FriendRequest from "../models/FriendRequest.js";
import User from "../models/User.js"; // Ensure User model is imported

// @desc    Send a friend request
// @route   POST /api/friends/send
// @access  Private
const sendFriendRequest = async (req, res) => {
    try {
        const { email } = req.body;

        // Find recipient by email
        const recipient = await User.findOne({ email });
        if (!recipient) {
            return res.status(404).json({ message: "User not found" });
        }

        // Check if sender is trying to send request to themselves
        if (recipient._id.toString() === req.user._id.toString()) {
            return res.status(400).json({ message: "You cannot send a friend request to yourself" });
        }

        // Check if request already exists (pending or accepted)
        const existingRequest = await FriendRequest.findOne({
            $or: [
                { sender: req.user._id, receiver: recipient._id },
                { sender: recipient._id, receiver: req.user._id }
            ],
            status: { $in: ["pending", "accepted"] } // Check for pending or accepted
        });

        if (existingRequest) {
            if (existingRequest.status === "pending") {
                // Check if the existing pending request was sent by the current user or the recipient
                if (existingRequest.sender.toString() === req.user._id.toString()) {
                    return res.status(400).json({ message: "Friend request already sent" });
                } else {
                    return res.status(400).json({ message: "You already have a pending friend request from this user" });
                }
            } else { // status === "accepted"
                return res.status(400).json({ message: "You are already friends with this user" });
            }
        }

        // Create new friend request
        const friendRequest = new FriendRequest({
            sender: req.user._id,
            receiver: recipient._id,
            status: "pending"
        });

        await friendRequest.save();

        console.log(`[sendFriendRequest] Request sent from ${req.user._id} to ${recipient._id}`);
        res.status(201).json({ message: "Friend request sent successfully" });
    } catch (error) {
        console.error("[sendFriendRequest] Error sending friend request:", error);
        res.status(500).json({ message: "Server error sending friend request" });
    }
};

// @desc    Respond to a friend request (accept/reject)
// @route   POST /api/friends/respond
// @access  Private
const respondToFriendRequest = async (req, res) => {
    try {
        const { requestId, accept } = req.body;
        console.log("[respondToFriendRequest] Received response:", { requestId, accept });

        if (typeof accept !== 'boolean') { // Stricter check for boolean
            return res.status(400).json({ message: "Invalid action, 'accept' must be true or false" });
        }

        const request = await FriendRequest.findById(requestId);
        if (!request) {
            return res.status(404).json({ message: "Friend request not found" });
        }

        // Verify the request is for this user and is pending
        if (request.receiver.toString() !== req.user._id.toString()) {
            return res.status(403).json({ message: "Not authorized to respond to this request" });
        }
        if (request.status !== "pending") {
            return res.status(400).json({ message: `Request already ${request.status}` });
        }

        request.status = accept === true ? "accepted" : "rejected";
        await request.save();

        console.log(`[respondToFriendRequest] Request ${requestId} ${request.status} by user ${req.user._id}`);
        res.status(200).json({ message: `Friend request ${request.status}` });
    } catch (error) {
        console.error("[respondToFriendRequest] Error responding to friend request:", error);
        res.status(500).json({ message: "Server error responding to friend request" });
    }
};

// @desc    Get list of friends for the logged-in user
// @route   GET /api/friends
// @access  Private
const getFriends = async (req, res) => {
    try {
        console.log(`[getFriends] Fetching friends for user ${req.user._id}`);
        // Find accepted friend requests where user is either sender or receiver
        const friendRequests = await FriendRequest.find({
            $or: [
                { sender: req.user._id, status: "accepted" },
                { receiver: req.user._id, status: "accepted" }
            ]
        })
        // Populate sender and receiver fields, selecting specific user details INCLUDING status and lastSeen
        .populate('sender', 'username email profilePicture status lastSeen') // <-- Added profilePicture, status, lastSeen
        .populate('receiver', 'username email profilePicture status lastSeen'); // <-- Added profilePicture, status, lastSeen

        // Extract the friend object from each request
        const friends = friendRequests.map(request => {
            // Determine who the friend is in the request object
            const friend = request.sender._id.toString() === req.user._id.toString()
                ? request.receiver
                : request.sender;

            // Return a structured friend object including status and lastSeen
            return {
                _id: friend._id,
                username: friend.username,
                email: friend.email, // Consider if email is needed here
                profilePicture: friend.profilePicture, // Include profile picture
                status: friend.status,         // <-- Include status
                lastSeen: friend.lastSeen,     // <-- Include lastSeen
                requestId: request._id         // Keep the request ID if needed for removal etc.
            };
        });

        console.log(`[getFriends] Found ${friends.length} friends for user ${req.user._id}`);
        res.status(200).json(friends);

    } catch (error) {
        console.error("[getFriends] Error fetching friends:", error);
        res.status(500).json({ message: "Server error fetching friends" });
    }
};

// @desc    Get pending friend requests for the logged-in user
// @route   GET /api/friends/requests
// @access  Private
const getFriendRequests = async (req, res) => {
    try {
        console.log(`[getFriendRequests] Fetching requests for user ${req.user._id}`);
        // Find pending requests where user is the receiver
        const requests = await FriendRequest.find({
            receiver: req.user._id,
            status: "pending"
        })
        // Populate sender details including status and lastSeen
        .populate('sender', 'username email profilePicture status lastSeen'); // <-- Added profilePicture, status, lastSeen

        // Format the requests for the response
        const formattedRequests = requests.map(request => ({
            _id: request._id,
            sender: {
                _id: request.sender._id,
                username: request.sender.username,
                email: request.sender.email, // Consider if email is needed
                profilePicture: request.sender.profilePicture, // Include profile picture
                status: request.sender.status,         // <-- Include status
                lastSeen: request.sender.lastSeen      // <-- Include lastSeen
            },
            createdAt: request.createdAt // Keep timestamp of the request itself
        }));

        console.log(`[getFriendRequests] Found ${formattedRequests.length} pending requests.`);
        res.status(200).json(formattedRequests);
    } catch (error) {
        console.error("[getFriendRequests] Error fetching friend requests:", error);
        res.status(500).json({ message: "Server error fetching friend requests" });
    }
};

// @desc    Remove a friend
// @route   POST /api/friends/remove
// @access  Private
const removeFriend = async (req, res) => {
    try {
        const { friendId } = req.body;
        console.log(`[removeFriend] Attempting to remove friend ${friendId} for user ${req.user._id}`);

        if (!friendId) {
            return res.status(400).json({ message: "Friend ID is required" });
        }

        // Ensure user is not trying to remove themselves (edge case)
        if (friendId === req.user._id.toString()) {
             return res.status(400).json({ message: "Cannot remove yourself as a friend" });
        }

        // Find and delete the accepted friend request between the users
        const deletedRequest = await FriendRequest.findOneAndDelete({
            status: "accepted", // Ensure we only target accepted requests
            $or: [
                { sender: req.user._id, receiver: friendId },
                { sender: friendId, receiver: req.user._id }
            ]
        });

        if (!deletedRequest) {
            console.log(`[removeFriend] Friend relationship not found between ${req.user._id} and ${friendId}`);
            return res.status(404).json({ message: "Friend relationship not found or already removed" });
        }

        console.log(`[removeFriend] Friend ${friendId} removed successfully for user ${req.user._id}`);
        res.status(200).json({ message: "Friend removed successfully" });
    } catch (error) {
        console.error("[removeFriend] Error removing friend:", error);
        res.status(500).json({ message: "Server error removing friend" });
    }
};

// Export all controller functions
export {
    sendFriendRequest,
    respondToFriendRequest,
    getFriends,
    getFriendRequests,
    removeFriend // Make sure to export this function
};