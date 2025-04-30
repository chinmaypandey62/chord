"use client"

import { useState, useEffect, useCallback, useRef } from "react"
// Replace React Router imports with Next.js
import { useParams, useRouter } from "next/navigation"
import axios from "../../utils/axios"
import { useAuth } from "../../context/AuthContext"
import { getSocket } from "../../utils/socket"
import Navbar from "../../components/Navbar/Navbar"
import VideoPlayer from "../../components/VideoPlayer/VideoPlayer"
import ChatBox from "../../components/ChatBox/ChatBox"
import VideoCallParticipantsBar from "../../components/VideoCallParticipantsBar/VideoCallParticipantsBar"
import { Avatar, AvatarFallback, AvatarImage } from "../../../components/ui/avatar" // Fix import path
import { formatDistanceToNow } from "date-fns"
import { toast } from "sonner"
import "./ChatRoomPage.css"
import { Mic, MicOff, Video, VideoOff, PhoneOff, SwitchCamera } from "lucide-react" // Import icons

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

/**
 * Chat Room Page Component
 * @param {Object} props - Component props
 * @param {string|string[]} [props.roomId] - Room ID passed from parent component
 */
const ChatRoomPage = ({ roomId: propRoomId }) => {
  // Add check for server-side rendering
  const isBrowser = typeof window !== 'undefined';
  
  const params = useParams();
  // Use prop roomId if provided, otherwise use from params
  const roomId = propRoomId || params?.roomId;
  const [room, setRoom] = useState(null);
  const [initialLoading, setInitialLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Safe destructuring from context
  const authContext = useAuth() || {};
  const { user } = authContext;
  
  const router = useRouter();
  
  // Since Next.js doesn't have useLocation, we'll use sessionStorage for state passing
  const [startCallParams, setStartCallParams] = useState(null)
  
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

  // State for big screen participant (Desktop)
  const [bigScreenParticipantId, setBigScreenParticipantId] = useState(null)
  // State for mobile video view switching
  const [isLocalVideoMain, setIsLocalVideoMain] = useState(false)

  // Refs for mobile video elements
  const mobileLocalVideoRef = useRef(null)
  const mobileRemoteVideoRef = useRef(null)


  // Handler for double click (Desktop)
  const handleParticipantVideoDoubleClick = (participantId) => {
    setBigScreenParticipantId(participantId)
  }

  // Handler for switching mobile video views
  const handleSwitchVideoViews = () => {
    setIsLocalVideoMain(prev => !prev)
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
    setIsLocalVideoMain(false) // Reset view on hangup
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

  // Store original favicon and title for restoration - FIX THIS PART
  const originalFaviconHref = useRef(null);
  const originalTitle = useRef(null);
  
  // Initialize the refs after component mounts on client
  useEffect(() => {
    if (typeof document !== 'undefined') {
      originalFaviconHref.current = document.querySelector("link[rel~='icon']")?.href;
      originalTitle.current = document.title;
    }
  }, []);
  
  // --- WebRTC/Socket.IO signaling logic ---
  useEffect(() => {
    if (typeof document === 'undefined') return;
    
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
      // Restore favicon and title on cleanup - FIX THIS PART
      if (typeof document !== 'undefined') {
        const favicon = document.querySelector("link[rel~='icon']")
        if (favicon && favicon.dataset.prevHref) {
          favicon.href = favicon.dataset.prevHref
          delete favicon.dataset.prevHref
        }
        if (originalTitle.current) {
          document.title = originalTitle.current
        }
      }
    }
    // eslint-disable-next-line
  }, [peerConnection, room, audioUnlocked, roomId])

  // Restore favicon and title when call is accepted/declined/ended
  useEffect(() => {
    if (typeof document === 'undefined' || callIncoming) return;
    
    const favicon = document.querySelector("link[rel~='icon']")
    if (favicon && favicon.dataset.prevHref) {
      favicon.href = favicon.dataset.prevHref
      delete favicon.dataset.prevHref
    }
    if (originalTitle.current) {
      document.title = originalTitle.current
    }
  }, [callIncoming]);

  // Stop sound when call is accepted/declined/ended
  useEffect(() => {
    if (!callIncoming && incomingCallAudioRef.current) {
      incomingCallAudioRef.current.pause()
      incomingCallAudioRef.current.currentTime = 0
    }
  }, [callIncoming])

  // Improved useEffect for the mobile video elements
  useEffect(() => {
    // Assign streams to mobile video elements when they become available or view switches
    const updateMobileVideoElements = () => {
      console.log("[ChatRoomPage] Updating mobile video elements. Local:", !!localStream, "Remote:", !!remoteStream);
      
      const mainVideoEl = isLocalVideoMain ? mobileLocalVideoRef.current : mobileRemoteVideoRef.current;
      const floatingVideoEl = isLocalVideoMain ? mobileRemoteVideoRef.current : mobileLocalVideoRef.current;
      const mainStream = isLocalVideoMain ? localStream : remoteStream;
      const floatingStream = isLocalVideoMain ? remoteStream : localStream;

      // Set main video
      if (mainVideoEl && mainStream && mainVideoEl.srcObject !== mainStream) {
        console.log("[ChatRoomPage] Setting main video srcObject");
        mainVideoEl.srcObject = mainStream;
        mainVideoEl.play().catch(e => console.warn("[ChatRoomPage] Could not play main video:", e));
      }
      
      // Set floating video
      if (floatingVideoEl && floatingStream && floatingVideoEl.srcObject !== floatingStream) {
        console.log("[ChatRoomPage] Setting floating video srcObject");
        floatingVideoEl.srcObject = floatingStream;
        floatingVideoEl.play().catch(e => console.warn("[ChatRoomPage] Could not play floating video:", e));
      }
      
      // Clear srcObject if stream becomes null
      if (mainVideoEl && !mainStream && mainVideoEl.srcObject) {
        console.log("[ChatRoomPage] Clearing main video srcObject");
        mainVideoEl.srcObject = null;
      }
      
      if (floatingVideoEl && !floatingStream && floatingVideoEl.srcObject) {
        console.log("[ChatRoomPage] Clearing floating video srcObject");
        floatingVideoEl.srcObject = null;
      }
    };
    
    // Call immediately and with small delays to ensure DOM updates
    updateMobileVideoElements();
    setTimeout(updateMobileVideoElements, 100);
    setTimeout(updateMobileVideoElements, 500);
    
  }, [localStream, remoteStream, isLocalVideoMain, callActive])

  // Create peer connection and setup handlers - completely rewritten for reliability
  const createPeerConnection = (socket, targetUserId) => {
    console.log("[WebRTC] Creating new peer connection for", targetUserId);
    
    // Close any existing connection first
    if (window._rtcPeerConnection) {
      try {
        window._rtcPeerConnection.close();
      } catch (e) {
        console.warn("[WebRTC] Error closing existing peer connection:", e);
      }
    }
    
    const pc = new RTCPeerConnection({
      iceServers: [
        { urls: ["stun:stun.l.google.com:19302", "stun:stun1.l.google.com:19302"] }
      ]
    });
    
    // Store for debugging
    window._rtcPeerConnection = pc;

    // --- ICE candidate handler ---
    pc.onicecandidate = (event) => {
      if (event.candidate) {
        console.log(`[WebRTC] Sending ICE candidate to ${targetUserId}`);
        socket.emit("call-ice-candidate", { to: targetUserId, candidate: event.candidate });
      } else {
        console.log("[WebRTC] All ICE candidates gathered");
      }
    };

    // --- CRITICAL: Improved remote track handling ---
    pc.ontrack = (event) => {
      console.log("[WebRTC] Received remote track:", event.track.kind);
      
      // Always work with the event stream directly
      if (event.streams && event.streams[0]) {
        const stream = event.streams[0];
        console.log(`[WebRTC] Got remote stream with ${stream.getTracks().length} tracks`);
        
        // Set to state
        setRemoteStream(stream);
        
        // Also manually set to all video elements to ensure they update
        if (typeof document !== 'undefined') {
          // Find all remoteVideo elements in the component that might need this stream
          const remoteVideos = document.querySelectorAll('.remote-video');
          remoteVideos.forEach(video => {
            if (video.srcObject !== stream) {
              console.log('[WebRTC] Setting stream to remote video element');
              video.srcObject = stream;
              video.play().catch(e => console.warn('[WebRTC] Could not play video:', e));
            }
          });
        }
      }
    };
    
    // Connection state monitoring
    pc.onconnectionstatechange = () => {
      console.log(`[WebRTC] Connection state changed to: ${pc.connectionState}`);
    };
    
    pc.oniceconnectionstatechange = () => {
      console.log(`[WebRTC] ICE connection state changed to: ${pc.iceConnectionState}`);
    };

    return pc;
  };

  // Start a call - simplified and focused on reliability
  const startCall = async (targetUserId) => {
    if (!isBrowser) return;
    
    const socket = getSocket();
    if (!socket) return;
    
    try {
      console.log("[VideoCall] Getting user media for outgoing call...");
      // Get media FIRST, before creating the peer connection
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: true, 
        audio: true 
      });
      
      console.log(`[VideoCall] Got local stream with ${stream.getTracks().length} tracks`);
      setLocalStream(stream);
      
      // Create peer connection AFTER getting media
      const pc = createPeerConnection(socket, targetUserId);
      setPeerConnection(pc);
      
      // Set call state
      setCallActive(true);
      setRemoteUser(targetUserId);
      
      // Add tracks to peer connection - CRITICAL STEP
      stream.getTracks().forEach(track => {
        console.log(`[VideoCall] Adding ${track.kind} track to peer connection`);
        pc.addTrack(track, stream);
      });
      
      // Create offer
      console.log("[VideoCall] Creating offer...");
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      
      // Send offer
      console.log("[VideoCall] Sending call-offer to", targetUserId);
      socket.emit("call-offer", { to: targetUserId, offer, roomId });
      
    } catch (e) {
      console.error("[VideoCall] Error starting call:", e);
      alert("Could not start video call: " + e.message);
      endCall();
    }
  };

  // Accept call - simplified and focused on reliability
  const acceptCall = async () => {
    if (!isBrowser) return;
    
    try {
      setCallIncoming(false);
      setCallActive(true);
      
      const socket = getSocket();
      if (!socket || !remoteUser || !window._pendingOffer) {
        throw new Error("Missing required data to accept call");
      }
      
      console.log("[VideoCall] Getting user media for accepting call...");
      // Get media FIRST, before creating the peer connection
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: true, 
        audio: true 
      });
      
      console.log(`[VideoCall] Got local stream with ${stream.getTracks().length} tracks`);
      setLocalStream(stream);
      
      // Create peer connection AFTER getting media
      const pc = createPeerConnection(socket, remoteUser);
      setPeerConnection(pc);
      
      // Add tracks to peer connection - CRITICAL STEP
      stream.getTracks().forEach(track => {
        console.log(`[VideoCall] Adding ${track.kind} track to peer connection`);
        pc.addTrack(track, stream);
      });
      
      // Set remote description from offer
      console.log("[VideoCall] Setting remote description from pending offer...");
      await pc.setRemoteDescription(new RTCSessionDescription(window._pendingOffer));
      
      // Create answer
      console.log("[VideoCall] Creating answer...");
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      
      // Send answer
      console.log("[VideoCall] Sending call-answer to", remoteUser);
      socket.emit("call-answer", { to: remoteUser, answer });
      
      // Clear pending offer
      window._pendingOffer = null;
      
    } catch (e) {
      console.error("[VideoCall] Error accepting call:", e);
      alert("Could not accept call: " + e.message);
      endCall();
    }
  };

  // Decline incoming call
  const declineCall = () => {
    setCallIncoming(false);
    setCallActive(false);
    setRemoteUser(null);
    window._pendingOffer = null;
    
    // Clean up any active streams (shouldn't be any for declined calls, but just in case)
    if (localStream) {
      try { 
        localStream.getTracks().forEach(track => track.stop());
      } catch (err) {
        console.error("[Call] Error stopping tracks:", err);
      }
      setLocalStream(null);
    }
    
    // Clean up connection if somehow it exists
    if (peerConnection) {
      try { peerConnection.close(); } catch {}
      setPeerConnection(null);
    }
    
    setRemoteStream(null);
    
    // Notify the caller that the call was declined
    const socket = getSocket();
    if (socket && remoteUser) {
      socket.emit("call-decline", { to: remoteUser });
    }
    // Also notify the other user to close their popup
    if (socket && remoteUser) {
      socket.emit("call-hangup", { to: remoteUser });
    }
  }

  // Enhanced to ensure all resources are properly released
  const endCall = () => {
    console.log("[VideoCall] Ending call...")
    // Clean up peer connection
    if (peerConnection) {
      try { 
        // Properly remove all event handlers to prevent memory leaks
        peerConnection.onicecandidate = null;
        peerConnection.ontrack = null;
        peerConnection.oniceconnectionstatechange = null;
        peerConnection.onconnectionstatechange = null;
        peerConnection.close(); 
      } catch (err) {
        console.error("[VideoCall] Error closing peer connection:", err)
      }
      setPeerConnection(null)
    }
    
    // Stop all tracks in local stream
    if (localStream) {
      try {
        localStream.getTracks().forEach(track => {
          console.log(`[VideoCall] Stopping ${track.kind} track`)
          track.stop()
        })
      } catch (err) {
        console.error("[VideoCall] Error stopping local tracks:", err)
      }
      setLocalStream(null)
    }
    
    // Clean up video elements
    if (mobileLocalVideoRef.current) {
      mobileLocalVideoRef.current.srcObject = null;
    }
    
    if (mobileRemoteVideoRef.current) {
      mobileRemoteVideoRef.current.srcObject = null;
    }
    
    // Clear remote stream
    setRemoteStream(null)
    setCallActive(false)
    setCallIncoming(false)
    setRemoteUser(null)
    window._pendingOffer = null
    setIsLocalVideoMain(false); // Reset view
    
    // Notify the other user
    const socket = getSocket();
    if (socket && remoteUser) {
      socket.emit("call-hangup", { to: remoteUser });
    }
  }

  // Add cleanup on component unmount for safety
  useEffect(() => {
    return () => {
      // Clean up any active streams to prevent memory leaks
      if (localStream) {
        try {
          const tracks = localStream.getTracks();
          tracks.forEach(track => track.stop());
        } catch (err) {
          console.error("[Cleanup] Error stopping tracks on unmount:", err);
        }
      }
      // Close any active peer connection
      if (peerConnection) {
        try { peerConnection.close(); } catch {}
      }
    };
  }, [localStream, peerConnection]);

  // --- UseEffects ---

  // New useEffect to handle automatic call initiation - modified for Next.js
  useEffect(() => {
    // Check if we should start a call based on sessionStorage state
    const callDataString = sessionStorage.getItem('callData');
    console.log('[ChatRoomPage] Retrieved call data from sessionStorage:', callDataString);
    
    if (!isBrowser || !roomId) return;
    
    if (callDataString) {
      try {
        const callData = JSON.parse(callDataString);
        console.log('[ChatRoomPage] Parsed call data:', callData);
        
        if (callData.startCall && user && room?.members?.length === 2 && !callActive && !callIncoming) {
          console.log('[ChatRoomPage] Call conditions met, finding target user:', callData.targetUserId);
          const otherParticipant = room.members.find(m => m._id === callData.targetUserId && m._id !== user._id);
          
          if (otherParticipant) {
            console.log(`[ChatRoomPage] Found target user, initiating call to ${otherParticipant._id}`);
            // Add a small delay to ensure everything is ready
            setTimeout(() => {
              startCall(otherParticipant._id);
            }, 1000);
          } else {
            console.warn("[ChatRoomPage] Auto-start call requested, but target user not found or is self.");
            console.log("[ChatRoomPage] Room members:", room.members);
            console.log("[ChatRoomPage] Current user:", user);
          }
        } else {
          console.log('[ChatRoomPage] Call conditions not met:', {
            hasCallData: !!callData.startCall,
            hasUser: !!user,
            roomMemberCount: room?.members?.length,
            callActive,
            callIncoming
          });
        }
        // Clear the data after processing
        sessionStorage.removeItem('callData');
        console.log('[ChatRoomPage] Cleared call data from sessionStorage');
      } catch (e) {
        console.error("[ChatRoomPage] Error parsing call data:", e);
        sessionStorage.removeItem('callData');
      }
    }
  }, [user, room, callActive, callIncoming, isBrowser, roomId]); // Dependencies adjusted for Next.js

  useEffect(() => {
    // Assign streams to mobile video elements when they become available or view switches
    const updateMobileVideoElements = () => {
      console.log("[ChatRoomPage] Updating mobile video elements. Local:", !!localStream, "Remote:", !!remoteStream);
      
      const mainVideoEl = isLocalVideoMain ? mobileLocalVideoRef.current : mobileRemoteVideoRef.current;
      const floatingVideoEl = isLocalVideoMain ? mobileRemoteVideoRef.current : mobileLocalVideoRef.current;
      const mainStream = isLocalVideoMain ? localStream : remoteStream;
      const floatingStream = isLocalVideoMain ? remoteStream : localStream;

      // Set main video
      if (mainVideoEl && mainStream && mainVideoEl.srcObject !== mainStream) {
        console.log("[ChatRoomPage] Setting main video srcObject");
        mainVideoEl.srcObject = mainStream;
        mainVideoEl.play().catch(e => console.warn("[ChatRoomPage] Could not play main video:", e));
      }
      
      // Set floating video
      if (floatingVideoEl && floatingStream && floatingVideoEl.srcObject !== floatingStream) {
        console.log("[ChatRoomPage] Setting floating video srcObject");
        floatingVideoEl.srcObject = floatingStream;
        floatingVideoEl.play().catch(e => console.warn("[ChatRoomPage] Could not play floating video:", e));
      }
      
      // Clear srcObject if stream becomes null
      if (mainVideoEl && !mainStream && mainVideoEl.srcObject) {
        console.log("[ChatRoomPage] Clearing main video srcObject");
        mainVideoEl.srcObject = null;
      }
      
      if (floatingVideoEl && !floatingStream && floatingVideoEl.srcObject) {
        console.log("[ChatRoomPage] Clearing floating video srcObject");
        floatingVideoEl.srcObject = null;
      }
    };
    
    // Call immediately and with small delays to ensure DOM updates
    updateMobileVideoElements();
    setTimeout(updateMobileVideoElements, 100);
    setTimeout(updateMobileVideoElements, 500);
    
  }, [localStream, remoteStream, isLocalVideoMain, callActive])

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

  // Fetch room details - Ensure roomId is valid
  const fetchRoomDetails = async () => {
    if (!roomId) {
      setError("Room ID is missing");
      setInitialLoading(false);
      return;
    }
    
    setInitialLoading(true);
    setError(null);
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

  // Find the other participant for P2P call
  const otherParticipant = room?.members?.find(m => m._id !== user?._id)
  const canStartCall = room?.members?.length === 2 && otherParticipant // Enable start only for 1-on-1

  if (initialLoading) {
    return <div className="loading-container">Loading room...</div>
  }

  if (error && !room) {
    return (
      <div className="error-container">
        <Navbar />
        <p>Error loading room: {error}</p>
        <button 
          className="btn btn-secondary" 
          onClick={() => router.push("/dashboard")}
        >
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
        {/* --- Desktop Layout --- */}
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

        {/* --- Mobile Layout --- */}
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
            {!callActive ? (
              <>
                {/* Show participant list and start button only when not in a call */}
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
                {/* Functional Start Call Button */}
                {otherParticipant ? (
                  <button
                    className="btn btn-primary video-call-button-panel"
                    onClick={() => startCall(otherParticipant._id)}
                    disabled={!canStartCall || initialLoading || !!error}
                    title={!canStartCall ? "Video call available for 2 participants only" : "Start video call"}
                  >
                    Start Video Call
                  </button>
                ) : (
                   <p className="text-center text-sm text-muted-foreground mt-4">Waiting for another participant to join...</p>
                )}
                 {!canStartCall && room?.members?.length > 2 && (
                   <p className="text-center text-sm text-muted-foreground mt-2">Video call currently supports only 2 participants.</p>
                 )}
              </>
            ) : (
              <>
                {/* Active Call UI */}
                <div className="mobile-call-active-view">
                  {/* Main Video */}
                  <div className="mobile-call-main-video" onClick={handleSwitchVideoViews}>
                    <video
                      ref={isLocalVideoMain ? mobileLocalVideoRef : mobileRemoteVideoRef}
                      key={isLocalVideoMain ? 'local-main' : 'remote-main'}
                      autoPlay
                      playsInline
                      muted={isLocalVideoMain} // Mute only if it's the local video in main view
                      className="main-video-element"
                    />
                  </div>

                  {/* Floating Video */}
                  <div className="mobile-call-floating-video" onClick={handleSwitchVideoViews}>
                     <video
                       ref={isLocalVideoMain ? mobileRemoteVideoRef : mobileLocalVideoRef}
                       key={isLocalVideoMain ? 'remote-floating' : 'local-floating'}
                       autoPlay
                       playsInline
                       muted={!isLocalVideoMain} // Mute only if it's the local video in floating view
                       className="floating-video-element"
                     />
                  </div>

                  {/* Call Controls */}
                  <div className="mobile-call-controls">
                     <button
                       className={`mobile-call-btn ${!micEnabled ? "muted" : ""}`}
                       onClick={handleToggleMic}
                       title={micEnabled ? "Mute Mic" : "Unmute Mic"}
                     >
                       {micEnabled ? <Mic size={24} /> : <MicOff size={24} />}
                     </button>
                     <button
                       className={`mobile-call-btn ${!videoEnabled ? "muted" : ""}`}
                       onClick={handleToggleVideo}
                       title={videoEnabled ? "Stop Video" : "Start Video"}
                     >
                       {videoEnabled ? <Video size={24} /> : <VideoOff size={24} />}
                     </button>
                     <button
                       className="mobile-call-btn switch"
                       onClick={handleSwitchVideoViews}
                       title="Switch Views"
                     >
                       <SwitchCamera size={24} />
                     </button>
                     <button
                       className="mobile-call-btn hangup"
                       onClick={handleHangCall}
                       title="End Call"
                     >
                       <PhoneOff size={24} />
                     </button>
                  </div>
                </div>
              </>
            )}
          </div>

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

          {/* Incoming Call Overlay */}
          {callIncoming && !callActive && (
            <div className="mobile-incoming-call-overlay">
              <p>Incoming call from {room?.members?.find(m => m._id === remoteUser)?.username || 'Unknown'}...</p>
              <div className="incoming-call-actions">
                <button className="btn btn-success" onClick={acceptCall}>Accept</button>
                <button className="btn btn-danger" onClick={declineCall}>Decline</button>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}

export default ChatRoomPage