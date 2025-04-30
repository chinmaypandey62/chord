"use client"

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation'; // Replace react-router with Next.js router
import { useAuth } from '../../context/AuthContext';
import { useFriends } from '../../context/FriendContext';
import Navbar from '../../components/Navbar/Navbar';
import FriendCard from '../../components/FriendCard/FriendCard';
import './DashboardPage.css';

const DashboardPage = () => {
  const router = useRouter(); // Use Next.js router
  const { user, loading: authLoading } = useAuth();
  const { friends, loading: friendsLoading, error, fetchFriends } = useFriends();
  const initialFetchDone = useRef(false);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Combine loading states
  const loading = authLoading || friendsLoading;

  // Handle search input changes
  const handleSearchChange = (e) => {
    setSearchTerm(e.target.value);
  };

  // This effect runs only once after user is authenticated
  useEffect(() => {
    // Don't do anything if still loading auth or no user
    if (authLoading || !user) return;
    
    if (!initialFetchDone.current) {
      console.log("Dashboard - Fetching friends...");
      // Small delay to ensure auth context is fully processed
      const timeoutId = setTimeout(() => {
        initialFetchDone.current = true;
        fetchFriends(true);
      }, 300);
      
      return () => clearTimeout(timeoutId);
    }
  }, [user, authLoading, fetchFriends]);

  // Render loading state
  if (loading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner"></div>
        <p>Loading your dashboard...</p>
      </div>
    );
  }

  // Render error state if there's an error
  if (error) {
    return (
      <div className="error-state">
        <p>{error}</p>
        <button onClick={() => fetchFriends(true)}>Retry</button>
      </div>
    );
  }

  // Filter friends based on search term
  const filteredFriends = friends.filter(friend => 
    friend.username?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    friend.email?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Rest of your component remains the same...
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
                onClick={() => router.push("/friends")} // Use router.push instead of navigate
              >
                View Friend Requests
              </button>
            </div>

            {error ? (
              <div className="error-state">
                <p>{error}</p>
                {/* Ensure fetchFriends exists before calling */}
                <button className="btn btn-primary" onClick={() => fetchFriends && fetchFriends()}>
                  Try Again
                </button>
              </div>
            ) : null}

            {filteredFriends.length === 0 ? (
              <div className="empty-state">
                {searchTerm ? (
                  <p>No friends match your search.</p>
                ) : (
                  <>
                    <p>You don't have any friends yet.</p>
                    <button
                      className="btn btn-primary"
                      onClick={() => router.push("/friends")} // Use router.push instead of navigate
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