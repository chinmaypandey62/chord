"use client"

import React, { createContext, useState, useEffect, useContext } from "react"
import axios from "../utils/axios"
import { useAuth } from "./AuthContext"
import { getSocket } from "../utils/socket"; // <-- Import getSocket

const FriendContext = createContext()

export const useFriends = () => useContext(FriendContext)

export const FriendProvider = ({ children }) => {
  const { user } = useAuth() // Get the logged-in user
  const [friends, setFriends] = useState([])
  const [friendRequests, setFriendRequests] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  // Function to fetch friends list
  const fetchFriends = async () => {
    if (!user) return; // Don't fetch if no user
    setLoading(true)
    setError(null)
    try {
      console.log("[FriendContext] Fetching friends...");
      const response = await axios.get("/friends") // API endpoint for friends
      // The response.data should already include status and lastSeen from the controller update
      setFriends(response.data || [])
      console.log("[FriendContext] Friends fetched:", response.data);
    } catch (err) {
      console.error("[FriendContext] Error fetching friends:", err)
      setError(err.response?.data?.message || "Failed to fetch friends")
      setFriends([]) // Clear friends on error
    } finally {
      setLoading(false)
    }
  }

  // Function to fetch friend requests
  const fetchFriendRequests = async () => {
    if (!user) return; // Don't fetch if no user
    setLoading(true)
    setError(null)
    try {
      console.log("[FriendContext] Fetching friend requests...");
      const response = await axios.get("/friends/requests") // API endpoint for requests
      // The response.data should already include sender status/lastSeen from the controller update
      setFriendRequests(response.data || [])
      console.log("[FriendContext] Friend requests fetched:", response.data);
    } catch (err) {
      console.error("[FriendContext] Error fetching friend requests:", err)
      setError(err.response?.data?.message || "Failed to fetch friend requests")
      setFriendRequests([]) // Clear requests on error
    } finally {
      setLoading(false)
    }
  }

  // Fetch initial data when user logs in
  useEffect(() => {
    if (user?._id) {
      console.log("[FriendContext] User logged in, fetching initial friend data...");
      fetchFriends()
      fetchFriendRequests()
    } else {
      // Clear data when user logs out
      console.log("[FriendContext] User logged out, clearing friend data...");
      setFriends([])
      setFriendRequests([])
    }
  }, [user?._id]) // Re-run when user ID changes (login/logout)


  // --- Add Socket Listener for Status Changes ---
  useEffect(() => {
    const socket = getSocket(); // Get the socket instance

    // Only set up listener if socket exists and user is logged in
    if (socket && user?._id) {
      console.log("[FriendContext] Setting up socket listener for 'user-status-change'");

      const handleStatusChange = ({ userId, status, lastSeen }) => {
        console.log(`[FriendContext] Received status change: User ${userId} is now ${status}`);
        // Update the friends list state
        setFriends(prevFriends =>
          prevFriends.map(friend =>
            friend._id === userId
              ? { ...friend, status, lastSeen: status === 'offline' ? lastSeen : friend.lastSeen } // Update status and lastSeen if offline
              : friend
          )
        );
        // Optionally, update friendRequests state if needed (less common)
        // setFriendRequests(prevRequests => ...);
      };

      // Listen for the event
      socket.on('user-status-change', handleStatusChange);

      // Clean up the listener when the component unmounts or socket/user changes
      return () => {
        console.log("[FriendContext] Cleaning up socket listener for 'user-status-change'");
        socket.off('user-status-change', handleStatusChange);
      };
    } else {
       console.log("[FriendContext] Socket not available or user not logged in, skipping listener setup.");
    }

  }, [user?._id]); // Re-run when user ID changes (login/logout) or socket instance potentially changes (though getSocket should be stable after init)
  // --- End of Socket Listener ---


  // Function to send a friend request
  const sendRequest = async (email) => {
    try {
      await axios.post("/friends/send", { email });
      fetchFriendRequests(); // Refetch requests list
    } catch (err) {
      console.error("Error sending friend request:", err);
      setError(err.response?.data?.message || "Failed to send friend request.");
    }
  }

  // Function to respond to a friend request
  const respondRequest = async (requestId, accept) => {
    try {
      await axios.post("/friends/respond", { requestId, accept });
      fetchFriends(); // Refetch friends list
      fetchFriendRequests(); // Refetch requests list
    } catch (err) {
      console.error("Error responding to friend request:", err);
      setError(err.response?.data?.message || "Failed to respond to friend request.");
    }
  }

  // Function to remove a friend
  const removeFriend = async (friendId) => {
    try {
      await axios.post("/friends/remove", { friendId });
      fetchFriends(); // Refetch friends list
    } catch (err) {
      console.error("Error removing friend:", err);
      setError(err.response?.data?.message || "Failed to remove friend.");
    }
  }

  const value = {
    friends,
    friendRequests,
    loading,
    error,
    fetchFriends,
    fetchFriendRequests,
    sendRequest,
    respondRequest,
    removeFriend,
    setError, // Expose setError if needed
  }

  return <FriendContext.Provider value={value}>{children}</FriendContext.Provider>
}
