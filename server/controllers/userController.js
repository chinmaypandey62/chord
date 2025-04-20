import User from '../models/User.js';

// @desc    Get user profile
// @route   GET /api/users/profile  (Assuming route is /api/users/profile based on AuthContext)
// @access  Private
const getUserProfile = async (req, res) => {
  // req.user is attached by the protect middleware, contains at least _id
  try {
    // Fetch the user from DB using the ID from the token to ensure we get all fields
    const user = await User.findById(req.user._id).select('-password'); // Exclude password

    if (user) {
      console.log(`[getUserProfile] Found profile for user ${user._id}`);
      res.json({
        _id: user._id,
        username: user.username,
        email: user.email,
        profilePicture: user.profilePicture, // Include profile picture
        status: user.status,                 // <-- Include status
        lastSeen: user.lastSeen,             // <-- Include lastSeen
        createdAt: user.createdAt,           // Optional: include timestamps
        updatedAt: user.updatedAt
      });
    } else {
      // This case should be rare if protect middleware worked, but handle it
      console.log(`[getUserProfile] User not found in DB for ID: ${req.user._id}`);
      res.status(404).json({ message: 'User not found' });
    }
  } catch (error) {
      console.error(`[getUserProfile] Error fetching profile for user ${req.user._id}:`, error);
      res.status(500).json({ message: 'Server error fetching profile' });
  }
};

// @desc    Update user profile
// @route   PUT /api/users/profile (Assuming route is /api/users/profile based on AuthContext)
// @access  Private
const updateUserProfile = async (req, res) => {
    try {
        const user = await User.findById(req.user._id);

        if (user) {
            console.log(`[updateUserProfile] Updating profile for user ${user._id}`);
            // Update fields based on request body
            user.username = req.body.username || user.username; // Allow username update
            user.email = req.body.email || user.email; // Allow email update
            user.profilePicture = req.body.profilePicture || user.profilePicture; // Allow profile picture update

            // Handle password update separately if provided
            if (req.body.password) {
                if (req.body.password.length < 6) { // Example validation
                   return res.status(400).json({ message: 'Password must be at least 6 characters long' });
                }
                console.log(`[updateUserProfile] Updating password for user ${user._id}`);
                // The pre-save hook in User.js will handle hashing
                user.password = req.body.password;
            }

            // Note: You might want to add validation here (e.g., check if email/username is already taken by another user)

            const updatedUser = await user.save(); // Save triggers pre-save hooks (like password hashing)
            console.log(`[updateUserProfile] Profile updated successfully for user ${updatedUser._id}`);

            res.json({
                _id: updatedUser._id,
                username: updatedUser.username,
                email: updatedUser.email,
                profilePicture: updatedUser.profilePicture,
                status: updatedUser.status,         // <-- Include status
                lastSeen: updatedUser.lastSeen,     // <-- Include lastSeen
                createdAt: updatedUser.createdAt,   // Optional: include timestamps
                updatedAt: updatedUser.updatedAt
                // DO NOT send back the password hash
            });
        } else {
            console.log(`[updateUserProfile] User not found for ID: ${req.user._id}`);
            res.status(404).json({ message: 'User not found' });
        }
    } catch (error) {
         // Handle potential duplicate key errors (e.g., username/email already exists)
         if (error.code === 11000) {
             console.error(`[updateUserProfile] Duplicate key error for user ${req.user._id}:`, error.keyValue);
             // Determine which field caused the error
             const field = Object.keys(error.keyValue)[0];
             return res.status(400).json({ message: `${field.charAt(0).toUpperCase() + field.slice(1)} already exists.` });
         }
        console.error(`[updateUserProfile] Error updating profile for user ${req.user._id}:`, error);
        res.status(500).json({ message: 'Server error updating profile' });
    }
};


export { getUserProfile, updateUserProfile };
