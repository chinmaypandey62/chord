import React from 'react';
import { Avatar, AvatarFallback, AvatarImage } from "../../../components/ui/avatar";
import { Button } from "../../../components/ui/button";
import { formatDistanceToNow } from 'date-fns'; // Import date-fns
import "./FriendRequestCard.css";

// Helper function to safely format dates
const safeFormatDate = (dateString) => {
  if (!dateString) return 'recently';
  try {
    const date = new Date(dateString);
    // Check if the date is valid
    if (isNaN(date.getTime())) {
      return 'recently';
    }
    return formatDistanceToNow(date, { addSuffix: true });
  } catch (e) {
    return 'recently';
  }
};

const FriendRequestCard = ({ request, onAccept, onReject }) => {
  // Check if request and sender exist
  if (!request || !request.sender) {
    return <div className="friend-request-card error">Invalid request data</div>;
  }

  const { sender, createdAt, _id: requestId } = request;
  const isOnline = sender.status === 'online';
  
  // Get initials for avatar fallback
  const getInitials = () => {
    return sender.username?.substring(0, 2).toUpperCase() || '??';
  };

  return (
    <div className="friend-request-card">
      <div className="card-content">
        <div className="avatar-container">
          <Avatar className="user-avatar">
            <AvatarImage src={sender.profilePicture || undefined} alt={sender.username} />
            <AvatarFallback>{getInitials()}</AvatarFallback>
          </Avatar>
          <span
            className={`avatar-status ${isOnline ? 'online' : 'offline'}`}
          ></span>
        </div>
        
        <div className="user-info">
          <div className="display-name">{sender.username}</div>
          <div className="username">@{sender.username}</div>
          <div className="request-time">Sent {safeFormatDate(createdAt)}</div>
        </div>
      </div>
      
      <div className="button-container">
        <button className="action-btn reject" onClick={() => onReject(requestId)}>
          Reject
        </button>
        <button className="action-btn accept" onClick={() => onAccept(requestId)}>
          Accept
        </button>
      </div>
    </div>
  );
};

export default FriendRequestCard;