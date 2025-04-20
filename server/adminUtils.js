import express from 'express';
import mongoose from 'mongoose';
import User from './models/User.js';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Connect to MongoDB
const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGO_URI);
    console.log(`MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    console.error(`Error: ${error.message}`);
    process.exit(1);
  }
};

// Create express app
const app = express();
app.use(express.json());

// Route to delete a user by email
app.delete('/delete-user/:email', async (req, res) => {
  try {
    const { email } = req.params;
    const result = await User.deleteOne({ email });
    
    if (result.deletedCount === 0) {
      return res.status(404).json({ message: `User with email ${email} not found` });
    }
    
    res.json({ 
      message: `User with email ${email} deleted successfully`,
      result
    });
  } catch (error) {
    res.status(500).json({ message: 'Error deleting user', error: error.message });
  }
});

// Route to register a user directly
app.post('/register-user', async (req, res) => {
  try {
    const { username, email, password, name } = req.body;
    
    // Check if user exists
    const existingUser = await User.findOne({ $or: [{ email }, { username }] });
    if (existingUser) {
      return res.status(400).json({ 
        message: existingUser.email === email ? 'Email already in use' : 'Username already taken' 
      });
    }
    
    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);
    console.log(`Generated hash for '${password}': ${hashedPassword}`);
    
    // Create user directly
    const user = await User.create({
      username,
      email,
      password: hashedPassword, // Already hashed
      name: name || username,
    });
    
    // Verify the hash was stored correctly
    const savedUser = await User.findById(user._id);
    const verifyMatch = await bcrypt.compare(password, savedUser.password);
    
    res.json({
      message: 'User created successfully',
      user: {
        id: user._id,
        username: user.username,
        email: user.email
      },
      verification: {
        hashStored: savedUser.password,
        passwordVerifies: verifyMatch
      }
    });
  } catch (error) {
    res.status(500).json({ message: 'Error creating user', error: error.message });
  }
});

// Start server
const PORT = 5555;
connectDB().then(() => {
  app.listen(PORT, () => {
    console.log(`Admin utility server running on http://localhost:${PORT}`);
  });
});
