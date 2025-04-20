import Room from "../models/Room.js";
import User from "../models/User.js"; // Ensure User model is imported

// Fields to select when populating user data
const userPopulateFields = 'username email profilePicture status lastSeen';

// Create a named room or find/create a direct message room
export const createRoom = async (req, res) => {
  // Assumes authentication middleware adds user to req: req.user = { _id: '...' }
  if (!req.user || !req.user._id) { // Check for _id from protect middleware
    return res.status(401).json({ message: "Not authenticated" });
  }
  const userId = req.user._id; // Use _id
  const { name, participants } = req.body;

  try {
    let room;

    // Scenario 1: Create a named room (owner is admin and member)
    if (name) {
      console.log(`[createRoom] Creating named room '${name}' for user ${userId}`);
      room = await Room.create({
        name,
        admin: userId,
        members: [userId],
        isDirectMessage: false,
      });
      console.log(`[createRoom] Named room ${room._id} created.`);
    }
    // Scenario 2: Find or create a direct message room
    else if (participants && participants.length === 1) {
      const friendId = participants[0];
      // Ensure friendId is valid and not the user themselves
      if (!friendId || friendId === userId.toString()) {
         return res.status(400).json({ message: "Invalid participant ID provided for direct message." });
      }

      // Check if friendId corresponds to an actual user (optional but good practice)
      const friendExists = await User.findById(friendId);
      if (!friendExists) {
          return res.status(404).json({ message: "The specified friend user does not exist." });
      }

      // Sort IDs to ensure consistency in finding/creating DM rooms
      const members = [userId.toString(), friendId.toString()].sort();
      console.log(`[createRoom] Finding/Creating DM room between ${members[0]} and ${members[1]}`);

      // Check if a DM room already exists between these two users
      room = await Room.findOne({
        isDirectMessage: true,
        members: { $all: members, $size: 2 }, // Exactly these two members
      });

      if (!room) {
        // Create a new DM room if it doesn't exist
        console.log(`[createRoom] DM room not found, creating new one.`);
        room = await Room.create({
          name: `DM:${members[0]}-${members[1]}`, // Auto-generated name for DMs
          admin: userId, // Or null/undefined for DMs if admin concept doesn't apply
          members: members,
          isDirectMessage: true,
        });
        console.log(`[createRoom] DM room ${room._id} created.`);
      } else {
         console.log(`[createRoom] Found existing DM room: ${room._id}`);
      }
    }
    // Invalid request
    else {
      console.log(`[createRoom] Invalid request payload:`, req.body);
      return res.status(400).json({ message: "Invalid request. Provide 'name' for a group room or 'participants' (with one friend ID) for a direct chat." });
    }

    // Populate members and admin for the response
    const populatedRoom = await Room.findById(room._id)
        .populate("members", userPopulateFields) // <-- Use defined fields
        .populate("admin", userPopulateFields);  // <-- Use defined fields

    console.log(`[createRoom] Returning room ${populatedRoom._id}`);
    res.status(201).json(populatedRoom); // Return the found or created room

  } catch (error) {
    console.error("[createRoom] Error:", error);
    res.status(500).json({ message: "Server error creating or finding room", error: error.message });
  }
};

// Join an existing room (primarily for named rooms)
export const joinRoom = async (req, res) => {
  const { roomId } = req.params; // Get roomId from URL parameters
  const userId = req.user._id; // Get userId from authenticated user

  try {
    console.log(`[joinRoom] User ${userId} attempting to join room ${roomId}`);
    const room = await Room.findById(roomId);
    if (!room) {
      return res.status(404).json({ message: "Room not found" });
    }

    // Cannot join a direct message room explicitly
    if (room.isDirectMessage) {
        return res.status(400).json({ message: "Cannot explicitly join a direct message room." });
    }

    // Add user to members if not already present
    if (!room.members.map(id => id.toString()).includes(userId.toString())) {
      room.members.push(userId);
      await room.save();
      console.log(`[joinRoom] User ${userId} successfully joined room ${roomId}`);
    } else {
       console.log(`[joinRoom] User ${userId} is already a member of room ${roomId}`);
    }

    // Populate and return the updated room info
    const populatedRoom = await Room.findById(room._id)
        .populate("members", userPopulateFields) // <-- Use defined fields
        .populate("admin", userPopulateFields);  // <-- Use defined fields

    res.status(200).json(populatedRoom);
  } catch (error) {
    console.error(`[joinRoom] Error joining room ${roomId} for user ${userId}:`, error);
    res.status(500).json({ message: "Server error joining room", error: error.message });
  }
};

// Get room info by ID
export const getRoom = async (req, res) => {
  try {
    const { roomId } = req.params;
    console.log(`[getRoom] Fetching room details for ID: ${roomId}`);

    const room = await Room.findById(roomId)
      .populate("members", userPopulateFields) // <-- Use defined fields
      .populate("admin", userPopulateFields);  // <-- Use defined fields

    if (!room) {
      console.log(`[getRoom] Room not found: ${roomId}`);
      return res.status(404).json({ message: "Room not found" });
    }

    // Optional: Check if the requesting user is a member of the room
    // if (!room.members.some(member => member._id.toString() === req.user._id.toString())) {
    //    console.log(`[getRoom] User ${req.user._id} is not a member of room ${roomId}`);
    //    return res.status(403).json({ message: "Access denied. You are not a member of this room." });
    // }

    console.log(`[getRoom] Found room: ${room._id}`);
    res.status(200).json(room);
  } catch (error) {
    console.error(`[getRoom] Error fetching room ${req.params.roomId}:`, error);
    res.status(500).json({ message: "Server error fetching room", error: error.message });
  }
};

// Get rooms for the logged-in user
export const getRoomsForUser = async (req, res) => {
  try {
    const userId = req.user._id;
    console.log(`[getRoomsForUser] Fetching rooms for user ${userId}`);

    // Find rooms where the logged-in user is a member
    const rooms = await Room.find({ members: userId })
        .populate('members', userPopulateFields) // <-- Use defined fields
        .populate('admin', userPopulateFields)   // <-- Use defined fields
        // Optional: Populate last message sender if you add that feature
        // .populate('lastMessage.sender', userPopulateFields)
        .sort({ updatedAt: -1 }); // Sort by recent activity (or createdAt)

    console.log(`[getRoomsForUser] Found ${rooms.length} rooms for user ${userId}`);
    res.status(200).json(rooms);
  } catch (error) {
    console.error(`[getRoomsForUser] Error fetching rooms for user ${req.user._id}:`, error);
    res.status(500).json({ message: "Server error fetching rooms", error: error.message });
  }
};