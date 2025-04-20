"use client"

import { useState, useEffect } from "react"
import { useAuth } from "../../context/AuthContext" // Corrected path
import Navbar from "../../components/Navbar/Navbar" // Corrected path
import "./ProfilePage.css"

const ProfilePage = () => {
  const { user, updateProfile } = useAuth()
  const [formData, setFormData] = useState({
    username: "",
    email: "",
    bio: "",
  })
  const [avatar, setAvatar] = useState(null)
  const [avatarPreview, setAvatarPreview] = useState("")
  const [isEditing, setIsEditing] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [status, setStatus] = useState(null)

  useEffect(() => {
    if (user) {
      setFormData({
        username: user.username || "",
        email: user.email || "",
        bio: user.bio || "",
      })

      if (user.avatar) {
        setAvatarPreview(user.avatar)
      }
    }
  }, [user])

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }))
  }

  const handleAvatarChange = (e) => {
    const file = e.target.files[0]
    if (!file) return

    setAvatar(file)

    // Create preview URL
    const reader = new FileReader()
    reader.onloadend = () => {
      setAvatarPreview(reader.result)
    }
    reader.readAsDataURL(file)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()

    setIsSubmitting(true)

    try {
      // Create FormData for file upload
      const data = new FormData()
      data.append("username", formData.username)
      data.append("bio", formData.bio)

      if (avatar) {
        data.append("avatar", avatar)
      }

      const result = await updateProfile(data)

      if (result.success) {
        setStatus({
          type: "success",
          message: "Profile updated successfully!",
        })
        setIsEditing(false)
      } else {
        setStatus({
          type: "error",
          message: result.error,
        })
      }
    } catch (error) {
      setStatus({
        type: "error",
        message: "An unexpected error occurred. Please try again.",
      })
    } finally {
      setIsSubmitting(false)

      // Clear status after 3 seconds
      setTimeout(() => {
        setStatus(null)
      }, 3000)
    }
  }

  return (
    <div className="profile-page">
      <Navbar />

      <main className="container profile-container">
        <div className="page-header">
          <h1>Profile</h1>
          <p>View and edit your profile information.</p>
        </div>

        <div className="profile-content">
          <div className="profile-card">
            {status && <div className={`status-message ${status.type}`}>{status.message}</div>}

            <div className="profile-header">
              <div className="profile-avatar">
                {avatarPreview ? (
                  <img src={avatarPreview || "/placeholder.svg"} alt={formData.username} />
                ) : (
                  <div className="avatar-placeholder">{formData.username.charAt(0).toUpperCase()}</div>
                )}

                {isEditing && (
                  <label className="avatar-upload-label">
                    <input type="file" accept="image/*" onChange={handleAvatarChange} className="avatar-upload-input" />
                    <span>Change</span>
                  </label>
                )}
              </div>

              <div className="profile-actions">
                {!isEditing ? (
                  <button className="btn btn-primary" onClick={() => setIsEditing(true)}>
                    Edit Profile
                  </button>
                ) : (
                  <button className="btn btn-secondary" onClick={() => setIsEditing(false)} disabled={isSubmitting}>
                    Cancel
                  </button>
                )}
              </div>
            </div>

            <form onSubmit={handleSubmit} className="profile-form">
              <div className="form-group">
                <label htmlFor="username" className="form-label">
                  Username
                </label>
                <input
                  type="text"
                  id="username"
                  name="username"
                  value={formData.username}
                  onChange={handleChange}
                  className="form-input"
                  disabled={!isEditing || isSubmitting}
                />
              </div>

              <div className="form-group">
                <label htmlFor="email" className="form-label">
                  Email
                </label>
                <input
                  type="email"
                  id="email"
                  name="email"
                  value={formData.email}
                  className="form-input"
                  disabled={true} // Email cannot be changed
                />
              </div>

              <div className="form-group">
                <label htmlFor="bio" className="form-label">
                  Bio
                </label>
                <textarea
                  id="bio"
                  name="bio"
                  value={formData.bio}
                  onChange={handleChange}
                  className="form-input"
                  rows={4}
                  placeholder="Tell us about yourself..."
                  disabled={!isEditing || isSubmitting}
                />
              </div>

              {isEditing && (
                <button type="submit" className="btn btn-primary w-full" disabled={isSubmitting}>
                  {isSubmitting ? "Saving..." : "Save Changes"}
                </button>
              )}
            </form>
          </div>

          <div className="account-settings-card">
            <h2>Account Settings</h2>

            <div className="coming-soon-message">
              <p>Additional account settings will be available soon.</p>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}

export default ProfilePage