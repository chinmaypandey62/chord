"use client"

import { useState, useEffect } from "react"
import { usePathname, useRouter } from "next/navigation" // Replace React Router with Next.js navigation
import { AuthProvider, useAuth } from "./context/AuthContext"
import { ThemeProvider } from "./components/theme-provider"
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
import "./styles/globals.css"

function App() {
  const [isClient, setIsClient] = useState(false)
  const [socketReady, setSocketReady] = useState(false)
  const pathname = usePathname() || '/'
  const auth = useAuth() || {}
  const { user, loading } = auth
  const router = useRouter()

  // Set client state on mount
  useEffect(() => {
    setIsClient(true)
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
    if (!socketReady || !isClient) return
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
  }, [socketReady, isClient])

  // Protected route logic - only run on client side
  useEffect(() => {
    if (!isClient) return
    
    // Check if the current route needs protection
    const protectedRoutes = ['/dashboard', '/friends', '/profile'];
    const isChatRoute = pathname?.startsWith('/chat/');
    const needsProtection = protectedRoutes.includes(pathname) || isChatRoute;
    
    // Redirect to login if accessing protected route without auth
    if (needsProtection && !loading && !user) {
      console.log("Access to protected route blocked - redirecting to login")
      router.replace("/signin")
    }
  }, [user, loading, pathname, router, isClient]);

  if (!isClient) {
    // Return a minimal loading UI during SSR
    return <div className="app-loading">Loading application...</div>
  }
  
  // Show loading state while checking authentication on protected routes
  const protectedRoutes = ['/dashboard', '/friends', '/profile'];
  const isChatRoute = pathname?.startsWith('/chat/');
  const needsProtection = protectedRoutes.includes(pathname) || isChatRoute;
  
  if (loading && needsProtection) {
    return <div>Loading Session...</div>
  }

  // Render content based on current pathname
  const renderContent = () => {
    // Extract roomId for chat routes
    const roomId = isChatRoute ? pathname.split('/').pop() : null;
    
    // Only render protected content if user exists
    if (needsProtection && !user) {
      return null; // Will redirect via useEffect
    }
    
    switch (pathname) {
      case '/':
        return <LandingPage />;
      case '/signin':
        return <SignInPage />;
      case '/signup':
        return <SignUpPage />;
      case '/dashboard':
        return <DashboardPage />;
      case '/friends':
        return <FriendRequestsPage />;
      case '/profile':
        return <ProfilePage />;
      default:
        if (isChatRoute) {
          return <ChatRoomPage roomId={roomId} />;
        }
        return <NotFoundPage />;
    }
  };

  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
      <div className="app">
        {/* Add Toaster at the root so toasts show on any page */}
        <Toaster position="top-center" richColors />
        {renderContent()}
      </div>
    </ThemeProvider>
  )
}

// Update the default export to properly wrap with providers
function AppWithProviders() {
  // Add client-side only rendering for the app and its providers
  const [mounted, setMounted] = useState(false)
  
  useEffect(() => {
    setMounted(true)
  }, [])
  
  if (!mounted) {
    // Return minimal UI during SSR
    return <div className="app-initial-loading">Loading...</div>
  }
  
  return (
    <AuthProvider>
      <FriendProvider>
        <App />
      </FriendProvider>
    </AuthProvider>
  );
}

export default AppWithProviders;
