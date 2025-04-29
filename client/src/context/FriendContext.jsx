"use client"

import React, { createContext, useState, useEffect, useContext, useCallback, useRef } from "react"
import axios from "../utils/axios"
import { useAuth } from "./AuthContext"
import { getSocket } from "../utils/socket"

// Provide default values to prevent destructuring errors during SSR
const FriendContext = createContext({
  friends: [],
  friendRequests: [],
  loading: false,
  error: null,
  fetchFriends: () => {},
  fetchFriendRequests: () => {},
  sendRequest: () => {},
  respondRequest: () => {},
  removeFriend: () => {},
  setError: () => {}
})

export const useFriends = () => useContext(FriendContext)

export const FriendProvider = ({ children }) => {
  // Safely access auth context with fallback for SSR
  const auth = useAuth() || { user: null, loading: true }
  const { user, loading: authLoading } = auth
  
  const [friends, setFriends] = useState([])
  const [friendRequests, setFriendRequests] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [lastFetchTime, setLastFetchTime] = useState(0)
  const isFetchingRef = useRef(false)
  const initialized = useRef(false)
  const [isMounted, setIsMounted] = useState(false)
  
  // Check if we're running in the browser
  useEffect(() => {
    setIsMounted(true)
  }, [])

  // Function to fetch friends list with better error handling
  const fetchFriends = useCallback(async (force = false) => {
    // Don't fetch if auth is still loading
    if (authLoading) return;
    
    // Don't fetch if no user is logged in
    if (!user?._id) return;
    
    // Prevent multiple concurrent fetches
    if (isFetchingRef.current) return;
    
    // Skip if recent fetch (within last 5 seconds) unless forced
    if (!force && Date.now() - lastFetchTime < 5000) return;
    
    isFetchingRef.current = true;
    setLoading(true);
    setError(null);
    
    try {
      console.log("[FriendContext] Fetching friends...");
      const response = await axios.get("/friends");
      setFriends(response.data || []);
      console.log("[FriendContext] Friends fetched:", response.data);
      setLastFetchTime(Date.now());
    } catch (err) {
      console.error("[FriendContext] Error fetching friends:", err);
      setError(err.response?.data?.message || "Failed to fetch friends");
      // Don't clear friends on error - maintain previous state
    } finally {
      setLoading(false);
      isFetchingRef.current = false;
    }
  }, [user?._id, lastFetchTime, authLoading]);

  // Function to fetch friend requests - improved
  const fetchFriendRequests = useCallback(async (force = false) => {
    if (authLoading || !user?._id || isFetchingRef.current || 
       (!force && Date.now() - lastFetchTime < 5000)) return;
    
    isFetchingRef.current = true;
    setLoading(true);
    
    try {
      console.log("[FriendContext] Fetching friend requests...");
      const response = await axios.get("/friends/requests");
      setFriendRequests(response.data || []);
      console.log("[FriendContext] Friend requests fetched:", response.data);
    } catch (err) {
      console.error("[FriendContext] Error fetching friend requests:", err);
      setError(err.response?.data?.message || "Failed to fetch friend requests");
      // Don't clear requests on error
    } finally {
      setLoading(false);
      isFetchingRef.current = false;
    }
  }, [user?._id, lastFetchTime, authLoading]);

  // Fetch initial data when user logs in - only once
  useEffect(() => {
    // Skip if auth is still loading
    if (authLoading) return;
    
    if (user?._id && !initialized.current) {
      console.log("[FriendContext] User logged in, fetching initial friend data...");
      initialized.current = true;
      // Use setTimeout to ensure auth is fully processed
      setTimeout(() => {
        fetchFriends(true);
        fetchFriendRequests(true);
      }, 500);
    } else if (!user) {
      // Clear data when user logs out
      console.log("[FriendContext] User logged out, clearing friend data...");
      setFriends([]);
      setFriendRequests([]);
      initialized.current = false;
    }
  }, [user?._id, authLoading, fetchFriends, fetchFriendRequests]);

  // Socket listener setup with better error handling
  useEffect(() => {
    // Skip if not mounted on client
    if (!isMounted) return;
    
    // Skip if auth is still loading
    if (authLoading) return;
    
    // Skip if no user
    if (!user?._id) return;
    
    // Small delay to ensure socket is initialized
    const timeoutId = setTimeout(() => {
      const socket = getSocket();
      
      if (!socket) {
        console.log("[FriendContext] Socket not available or user not logged in, skipping listener setup.");
        return;
      }
      
      console.log("[FriendContext] Setting up socket listener for 'user-status-change'");
      
      const handleStatusChange = ({ userId, status, lastSeen }) => {
        console.log(`[FriendContext] Received status change: User ${userId} is now ${status}`);
        
        setFriends(prevFriends => 
          prevFriends.map(friend => 
            friend._id === userId 
              ? { 
                  ...friend, 
                  status, 
                  lastSeen: status === 'offline' ? lastSeen : friend.lastSeen 
                } 
              : friend
          )
        );
      };
      
      socket.on('user-status-change', handleStatusChange);
      
      return () => {
        if (socket) {
          console.log("[FriendContext] Cleaning up socket listener for 'user-status-change'");
          socket.off('user-status-change', handleStatusChange);
        }
      };
    }, 1000); // Delay to ensure socket is properly initialized
    
    return () => clearTimeout(timeoutId);
  }, [user?._id, authLoading, isMounted]);

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
    loading: loading || authLoading, // Combine loading states
    error,
    fetchFriends,
    fetchFriendRequests,
    sendRequest,
    respondRequest,
    removeFriend,
    setError
  };

  return <FriendContext.Provider value={value}>{children}</FriendContext.Provider>
}
