import { io } from 'socket.io-client';

// Track socket state
let socket = null;
let socketInitialized = false;
let currentUserId = null;
const userSocketListeners = new Map();

// Always use the production URL for testing hosted backend
const getSocketUrl = () => {
  // Use production URL regardless of environment
  return process.env.NEXT_PUBLIC_API_URL;
};

// Initialize socket connection with the user's ID
export const initializeSocket = (userId) => {
  if (!userId) {
    console.error('Cannot initialize socket: No user ID provided');
    return;
  }

  console.log(`Initializing socket connection for user: ${userId}`);
  
  // Don't reinitialize if already connected with the same user
  if (socketInitialized && socket && currentUserId === userId) {
    console.log('Socket already initialized for this user');
    return;
  }
  
  // Clean up existing connection if any
  if (socket) {
    console.log('Disconnecting existing socket before creating new connection');
    socket.disconnect();
    socket = null;
  }
  
  currentUserId = userId;
  
  try {
    // Connect to the server with the user ID as auth data
    const socketUrl = getSocketUrl();
    console.log(`Connecting to socket server at: ${socketUrl}`);
    
    socket = io(socketUrl, {
      auth: { userId },
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
      timeout: 20000, // Increase timeout to 20 seconds
      withCredentials: true
    });

    // Handle connection events
    socket.on('connect', () => {
      console.log(`Socket connected: ${socket.id} for user ${userId}`);
      socketInitialized = true;
      
      // Re-register any existing listeners
      userSocketListeners.forEach((callback, event) => {
        socket.on(event, callback);
      });
    });

    socket.on('connect_error', (err) => {
      console.error(`Socket connection error: ${err.message}`);
      console.error(`Failed to connect to: ${socketUrl}`);
      socketInitialized = false;
    });
    
    socket.on('disconnect', (reason) => {
      console.log(`Socket disconnected. Reason: ${reason}`);
      socketInitialized = false;
    });
    
    // Add other event listeners and logic
    // ...existing code...
  } catch (error) {
    console.error('Error initializing socket:', error);
    socketInitialized = false;
  }
};

// Get the socket instance if initialized
export const getSocket = () => {
  if (!socketInitialized || !socket) {
    console.log('Socket requested before initialization or after disconnection.');
    return null;
  }
  return socket;
};

// Disconnect the socket
export const disconnectSocket = () => {
  if (socket) {
    console.log('Disconnecting socket');
    socket.disconnect();
    socket = null;
  }
  
  socketInitialized = false;
  currentUserId = null;
  userSocketListeners.clear();
};

// Add event listener that persists across reconnections
export const addSocketListener = (event, callback) => {
  if (!event || typeof callback !== 'function') {
    console.error('Invalid event or callback for socket listener');
    return;
  }
  
  // Store the listener so we can reattach it on reconnection
  userSocketListeners.set(event, callback);
  
  // Attach to current socket if it exists
  if (socket && socketInitialized) {
    socket.on(event, callback);
    return true;
  }
  
  return false;
};

// Remove a specific event listener
export const removeSocketListener = (event) => {
  if (!event) return;
  
  userSocketListeners.delete(event);
  
  if (socket && socketInitialized) {
    socket.off(event);
    return true;
  }
  
  return false;
};