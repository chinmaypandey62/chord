"use client"

import { useState, useEffect } from "react"
import Link from "next/link" // Changed from react-router-dom
import { useRouter } from "next/navigation" // Changed from react-router-dom
import { useAuth } from "../../context/AuthContext"
import Navbar from "../../components/Navbar/Navbar"
import "./SignUpPage.css"

const SignUpPage = () => {
  const [formData, setFormData] = useState({
    username: "",
    email: "",
    password: "",
    confirmPassword: "",
    name: ""
  })
  const [errors, setErrors] = useState({})
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isClient, setIsClient] = useState(false); // Add isClient state

  const auth = useAuth(); // Get the whole context object
  const router = useRouter() // Changed from useNavigate
  
  // Destructure context safely
  const register = auth?.register;
  const user = auth?.user;
  const authLoading = auth?.loading ?? true; // Default to true if context is undefined

  // Set isClient to true only on the client
  useEffect(() => {
    setIsClient(true);
  }, []);

  // Redirect to dashboard if already authenticated (runs only on client)
  useEffect(() => {
    if (isClient && !authLoading && user) {
      console.log("User already authenticated, redirecting to dashboard")
      router.push("/dashboard") // Changed from navigate
    }
  }, [user, authLoading, router, isClient]); // Updated dependency

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }))

    // Clear error when user types
    if (errors[name]) {
      setErrors((prev) => ({
        ...prev,
        [name]: "",
      }))
    }
  }

  const validateForm = () => {
    const newErrors = {}

    if (!formData.username) {
      newErrors.username = "Username is required"
    } else if (formData.username.length < 3) {
      newErrors.username = "Username must be at least 3 characters"
    }

    if (!formData.name) {
      newErrors.name = "Full name is required"
    }

    if (!formData.email) {
      newErrors.email = "Email is required"
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = "Email address is invalid"
    }

    if (!formData.password) {
      newErrors.password = "Password is required";
    } else if (formData.password.length < 6) {
      newErrors.password = "Password must be at least 6 characters long";
    } else if (formData.password === formData.email) {
      newErrors.password = "Password cannot be the same as email";
    } else if (formData.password === formData.username) {
      newErrors.password = "Password cannot be the same as username";
    } else if (formData.password.includes(" ")) {
      newErrors.password = "Password cannot contain spaces";
    } else if (!/[A-Z]/.test(formData.password)) {
      newErrors.password = "Password must contain at least one uppercase, one lowecase letter and a special character";
    } else if (!/[a-z]/.test(formData.password)) {
      newErrors.password = "Password must contain at least one uppercase, one lowecase letter and a special character";
    } else if (!/[!@#$%^&*(),.?":{}|<>]/.test(formData.password)) {
      newErrors.password = "Password must contain at least one uppercase, one lowecase letter and a special character";
    }

    if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = "Passwords do not match"
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e) => {
    e.preventDefault()

    if (!validateForm()) return

    // Ensure register function is available
    if (!register) {
      setErrors({ general: "Registration service is unavailable." });
      return;
    }

    setIsSubmitting(true)
    console.log(formData)
    try {
      const result = await register({
        username: formData.username,
        email: formData.email,
        password: formData.password,
        name: formData.name
      })

      if (result.success) {
        // Navigate directly to dashboard after successful registration
        router.push("/dashboard") // Changed from navigate
      } else {
        setErrors({ general: result.error || "Registration failed" })
      }
    } catch (error) {
      setErrors({ general: "An unexpected error occurred. Please try again." })
    } finally {
      setIsSubmitting(false)
    }
  }

  // Render loading state until client-side and auth is checked
  if (!isClient || authLoading) {
    return (
      <div className="signup-page loading-state">
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 'calc(100vh - 60px)' }}>
           <p>Loading...</p>
        </div>
      </div>
    )
  }

  // If user is logged in (and redirection is happening), render null briefly
  if (user) return null;

  return (
    <div className="signup-page">
      <Navbar />

      <main className="signup-container">
        <div className="signup-card">
          <h1 className="signup-title">Create an Account</h1>

          {errors.general && <div className="error-message">{errors.general}</div>}

          <form onSubmit={handleSubmit} className="signup-form">
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
                className={`form-input ${errors.username ? "error" : ""}`}
                placeholder="Choose a username"
                disabled={isSubmitting}
              />
              {errors.username && <div className="error-message">{errors.username}</div>}
            </div>

            <div className="form-group">
              <label htmlFor="name" className="form-label">
                Full Name
              </label>
              <input
                type="text"
                id="name"
                name="name"
                value={formData.name}
                onChange={handleChange}
                className={`form-input ${errors.name ? "error" : ""}`}
                placeholder="Enter your full name"
                disabled={isSubmitting}
              />
              {errors.name && <div className="error-message">{errors.name}</div>}
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
                onChange={handleChange}
                className={`form-input ${errors.email ? "error" : ""}`}
                placeholder="Enter your email"
                disabled={isSubmitting}
              />
              {errors.email && <div className="error-message">{errors.email}</div>}
            </div>

            <div className="form-group">
              <label htmlFor="password" className="form-label">
                Password
              </label>
              <input
                type="password"
                id="password"
                name="password"
                value={formData.password}
                onChange={handleChange}
                className={`form-input ${errors.password ? "error" : ""}`}
                placeholder="Create a password"
                disabled={isSubmitting}
              />
              {errors.password && <div className="error-message">{errors.password}</div>}
            </div>

            <div className="form-group">
              <label htmlFor="confirmPassword" className="form-label">
                Confirm Password
              </label>
              <input
                type="password"
                id="confirmPassword"
                name="confirmPassword"
                value={formData.confirmPassword}
                onChange={handleChange}
                className={`form-input ${errors.confirmPassword ? "error" : ""}`}
                placeholder="Confirm your password"
                disabled={isSubmitting}
              />
              {errors.confirmPassword && <div className="error-message">{errors.confirmPassword}</div>}
            </div>

            <button type="submit" className="btn btn-primary w-full" disabled={isSubmitting}>
              {isSubmitting ? "Creating Account..." : "Sign Up"}
            </button>
          </form>

          <div className="signup-footer">
            <p>
              Already have an account? <Link href="/signin">Sign In</Link> {/* Changed to href */}
            </p>
          </div>
        </div>
      </main>
    </div>
  )
}

export default SignUpPage