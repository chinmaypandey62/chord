"use client"

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '../../src/context/AuthContext'
import DashboardPage from '../../src/pages/DashboardPage/DashboardPage'

export default function Dashboard() {
  const { user, loading } = useAuth() || {}
  const router = useRouter()
  
  useEffect(() => {
    if (!loading && !user) {
      router.replace('/signin')
    }
  }, [user, loading, router])
  
  if (loading) return <div>Loading Session...</div>
  if (!user) return null // Will redirect in useEffect
  
  return <DashboardPage />
}
