import User from '../models/User.js'; // Import User model
import FriendRequest from '../models/FriendRequest.js'; // Import FriendRequest model (adjust path if needed)

// In-memory store for current video ID per room
const roomVideoState = {}; // { roomId: currentVideoId, ... }

// Map to store userId -> socketId associations
const userSockets = new Map(); // Map<userId, socketId>

// Helper function to get friend IDs
const getFriendIds = async (userId) => {
  if (!userId) return [];
  try {
    const friendRequests = await FriendRequest.find({
      $or: [{ sender: userId }, { receiver: userId }],
      status: 'accepted',
    }).select('sender receiver');

    const friendIds = friendRequests.map(req =>
      req.sender.toString() === userId.toString() ? req.receiver.toString() : req.sender.toString()
    );
    // console.log(`[getFriendIds] Friends found for ${userId}:`, friendIds);
    return friendIds;
  } catch (error) {
    console.error(`[getFriendIds] Error fetching friend IDs for ${userId}:`, error);
    return [];
  }
};

// Main function to set up socket handlers
export const setupSocketHandlers = (io) => {

  io.on("connection", async (socket) => { // Make the handler async
    console.log(`✅ User connected: ${socket.id}`);

    // --- Authentication & Status Update ---
    const userId = socket.handshake.auth?.userId;
    socket.userId = userId; // Attach userId to socket object for easier access

    if (userId) {
      console.log(`[Connection] Authenticated user ${userId} connected with socket ${socket.id}`);
      userSockets.set(userId, socket.id);

      try {
        const user = await User.findByIdAndUpdate(userId, { status: 'online' }, { new: true }).select('username'); // Fetch username too
        if (user) {
            socket.username = user.username; // Attach username to socket object
            console.log(`[Connection] User ${user.username} (${userId}) marked as online.`);
        } else {
            console.log(`[Connection] User ${userId} not found for status update.`);
        }

        // Notify friends that this user is online
        const friendIds = await getFriendIds(userId);
        friendIds.forEach(friendId => {
          const friendSocketId = userSockets.get(friendId);
          if (friendSocketId) {
            // console.log(`[Connection] Notifying friend ${friendId} (socket ${friendSocketId}) that ${userId} is online.`);
            io.to(friendSocketId).emit('user-status-change', { userId, status: 'online' });
          }
        });

      } catch (error) {
        console.error(`[Connection] Error setting user ${userId} online:`, error);
      }
    } else {
      console.log(`[Connection] Connection ${socket.id} without authenticated userId. Cannot update status.`);
      // Consider disconnecting unauthenticated users
    }

    // --- Room Management ---
    socket.on("join-room", (roomId) => {
      socket.join(roomId);
      console.log(`[Room] User ${socket.username || socket.id} (ID: ${socket.userId || 'N/A'}) joined room ${roomId}`);

      if (roomVideoState[roomId]) {
        // console.log(`[Room] Sending current video ${roomVideoState[roomId]} to user ${socket.id} for room ${roomId}`);
        socket.emit("current-video", { videoId: roomVideoState[roomId] });
      }
    });

    socket.on("leave-room", (roomId) => {
      socket.leave(roomId);
      console.log(`[Room] User ${socket.username || socket.id} (ID: ${socket.userId || 'N/A'}) left room ${roomId}`);
    });

    // --- Video Sync ---
    socket.on("video-action", ({ roomId, action, currentTime }) => {
      // console.log(`[Video] Action received in room ${roomId}: ${action} at ${currentTime} from ${socket.id} (User ID: ${socket.userId || 'N/A'})`);
      io.to(roomId).emit("sync-video", { action, currentTime, senderId: socket.id });
    });

    // --- Change Video ---
    socket.on("change-video", ({ roomId, videoId }) => {
      // console.log(`[Video] Change video request in room ${roomId} to ${videoId} from ${socket.id} (User ID: ${socket.userId || 'N/A'})`);
      roomVideoState[roomId] = videoId;
      io.to(roomId).emit("update-video", { videoId, senderId: socket.id });
    });

    // --- Chat ---
    // Listen for 'typing' (aligned with client)
    socket.on("typing", ({ roomId }) => {
      if (!socket.userId || !socket.username) return; // Ignore if user not identified
      // console.log(`[Socket] User ${socket.username} (${socket.userId}) started typing in room ${roomId}`);
      socket.to(roomId).emit("userTyping", { userId: socket.userId, username: socket.username });
    });

    // Listen for 'stopTyping' (aligned with client)
    socket.on("stopTyping", ({ roomId }) => {
      if (!socket.userId || !socket.username) return;
      // console.log(`[Socket] User ${socket.username} (${socket.userId}) stopped typing in room ${roomId}`);
      socket.to(roomId).emit("userStoppedTyping", { userId: socket.userId, username: socket.username });
    });

    // Modified 'send-message' handler (aligned with client)
    socket.on("send-message", async ({ roomId, message }) => { // Only expect roomId and message
      const senderId = socket.userId; // Get sender's ID from authenticated socket

      if (!senderId || !roomId || !message) {
        console.error("[Socket] Invalid send-message payload or missing senderId:", { senderId, roomId, message });
        return;
      }

      try {
        // Fetch sender details (username already on socket, could fetch picture if needed)
        // For now, use username from socket object
        const senderUsername = socket.username;
        if (!senderUsername) {
             console.error(`[Socket] Sender username not found on socket for ID: ${senderId}`);
             // Optionally fetch from DB as fallback
             // const sender = await User.findById(senderId).select('username').lean();
             // if (!sender) return;
             // senderUsername = sender.username;
             return; // Or handle error appropriately
        }

        // Create the message object with server-verified data
        const messageData = {
          roomId,
          message,
          sender: { // Include sender object
            _id: senderId,
            username: senderUsername,
            // profilePicture: sender.profilePicture, // Fetch if needed
          },
          timestamp: new Date().toISOString(), // Add server timestamp
        };

        console.log(`[Chat] Broadcasting message to room ${roomId} from ${senderUsername}`);
        io.to(roomId).emit("receive-message", messageData);

      } catch (error) {
        console.error("[Socket] Error handling send-message:", error);
      }
    });

    // --- P2P Video Call Signaling ---
    socket.on("call-offer", ({ to, offer, roomId }) => {
      console.log(`[Socket Server] Received 'call-offer' from ${socket.userId} (${socket.id}) for ${to} in room ${roomId}`); // Log reception
      const targetSocketId = userSockets.get(to)
      // Always emit to the user, regardless of room join
      // Pass the roomId for correct toast navigation and call logic
      if (targetSocketId) {
        console.log(`[Socket Server] Relaying 'call-offer' from ${socket.userId} (${socket.id}) to ${to} (${targetSocketId})`); // Log relay attempt
        io.to(targetSocketId).emit("call-offer", { from: socket.userId, offer, roomId })
      } else {
        console.warn(`[Socket Server] Could not find target socket for 'call-offer': ${to}. Storing pending offer.`); // Log if target not found
        if (!global.pendingCallOffers) global.pendingCallOffers = {}
        global.pendingCallOffers[to] = { from: socket.userId, offer, roomId }
      }
    })

    // Add handler for call-answer
    socket.on("call-answer", ({ to, answer }) => {
      console.log(`[Socket Server] Received 'call-answer' from ${socket.userId} (${socket.id}) intended for ${to}`); // Log reception
      const targetSocketId = userSockets.get(to); // Use the map to find the target socket ID
      if (targetSocketId) {
        console.log(`[Socket Server] Relaying 'call-answer' from ${socket.userId} (${socket.id}) to ${to} (${targetSocketId})`); // Log relay attempt
        io.to(targetSocketId).emit("call-answer", { from: socket.userId, answer }); // Emit directly to the target socket ID
      } else {
        console.warn(`[Socket Server] Could not find target socket for 'call-answer': ${to}`); // Log if target not found
      }
    });

    // Add handler for call-ice-candidate
    socket.on("call-ice-candidate", ({ to, candidate }) => {
      // console.log(`[Socket Server] Received 'call-ice-candidate' from ${socket.userId} (${socket.id}) for ${to}`); // Log reception (can be noisy)
      const targetSocketId = userSockets.get(to); // Use the map
      if (targetSocketId) {
        // console.log(`[Socket Server] Relaying 'call-ice-candidate' from ${socket.userId} (${socket.id}) to ${to} (${targetSocketId})`); // Log relay attempt (can be noisy)
        io.to(targetSocketId).emit("call-ice-candidate", { from: socket.userId, candidate }); // Emit directly
      } else {
        // console.warn(`[Socket Server] Could not find target socket for 'call-ice-candidate': ${to}`); // Log if target not found (can be noisy)
      }
    });


    // When a user connects, check for any pending call offers
    if (userId && global.pendingCallOffers && global.pendingCallOffers[userId]) {
      const pending = global.pendingCallOffers[userId]
      console.log(`[Socket Server] Found pending call offer for ${userId} from ${pending.from}. Emitting.`); // Log pending offer emission
      socket.emit("call-offer", pending)
      delete global.pendingCallOffers[userId]
    }

    socket.on("call-decline", ({ to }) => {
      console.log(`[Socket Server] Received 'call-decline' from ${socket.userId} (${socket.id}) for ${to}`); // Log reception
      const targetSocketId = userSockets.get(to)
      if (targetSocketId) {
        console.log(`[Socket Server] Relaying 'call-decline' from ${socket.userId} (${socket.id}) to ${to} (${targetSocketId})`); // Log relay attempt
        io.to(targetSocketId).emit("call-decline", { from: socket.userId }); // Include 'from'
        // Also emit call-hangup to ensure both sides close their popups/UI
        console.log(`[Socket Server] Also relaying 'call-hangup' for decline from ${socket.userId} (${socket.id}) to ${to} (${targetSocketId})`);
        io.to(targetSocketId).emit("call-hangup", { from: socket.userId }); // Include 'from'
      } else {
        console.warn(`[Socket Server] Could not find target socket for 'call-decline': ${to}`); // Log if target not found
      }
    })

    socket.on("call-hangup", ({ to }) => {
      console.log(`[Socket Server] Received 'call-hangup' from ${socket.userId} (${socket.id}) for ${to}`); // Log reception
      const targetSocketId = userSockets.get(to)
      if (targetSocketId) {
        console.log(`[Socket Server] Relaying 'call-hangup' from ${socket.userId} (${socket.id}) to ${to} (${targetSocketId})`); // Log relay attempt
        io.to(targetSocketId).emit("call-hangup", { from: socket.userId }); // Include 'from'
      } else {
        console.warn(`[Socket Server] Could not find target socket for 'call-hangup': ${to}`); // Log if target not found
      }
    })

    // --- Disconnect ---
    socket.on("disconnect", async (reason) => { // Make the handler async
      console.log(`❌ User disconnected: ${socket.id}, Reason: ${reason}`);

      const disconnectedUserId = socket.userId; // Get userId directly from socket object

      if (disconnectedUserId) {
        userSockets.delete(disconnectedUserId); // Remove user from the map
        console.log(`[Disconnect] Removed user ${disconnectedUserId} from userSockets map.`);
        try {
          const user = await User.findByIdAndUpdate(
            disconnectedUserId,
            { status: 'offline', lastSeen: new Date() },
            { new: true }
          );

          if (user) {
            console.log(`[Disconnect] User ${user.username} (${disconnectedUserId}) marked as offline. Last seen: ${user.lastSeen}`);

            const friendIds = await getFriendIds(disconnectedUserId);
            friendIds.forEach(friendId => {
              const friendSocketId = userSockets.get(friendId);
              if (friendSocketId) {
                // console.log(`[Disconnect] Notifying friend ${friendId} (socket ${friendSocketId}) that ${disconnectedUserId} is offline.`);
                io.to(friendSocketId).emit('user-status-change', { userId: disconnectedUserId, status: 'offline', lastSeen: user.lastSeen });
              }
            });
          } else {
             console.log(`[Disconnect] User ${disconnectedUserId} not found for offline status update.`);
          }

        } catch (error) {
          console.error(`[Disconnect] Error setting user ${disconnectedUserId} offline:`, error);
        }
      } else {
         console.log(`[Disconnect] Disconnected socket ${socket.id} had no associated userId.`);
      }

      // Clean up room memberships
      socket.rooms.forEach(room => {
        if (room !== socket.id) {
          socket.leave(room);
          // console.log(`[Disconnect] Socket ${socket.id} automatically left room ${room}.`);
        }
      });
    });

    // --- Error Handling per Socket ---
    socket.on("connect_error", (err) => {
      console.log(`[Error] Socket connect_error for ${socket.id}: ${err.message}`);
    });

    socket.on('error', (error) => {
      console.error(`[Error] Generic socket error for ${socket.id} (User ID: ${socket.userId || 'N/A'}):`, error);
    });

  });

  // --- Global Engine Error Handling ---
  io.engine.on("connection_error", (err) => {
    console.log("[Error] Socket Engine Connection Error:");
    console.log(`       Code: ${err.code}`);
    console.log(`       Message: ${err.message}`);
  });

  console.log("🔌 Socket.IO handlers set up successfully.");
};

// Export the setup function
export default setupSocketHandlers; // Ensure this is the default export if server.js expects it