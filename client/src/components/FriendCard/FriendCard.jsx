"use client"

import { useState } from "react"
import { useNavigate } from "react-router-dom"
import axios from "../../utils/axios"
import { BsChatDots, BsCameraVideo } from "react-icons/bs"; // Import icons
import "./FriendCard.css"

const FriendCard = ({ friend, onStatusChange }) => {
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()

  const startChat = async () => {
    try {
      setLoading(true)
      // Call createRoom endpoint, sending friend's ID in participants array
      const response = await axios.post("/rooms/create", {
        participants: [friend._id], // Send friend's ID
      })

      // Navigate to the chat room using the returned room's _id
      if (response.data && response.data._id) {
        navigate(`/chat/${response.data._id}`)
      } else {
        throw new Error("Failed to get room ID from response.")
      }
    } catch (error) {
      console.error("Error creating chat room:", error)
      alert("Failed to create chat room. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  const startVideoCall = () => {
    // Show "Coming Soon" modal
    alert("Video calling feature coming soon!")
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
          disabled={loading}
          aria-label={`Start chat with ${friend.username}`} // Accessibility
          title="Start Chat" // Tooltip on hover
        >
          {loading ? "..." : <BsChatDots size={18} />} {/* Icon */}
        </button>

        <button
          className="btn btn-icon btn-secondary" // Add btn-icon class
          onClick={startVideoCall}
          aria-label={`Start video call with ${friend.username}`} // Accessibility
          title="Start Video Call" // Tooltip on hover
        >
          <BsCameraVideo size={18} /> {/* Icon */}
        </button>
      </div>
    </div>
  )
}

export default FriendCard