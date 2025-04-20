"use client"

import { useState, useEffect, useCallback } from "react"
import { useParams, useNavigate } from "react-router-dom"
import axios from "../../utils/axios"
import { useAuth } from "../../context/AuthContext"
import { getSocket } from "../../utils/socket"
import Navbar from "../../components/Navbar/Navbar"
import VideoPlayer from "../../components/VideoPlayer/VideoPlayer"
import ChatBox from "../../components/ChatBox/ChatBox"
import { Avatar, AvatarFallback, AvatarImage } from "../../../components/ui/avatar"
import { formatDistanceToNow } from "date-fns"
import "./ChatRoomPage.css"

// Helper function to format lastSeen
const formatLastSeen = (dateString) => {
  if (!dateString) return "Offline"
  try {
    const date = new Date(dateString)
    if (Date.now() - date.getTime() < 60000) {
      return "Offline"
    }
    return `Offline - ${formatDistanceToNow(date, { addSuffix: true })}`
  } catch (e) {
    return "Offline"
  }
}

const ChatRoomPage = () => {
  const { roomId } = useParams()
  const [room, setRoom] = useState(null)
  const [initialLoading, setInitialLoading] = useState(true)
  const [error, setError] = useState(null)
  const { user } = useAuth()
  const navigate = useNavigate()

  const [videoInput, setVideoInput] = useState("")
  const [currentVideoId, setCurrentVideoId] = useState("dQw4w9WgXcQ")
  const [videoDetails, setVideoDetails] = useState({
    title: "Never Gonna Give You Up",
    channel: "Rick Astley",
    thumbnail: "https://img.youtube.com/vi/dQw4w9WgXcQ/default.jpg",
    viewers: room?.members?.length || 1,
  })
  const [activeMobilePanel, setActiveMobilePanel] = useState("chat")
  const [isPortraitLayout, setIsPortraitLayout] = useState(false)

  const handleStartCall = () => alert("Start Call clicked (placeholder)")
  const handleHangCall = () => alert("Hang Call clicked (placeholder)")
  const handleMute = () => alert("Mute clicked (placeholder)")
  const handlePauseVideo = () => alert("Pause Video clicked (placeholder)")

  useEffect(() => {
    fetchRoomDetails()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roomId])

  useEffect(() => {
    const socket = getSocket()

    if (socket && roomId) {
      console.log(`[ChatRoomPage] Setting up socket listeners for room ${roomId}`)

      const handleCurrentVideo = (data) => {
        console.log("[ChatRoomPage] Received current-video", data.videoId)
        setCurrentVideoId(data.videoId)
        fetchVideoDetails(data.videoId)
      }

      const handleVideoUpdate = (data) => {
        if (data.senderId !== socket.id) {
          console.log("[ChatRoomPage] Received update-video from other user", data.videoId)
          setCurrentVideoId(data.videoId)
          fetchVideoDetails(data.videoId)
        }
      }

      socket.on("current-video", handleCurrentVideo)
      socket.on("update-video", handleVideoUpdate)

      console.log(`[ChatRoomPage] Emitting join-room for ${roomId}`)
      socket.emit("join-room", roomId)

      return () => {
        console.log(`[ChatRoomPage] Cleaning up socket listeners and leaving room ${roomId}`)
        socket.off("current-video", handleCurrentVideo)
        socket.off("update-video", handleVideoUpdate)
        socket.emit("leave-room", roomId)
      }
    } else {
      console.log("[ChatRoomPage] Socket not available or roomId missing, skipping listener setup.")
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roomId])

  // Fetch video details when the video changes
  useEffect(() => {
    if (currentVideoId) {
      fetchVideoDetails(currentVideoId)
    }
  }, [currentVideoId])

  // Function to fetch video details from YouTube API (placeholder)
  const fetchVideoDetails = async (videoId) => {
    try {
      // This is a placeholder - in a real app, you'd call your backend which would use YouTube API
      // For now we'll just set a dummy value based on the video ID
      setVideoDetails({
        title: `Video ${videoId.substring(0, 6)}...`,
        channel: "YouTube Channel",
        thumbnail: `https://img.youtube.com/vi/${videoId}/default.jpg`,
        viewers: room?.members?.length || 1,
      })
      
      // Advanced implementation would use YouTube API like:
      // const response = await axios.get(`/api/youtube/video-details?id=${videoId}`);
      // setVideoDetails(response.data);
    } catch (error) {
      console.error("Error fetching video details:", error)
    }
  }

  useEffect(() => {
    const socket = getSocket()

    if (socket && room?._id) {
      console.log(`[ChatRoomPage] Setting up listener for user-status-change in room ${room._id}`)

      const handleParticipantStatusChange = ({ userId, status, lastSeen }) => {
        console.log(`[ChatRoomPage] Received status change: User ${userId} is now ${status}`)

        const isMember = room.members?.some((member) => member._id === userId)

        if (isMember) {
          console.log(`[ChatRoomPage] Updating status for room member ${userId}`)
          setRoom((prevRoom) => {
            if (!prevRoom) return null
            return {
              ...prevRoom,
              members: prevRoom.members.map((member) =>
                member._id === userId
                  ? { ...member, status, lastSeen: status === "offline" ? lastSeen : member.lastSeen }
                  : member
              ),
            }
          })
        }
      }

      socket.on("user-status-change", handleParticipantStatusChange)

      return () => {
        console.log(`[ChatRoomPage] Cleaning up listener for user-status-change in room ${room._id}`)
        socket.off("user-status-change", handleParticipantStatusChange)
      }
    }
  }, [room])

  useEffect(() => {
    const checkLayout = () => {
      if (typeof window !== "undefined") {
        const height = window.innerHeight
        const width = window.innerWidth
        const isPortrait = height > width * 1.5
        setIsPortraitLayout(isPortrait)
        console.log(`[Layout Check] Width: ${width}, Height: ${height}, Ratio: ${height / width}, IsPortrait: ${isPortrait}`)
      }
    }

    checkLayout()

    window.addEventListener("resize", checkLayout)

    return () => {
      window.removeEventListener("resize", checkLayout)
    }
  }, [])

  const fetchRoomDetails = async () => {
    if (!roomId) return
    setInitialLoading(true)
    setError(null)
    try {
      console.log(`[ChatRoomPage] Fetching room details for ${roomId}`)
      const response = await axios.get(`/rooms/${roomId}`)
      setRoom(response.data)
      setError(null)
    } catch (err) {
      console.error("Error fetching room details:", err)
      setError(err.response?.data?.message || "Failed to load room details.")
      setRoom(null)
    } finally {
      setInitialLoading(false)
    }
  }

  const handleVideoCall = () => {
    alert("Video calling feature coming soon!")
  }

  const handleVideoSubmit = useCallback(
    (e) => {
      e.preventDefault()
      const socket = getSocket()
      if (!socket || !roomId) {
        console.warn("Cannot submit video: Socket or RoomId missing.")
        return
      }

      let newVideoId = videoInput.trim()
      if (!newVideoId) return

      const youtubeRegex = /(?:youtube\.com\/(?:[^/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?/\\s]{11})/
      const match = newVideoId.match(youtubeRegex)

      if (match && match[1]) {
        newVideoId = match[1]
      } else if (newVideoId.length !== 11) {
        console.warn("Invalid YouTube URL or Video ID provided.")
        alert("Please enter a valid YouTube video URL or 11-character Video ID.")
        return
      }

      if (newVideoId !== currentVideoId) {
        console.log("[ChatRoomPage] Emitting change-video:", { roomId, videoId: newVideoId })
        socket.emit("change-video", { roomId, videoId: newVideoId })
        setCurrentVideoId(newVideoId)
        setVideoInput("")
      } else {
        console.log("[ChatRoomPage] Video ID is the same, not emitting.")
        setVideoInput("")
      }
    },
    [videoInput, currentVideoId, roomId]
  )

  // Function to handle video sharing
  const handleShareVideo = () => {
    if (navigator.share) {
      navigator.share({
        title: videoDetails.title,
        text: `Check out this video: ${videoDetails.title}`,
        url: `https://youtube.com/watch?v=${currentVideoId}`
      }).catch(err => console.error("Error sharing:", err))
    } else {
      // Fallback
      navigator.clipboard.writeText(`https://youtube.com/watch?v=${currentVideoId}`)
        .then(() => alert("Video link copied to clipboard!"))
        .catch(err => console.error("Error copying:", err))
    }
  }

  if (initialLoading) {
    return <div className="loading-container">Loading room...</div>
  }

  if (error && !room) {
    return (
      <div className="error-container">
        <Navbar />
        <p>Error loading room: {error}</p>
        <button className="btn btn-secondary" onClick={() => navigate("/dashboard")}>
          Back to Dashboard
        </button>
      </div>
    )
  }

  return (
    <div className="chat-room-page">
      <Navbar />

      <main className="chat-room-main-content">
        <div className="desktop-layout">
          <div className="chat-room-content">
            <div className="chat-left-panel">
              <div className="video-call-area desktop-video-call-area">
                <div className="participant-videos-container">
                  {room?.members
                    ?.filter((member) => member._id !== user?._id)
                    .map((member) => {
                      const isOnline = member.status === "online"
                      return (
                        <div key={member._id} className="participant-video-item" title={member.username}>
                          <div className="participant-video-placeholder">
                            <Avatar className="h-12 w-12">
                              <AvatarImage src={member.profilePicture || undefined} alt={member.username} />
                              <AvatarFallback>{member.username?.substring(0, 2).toUpperCase() || "??"}</AvatarFallback>
                            </Avatar>
                            {isOnline && <span className="online-indicator" title="Online"></span>}
                          </div>
                          <span className="participant-video-username">{member.username}</span>
                        </div>
                      )
                    })}
                  {user && room?.members?.find((m) => m._id === user._id) && (
                    <div className="participant-video-item self-video-item" title="You">
                      <div className="participant-video-placeholder">
                        <Avatar className="h-12 w-12">
                          <AvatarImage src={user.profilePicture || undefined} alt={user.username} />
                          <AvatarFallback>{user.username?.substring(0, 2).toUpperCase() || "??"}</AvatarFallback>
                        </Avatar>
                        <span className="online-indicator" title="Online"></span>
                      </div>
                      <span className="participant-video-username">You</span>
                    </div>
                  )}
                </div>
                {/* Call Control Buttons - Updated Structure */}
                <div className="call-controls">
                  <div className="call-controls-top-row">
                    <button className="btn btn-icon btn-mic" onClick={handleMute} title="Mute/Unmute">Mic</button>
                    <button className="btn btn-icon btn-cam" onClick={handlePauseVideo} title="Stop/Start Video">Cam</button>
                  </div>
                  <button className="btn btn-icon btn-hangup" onClick={handleHangCall} title="Hang Up">End</button>
                </div>
              </div>
              <div className="youtube-video-area">
                <VideoPlayer roomId={roomId} videoId={currentVideoId} />
                {/* Video information bar */}
                <div className="video-info-bar">
                  <div className="video-info-left">
                    <div className="video-thumbnail">
                      <img src={videoDetails.thumbnail} alt={videoDetails.title} />
                    </div>
                    <div className="video-title-container">
                      <div className="video-title" title={videoDetails.title}>{videoDetails.title}</div>
                      <div className="video-channel">{videoDetails.channel}</div>
                    </div>
                  </div>
                  <div className="video-info-right">
                    <div className="video-viewers">
                      <span>Viewers:</span>
                      <span className="viewer-count">{room?.members?.length || 1}</span>
                    </div>
                    <div className="video-action-buttons">
                      <button 
                        className="video-action-button" 
                        onClick={handleShareVideo}
                        title="Share video"
                      >
                        Share
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div className="chat-right-panel">
              <form onSubmit={handleVideoSubmit} className="video-change-form desktop-video-form">
                <input
                  type="text"
                  value={videoInput}
                  onChange={(e) => setVideoInput(e.target.value)}
                  placeholder="Video URL Entry Field"
                  className="form-input video-url-input"
                />
                <button type="submit" className="btn btn-secondary video-change-button">
                  Load
                </button>
              </form>
              <ChatBox roomId={roomId} />
            </div>
          </div>
        </div>

        <div className="mobile-layout">
          {/* Video panel */}
          <div className={`mobile-panel youtube-panel ${activeMobilePanel === "youtube" ? "active" : ""}`}>
            <form onSubmit={handleVideoSubmit} className="video-change-form mobile-video-form">
              <input
                type="text"
                value={videoInput}
                onChange={(e) => setVideoInput(e.target.value)}
                placeholder="Enter YouTube URL or ID"
                className="form-input video-url-input"
              />
              <button type="submit" className="btn btn-secondary video-change-button">
                Load
              </button>
            </form>
            <div className="mobile-video-aspect-ratio-wrapper">
              <VideoPlayer roomId={roomId} videoId={currentVideoId} />
              <div className="video-info-bar">
                <div className="video-info-left">
                  <div className="video-thumbnail">
                    <img src={videoDetails.thumbnail} alt={videoDetails.title} />
                  </div>
                  <div className="video-title-container">
                    <div className="video-title" title={videoDetails.title}>{videoDetails.title}</div>
                    <div className="video-channel">{videoDetails.channel}</div>
                  </div>
                </div>
                <div className="video-action-buttons">
                  <button 
                    className="video-action-button" 
                    onClick={handleShareVideo}
                    title="Share video"
                  >
                    Share
                  </button>
                </div>
              </div>
            </div>
            
            {/* Only show embedded chat on portrait layouts */}
            {isPortraitLayout && (
              <div className="mobile-youtube-chat-wrapper">
                <ChatBox roomId={roomId} />
              </div>
            )}
          </div>

          {/* Chat panel */}
          <div className={`mobile-panel chat-panel ${activeMobilePanel === "chat" ? "active" : ""}`}>
            <ChatBox roomId={roomId} />
          </div>

          {/* Call panel */}
          <div className={`mobile-panel call-panel ${activeMobilePanel === "call" ? "active" : ""}`}>
            <div className="participants-list">
              <h5>Participants ({room?.members?.length || 0})</h5>
              {room?.members?.map((member) => {
                const isOnline = member.status === "online"
                return (
                  <div
                    key={member._id}
                    className="participant-item"
                    title={isOnline ? "Online" : formatLastSeen(member.lastSeen)}
                  >
                    <div className="relative">
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={member.profilePicture || undefined} alt={member.username} />
                        <AvatarFallback>{member.username?.substring(0, 2).toUpperCase() || "??"}</AvatarFallback>
                      </Avatar>
                      <span
                        className={`absolute bottom-0 right-0 block h-2.5 w-2.5 rounded-full border border-background ${
                          isOnline ? "bg-green-500" : "bg-gray-400"
                        }`}
                      />
                    </div>
                    <span className="participant-username">
                      {member.username} {member._id === user?._id ? "(You)" : ""}
                    </span>
                  </div>
                )
              })}
            </div>
            <button
              className="btn btn-primary video-call-button-panel"
              onClick={handleVideoCall}
              disabled={initialLoading || !!error}
            >
              Start Video Call (Placeholder)
            </button>
            <p>Video calling feature coming soon!</p>
          </div>
        </div>
      </main>

      {/* Mobile panel switcher */}
      <div className="mobile-panel-switcher">
        <button
          className={`switcher-button ${activeMobilePanel === "youtube" ? "active" : ""}`}
          onClick={() => setActiveMobilePanel("youtube")}
        >
          Video
        </button>
        <button
          className={`switcher-button ${activeMobilePanel === "chat" ? "active" : ""}`}
          onClick={() => setActiveMobilePanel("chat")}
        >
          Chat
        </button>
        <button
          className={`switcher-button ${activeMobilePanel === "call" ? "active" : ""}`}
          onClick={() => setActiveMobilePanel("call")}
        >
          Call
        </button>
      </div>
    </div>
  )
}

export default ChatRoomPage