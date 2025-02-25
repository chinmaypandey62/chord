import React, { useState, useEffect } from "react";
import styles from "./auth.css";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faUser, faLock, faEnvelope } from "@fortawesome/free-solid-svg-icons";
import {
  faFacebookF,
  faTwitter,
  faGoogle,
  faLinkedinIn,
} from "@fortawesome/free-brands-svg-icons";
import { toast } from "react-hot-toast";
import { useAuthStore } from "../../store/useAuthStore.js";

const AuthPage = () => {
  const [signUpMode, setSignUpMode] = useState(false);
  const [clicked, setClicked] = useState(false);
  const [formData, setFormData] = useState({
    fullName: "",
    email: "",
    password: "",
  });

  const { authUser, isSigningUp, isLoggingIn, login, signup } = useAuthStore();

  useEffect(() => {
    const logoElement = document.querySelector('.header .logo');
    if (signUpMode) {
      logoElement.style.color = '#000';
    } else {
      logoElement.style.color = '#fff';
    }
  }, [signUpMode]);

  const handleSignInClick = () => {
    setSignUpMode(false);
  };

  const handleSignUpClick = () => {
    setSignUpMode(true);
  };

  const validateForm = () => {
    if (signUpMode && !formData.fullName.trim()) {
      toast.error("Full name is required");
      return false;
    }
    if (!formData.email.trim()) {
      toast.error("Email is required");
      return false;
    }
    if (!/\S+@\S+\.\S+/.test(formData.email)) {
      toast.error("Invalid email format");
      return false;
    }
    if (!formData.password) {
      toast.error("Password is required");
      return false;
    }
    if (formData.password.length < 6) {
      toast.error("Password must be at least 6 characters");
      return false;
    }
    return true;
  };

  const handleLoginSubmit = (e) => {
    e.preventDefault();
    setClicked(true);
    if (validateForm()) {
      login(formData.email, formData.password);
    }
  };
  
  const handleSignUpSubmit = (e) => {
    e.preventDefault();
    setClicked(true);
    if (validateForm()) {
      signup(formData.email, formData.password, formData.fullName);
    }
  };

  return (
    <div className={`container ${signUpMode ? "sign-up-mode" : ""}`}>
      <div className="forms-container">
        <div className="signin-signup">
          {/* Sign In Form */}
          <form className="sign-in-form" onSubmit={handleLoginSubmit}>
            <h2 className="title">Sign in</h2>
            <center>
  <p style={{ color: 'black', display: (clicked && authUser == null) ? 'inline' : 'none' }}>
    Invalid Credentials...
  </p>
</center>

            <div className="input-field">
              <input
                type="text"
                placeholder="Enter your email"
                name="email"
                onChange={(elem) => setFormData({ ...formData, email: elem.target.value })}
              />
            </div>
            <div className="input-field">
              <input
                type="password"
                placeholder="Password"
                name="password"
                onChange={(elem) => setFormData({ ...formData, password: elem.target.value })}
              />
            </div>
            <button
              type="submit"
              className="btn solid"
              name="login"
              disabled={isLoggingIn || formData.email === "" || formData.password === ""}
            >
              {isLoggingIn ? "Logging in..." : "Login"}
            </button>
            <p className="social-text">Or Sign in with social platforms</p>
            <div className="social-media">
              <a href="#" className="social-icon">
                <FontAwesomeIcon icon={faFacebookF} />
              </a>
              <a href="#" className="social-icon">
                <FontAwesomeIcon icon={faTwitter} />
              </a>
              <a href="#" className="social-icon">
                <FontAwesomeIcon icon={faGoogle} />
              </a>
              <a href="#" className="social-icon">
                <FontAwesomeIcon icon={faLinkedinIn} />
              </a>
            </div>
          </form>

          {/* Sign Up Form */}
          <form className="sign-up-form" onSubmit={handleSignUpSubmit}>
            <h2 className="title">Sign up</h2>
            <div className="input-field">
              <input
                type="text"
                placeholder="Enter your fullname"
                name="fullName"
                onChange={(elem) => setFormData({ ...formData, fullName: elem.target.value })}
              />
            </div>
            <div className="input-field">
              <input
                type="email"
                placeholder="Email"
                name="email"
                onChange={(elem) => setFormData({ ...formData, email: elem.target.value })}
              />
            </div>
            <div className="input-field">
              <input
                type="password"
                placeholder="Password"
                name="password"
                onChange={(elem) => setFormData({ ...formData, password: elem.target.value })}
              />
            </div>
            <button
              type="submit"
              className="btn"
              disabled={isSigningUp || formData.email === "" || formData.fullName === "" || formData.password === ""}
            >
              {isSigningUp ? "Signing Up..." : "Sign Up"}
            </button>
            <p className="social-text">Or Sign up with social platforms</p>
            <div className="social-media">
              <a href="#" className="social-icon">
                <FontAwesomeIcon icon={faFacebookF} />
              </a>
              <a href="#" className="social-icon">
                <FontAwesomeIcon icon={faTwitter} />
              </a>
              <a href="#" className="social-icon">
                <FontAwesomeIcon icon={faGoogle} />
              </a>
              <a href="#" className="social-icon">
                <FontAwesomeIcon icon={faLinkedinIn} />
              </a>
            </div>
          </form>
        </div>
      </div>

      {/* Panels */}
      <div className="panels-container">
        <div className="panel left-panel">
          <div className="content">
            <h3>New here ?</h3>
            <p>Join us today and explore new possibilities!</p>
            <button
              className="btn transparent"
              id="sign-up-btn"
              onClick={handleSignUpClick}
            >
              Sign up
            </button>
          </div>
          <img
            src="https://i.ibb.co/6HXL6q1/Privacy-policy-rafiki.png"
            className="image"
            alt="Sign Up"
            style={{ filter: "grayscale(100%)" }}
          />
        </div>
        <div className="panel right-panel">
          <div className="content">
            <h3>One of us ?</h3>
            <p>Welcome back! Continue your journey with us.</p>
            <button
              className="btn transparent"
              id="sign-in-btn"
              onClick={handleSignInClick}
            >
              Sign in
            </button>
          </div>
          <img
            src="https://i.ibb.co/nP8H853/Mobile-login-rafiki.png"
            className="image"
            alt="Sign In"
            style={{ filter: "grayscale(100%)" }}
          />
        </div>
      </div>
    </div>
  );
};

export default AuthPage;
