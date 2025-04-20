"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { getSocket } from "../../utils/socket"
import { useAuth } from "../../context/AuthContext"
import "./ChatBox.css"

const ChatBox = ({ roomId }) => {
  const [messages, setMessages] = useState([])
  const [messageInput, setMessageInput] = useState("")
  const [isTyping, setIsTyping] = useState(false)
  const [typingUsers, setTypingUsers] = useState([])
  const { user } = useAuth()
  const messagesEndRef = useRef(null)
  const typingTimeoutRef = useRef(null)

  // --- Socket Event Handlers ---
  const handleNewMessage = useCallback((data) => {
    console.log("[ChatBox] Received message:", data)
    const newMessage = {
      content: data.message,
      userId: data.sender._id,
      username: data.sender.username,
      timestamp: data.timestamp || new Date().toISOString(),
    }
    setMessages((prevMessages) => [...prevMessages, newMessage])
  }, [])

  const handleUserTyping = useCallback((data) => {
    if (data.userId === user?._id) return

    console.log(`[ChatBox] User typing: ${data.username}`)
    setTypingUsers((prev) => {
      if (!prev.includes(data.username)) {
        return [...prev, data.username]
      }
      return prev
    })
  }, [user?._id])

  const handleUserStoppedTyping = useCallback((data) => {
    if (data.userId === user?._id) return

    console.log(`[ChatBox] User stopped typing: ${data.username}`)
    setTypingUsers((prev) => prev.filter((username) => username !== data.username))
  }, [user?._id])
  // --- End Socket Event Handlers ---

  // --- Main Socket Effect ---
  useEffect(() => {
    const socket = getSocket()
    if (!socket || !roomId) {
      console.warn("[ChatBox] Socket or RoomId not available, skipping listener setup.")
      return
    }

    console.log(`[ChatBox] Setting up listeners for room ${roomId}`)

    socket.on("receive-message", handleNewMessage)
    socket.on("userTyping", handleUserTyping)
    socket.on("userStoppedTyping", handleUserStoppedTyping)

    return () => {
      console.log(`[ChatBox] Cleaning up listeners for room ${roomId}`)
      socket.off("receive-message", handleNewMessage)
      socket.off("userTyping", handleUserTyping)
      socket.off("userStoppedTyping", handleUserStoppedTyping)
    }
  }, [roomId, handleNewMessage, handleUserTyping, handleUserStoppedTyping])
  // --- End Main Socket Effect ---

  // Scroll to bottom when messages change
  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }

  // --- Event Handlers for Input/Form ---
  const handleStopTyping = useCallback(() => {
    const socket = getSocket()
    if (!socket || !roomId || !isTyping) return

    console.log("[ChatBox] Emitting stopTyping")
    setIsTyping(false)
    socket.emit("stopTyping", { roomId })
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current)
      typingTimeoutRef.current = null
    }
  }, [roomId, isTyping])

  const handleSubmit = (e) => {
    e.preventDefault()
    const socket = getSocket()

    if (!messageInput.trim() || !socket || !user || !roomId) {
      console.warn("Cannot send message: Input empty, socket missing, user missing, or roomId missing.")
      return
    }

    console.log("[ChatBox] Emitting send-message:", messageInput)
    socket.emit("send-message", {
      roomId,
      message: messageInput,
    })

    setMessageInput("")
    handleStopTyping()
  }

  const handleInputChange = (e) => {
    setMessageInput(e.target.value)
    const socket = getSocket()

    if (!socket || !user || !roomId) return

    if (!isTyping) {
      console.log("[ChatBox] Emitting typing")
      setIsTyping(true)
      socket.emit("typing", { roomId })
    }

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current)
    }

    typingTimeoutRef.current = setTimeout(handleStopTyping, 2000)
  }
  // --- End Event Handlers for Input/Form ---

  // Group messages by date (UI Logic)
  const groupedMessages = messages.reduce((groups, message) => {
    if (!message.timestamp) return groups
    try {
      const date = new Date(message.timestamp).toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" })
      if (!groups[date]) {
        groups[date] = []
      }
      groups[date].push(message)
    } catch (e) {
      console.error("Error parsing message timestamp:", message.timestamp, e)
    }
    return groups
  }, {})

  return (
    <div className="chat-box">
      <div className="chat-messages">
        {Object.entries(groupedMessages).map(([date, msgs]) => (
          <div key={date} className="message-group">
            <div className="date-divider">
              <span>{date}</span>
            </div>

            {msgs.map((msg, index) => (
              <div
                key={msg.timestamp + index}
                className={`message ${msg.userId === user?._id ? "message-own" : "message-other"}`}
              >
                <div className="message-header">
                  {msg.userId !== user?._id && <span className="message-username">{msg.username}</span>}
                  <span className="message-time">
                    {msg.timestamp ? new Date(msg.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : ""}
                  </span>
                </div>
                <div className="message-content">{msg.content}</div>
              </div>
            ))}
          </div>
        ))}

        {typingUsers.length > 0 && (
          <div className="typing-indicator">
            {typingUsers.length === 1 ? `${typingUsers[0]} is typing...` : `${typingUsers.join(", ")} are typing...`}
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      <form onSubmit={handleSubmit} className="chat-input-form">
        <input
          type="text"
          value={messageInput}
          onChange={handleInputChange}
          onBlur={handleStopTyping}
          placeholder="Type a message..."
          className="chat-input"
          disabled={!roomId || !user}
        />
        <button type="submit" className="btn btn-primary" disabled={!messageInput.trim() || !roomId || !user}>
          Send
        </button>
      </form>
    </div>
  )
}

export default ChatBox