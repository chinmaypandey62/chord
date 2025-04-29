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

  useEffect(() => {
    if (localVideoRef.current && localStream) {
      localVideoRef.current.srcObject = localStream
    }
  }, [localStream])

  useEffect(() => {
    if (remoteVideoRef.current && remoteStream) {
      remoteVideoRef.current.srcObject = remoteStream
    }
  }, [remoteStream])

  // Helper: get participant display
  const renderParticipantBox = (participant) => {
    if (!participant || !participant._id) return null;
    
    const isSelf = participant._id === user._id
    const isOnline = participant.status === "online"
    // Show video if call is active and this is self or remote
    if (callActive) {
      if (isSelf && localStream) {
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
            <video
              ref={localVideoRef}
              autoPlay
              muted
              playsInline
              style={{ width: "100%", height: "100%", borderRadius: 8, background: "#222" }}
              onDoubleClick={() => onParticipantVideoDoubleClick && onParticipantVideoDoubleClick(participant._id)}
            />
            <div className="participant-video-username">{participant.username || "You"}</div>
          </div>
        )
      }
      if (!isSelf && remoteStream && remoteUser === participant._id) {
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
            <video
              ref={remoteVideoRef}
              autoPlay
              playsInline
              style={{ width: "100%", height: "100%", borderRadius: 8, background: "#222" }}
              onDoubleClick={() => onParticipantVideoDoubleClick && onParticipantVideoDoubleClick(participant._id)}
            />
            <div className="participant-video-username">{participant.username}</div>
          </div>
        )
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
    )
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
