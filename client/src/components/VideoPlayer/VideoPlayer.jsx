"use client"

import React, { useEffect, useRef, useCallback } from "react"
import YouTube from "react-youtube"
import { getSocket } from "../../utils/socket"
import "./VideoPlayer.css"

const VideoPlayer = ({ roomId, videoId }) => {
  const playerRef = useRef(null)
  const isSyncingRef = useRef(false)
  const lastSentTimeRef = useRef(0)
  const syncTimeoutRef = useRef(null)
  const seekCheckIntervalRef = useRef(null)

  // --- Event Handlers wrapped in useCallback ---

  const emitVideoAction = useCallback((action, currentTime) => {
    const socket = getSocket()
    if (!socket || !roomId) {
      console.warn("Cannot emit video action: Socket or RoomId missing.")
      return
    }
    const now = Date.now()
    if (action === "timeupdate" && now - lastSentTimeRef.current < 500) {
      return
    }
    lastSentTimeRef.current = now

    console.log(`[VideoPlayer] Emitting video-action: ${action} at ${currentTime}`)
    socket.emit("video-action", { roomId, action, currentTime })
  }, [roomId])

  const handleSyncVideo = useCallback((data) => {
    const socket = getSocket()
    if (!socket) return

    const player = playerRef.current
    // Fix: If player is null, exit early
    if (!player || typeof player.getPlayerState !== "function") {
      console.warn("[VideoPlayer] Player not ready or invalid for sync.")
      return
    }
    if (data.senderId === socket.id) {
      return
    }

    console.log(`[VideoPlayer] Received sync-video: ${data.action} at ${data.currentTime} from ${data.senderId}`)
    isSyncingRef.current = true

    if (syncTimeoutRef.current) {
      clearTimeout(syncTimeoutRef.current)
    }

    syncTimeoutRef.current = setTimeout(async () => {
      try {
        const playerState = await player.getPlayerState()
        const currentVideoTime = await player.getCurrentTime()
        const timeDifference = Math.abs(currentVideoTime - data.currentTime)

        console.log(`[VideoPlayer] Syncing - Action: ${data.action}, Target Time: ${data.currentTime}, Current Time: ${currentVideoTime}, State: ${playerState}`)

        switch (data.action) {
          case "play":
            if (playerState !== YouTube.PlayerState.PLAYING) {
              if (timeDifference > 1.5) {
                console.log("[VideoPlayer] Syncing Play: Seeking first.")
                await player.seekTo(data.currentTime, true)
              }
              console.log("[VideoPlayer] Syncing Play: Playing video.")
              await player.playVideo()
            } else if (timeDifference > 1.5) {
              console.log("[VideoPlayer] Syncing Play: Already playing, seeking.")
              await player.seekTo(data.currentTime, true)
            }
            break
          case "pause":
            if (playerState !== YouTube.PlayerState.PAUSED) {
              console.log("[VideoPlayer] Syncing Pause: Pausing video.")
              await player.pauseVideo()
              if (timeDifference > 1.5) {
                console.log("[VideoPlayer] Syncing Pause: Seeking after pause.")
                await player.seekTo(data.currentTime, true)
              }
            } else if (timeDifference > 1.5) {
              console.log("[VideoPlayer] Syncing Pause: Already paused, seeking.")
              await player.seekTo(data.currentTime, true)
            }
            break
          case "seek":
          case "timeupdate":
            if (timeDifference > 1.5) {
              console.log(`[VideoPlayer] Syncing Seek/TimeUpdate: Seeking to ${data.currentTime}`)
              await player.seekTo(data.currentTime, true)
            } else {
              console.log(`[VideoPlayer] Syncing Seek/TimeUpdate: Time difference within threshold.`)
            }
            break
          default:
            console.warn(`[VideoPlayer] Unknown sync action: ${data.action}`)
        }
      } catch (error) {
        console.error("[VideoPlayer] Error during video sync:", error)
      } finally {
        setTimeout(() => {
          isSyncingRef.current = false
          console.log("[VideoPlayer] Syncing complete, flag reset.")
        }, 300)
      }
    }, 150)
  }, [])

  const onReady = useCallback((event) => {
    playerRef.current = event.target
    console.log("[VideoPlayer] YouTube Player Ready. Instance stored in ref.")
  }, [])

  const onStateChange = useCallback(async (event) => {
    if (isSyncingRef.current) return

    const player = event.target
    if (!player || typeof player.getCurrentTime !== "function") {
      console.warn("[VideoPlayer] onStateChange: Player not valid.")
      return
    }
    const currentTime = await player.getCurrentTime()

    switch (event.data) {
      case YouTube.PlayerState.PLAYING:
        console.log("[VideoPlayer] State Change: PLAYING")
        emitVideoAction("play", currentTime)
        if (seekCheckIntervalRef.current) {
          clearInterval(seekCheckIntervalRef.current)
          seekCheckIntervalRef.current = null
        }
        break
      case YouTube.PlayerState.PAUSED:
        console.log("[VideoPlayer] State Change: PAUSED")
        emitVideoAction("pause", currentTime)
        if (seekCheckIntervalRef.current) {
          clearInterval(seekCheckIntervalRef.current)
          seekCheckIntervalRef.current = null
        }
        break
      case YouTube.PlayerState.BUFFERING:
        console.log("[VideoPlayer] State Change: BUFFERING")
        break
      case YouTube.PlayerState.ENDED:
        console.log("[VideoPlayer] State Change: ENDED")
        break
      case YouTube.PlayerState.CUED:
        console.log("[VideoPlayer] State Change: CUED")
        break
      default:
        break
    }
  }, [emitVideoAction])

  const handleManualSeek = useCallback(async () => {
    if (isSyncingRef.current) return

    const player = playerRef.current
    if (!player || typeof player.getCurrentTime !== "function") return

    const currentTime = await player.getCurrentTime()
    console.log("[VideoPlayer] Manual Seek Detected (via interval)")
    emitVideoAction("seek", currentTime)
  }, [emitVideoAction])

  useEffect(() => {
    const player = playerRef.current
    if (!player || typeof player.getPlayerState !== "function") {
      return
    }

    let lastCheckedTime = -1

    const checkSeek = async () => {
      try {
        const playerState = await player.getPlayerState()
        if (playerState === YouTube.PlayerState.PAUSED || playerState === YouTube.PlayerState.BUFFERING) {
          const currentTime = await player.getCurrentTime()
          if (lastCheckedTime !== -1 && Math.abs(currentTime - lastCheckedTime) > 0.5) {
            handleManualSeek()
          }
          lastCheckedTime = currentTime
        } else {
          lastCheckedTime = -1
        }
      } catch (error) {}
    }

    if (seekCheckIntervalRef.current) {
      clearInterval(seekCheckIntervalRef.current)
    }
    seekCheckIntervalRef.current = setInterval(checkSeek, 750)

    return () => {
      if (seekCheckIntervalRef.current) {
        clearInterval(seekCheckIntervalRef.current)
        seekCheckIntervalRef.current = null
      }
    }
  }, [videoId, handleManualSeek])

  useEffect(() => {
    const socket = getSocket()
    if (!socket) {
      console.warn("[VideoPlayer] Socket not available, skipping listener setup.")
      return
    }

    console.log("[VideoPlayer] Setting up socket listener for 'sync-video'")
    socket.on("sync-video", handleSyncVideo)

    return () => {
      console.log("[VideoPlayer] Cleaning up socket listener for 'sync-video'")
      socket.off("sync-video", handleSyncVideo)
      if (syncTimeoutRef.current) clearTimeout(syncTimeoutRef.current)
      if (seekCheckIntervalRef.current) clearInterval(seekCheckIntervalRef.current)
    }
  }, [handleSyncVideo])

  const opts = {
    height: "100%",
    width: "100%",
    playerVars: {
      autoplay: 0,
      controls: 1,
      rel: 0,
      modestbranding: 1,
      iv_load_policy: 3,
    },
  }

  return (
    <div className="video-wrapper">
      <YouTube
        videoId={videoId}
        opts={opts}
        onReady={onReady}
        onStateChange={onStateChange}
        className="youtube-iframe"
        iframeClassName="youtube-player-iframe"
      />
    </div>
  )
}

export default VideoPlayer