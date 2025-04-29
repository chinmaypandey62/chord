"use client"

import { useState } from "react"
import { useRouter } from "next/navigation" // Changed from react-router-dom
import axios from "../../utils/axios"
import { BsChatDots, BsCameraVideo } from "react-icons/bs"; // Import icons
import "./FriendCard.css"

const FriendCard = ({ friend, onStatusChange }) => {
  // Add safety check for server-side rendering
  if (typeof window === 'undefined' || !friend) {
    return <div className="friend-card loading">Loading friend data...</div>
  }

  const [loadingChat, setLoadingChat] = useState(false)
  const [loadingCall, setLoadingCall] = useState(false) // Separate loading state for call
  const router = useRouter() // Changed from navigate

  const startChat = async () => {
    try {
      setLoadingChat(true)
      // Call createRoom endpoint, sending friend's ID in participants array
      const response = await axios.post("/rooms/create", {
        participants: [friend._id], // Send friend's ID
      })

      // Navigate to the chat room using the returned room's _id
      if (response.data && response.data._id) {
        router.push(`/chat/${response.data._id}`) // Changed to router.push
      } else {
        throw new Error("Failed to get room ID from response.")
      }
    } catch (error) {
      console.error("Error creating chat room:", error)
      alert("Failed to create chat room. Please try again.")
    } finally {
      setLoadingChat(false)
    }
  }

  // Modified startVideoCall function with improved logging
  const startVideoCall = async () => {
    try {
      setLoadingCall(true)
      console.log(`[FriendCard] Starting video call with friend: ${friend.username} (${friend._id})`);
      
      // 1. Create/Get the room
      const response = await axios.post("/rooms/create", {
        participants: [friend._id],
      })

      if (response.data && response.data._id) {
        const roomId = response.data._id
        console.log(`[FriendCard] Created/retrieved room: ${roomId}`);
        
        // 2. Store call data with improved error handling
        try {
          const callData = { startCall: true, targetUserId: friend._id };
          sessionStorage.setItem('callData', JSON.stringify(callData));
          console.log(`[FriendCard] Stored call data in sessionStorage:`, callData);
        } catch (storageError) {
          console.error(`[FriendCard] Failed to store call data:`, storageError);
          // Continue anyway, the user can manually start the call
        }
        
        // 3. Navigate to the chat room
        console.log(`[FriendCard] Navigating to chat room: /chat/${roomId}`);
        router.push(`/chat/${roomId}`);
      } else {
        throw new Error("Failed to get room ID from response.")
      }
    } catch (error) {
      console.error("[FriendCard] Error initiating video call:", error);
      alert("Failed to initiate video call. Please try again.");
    } finally {
      setLoadingCall(false);
    }
  }

  return (
    <div className="friend-card">
      <div className="friend-avatar">
        {friend.avatar ? (
          <img src={friend.avatar || "/placeholder.svg"} alt={friend.username} />
        ) : (
          <div className="avatar-placeholder">{friend.username.charAt(0).toUpperCase()}</div>
        )}
        <span className={`status-indicator ${friend.status || "offline"}`}></span>
      </div>

      <div className="friend-info">
        <h3 className="friend-name">{friend.username}</h3>
        <p className="friend-status">{friend.status || "Offline"}</p>
      </div>

      <div className="friend-actions">
        <button
          className="btn btn-icon btn-primary" // Add btn-icon class
          onClick={startChat}
          disabled={loadingChat || loadingCall} // Disable if either action is loading
          aria-label={`Start chat with ${friend.username}`} // Accessibility
          title="Start Chat" // Tooltip on hover
        >
          {loadingChat ? "..." : <BsChatDots size={18} />} {/* Icon */}
        </button>

        <button
          className="btn btn-icon btn-secondary" // Add btn-icon class
          onClick={startVideoCall}
          disabled={loadingChat || loadingCall} // Disable if either action is loading
          aria-label={`Start video call with ${friend.username}`} // Accessibility
          title="Start Video Call" // Tooltip on hover
        >
          {/* Moved content inside the button */}
          {loadingCall ? "..." : <BsCameraVideo size={18} />} {/* Icon */}
        </button>
      </div>
    </div>
  )
}

export default FriendCard