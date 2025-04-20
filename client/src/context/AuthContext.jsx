"use client"

import { createContext, useState, useEffect, useContext } from "react"
import axios from "../utils/axios"
import { initializeSocket, disconnectSocket } from "../utils/socket"

const AuthContext = createContext()

export const useAuth = () => useContext(AuthContext)

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    const checkLoggedIn = async () => {
      const token = localStorage.getItem("token")
      if (token) {
        try {
          console.log("Token found, attempting to verify...")
          await axios.get("/auth/verify", {
            headers: { Authorization: `Bearer ${token}` },
          })
          await fetchUserProfile(token)
        } catch (err) {
          console.error("Auth check failed (verify or fetch):", err)
          localStorage.removeItem("token")
          setUser(null)
          disconnectSocket()
          setLoading(false)
        }
      } else {
        console.log("No token found, user is logged out.")
        disconnectSocket()
        setLoading(false)
      }
    }
    checkLoggedIn()
  }, [])

  const fetchUserProfile = async (token) => {
    console.log("fetchUserProfile - Token received:", token)
    try {
      const response = await axios.get("/users/profile", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })
      const fetchedUser = response.data
      setUser(fetchedUser)
      if (fetchedUser?._id) {
        initializeSocket(fetchedUser._id)
      } else {
        console.error("Fetched user profile does not contain _id")
        disconnectSocket()
      }
      setLoading(false)
    } catch (err) {
      console.error("Error fetching user profile:", err)
      localStorage.removeItem("token")
      setUser(null)
      disconnectSocket()
      setError("Session expired. Please login again.")
      setLoading(false)
    }
  }

  const login = async (usernameOrEmail, password) => {
    setLoading(true)
    setError(null)
    try {
      console.log("Attempting login with:", { usernameOrEmail })
      const response = await axios.post("/auth/login", { usernameOrEmail, password })
      const { token, user: loggedInUser } = response.data

      console.log("Received token from server:", token)

      localStorage.setItem("token", token)
      console.log("AuthContext login - Token saved:", token)

      setUser(loggedInUser)
      if (loggedInUser?._id) {
        initializeSocket(loggedInUser._id)
      } else {
        console.error("Logged in user data does not contain _id")
        disconnectSocket()
      }
      setLoading(false)
      setError(null)
      return { success: true }
    } catch (err) {
      const errorMessage = err.response?.data?.message || "Login failed"
      setError(errorMessage)
      console.error("Login error:", errorMessage)
      setUser(null)
      localStorage.removeItem("token")
      disconnectSocket()
      setLoading(false)
      return {
        success: false,
        error: errorMessage,
      }
    }
  }

  const register = async (registrationData) => {
    setError(null)
    setLoading(true)
    try {
      console.log("Attempting registration with data:", registrationData)
      const response = await axios.post("/auth/register", registrationData)
      const { token, user: registeredUser } = response.data

      localStorage.setItem("token", token)
      console.log("Registration successful, token saved:", token)
      setUser(registeredUser)
      if (registeredUser?._id) {
        initializeSocket(registeredUser._id)
      } else {
        console.error("Registered user data does not contain _id")
        disconnectSocket()
      }
      setLoading(false)
      return { success: true, user: registeredUser }
    } catch (err) {
      const errorMessage = err.response?.data?.message || "Registration failed"
      console.error("Registration error:", err.response?.data || err.message)
      setError(errorMessage)
      setUser(null)
      localStorage.removeItem("token")
      disconnectSocket()
      setLoading(false)
      return { success: false, error: errorMessage }
    }
  }

  const logout = () => {
    console.log("Logging out user...")
    localStorage.removeItem("token")
    setUser(null)
    disconnectSocket()
    setError(null)
    console.log("User logged out, state cleared, socket disconnected")
  }

  const updateProfile = async (userData) => {
    setError(null)
    try {
      const token = localStorage.getItem("token")
      if (!token) throw new Error("No token found for profile update.")

      const response = await axios.put("/users/profile", userData, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      const updatedUser = response.data
      setUser(updatedUser)
      console.log("AuthContext user updated:", updatedUser)
      return { success: true }
    } catch (err) {
      const errorMessage = err.response?.data?.message || err.message || "Profile update failed"
      setError(errorMessage)
      console.error("Profile update error:", errorMessage)
      if (err.response?.status === 401) {
        logout()
      }
      return { success: false, error: errorMessage }
    }
  }

  const value = {
    user,
    loading,
    error,
    login,
    register,
    logout,
    updateProfile,
    setError,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
