"use client"

import { useEffect } from 'react'
import { useAuth } from '../../../src/context/AuthContext'
import { useRouter, useParams } from 'next/navigation'
import ChatRoomPage from '../../../src/pages/ChatRoomPage/ChatRoomPage'

export default function ChatRoom() {
  const { user, loading } = useAuth() || {}
  const router = useRouter()
  const params = useParams()
  const roomId = params?.roomId

  // Protected route check
  useEffect(() => {
    if (!loading && !user) {
      router.replace('/signin')
    }
  }, [user, loading, router])

  if (loading) return <div>Loading Session...</div>
  if (!user) return null // Will redirect in useEffect
  
  return <ChatRoomPage roomId={roomId} />
}
