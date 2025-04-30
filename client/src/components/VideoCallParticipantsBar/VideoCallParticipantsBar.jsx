"use client" // Add client directive

import React, { useRef, useEffect } from "react"
import { Avatar, AvatarFallback, AvatarImage } from "../../../components/ui/avatar" // Fix import path

const VideoCallParticipantsBar = ({
  room,
  user,
  callActive,
  callIncoming,
  remoteUser,
  localStream,
  remoteStream,
  onStartCall,
  onAcceptCall,
  onDeclineCall,
  onEndCall,
  onToggleMic,
  onToggleVideo,
  micEnabled,
  videoEnabled,
  onParticipantVideoDoubleClick
}) => {
  // Add safety check for SSR
  if (typeof window === 'undefined' || !room || !user) {
    return null;
  }
  
  // Refs for video elements
  const localVideoRef = useRef(null)
  const remoteVideoRef = useRef(null)

  // NEW: Add direct video element stream attachment for reliability
  useEffect(() => {
    console.log("[VideoCallParticipantsBar] remoteStream changed:", !!remoteStream);
    
    // Find all video elements that might need the remote stream
    if (remoteStream) {
      // Force direct srcObject assignment
      const setVideoStream = () => {
        try {
          // 1. Try the ref approach
          if (remoteVideoRef.current && remoteVideoRef.current.srcObject !== remoteStream) {
            console.log("[VideoCallParticipantsBar] Setting remoteVideoRef.current.srcObject");
            remoteVideoRef.current.srcObject = remoteStream;
            
            // Force autoplay
            remoteVideoRef.current.play().catch(e => 
              console.warn("[VideoCallParticipantsBar] Could not autoplay:", e)
            );
          }
          
          // 2. Try direct DOM query as fallback
          const allVideoElements = document.querySelectorAll('.participant-video-box video:not([muted])');
          console.log(`[VideoCallParticipantsBar] Found ${allVideoElements.length} non-muted video elements`);
          
          allVideoElements.forEach((videoEl, index) => {
            if (videoEl.srcObject !== remoteStream) {
              console.log(`[VideoCallParticipantsBar] Setting srcObject on video element ${index}`);
              videoEl.srcObject = remoteStream;
              videoEl.play().catch(e => console.warn(`[VideoCallParticipantsBar] Could not autoplay element ${index}:`, e));
            }
          });
        } catch (err) {
          console.error("[VideoCallParticipantsBar] Error setting video streams:", err);
        }
      };
      
      // Call immediately and with a small delay to ensure DOM is ready
      setVideoStream();
      setTimeout(setVideoStream, 100);
      setTimeout(setVideoStream, 500); // One more attempt after 500ms
    }
  }, [remoteStream]);

  // Enhanced useEffects with better stream handling
  useEffect(() => {
    if (localVideoRef.current) {
      console.log("[ParticipantsBar] Setting local video srcObject:", !!localStream);
      if (localStream) {
        localVideoRef.current.srcObject = localStream;
        
        // Ensure video plays
        localVideoRef.current.play().catch(err => {
          console.warn("[ParticipantsBar] Local video autoplay failed:", err);
        });
      } else {
        localVideoRef.current.srcObject = null;
      }
    }
  }, [localStream]);

  useEffect(() => {
    if (remoteVideoRef.current) {
      console.log("[ParticipantsBar] Setting remote video srcObject:", !!remoteStream);
      if (remoteStream) {
        remoteVideoRef.current.srcObject = remoteStream;
        
        // Ensure video plays
        remoteVideoRef.current.play().catch(err => {
          console.warn("[ParticipantsBar] Remote video autoplay failed:", err);
        });
      } else {
        remoteVideoRef.current.srcObject = null;
      }
    }
  }, [remoteStream]);

  // Enhanced cleanup for unmount
  useEffect(() => {
    return () => {
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = null;
      }
      if (remoteVideoRef.current) {
        remoteVideoRef.current.srcObject = null;
      }
    };
  }, []);

  // Enhanced helper for participant box rendering with fixed syntax
  const renderParticipantBox = (participant) => {
    if (!participant || !participant._id) return null;
    
    const isSelf = participant._id === user._id;
    const isOnline = participant.status === "online";
    
    // ✅ FIX: Improved call participation detection
    // Check if this participant should be in the call (either self or the remote user)
    const isCallParticipant = callActive && (isSelf || participant._id === remoteUser);
    
    // Only show video UI if call is active AND this participant is part of the call
    if (isCallParticipant) {
      if (isSelf) {
        // Local participant - show self video
        return (
          <div className="participant-video-box" key={participant._id} style={{ position: "relative" }}>
            {/* Online indicator */}
            {isOnline && (
              <span
                style={{
                  position: "absolute",
                  top: 8,
                  right: 8,
                  width: 12,
                  height: 12,
                  background: "#22c55e",
                  borderRadius: "50%",
                  border: "2px solid #18181b",
                  zIndex: 2,
                  display: "block"
                }}
                title="Online"
              />
            )}
            
            {/* Local video - always show if in call */}
            <video
              ref={localVideoRef}
              autoPlay
              playsInline
              muted
              style={{ 
                width: "100%", 
                height: "100%", 
                borderRadius: 8, 
                background: "#222",
                objectFit: "cover"
              }}
              onDoubleClick={() => onParticipantVideoDoubleClick && onParticipantVideoDoubleClick(participant._id)}
            />
            <div className="participant-video-username">{participant.username || "You"}</div>
            
            {/* Stream status indicator */}
            <div style={{
              position: "absolute",
              bottom: 4,
              right: 4,
              fontSize: "9px",
              background: "rgba(0,0,0,0.5)",
              color: localStream ? "#4ade80" : "#f87171",
              padding: "2px 4px",
              borderRadius: 4
            }}>
              {localStream ? "Active" : "No Stream"}
            </div>
          </div>
        );
      } else {
        // Remote participant - show their video if available
        return (
          <div className="participant-video-box" key={participant._id} style={{ position: "relative" }}>
            {/* Online indicator */}
            {isOnline && (
              <span
                style={{
                  position: "absolute",
                  top: 8,
                  right: 8,
                  width: 12,
                  height: 12,
                  background: "#22c55e",
                  borderRadius: "50%",
                  border: "2px solid #18181b",
                  zIndex: 2,
                  display: "block"
                }}
                title="Online"
              />
            )}
            
            {/* Add a placeholder while waiting for remote stream */}
            {!remoteStream && (
              <div style={{
                position: "absolute",
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                background: "#222",
                borderRadius: 8,
                zIndex: 1
              }}>
                <div style={{ textAlign: "center" }}>
                  <Avatar className="h-12 w-12 mx-auto mb-2">
                    <AvatarImage src={participant.profilePicture || undefined} alt={participant.username} />
                    <AvatarFallback>{participant.username?.substring(0, 2).toUpperCase() || "??"}</AvatarFallback>
                  </Avatar>
                  <div style={{ color: "#fff", fontSize: "12px" }}>Connecting...</div>
                </div>
              </div>
            )}
            
            {/* Remote video element - always render it to be ready for stream */}
            <video
              ref={remoteVideoRef}
              autoPlay
              playsInline
              style={{ 
                width: "100%", 
                height: "100%", 
                borderRadius: 8, 
                background: "#222",
                objectFit: "cover",
                visibility: remoteStream ? "visible" : "hidden" // Hide video until stream available
              }}
              onDoubleClick={() => onParticipantVideoDoubleClick && onParticipantVideoDoubleClick(participant._id)}
            />
            <div className="participant-video-username">{participant.username}</div>
            
            {/* Stream status indicator - improved */}
            <div style={{
              position: "absolute",
              bottom: 4,
              right: 4,
              fontSize: "9px",
              background: "rgba(0,0,0,0.5)",
              color: remoteStream ? "#4ade80" : "#f87171",
              padding: "2px 4px",
              borderRadius: 4,
              zIndex: 3 // Ensure it's above other elements
            }}>
              {remoteStream ? "Connected" : "Connecting..."}
            </div>
          </div>
        );
      }
    }
    
    // Otherwise, just show avatar and name
    return (
      <div className="participant-video-box" key={participant._id} style={{ position: "relative" }}>
        {/* Online indicator */}
        {isOnline && (
          <span
            style={{
              position: "absolute",
              top: 8,
              right: 8,
              width: 12,
              height: 12,
              background: "#22c55e",
              borderRadius: "50%",
              border: "2px solid #18181b",
              zIndex: 2,
              display: "block"
            }}
            title="Online"
          />
        )}
        <div className="participant-video-placeholder" style={{ width: "100%", height: 90, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <Avatar className="h-12 w-12">
            <AvatarImage src={participant.profilePicture || undefined} alt={participant.username} />
            <AvatarFallback>{participant.username?.substring(0, 2).toUpperCase() || "??"}</AvatarFallback>
          </Avatar>
        </div>
        <div className="participant-video-username">{isSelf ? "You" : participant.username}</div>
      </div>
    );
  }

  // Only show controls if there are other members
  const otherMembers = room?.members?.filter(m => m._id !== user._id) || []

  return (
    <div className="video-call-participants-bar" style={{ display: "flex", alignItems: "center", gap: 16, width: "100%" }}>
      {/* Participant boxes */}
      <div style={{ display: "flex", gap: 16, flex: 1 }}>
        {room?.members?.map(renderParticipantBox)}
      </div>
      {/* Call controls */}
      <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", minWidth: 120 }}>
        {!callActive && !callIncoming && otherMembers.length > 0 && (
          <button
            className="btn btn-primary"
            onClick={() => onStartCall(otherMembers[0]._id)}
            style={{ marginBottom: 8 }}
          >
            Start Call
          </button>
        )}
        {callIncoming && (
          <div>
            <span>Incoming call</span>
            <button className="btn btn-success" onClick={onAcceptCall} style={{ marginLeft: 8 }}>Accept</button>
            <button className="btn btn-danger" onClick={onDeclineCall} style={{ marginLeft: 8 }}>Decline</button>
          </div>
        )}
        {callActive && (
          <div style={{ display: "flex", gap: 8 }}>
            <button
              className={`btn btn-icon btn-mic${micEnabled ? "" : " btn-muted"}`}
              onClick={onToggleMic}
              title={micEnabled ? "Mute" : "Unmute"}
            >
              {micEnabled ? "Mic" : "Mic Off"}
            </button>
            <button
              className={`btn btn-icon btn-cam${videoEnabled ? "" : " btn-muted"}`}
              onClick={onToggleVideo}
              title={videoEnabled ? "Stop Video" : "Start Video"}
            >
              {videoEnabled ? "Cam" : "Cam Off"}
            </button>
            <button
              className="btn btn-icon btn-hangup"
              onClick={onEndCall}
              title="End Call"
            >
              End
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

export default VideoCallParticipantsBar
