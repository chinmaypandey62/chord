"use client"

import { useState, useEffect } from "react"
import { AuthProvider } from "../context/AuthContext"
import { FriendProvider } from "../context/FriendContext"
import { ThemeProvider } from "./theme-provider"

export default function ClientProvider({ children }) {
  // Add client-side only rendering to prevent hydration issues
  const [isMounted, setIsMounted] = useState(false)
  
  useEffect(() => {
    setIsMounted(true)
  }, [])

  if (!isMounted) {
    // Return an empty div with the same structure to maintain layout during SSR
    return <div className="client-provider-placeholder" suppressHydrationWarning></div>
  }

  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      disableTransitionOnChange
    >
      <AuthProvider>
        <FriendProvider>
          {children}
        </FriendProvider>
      </AuthProvider>
    </ThemeProvider>
  )
}
