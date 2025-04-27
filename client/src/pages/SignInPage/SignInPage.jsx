"use client"

import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
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
  const navigate = useNavigate();
  const { login, user, loading: authLoading } = useAuth();

  // Redirect to dashboard if already authenticated
  useEffect(() => {
    if (!authLoading && user) {
      console.log("User already authenticated, redirecting to dashboard");
      navigate("/dashboard");
    }
  }, [user, authLoading, navigate]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (error) setError("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
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
        navigate("/dashboard");
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
  if (authLoading || user) {
    return (
      <div className="signin-page loading-state">
        {/* <Navbar /> */}
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
              Don't have an account? <Link to="/signup">Sign Up</Link>
            </p>
          </div>
        </div>
      </main>
    </div>
  );
};

export default SignInPage;