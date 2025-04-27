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

  // Find another user to call (for demo: first other member)
  const otherMember = room?.members?.find(m => m._id !== user?._id)

  if (!room) return null

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
