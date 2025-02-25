import { useState, useEffect } from "react";
import { useAuthStore } from "../../store/useAuthStore.js"
import { Camera, Mail, User } from "lucide-react";
import "./ProfilePage.css"; // Importing the CSS file

const resizeImage = (file, maxWidth, maxHeight, callback) => {
  const reader = new FileReader();
  reader.readAsDataURL(file);

  reader.onload = (event) => {
    const img = new Image();
    img.src = event.target.result;

    img.onload = () => {
      const canvas = document.createElement("canvas");
      let width = img.width;
      let height = img.height;

      if (width > height) {
        if (width > maxWidth) {
          height *= maxWidth / width;
          width = maxWidth;
        }
      } else {
        if (height > maxHeight) {
          width *= maxHeight / height;
          height = maxHeight;
        }
      }

      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d");
      ctx.drawImage(img, 0, 0, width, height);

      canvas.toBlob(callback, "image/jpeg", 0.7);
    };
  };
};

const ProfilePage = () => {
  const { authUser, isUpdatingProfile, updateProfile } = useAuthStore();
  console.log(`user: ${authUser}`);

  const [selectedImg, setSelectedImg] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 1000);

    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    // Force re-render when authUser changes
    setSelectedImg(authUser?.profilePic);
  }, [authUser]);

  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    resizeImage(file, 800, 800, async (blob) => {
      const reader = new FileReader();
      reader.readAsDataURL(blob);

      reader.onload = async () => {
        const base64Image = reader.result;
        setSelectedImg(base64Image);
        await updateProfile({ profilePic: base64Image });
      };
    });
  };

  if (isLoading || !authUser) {
    return <div>Loading...</div>;
  }

  return (
    
    <div className="profile-container">
      <div className="profile-content">
        <div className="profile-card">
          <div className="profile-header">
            <h1>Profile</h1>
            <p>Your profile information</p>
          </div>

          {/* Avatar upload section */}
          <div className="avatar-section">
            <div className="avatar-wrapper">
              <img
                src={selectedImg || authUser.profilePic || "/avatar.png"}
                alt="Profile"
                className="avatar-img"
                style={{filter: "grayscale(100%)"}}
              />
              <label
                htmlFor="avatar-upload"
                className={`camera-icon ${isUpdatingProfile ? "disabled" : ""}`}
              >
                <Camera className="icon" />
                <input
                  type="file"
                  id="avatar-upload"
                  className="hidden-input"
                  accept="image/*"
                  onChange={handleImageUpload}
                  disabled={isUpdatingProfile}
                />
              </label>
            </div>
            <p className="upload-status">
              {isUpdatingProfile ? "Uploading..." : "Click the camera icon to update your photo"}
            </p>
          </div>

          <div className="info-section">
            <div className="info-box">
              <div className="info-label">
                <User className="info-icon" />
                Full Name
              </div>
              <p className="info-text">{authUser?.fullName}</p>
            </div>

            <div className="info-box">
              <div className="info-label">
                <Mail className="info-icon" />
                Email Address
              </div>
              <p className="info-text">{authUser?.email}</p>
            </div>
          </div>

          <div className="account-info">
            <h2>Account Information</h2>
            <div className="account-details">
              <div className="account-row">
                <span>Member Since</span>
                <span>{authUser.createdAt?.split("T")[0]}</span>
              </div>
              <div className="account-row">
                <span>Account Status</span>
                <span className="status-active">Active</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProfilePage;
