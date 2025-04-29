"use client";

import { useState, useEffect } from "react";
import { useFriends } from "../../context/FriendContext";  // Import the correct hook name
import Navbar from "../../components/Navbar/Navbar";
import FriendRequestCard from "../../components/FriendRequestCard/FriendRequestCard";
import "./FriendRequestsPage.css";

const FriendRequestsPage = () => {
  // Handle null context during SSR with default values
  const friendsContext = useFriends() || {
    friendRequests: [],
    loading: true,
    error: null,
    fetchFriendRequests: () => {},
    sendRequest: () => Promise.resolve(),
    respondRequest: () => {}
  };
  
  const {
    friendRequests: requests,
    loading,
    error,
    fetchFriendRequests,
    sendRequest,
    respondRequest,
  } = friendsContext;
  
  const [friendEmail, setFriendEmail] = useState("");
  const [sendingRequest, setSendingRequest] = useState(false);
  const [requestStatus, setRequestStatus] = useState(null);
  
  // Make sure fetchFriendRequests is only called on the client side
  useEffect(() => {
    if (typeof window !== 'undefined' && fetchFriendRequests) {
      fetchFriendRequests();
    }
  }, [fetchFriendRequests]);

  const handleSendRequest = async (e) => {
    e.preventDefault();

    if (!friendEmail.trim()) return;

    setSendingRequest(true);
    sendRequest(
      friendEmail,
      () => {
        setFriendEmail("");
        setRequestStatus({
          type: "success",
          message: "Friend request sent successfully!",
        });
        setTimeout(() => setRequestStatus(null), 3000);
      },
      (errorMessage) => {
        setRequestStatus({ type: "error", message: errorMessage });
      }
    ).finally(() => setSendingRequest(false));
  };

  const handleAcceptRequest = (requestId) => respondRequest(requestId, true);
  const handleRejectRequest = (requestId) => respondRequest(requestId, false);

  return (
    <div className="friend-requests-page">
      <Navbar />

      <main className="container friend-requests-container">
        <div className="page-header">
          <h1>Friend Requests</h1>
          <p>Manage your friend requests and add new friends.</p>
        </div>

        <div className="friend-requests-content">
          <div className="send-request-section">
            <h2>Add a Friend</h2>

            <form onSubmit={handleSendRequest} className="send-request-form">
              <div className="form-group">
                <label htmlFor="friendEmail" className="form-label">
                  Friend's Email
                </label>
                <div className="input-with-button">
                  <input
                    type="email"
                    id="friendEmail"
                    value={friendEmail}
                    onChange={(e) => setFriendEmail(e.target.value)}
                    placeholder="Enter your friend's email"
                    className="form-input"
                    disabled={sendingRequest}
                  />
                  <button type="submit" className="btn btn-primary" disabled={sendingRequest}>
                    {sendingRequest ? "Sending..." : "Send Request"}
                  </button>
                </div>
              </div>

              {requestStatus && <div className={`status-message ${requestStatus.type}`}>{requestStatus.message}</div>}
            </form>
          </div>

          <div className="pending-requests-section">
            <h2>Pending Requests</h2>

            {loading ? (
              <div className="loading-state">Loading friend requests...</div>
            ) : error ? (
              <div className="error-state">
                <p>{error}</p>
                <button className="btn btn-primary" onClick={fetchFriendRequests}>
                  Try Again
                </button>
              </div>
            ) : requests && requests.length === 0 ? (
              <div className="empty-state">
                <p>You don't have any pending friend requests.</p>
              </div>
            ) : (
              <div className="requests-list">
                {requests && requests.map((request) => (
                  <FriendRequestCard
                    key={request._id}
                    request={request}
                    onAccept={handleAcceptRequest}
                    onReject={handleRejectRequest}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
};

export default FriendRequestsPage;