import { io } from "socket.io-client";

const URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000"; // Provide a fallback URL

// Store the socket instance globally within this module
let socket = null;

// Export a function to initialize the socket connection
export const initializeSocket = (userId) => {
  // Prevent creating multiple connections
  if (socket && socket.connected) {
    // If already connected with the same user, return existing socket
    if (socket.auth?.userId === userId) {
      console.log("Socket already connected for user:", userId);
      return socket;
    }
    // If connected with a different user, disconnect first
    console.log("Disconnecting existing socket before reconnecting with user:", userId);
    socket.disconnect();
  }

  if (!userId) {
    console.error("Cannot initialize socket without userId.");
    return null; // Or handle appropriately
  }

  console.log("Initializing socket connection for user:", userId);
  socket = io(URL, {
    withCredentials: true,
    transports: ['websocket'],
    // Add the auth object here
    auth: {
      userId: userId // Pass the user ID obtained after login
    }
  });

  // Optional: Add basic connection logging
  socket.on('connect', () => {
    console.log(`Socket connected: ${socket.id} for user ${userId}`);
  });

  socket.on('disconnect', (reason) => {
    console.log(`Socket disconnected: ${reason}`);
    // Optionally nullify socket here if you want re-initialization on next attempt
    // socket = null;
  });

  socket.on('connect_error', (err) => {
    console.error(`Socket connection error: ${err.message}`);
  });

  return socket;
};

// Export a function to get the current socket instance
export const getSocket = () => {
  if (!socket) {
    console.warn("Socket requested before initialization or after disconnection.");
    // Depending on your app's logic, you might want to throw an error
    // or return null/undefined.
  }
  return socket;
};

// Export a function to disconnect the socket
export const disconnectSocket = () => {
  if (socket) {
    console.log("Disconnecting socket manually.");
    socket.disconnect();
    socket = null; // Clear the instance
  }
};

// Note: We no longer export the socket instance directly
// export default socket; // Remove this line