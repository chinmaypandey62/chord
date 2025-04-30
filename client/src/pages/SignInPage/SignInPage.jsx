"use client"

import { useState, useEffect } from "react";
import Link from "next/link"; // Changed from react-router-dom
import { useRouter } from "next/navigation"; // Changed from react-router-dom
import { useAuth } from "../../context/AuthContext";
import Navbar from "../../components/Navbar/Navbar";
import "./SignInPage.css"; // Import the CSS file

const SignInPage = () => {
  const [formData, setFormData] = useState({
    email: "",
    password: "",
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [isClient, setIsClient] = useState(false);
  const router = useRouter(); // Changed from useNavigate
  
  // Safe access to auth context with fallback
  const auth = useAuth() || {};
  const login = auth.login;
  const user = auth.user;
  const authLoading = auth.loading ?? true;

  // Set isClient to true after mounting
  useEffect(() => {
    setIsClient(true);
  }, []);

  // Redirect to dashboard if already authenticated
  useEffect(() => {
    if (isClient && !authLoading && user) {
      console.log("User already authenticated, redirecting to dashboard");
      router.push("/dashboard"); // Changed from navigate
    }
  }, [user, authLoading, router, isClient]); // Updated dependency

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (error) setError("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Ensure we're on client side and login function exists
    if (!isClient || !login) {
      setError("Login service unavailable");
      return;
    }
    
    setError("");
    setLoading(true);

    if (!formData.email || !formData.password) {
      setError("Please enter both email and password.");
      setLoading(false);
      return;
    }

    const validatePassword = () => {
      if (formData.password.length < 6) {
        setError("Password must be at least 6 characters long.");
        setLoading(false);
        return false;
      }

      if (formData.password === formData.email) {
        setError("Password cannot be the same as email.");
        setLoading(false);
        return false;
      }

      if (formData.password.includes(" ")) {
        setError("Password cannot contain spaces.");
        setLoading(false);
        return false;
      }

      if (!/[A-Z]/.test(formData.password)) {
        setError("Password must contain at least one uppercase letter.");
        setLoading(false);
        return false;
      }

      if (!/[a-z]/.test(formData.password)) {
        setError("Password must contain at least one lowercase letter.");
        setLoading(false);
        return false;
      }

      if (!/[!@#$%^&*(),.?":{}|<>]/.test(formData.password)) {
        setError("Password must contain at least one special character.");
        setLoading(false);
        return false;
      }

      return true;
    };

    if (!validatePassword()) {
      return;
    }

    try {
      const result = await login(formData.email, formData.password);

      if (result.success) {
        console.log("Login successful, navigating to dashboard...");
        router.push("/dashboard"); // Changed from navigate
      } else {
        setError(result.error || "Login failed. Please check your credentials.");
      }
    } catch (err) {
      console.error("Unexpected error during login attempt:", err);
      setError("An unexpected error occurred. Please try again later.");
    } finally {
      setLoading(false);
    }
  };

  // Don't render the form if the user is authenticated and redirection is pending
  if (!isClient || authLoading || user) {
    return (
      <div className="signin-page loading-state">
        <Navbar />
        <div className="loading-spinner"></div>
        <p>Loading...</p>
      </div>
    );
  }

  return (
    <div className="signin-page">
      <Navbar />
      <main className="signin-container">
        <div className="signin-card">
          <h1 className="signin-title">Sign In</h1>

          {error && <div className="error-message">{error}</div>}

          <form onSubmit={handleSubmit} className="signin-form">
            <div className="form-group">
              <label htmlFor="email" className="form-label">
                Email or Username
              </label>
              <input
                type="text"
                id="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                required
                className="form-input"
                placeholder="Enter your email or username"
                disabled={loading}
              />
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
                required
                className="form-input"
                placeholder="Enter your password"
                disabled={loading}
              />
            </div>

            <button type="submit" className="btn btn-primary w-full" disabled={loading}>
              {loading ? "Signing in..." : "Sign In"}
            </button>
          </form>

          <div className="signin-footer">
            <p>
              Don't have an account? <Link href="/signup">Sign Up</Link> {/* Changed to href */}
            </p>
          </div>
        </div>
      </main>
    </div>
  );
};

export default SignInPage;