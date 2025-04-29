"use client"

import React, { useEffect, useState } from "react"; // Import useState
import Link from "next/link"; // Changed from react-router-dom
import { useRouter } from "next/navigation"; // Changed from react-router-dom
import { useAuth } from "../../context/AuthContext";
import Navbar from "../../components/Navbar/Navbar";
import HeroAnimation from "../../components/HeroAnimation/HeroAnimation"; // Import HeroAnimation
import "./LandingPage.css";

const LandingPage = () => {
  const auth = useAuth(); // Get the whole context object
  const router = useRouter(); // Changed from useNavigate
  const [isClient, setIsClient] = useState(false); // Add isClient state

  // Destructure context safely
  const user = auth?.user;
  const authLoading = auth?.loading ?? true; // Default to true if context is undefined

  // Set isClient to true only on the client
  useEffect(() => {
    setIsClient(true);
  }, []);

  // Redirect if authenticated (runs only on client)
  useEffect(() => {
    if (isClient && !authLoading && user) {
      console.log("User already authenticated, redirecting to dashboard");
      router.push("/dashboard"); // Changed from navigate
    }
  }, [user, authLoading, router, isClient]); // Updated dependency

  // Render loading state until client-side and auth is checked
  if (!isClient || authLoading) {
    return (
      <div className="landing-page loading-state">
        <Navbar />
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 'calc(100vh - 60px)' }}>
           <p>Loading...</p>
        </div>
      </div>
    );
  }

  // If user is logged in (and redirection is happening), render null briefly
  if (user) return null;

  return (
    <div className="landing-page">
      <Navbar />

      <main>
        <section className="hero">
          <div className="container">
            <div className="hero-content">
              <h1>Connect, Chat, and Watch Together with Chord</h1>
              <p>
                Experience real-time messaging with synchronized YouTube playback. Share moments with friends, no matter
                where they are.
              </p>
              <div className="hero-buttons">
                <Link href="/signup" className="btn btn-primary btn-lg">
                  Get Started
                </Link>
                <Link href="/signin" className="btn btn-secondary btn-lg">
                  Sign In
                </Link>
              </div>
            </div>
            <div className="hero-image">
              <HeroAnimation />
            </div>
          </div>
        </section>

        <section className="features">
          <div className="container">
            <h2 className="section-title">Features</h2>
            <div className="feature-cards">
              <div className="feature-card">
                <div className="feature-icon">
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
                    />
                  </svg>
                </div>
                <h3>Real-time Chat</h3>
                <p>Instant messaging with friends. See when they're typing and never miss a message.</p>
              </div>

              <div className="feature-card">
                <div className="feature-icon">
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z"
                    />
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                </div>
                <h3>YouTube Sync</h3>
                <p>Watch YouTube videos in perfect sync with friends. Play, pause, and seek together.</p>
              </div>

              <div className="feature-card">
                <div className="feature-icon">
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"
                    />
                  </svg>
                </div>
                <h3>Video Calling</h3>
                <p>Coming soon! Face-to-face conversations with friends will make Chord even better.</p>
              </div>
            </div>
          </div>
        </section>

        <section className="cta">
          <div className="container">
            <h2>Ready to get started?</h2>
            <p>Join Chord today and start connecting with friends in a whole new way.</p>
            <Link href="/signup" className="btn btn-primary btn-lg">
              Sign Up Now
            </Link>
          </div>
        </section>
      </main>

      <footer className="footer">
        <div className="container">
          <div className="footer-content">
            <div className="footer-logo">
              <h2>Chord</h2>
              <p>Connect. Chat. Watch.</p>
            </div>

            <div className="footer-links">
              <div className="footer-links-column">
                <h3>Company</h3>
                <ul>
                  <li>
                    <a href="/">About Us</a>
                  </li>
                  <li>
                    <a href="/">Careers</a>
                  </li>
                  <li>
                    <a href="/">Contact</a>
                  </li>
                </ul>
              </div>

              <div className="footer-links-column">
                <h3>Legal</h3>
                <ul>
                  <li>
                    <a href="/">Privacy Policy</a>
                  </li>
                  <li>
                    <a href="/">Terms of Service</a>
                  </li>
                  <li>
                    <a href="/">Cookie Policy</a>
                  </li>
                </ul>
              </div>
            </div>
          </div>

          <div className="footer-bottom">
            <p>&copy; {new Date().getFullYear()} Chord. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;