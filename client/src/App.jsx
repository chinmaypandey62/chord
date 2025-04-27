"use client"

import { useState, useEffect } from "react"
import { BrowserRouter as Router, Routes, Route, Navigate, useNavigate } from "react-router-dom"
import { AuthProvider, useAuth } from "./context/AuthContext"
// import { SocketProvider } from "./context/SocketContext"; // <-- Removed import
import { ThemeProvider } from "./components/theme-provider" // Ensure this path is correct
import { FriendProvider } from "./context/FriendContext"
import { Toaster } from "sonner"
import { getSocket } from "./utils/socket"
import { toast } from "sonner"

// Pages - Corrected Paths
import LandingPage from "./pages/LandingPage/LandingPage"
import SignInPage from "./pages/SignInPage/SignInPage"
import SignUpPage from "./pages/SignUpPage/SignUpPage"
import DashboardPage from "./pages/DashboardPage/DashboardPage"
import FriendRequestsPage from "./pages/FriendRequestsPage/FriendRequestsPage"
import ProfilePage from "./pages/ProfilePage/ProfilePage"
import ChatRoomPage from "./pages/ChatRoomPage/ChatRoomPage"
import NotFoundPage from "./pages/NotFoundPage/NotFoundPage"

// Styles
import "./App.css"
import "./styles/globals.css" // Ensure global styles are imported


function App() {
  const [isClient, setIsClient] = useState(false)
  const [socketReady, setSocketReady] = useState(false)

  useEffect(() => {
    if (typeof window !== "undefined") {
      setIsClient(true)
    }
  }, [])

  // Wait for socket to be initialized before attaching listeners
  useEffect(() => {
    if (!isClient) return
    const interval = setInterval(() => {
      const socket = getSocket()
      if (socket && socket.connected) {
        setSocketReady(true)
        clearInterval(interval)
      }
    }, 200)
    return () => clearInterval(interval)
  }, [isClient])

  useEffect(() => {
    if (!socketReady) return
    const socket = getSocket()
    if (!socket) return

    socket.off("call-offer", window.__globalCallOfferHandler)
    socket.off("call-decline", window.__globalCallDeclineHandler)
    socket.off("call-hangup", window.__globalCallHangupHandler)

    window.__globalCallOfferHandler = (payload) => {
      // Always show the toast, regardless of current page/room
      const callRoomId = payload.roomId || payload.from
      // Store the toast id so we can dismiss it later
      window.__activeCallToastId = toast(
        (t) => (
          <div>
            <strong>Incoming Call</strong>
            <div style={{ margin: "6px 0" }}>You have an incoming call in a room.</div>
            <button
              className="btn btn-primary"
              style={{ marginRight: 8 }}
              onClick={() => {
                window.location.href = `/chat/${callRoomId}`
                toast.dismiss(t)
              }}
            >
              Go to Call
            </button>
            <button
              className="btn btn-danger"
              onClick={() => {
                socket.emit("call-decline", { to: payload.from })
                toast.dismiss(t)
              }}
            >
              Reject
            </button>
          </div>
        ),
        {
          duration: 10000,
          important: true
        }
      )
      if ("Notification" in window && Notification.permission === "granted") {
        new Notification("Incoming Call", {
          body: "You have an incoming call in a room!",
          icon: "/favicon.ico"
        })
      }
    }

    window.__globalCallDeclineHandler = () => {
      // Dismiss any active incoming call toast
      if (window.__activeCallToastId) {
        toast.dismiss(window.__activeCallToastId)
        window.__activeCallToastId = null
      }
      toast.info("The other user declined your call.")
    }

    window.__globalCallHangupHandler = () => {
      // Dismiss any active incoming call toast
      if (window.__activeCallToastId) {
        toast.dismiss(window.__activeCallToastId)
        window.__activeCallToastId = null
      }
      toast.info("The call has ended.")
    }

    socket.on("call-offer", window.__globalCallOfferHandler)
    socket.on("call-decline", window.__globalCallDeclineHandler)
    socket.on("call-hangup", window.__globalCallHangupHandler)

    return () => {
      socket.off("call-offer", window.__globalCallOfferHandler)
      socket.off("call-decline", window.__globalCallDeclineHandler)
      socket.off("call-hangup", window.__globalCallHangupHandler)
    }
  }, [socketReady])

  if (!isClient) return null

  // Create a ProtectedRoute component to wrap protected routes
  const ProtectedRoute = ({ children }) => {
    const { user, loading } = useAuth()
    const navigate = useNavigate()

    useEffect(() => {
      // Redirect only if loading is finished and there's no user
      if (!loading && !user) {
        console.log("Access to protected route blocked - redirecting to login")
        navigate("/signin", { replace: true }) // Use replace to avoid back button issues
      }
    }, [user, loading, navigate])

    // Show loading state while checking authentication
    if (loading) {
      // You might want a more sophisticated loading indicator here
      return <div>Loading Session...</div>
    }

    // Only render children if authenticated (user exists)
    // If loading is false and user is null, the useEffect above will trigger navigation
    return user ? children : null // Render null while redirecting
  }

  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
      <AuthProvider>
        {/* <SocketProvider> */}
          <FriendProvider>
            <Router>
              <div className="app">
                {/* Add Toaster at the root so toasts show on any page */}
                <Toaster position="top-center" richColors />
                <Routes>
                  {/* Public routes */}
                  <Route path="/" element={<LandingPage />} />
                  <Route path="/signin" element={<SignInPage />} />
                  <Route path="/signup" element={<SignUpPage />} />

                  {/* Protected routes */}
                  <Route
                    path="/dashboard"
                    element={
                      <ProtectedRoute>
                        <DashboardPage />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/friends"
                    element={
                      <ProtectedRoute>
                        <FriendRequestsPage />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/profile"
                    element={
                      <ProtectedRoute>
                        <ProfilePage />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/chat/:roomId"
                    element={
                      <ProtectedRoute>
                        <ChatRoomPage />
                      </ProtectedRoute>
                    }
                  />

                  {/* 404 route */}
                  <Route path="*" element={<NotFoundPage />} />
                </Routes>
              </div>
            </Router>
          </FriendProvider>
        {/* </SocketProvider> */}
      </AuthProvider>
    </ThemeProvider>
  )
}

export default App
