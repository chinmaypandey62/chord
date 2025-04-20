"use client"

import { useState, useEffect } from "react"
import { BrowserRouter as Router, Routes, Route, Navigate, useNavigate } from "react-router-dom"
import { AuthProvider, useAuth } from "./context/AuthContext"
// import { SocketProvider } from "./context/SocketContext"; // <-- Removed import
import { ThemeProvider } from "./components/theme-provider" // Ensure this path is correct
import { FriendProvider } from "./context/FriendContext"

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

  useEffect(() => {
    // Ensure this runs only on the client
    if (typeof window !== "undefined") {
      setIsClient(true) // Set client status
    }
  }, [])

  // Render null or a loader until client status is confirmed
  if (!isClient) return null // or a loading spinner

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
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem> {/* Ensure system is the default */}
      <AuthProvider>
        {/* <SocketProvider> */} {/* <-- Removed wrapper */}
          <FriendProvider>
            <Router>
              <div className="app">
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
        {/* </SocketProvider> */} {/* <-- Removed wrapper */}
      </AuthProvider>
    </ThemeProvider>
  )
}

export default App
