"use client"

import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { useFriends } from "../../context/FriendContext"; // <-- Import useFriends
import Navbar from "../../components/Navbar/Navbar";
import FriendCard from "../../components/FriendCard/FriendCard";
import "./DashboardPage.css";

const DashboardPage = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();

  // Use state from FriendContext
  const { friends, loading, error, fetchFriends } = useFriends(); // <-- Use context state and fetch functions

  // Check authentication status and trigger initial fetch from context
  useEffect(() => {
    if (!authLoading) {
      if (!user) {
        console.log("No user found, redirecting to login page");
        navigate("/signin");
        return;
      }
      console.log("Dashboard - User authenticated:", user);
    }
  }, [user, authLoading, navigate]);

  const handleSearchChange = (e) => {
    setSearchTerm(e.target.value);
  };

  // Log state for debugging
  console.log("Dashboard render - Context Loading:", loading);
  console.log("Dashboard render - Context Friends:", friends);
  console.log("Dashboard render - User:", user);

  // Safe filtering with Array check (using friends from context)
  const filteredFriends = Array.isArray(friends)
    ? friends.filter((friend) =>
        friend?.username?.toLowerCase().includes(searchTerm.toLowerCase())
      )
    : [];

  // Show loading state (use loading from context)
  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-background dark:bg-background flex flex-col">
        <Navbar />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary mx-auto"></div>
            <p className="mt-4 text-xl">Loading dashboard...</p>
          </div>
        </div>
      </div>
    );
  }

  // If not loading and no user (should have been redirected, but as a fallback)
  if (!user) {
    return null; // Or a message indicating redirection
  }

  return (
    <div className="dashboard-page">
      <Navbar />

      <main className="container dashboard-container">
        <div className="dashboard-header">
          <h1>Dashboard</h1>
          <p>Welcome back, {user?.username || "User"}!</p>
        </div>

        <div className="dashboard-search">
          <input
            type="text"
            placeholder="Search friends..."
            value={searchTerm}
            onChange={handleSearchChange}
            className="form-input"
          />
        </div>

        <div className="dashboard-content">
          <div className="friends-section">
            <div className="section-header">
              <h2>Friends</h2>
              <button
                className="btn btn-secondary"
                onClick={() => navigate("/friends")}
              >
                View Friend Requests
              </button>
            </div>

            {error ? (
              <div className="error-state">
                <p>{error}</p>
                <button className="btn btn-primary" onClick={fetchFriends}>
                  Try Again
                </button>
              </div>
            ) : filteredFriends.length === 0 ? (
              <div className="empty-state">
                {searchTerm ? (
                  <p>No friends match your search.</p>
                ) : (
                  <>
                    <p>You don't have any friends yet.</p>
                    <button
                      className="btn btn-primary"
                      onClick={() => navigate("/friends")}
                    >
                      Find Friends
                    </button>
                  </>
                )}
              </div>
            ) : (
              <div className="friends-grid">
                {filteredFriends.map((friend) => (
                  <FriendCard key={friend._id} friend={friend} />
                ))}
              </div>
            )}
          </div>

          <div className="recent-chats-section">
            <div className="section-header">
              <h2>Recent Chats</h2>
            </div>
            <div className="coming-soon-card">
              <h3>Coming Soon!</h3>
              <p>Recent chats will be displayed here.</p>
            </div>
          </div>
        </div>

        <div className="video-call-placeholder">
          <div className="placeholder-content">
            <h2>Video Calling Coming Soon!</h2>
            <p>
              We're working hard to bring you face-to-face conversations with
              your friends.
            </p>
            <button className="btn btn-secondary">Learn More</button>
          </div>
        </div>
      </main>
    </div>
  );
};

export default DashboardPage;