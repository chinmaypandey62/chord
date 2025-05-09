"use client" // Add client directive

import React, { useEffect, useRef } from "react"

const VideoCallBar = ({
  callActive,
  callIncoming,
  remoteUser,
  localStream,
  remoteStream,
  onStartCall,
  onAcceptCall,
  onDeclineCall,
  onEndCall,
  room,
  user
}) => {
  // Add safety check for SSR
  if (typeof window === 'undefined' || !room) {
    return null;
  }

  const localVideoRef = useRef(null)
  const remoteVideoRef = useRef(null)

  // Enhanced useEffect for handling local stream
  useEffect(() => {
    if (localVideoRef.current) {
      if (localStream) {
        localVideoRef.current.srcObject = localStream;
      } else {
        // Explicitly clear srcObject when stream becomes null
        localVideoRef.current.srcObject = null;
      }
    }
  }, [localStream])

  // Enhanced useEffect for handling remote stream
  useEffect(() => {
    if (remoteVideoRef.current) {
      if (remoteStream) {
        remoteVideoRef.current.srcObject = remoteStream;
      } else {
        // Explicitly clear srcObject when stream becomes null
        remoteVideoRef.current.srcObject = null;
      }
    }
  }, [remoteStream])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      // Clear video elements when component unmounts
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = null;
      }
      
      if (remoteVideoRef.current) {
        remoteVideoRef.current.srcObject = null;
      }
    };
  }, [])

  // Find another user to call (for demo: first other member)
  // Add additional safety checks
  const otherMember = room?.members?.length > 0 
    ? room.members.find(m => m._id !== user?._id) 
    : null;

  return (
    <div style={{
      width: "100%",
      background: "#18181b",
      borderBottom: "1px solid #333",
      padding: "8px 0",
      display: "flex",
      alignItems: "center",
      gap: "16px",
      minHeight: "72px"
    }}>
      {callActive ? (
        <>
          <video
            ref={localVideoRef}
            autoPlay
            muted
            playsInline
            style={{ width: 80, height: 60, borderRadius: 8, background: "#222" }}
          />
          <video
            ref={remoteVideoRef}
            autoPlay
            playsInline
            style={{ width: 120, height: 90, borderRadius: 8, background: "#222" }}
          />
          <button onClick={onEndCall} style={{ marginLeft: 16, background: "#e11d48", color: "#fff", border: "none", borderRadius: 6, padding: "8px 16px" }}>
            Hang Up
          </button>
        </>
      ) : callIncoming ? (
        <div>
          <span>Incoming call from {remoteUser}</span>
          <button onClick={onAcceptCall} style={{ marginLeft: 8 }}>Accept</button>
          <button onClick={onDeclineCall} style={{ marginLeft: 8 }}>Decline</button>
        </div>
      ) : (
        otherMember && (
          <button onClick={() => onStartCall(otherMember._id)}>
            Start Video Call with {otherMember.username}
          </button>
        )
      )}
    </div>
  )
}

export default VideoCallBar
