import { io } from "socket.io-client";

const URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

// Store the socket instance globally within this module
let socket = null;
let socketInitialized = false;

// Export a function to initialize the socket connection
export const initializeSocket = (userId) => {
  // Don't proceed without userId
  if (!userId) {
    console.error("Cannot initialize socket without userId.");
    return null;
  }

  // If already connected with the same user, return existing socket
  if (socket && socket.connected && socket.auth?.userId === userId) {
    console.log("Socket already connected for user:", userId);
    socketInitialized = true;
    return socket;
  }
  
  // If connected with a different user or disconnected, disconnect first
  if (socket) {
    console.log("Disconnecting existing socket before reconnecting with user:", userId);
    socket.disconnect();
    socket = null;
  }

  console.log("Initializing socket connection for user:", userId);
  
  try {
    socket = io(URL, {
      withCredentials: true,
      transports: ['websocket'],
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
      timeout: 10000,
      auth: {
        userId: userId
      }
    });

    // Add connection logging
    socket.on('connect', () => {
      console.log(`Socket connected: ${socket.id} for user ${userId}`);
      socketInitialized = true;
    });

    socket.on('disconnect', (reason) => {
      console.log(`Socket disconnected: ${reason}`);
      socketInitialized = false;
    });

    socket.on('connect_error', (err) => {
      console.error(`Socket connection error: ${err.message}`);
      socketInitialized = false;
    });

    return socket;
  } catch (error) {
    console.error("Socket initialization error:", error);
    return null;
  }
};

// Export a function to get the current socket instance
export const getSocket = () => {
  if (!socket || !socketInitialized) {
    console.warn("Socket requested before initialization or after disconnection.");
    return null;
  }
  return socket;
};

// Export a function to disconnect the socket
export const disconnectSocket = () => {
  if (socket) {
    console.log("Disconnecting socket manually.");
    socket.disconnect();
    socket = null;
    socketInitialized = false;
  }
};