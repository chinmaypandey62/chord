import User from '../models/User.js';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

// Helper function to generate JWT token - was missing!
const generateToken = (userId, username) => {
  return jwt.sign(
    { id: userId, username },
    process.env.JWT_SECRET,
    { expiresIn: '7d' }
  );
};

export const register = async (req, res) => {
  try {
    const { username, email, password, name } = req.body; // Assuming 'name' is not part of the User schema based on User.js

    if (!password) {
      return res.status(400).json({ message: "Password is required." });
    }
    if (password.length < 6) { // Add password length validation
        return res.status(400).json({ message: "Password must be at least 6 characters long." });
    }

    const passwordString = password.toString();
    console.log(`[Register] Attempting registration for user: ${username}`);

    // Check if user already exists
    const existingUser = await User.findOne({ $or: [{ email }, { username }] });
    if (existingUser) {
        console.log(`[Register] Failed: User already exists with email ${email} or username ${username}`);
        return res.status(400).json({ message: "User already exists with this email or username." });
    }

    // Create user - password hashing is handled by the pre-save hook in User.js
    const newUser = new User({
      username,
      email,
      password: passwordString,
      // name, // Remove if 'name' is not in the schema
      // friends: [], // 'friends' is not in the schema
    });

    const savedUser = await newUser.save();
    console.log(`[Register] User ${savedUser.username} (${savedUser._id}) created successfully.`);

    // Generate JWT token
    const token = generateToken(savedUser._id, savedUser.username);

    // Set cookie
    res.cookie('token', token, {
      httpOnly: true, // Prevent client-side script access
      secure: process.env.NODE_ENV === 'production', // Use secure cookies in production
      sameSite: 'strict', // Mitigate CSRF attacks
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    });

    // Return user info (excluding password) and token
    res.status(201).json({
      message: 'User registered successfully',
      user: {
        _id: savedUser._id, // Use _id instead of id for consistency
        username: savedUser.username,
        email: savedUser.email,
        profilePicture: savedUser.profilePicture, // Include profile picture
        status: savedUser.status,                 // <-- Include status (will be default 'offline')
        lastSeen: savedUser.lastSeen,             // <-- Include lastSeen (will be default Date.now)
        createdAt: savedUser.createdAt,
        updatedAt: savedUser.updatedAt
      },
      token,
    });
  } catch (error) {
    // Handle potential duplicate key errors during save (though checked above, race condition possible)
    if (error.code === 11000) {
        console.error(`[Register] Duplicate key error:`, error.keyValue);
        const field = Object.keys(error.keyValue)[0];
        return res.status(400).json({ message: `${field.charAt(0).toUpperCase() + field.slice(1)} already exists.` });
    }
    console.error('[Register] Registration error:', error);
    res.status(500).json({ message: 'Server error during registration' });
  }
};

export const login = async (req, res) => {
  try {
    const { usernameOrEmail, password } = req.body;
    
    if (!usernameOrEmail || !password) {
      console.log('[Login] Failed: Missing username/email or password');
      return res.status(400).json({ message: 'Username/email and password are required' });
    }

    // Find user by username or email
    const user = await User.findOne({
      $or: [{ username: usernameOrEmail }, { email: usernameOrEmail }],
    }); // No .select('-password') needed here, as matchPassword needs it

    if (!user) {
      console.log(`[Login] Failed: User not found for ${usernameOrEmail}`);
      return res.status(401).json({ message: 'Invalid credentials' }); // Use generic message
    }

    // Check password using the method defined in User.js
    const isMatch = await user.matchPassword(password);

    if (!isMatch) {
      console.log(`[Login] Failed: Invalid password for ${user.username}`);
      return res.status(401).json({ message: 'Invalid credentials' }); // Use generic message
    }

    // Generate JWT token
    const token = generateToken(user._id, user.username);
    
    // Set token in cookie
    res.cookie('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    });
    
    console.log(`[Login] Success for ${user.username} (${user._id})`);
    console.log(`[Login] Token set in cookie: ${token.substring(0, 15)}...`);
    
    // Return user data and token
    res.status(200).json({
      user: {
        _id: user._id,
        username: user.username,
        email: user.email,
        profilePicture: user.profilePicture,
        status: user.status || 'online',
        lastSeen: user.lastSeen,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt
      },
      token
    });
  } catch (error) {
    console.error(`[Login] Error:`, error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

export const logout = (req, res) => {
  console.log(`[Logout] Clearing token cookie`);
  res.clearCookie('token', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      // path: '/' // Optional: specify path if needed
  });
  res.status(200).json({ message: 'Logged out successfully' }); // Use 200 OK
};

export const checkAuth = async (req, res) => {
  // Remove the token extraction part - rely on middleware
  try {
    // The protect middleware has already verified the token
    // and attached the user to req.user
    const user = req.user;
    
    console.log(`[CheckAuth] User authenticated through middleware: ${user._id}`);
    
    // Return authentication status and user info
    res.status(200).json({
      isAuthenticated: true,
      user: {
        _id: user._id,
        username: user.username,
        email: user.email,
        profilePicture: user.profilePicture,
        status: user.status,         
        lastSeen: user.lastSeen,     
        createdAt: user.createdAt,
        updatedAt: user.updatedAt
      }
    });
  } catch (error) {
    console.error('[CheckAuth] Auth check error:', error.name, error.message);
    return res.status(401).json({ 
      message: 'Authentication error', 
      isAuthenticated: false, 
      error: error.message 
    });
  }
};

export const verifyToken = async (req, res) => {
  try {
    // The protect middleware has already verified the token
    // and attached the user to req.user by this point
    
    // Log successful authentication
    console.log(`[Auth Verify] User ${req.user._id} successfully verified`);
    
    // Return success response
    return res.status(200).json({
      success: true,
      message: 'Token is valid',
      user: {
        _id: req.user._id,
        username: req.user.username,
        email: req.user.email,
        profilePicture: req.user.profilePicture,
        status: req.user.status,
        lastSeen: req.user.lastSeen
      }
    });
  } catch (error) {
    console.error('[Auth Verify] Error:', error);
    return res.status(401).json({
      success: false,
      message: 'Invalid token'
    });
  }
};