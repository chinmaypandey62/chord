"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { useParams, useNavigate } from "react-router-dom"
import axios from "../../utils/axios"
import { useAuth } from "../../context/AuthContext"
import { getSocket } from "../../utils/socket"
import Navbar from "../../components/Navbar/Navbar"
import VideoPlayer from "../../components/VideoPlayer/VideoPlayer"
import ChatBox from "../../components/ChatBox/ChatBox"
import VideoCallParticipantsBar from "../../components/VideoCallParticipantsBar/VideoCallParticipantsBar"
import { Avatar, AvatarFallback, AvatarImage } from "../../../components/ui/avatar"
import { formatDistanceToNow } from "date-fns"
import { toast } from "sonner"
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

  // Video call state
  const [callActive, setCallActive] = useState(false)
  const [callIncoming, setCallIncoming] = useState(false)
  const [remoteUser, setRemoteUser] = useState(null)
  const [localStream, setLocalStream] = useState(null)
  const [remoteStream, setRemoteStream] = useState(null)
  const [peerConnection, setPeerConnection] = useState(null)

  // Mic/video enabled state
  const [micEnabled, setMicEnabled] = useState(true)
  const [videoEnabled, setVideoEnabled] = useState(true)

  // State for big screen participant
  const [bigScreenParticipantId, setBigScreenParticipantId] = useState(null)

  // Handler for double click
  const handleParticipantVideoDoubleClick = (participantId) => {
    setBigScreenParticipantId(participantId)
  }

  // Helper to get participant object by id
  const getParticipantById = (id) => {
    return room?.members?.find(m => m._id === id)
  }

  // Toggle mic
  const handleToggleMic = () => {
    if (localStream) {
      const enabled = !micEnabled
      localStream.getAudioTracks().forEach(track => { track.enabled = enabled })
      setMicEnabled(enabled)
    }
  }
  // Toggle video
  const handleToggleVideo = () => {
    if (localStream) {
      const enabled = !videoEnabled
      localStream.getVideoTracks().forEach(track => { track.enabled = enabled })
      setVideoEnabled(enabled)
    }
  }
  // End call
  const handleHangCall = () => {
    endCall()
    setMicEnabled(true)
    setVideoEnabled(true)
  }

  // Add ref for audio element
  const incomingCallAudioRef = useRef(null)
  const [audioUnlocked, setAudioUnlocked] = useState(false)

  // Unlock audio on first user interaction
  useEffect(() => {
    const unlockAudio = () => {
      if (incomingCallAudioRef.current && !audioUnlocked) {
        incomingCallAudioRef.current.play().then(() => {
          incomingCallAudioRef.current.pause()
          incomingCallAudioRef.current.currentTime = 0
          setAudioUnlocked(true)
        }).catch(() => {})
      }
    }
    window.addEventListener("pointerdown", unlockAudio, { once: true })
    return () => window.removeEventListener("pointerdown", unlockAudio)
    // eslint-disable-next-line
  }, [])

  // Request notification permission on mount
  useEffect(() => {
    if ("Notification" in window && Notification.permission === "default") {
      Notification.requestPermission()
    }
  }, [])

  // Store original favicon and title for restoration
  const originalFaviconHref = useRef(document.querySelector("link[rel~='icon']")?.href)
  const originalTitle = useRef(document.title)

  // --- WebRTC/Socket.IO signaling logic ---
  useEffect(() => {
    const socket = getSocket()
    if (!socket) return

    // Listen for call-offer in addition to other events
    socket.on("call-offer", ({ from, offer, roomId }) => {
      // Only handle if this is the current room
      const callRoomId = roomId || from
      if (callRoomId === roomId) {
        setCallIncoming(true)
        setCallActive(false)
        setRemoteUser(from)
        window._pendingOffer = offer
      }
    })

    socket.on("call-answer", async ({ answer }) => {
      console.log("[WebRTC] Received call-answer:", answer); // Log reception
      if (peerConnection) {
        try {
          await peerConnection.setRemoteDescription(new RTCSessionDescription(answer));
          console.log("[WebRTC] Successfully set remote description from answer."); // Log success
        } catch (error) {
          console.error("[WebRTC] Failed to set remote description from answer:", error); // Log error
        }
      } else {
        console.warn("[WebRTC] Received call-answer but peerConnection is null.");
      }
    });

    socket.on("call-ice-candidate", async ({ candidate }) => {
      console.log("[WebRTC] Received ICE candidate:", candidate); // Log reception
      if (peerConnection && candidate) {
        try {
          await peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
          // console.log("[WebRTC] Successfully added ICE candidate."); // Optional: Can be noisy
        } catch (e) {
          console.error("[WebRTC] Error adding received ICE candidate:", e); // Log error
        }
      } else {
        console.warn("[WebRTC] Received ICE candidate but peerConnection or candidate is invalid.", { hasPeerConnection: !!peerConnection, hasCandidate: !!candidate });
      }
    })

    socket.on("call-hangup", () => {
      setCallIncoming(false)
      setCallActive(false)
      setRemoteUser(null)
      window._pendingOffer = null
      if (peerConnection) {
        try { peerConnection.close() } catch {}
        setPeerConnection(null)
      }
      if (localStream) {
        try { localStream.getTracks().forEach(track => track.stop()) } catch {}
        setLocalStream(null)
      }
      setRemoteStream(null)
    })

    socket.on("call-decline", () => {
      toast.info("The other user declined your call.")
      // --- FULL RESET OF CALL STATE ---
      setCallActive(false)
      setCallIncoming(false)
      setRemoteUser(null)
      window._pendingOffer = null
      if (peerConnection) {
        try { peerConnection.close() } catch {}
        setPeerConnection(null)
      }
      if (localStream) {
        try { localStream.getTracks().forEach(track => track.stop()) } catch {}
        setLocalStream(null)
      }
      setRemoteStream(null)
    })

    return () => {
      socket.off("call-offer")
      socket.off("call-answer")
      socket.off("call-ice-candidate")
      socket.off("call-hangup")
      socket.off("call-decline")
      // Restore favicon and title on cleanup
      const favicon = document.querySelector("link[rel~='icon']")
      if (favicon && favicon.dataset.prevHref) {
        favicon.href = favicon.dataset.prevHref
        delete favicon.dataset.prevHref
      }
      document.title = originalTitle.current
    }
    // eslint-disable-next-line
  }, [peerConnection, room, audioUnlocked, roomId])

  // Restore favicon and title when call is accepted/declined/ended
  useEffect(() => {
    if (!callIncoming) {
      const favicon = document.querySelector("link[rel~='icon']")
      if (favicon && favicon.dataset.prevHref) {
        favicon.href = favicon.dataset.prevHref
        delete favicon.dataset.prevHref
      }
      document.title = originalTitle.current
    }
  }, [callIncoming])

  // Stop sound when call is accepted/declined/ended
  useEffect(() => {
    if (!callIncoming && incomingCallAudioRef.current) {
      incomingCallAudioRef.current.pause()
      incomingCallAudioRef.current.currentTime = 0
    }
  }, [callIncoming])

  // Start a call (initiator)
  const startCall = async (targetUserId) => {
    const socket = getSocket()
    if (!socket) return
    const pc = createPeerConnection(socket, targetUserId)
    setPeerConnection(pc)
    setCallActive(true)
    setRemoteUser(targetUserId)
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true })
      setLocalStream(stream)
      stream.getTracks().forEach(track => pc.addTrack(track, stream))
      const offer = await pc.createOffer()
      await pc.setLocalDescription(offer)
      // Always include roomId in the call-offer payload
      socket.emit("call-offer", { to: targetUserId, offer, roomId })
      console.log("[VideoCall] Sent call-offer", { to: targetUserId, roomId })
    } catch (e) {
      alert("Could not start video call: " + e.message)
      endCall()
    }
  }

  // Accept incoming call
  const acceptCall = async () => {
    setCallIncoming(false)
    setCallActive(true)
    const socket = getSocket()
    if (!socket || !remoteUser) {
      console.error("[VideoCall] Cannot accept call: Socket or remoteUser missing.");
      return;
    }
    const pc = createPeerConnection(socket, remoteUser)
    setPeerConnection(pc)
    try {
      console.log("[VideoCall] Getting user media for accepting call...");
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true })
      setLocalStream(stream)
      stream.getTracks().forEach(track => pc.addTrack(track, stream))
      console.log("[VideoCall] Setting remote description from pending offer...");
      await pc.setRemoteDescription(new RTCSessionDescription(window._pendingOffer))
      console.log("[VideoCall] Creating answer...");
      const answer = await pc.createAnswer()
      console.log("[VideoCall] Setting local description with answer...");
      await pc.setLocalDescription(answer)
      console.log("[VideoCall] Emitting call-answer to", remoteUser); // Log before emit
      socket.emit("call-answer", { to: remoteUser, answer })
      window._pendingOffer = null; // Clear pending offer after use
    } catch (e) {
      console.error("Could not accept call:", e); // Use console.error
      alert("Could not accept call: " + e.message)
      endCall()
    }
  }

  // Decline incoming call
  const declineCall = () => {
    setCallIncoming(false)
    setCallActive(false)
    setRemoteUser(null)
    window._pendingOffer = null
    if (peerConnection) {
      try { peerConnection.close() } catch {}
      setPeerConnection(null)
    }
    if (localStream) {
      try { localStream.getTracks().forEach(track => track.stop()) } catch {}
      setLocalStream(null)
    }
    setRemoteStream(null)
    // Notify the caller that the call was declined
    const socket = getSocket()
    if (socket && remoteUser) {
      socket.emit("call-decline", { to: remoteUser })
    }
    // Also notify the other user to close their popup
    if (socket && remoteUser) {
      socket.emit("call-hangup", { to: remoteUser })
    }
  }

  // End call
  const endCall = () => {
    if (peerConnection) {
      try { peerConnection.close() } catch {}
      setPeerConnection(null)
    }
    if (localStream) {
      try { localStream.getTracks().forEach(track => track.stop()) } catch {}
      setLocalStream(null)
    }
    setRemoteStream(null)
    setCallActive(false)
    setCallIncoming(false)
    setRemoteUser(null)
    window._pendingOffer = null
    const socket = getSocket()
    if (socket && remoteUser) {
      socket.emit("call-hangup", { to: remoteUser })
    }
  }

  // Create peer connection and setup handlers
  const createPeerConnection = (socket, targetUserId) => {
    const pc = new RTCPeerConnection({
      iceServers: [{ urls: "stun:stun.l.google.com:19302" }]
    })

    // --- ICE candidate handler ---
    pc.onicecandidate = (event) => {
      if (event.candidate) {
        console.log(`[WebRTC] Sending ICE candidate to ${targetUserId}:`, event.candidate);
        socket.emit("call-ice-candidate", { to: targetUserId, candidate: event.candidate })
      }
    }

    // --- Fix: Always create a new MediaStream for remoteStream ---
    pc.ontrack = (event) => {
      console.log("[WebRTC] Received remote track:", event.track.kind, "Stream IDs:", event.streams.map(s => s.id));
      // Always create a new MediaStream from all tracks in event.streams[0]
      if (event.streams && event.streams[0]) {
        console.log("[WebRTC] Setting remote stream from event.streams[0]");
        setRemoteStream(event.streams[0]);
      } else {
        // Fallback: build stream from tracks (less common now)
        console.warn("[WebRTC] event.streams[0] not available, creating stream manually.");
        const inboundStream = remoteStream || new window.MediaStream(); // Reuse existing stream if possible
        inboundStream.addTrack(event.track);
        setRemoteStream(inboundStream);
      }
    }

    // Add logging for connection state changes
    pc.onconnectionstatechange = () => {
      console.log(`[WebRTC] Connection state changed: ${pc.connectionState}`);
      if (pc.connectionState === 'connected') {
        console.log('[WebRTC] Peers connected!');
      }
      if (pc.connectionState === 'failed' || pc.connectionState === 'disconnected' || pc.connectionState === 'closed') {
        console.warn(`[WebRTC] Connection ${pc.connectionState}. Cleaning up.`);
        // Consider adding cleanup logic here if needed, though endCall should handle it
      }
    };

    // Add logging for ICE connection state changes
    pc.oniceconnectionstatechange = () => {
      console.log(`[WebRTC] ICE connection state changed: ${pc.iceConnectionState}`);
    };

    return pc
  }

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
      {/* Incoming call sound */}
      <audio
        ref={incomingCallAudioRef}
        src="/ringtone.mp3"
        preload="auto"
        loop
        style={{ display: "none" }}
      />
      <Navbar />
      <main className="chat-room-main-content">
        <div className="desktop-layout">
          <div className="chat-room-content">
            <div className="chat-left-panel">
              <div className="video-call-area desktop-video-call-area">
                <VideoCallParticipantsBar
                  room={room}
                  user={user}
                  callActive={callActive}
                  callIncoming={callIncoming}
                  remoteUser={remoteUser}
                  localStream={localStream}
                  remoteStream={remoteStream}
                  onStartCall={startCall}
                  onAcceptCall={acceptCall}
                  onDeclineCall={declineCall}
                  onEndCall={handleHangCall}
                  onToggleMic={handleToggleMic}
                  onToggleVideo={handleToggleVideo}
                  micEnabled={micEnabled}
                  videoEnabled={videoEnabled}
                  onParticipantVideoDoubleClick={handleParticipantVideoDoubleClick}
                />
              </div>
              <div
                className={bigScreenParticipantId ? "youtube-video-area pinned-video-area" : "youtube-video-area"}
                // style={{
                //   display: bigScreenParticipantId ? undefined : undefined,
                //   // justifyContent: bigScreenParticipantId ? undefined : "flex-end",
                //   // alignItems: bigScreenParticipantId ? undefined : "stretch",
                //   // // position: "relative",
                //   minHeight: 240,
                //   background: "#000"
                // }}
              >
                {/* Always render the YouTube player, but hide it visually when pinned */}
                <div style={{ display: bigScreenParticipantId ? "none" : "block", width: "100%", height: "100%" }}>
                  <VideoPlayer roomId={roomId} videoId={currentVideoId} />
                </div>
                {bigScreenParticipantId ? (
                  (() => {
                    const participant = getParticipantById(bigScreenParticipantId)
                    if (!participant) return null
                    const isSelf = participant._id === user._id
                    const localVideoRef = el => {
                      if (el && localStream && el.srcObject !== localStream) { // Prevent unnecessary resets
                        console.log("[Ref] Setting local stream to video element");
                        el.srcObject = localStream;
                      }
                    };
                    const remoteVideoRef = el => {
                      console.log(`[Ref] Remote video ref called. Element: ${!!el}, RemoteStream: ${!!remoteStream}, RemoteUser: ${remoteUser}, PinnedParticipant: ${participant?._id}`);
                      // Ensure remoteStream is valid and belongs to the pinned remote user
                      if (el && remoteStream && remoteUser === participant._id) {
                        if (el.srcObject !== remoteStream) { // Prevent unnecessary resets
                           console.log("[Ref] Setting remote stream to video element");
                           el.srcObject = remoteStream;
                        }
                      }
                      // Clear srcObject if stream becomes invalid or user changes
                      else if (el && el.srcObject) { // Only clear if it was previously set
                        console.log("[Ref] Clearing remote stream from video element");
                        el.srcObject = null; 
                      }
                    };

                    return (
                      <div className="pinned-video-wrapper">
                        <button
                          className="unpin-btn"
                          onClick={() => setBigScreenParticipantId(null)}
                        >
                          Unpin
                        </button>
                        {/* Pinned Local Video */}
                        {isSelf && localStream && (
                          <video
                            ref={localVideoRef}
                            autoPlay
                            muted // Self view should always be muted
                            playsInline
                            key={`local-${participant._id}`} // Add key for potential re-renders
                          />
                        )}
                        {/* Pinned Remote Video */}
                        {!isSelf && remoteUser === participant._id && ( // Check remoteUser matches pinned participant
                          <video
                            ref={remoteVideoRef}
                            autoPlay
                            playsInline
                            key={`remote-${participant._id}-${remoteStream?.id}`} // Add stream ID to key
                          />
                        )}
                        {/* Placeholder if stream isn't ready or doesn't belong to pinned user */}
                        {(!isSelf && (!remoteStream || remoteUser !== participant._id)) && (
                           <div className="pinned-video-placeholder">Waiting for video...</div>
                        )}
                      </div>
                    )
                  })()
                ) : null}
                {/* Video information bar */}
                {!bigScreenParticipantId && (
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
                )}
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