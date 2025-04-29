"use client"

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '../../src/context/AuthContext'
import ProfilePage from '../../src/pages/ProfilePage/ProfilePage'

export default function Profile() {
  const { user, loading } = useAuth() || {}
  const router = useRouter()
  
  useEffect(() => {
    if (!loading && !user) {
      router.replace('/signin')
    }
  }, [user, loading, router])
  
  if (loading) return <div>Loading Session...</div>
  if (!user) return null // Will redirect in useEffect
  
  return <ProfilePage />
}
