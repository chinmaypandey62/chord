// Import necessary modules and models
import User from "../models/user.model.js";
import Message from "../models/message.model.js";
import { v2 as cloudinary } from "cloudinary";


// Controller to add a friend
export const addFriend = async (req, res) => {
  try {
    const { email } = req.body; // Get email from request body
    const receiver = await User.findOne({ email }); // Find user by email

    if (!receiver) {
      return res.status(404).json({ message: "User not found" }); // If user not found, return 404
    }

    const currentUserId = req.user.userId; // Get current user ID from request

    if (!currentUserId) {
      return res.status(401).json({ message: "Unauthorized" }); // If user is not authenticated, return 401
    }

    if (receiver._id.toString() === currentUserId) {
      return res.status(400).json({ message: "You cannot add yourself as a friend" }); // Prevent adding self as friend
    }

    const currentUser = await User.findById(currentUserId); // Find current user by ID

    if (!currentUser) {
      return res.status(404).json({ message: "User not found" }); // If current user not found, return 404
    }

    const isAlreadyFriend = currentUser.friends.includes(receiver._id); // Check if already friends

    if (isAlreadyFriend) {
      return res.status(400).json({ message: "User is already your friend" }); // If already friends, return 400
    }

    // Add each other as friends
    currentUser.friends.push(receiver._id);
    receiver.friends.push(currentUser._id);

    await currentUser.save(); // Save current user
    await receiver.save(); // Save receiver

    res.status(200).json({ message: "Friend added successfully" }); // Return success message

  } catch (error) {
    res.status(500).json({ message: "Internal server error" }); // Handle server error
  }
}

// Controller to get friends of the current user
export const getFriends = async (req, res) => {
  try {
    const currentUserId = req.user.userId; // Get current user ID from request

    if (!currentUserId) {
      return res.status(401).json({ message: "Unauthorized" }); // If user is not authenticated, return 401
    }

    const currentUser = await User.findById(currentUserId); // Find current user by ID

    if (!currentUser) {
      return res.status(404).json({ message: "User not found." }); // If current user not found, return 404
    }

    const friends = await User.find({ _id: { $in: currentUser.friends } }); // Find friends by IDs

    res.status(200).json({ friends }); // Return friends

  } catch (error) {
    res.status(500).json({ message: "Internal server error" }); // Handle server error
  }
}

// Controller to send a message
export const sendMessage = async (req, res) => {
  try {
    let { text, image } = req.body; // Get text and image from request body
    const receiverId = req.params.receiverId; // Get receiver ID from request params
    const senderId = req.user._id; // Get sender ID from request

    if (!senderId) {
      return res.status(401).json({ message: "Unauthorized" }); // If user is not authenticated, return 401
    }

    if (!text && !image) {
      return res.status(400).json({ message: "Message cannot be empty" }); // If message is empty, return 400
    }

    if (!receiverId) {
      return res.status(400).json({ message: "Receiver ID is required" }); // If receiver ID is missing, return 400
    }

    const receiver = await User.findById(receiverId); // Find receiver by ID

    if (!receiver) {
      return res.status(404).json({ message: "Receiver not found" }); // If receiver not found, return 404
    }

    if (!receiver.friends.includes(senderId)) {
      return res.status(400).json({ message: "You can only send messages to your friends" }); // Prevent sending messages to non-friends
    }

    let imageUrl = "";

    if (image) {
      const imageCheck = image.match(/\.(jpeg|jpg|gif|png)$/); // Validate image format
      if (!imageCheck) {
        return res.status(400).json({ message: "Invalid image format" }); // If invalid image format, return 400
      }

      // Upload image to Cloudinary
      cloudinary.uploader.upload(image, async (err, result) => {
        if (err) {
          return res.status(404).json({ message: "Error uploading image" }); // Handle image upload error
        }
        imageUrl = result.secure_url; // Get image URL from Cloudinary
      });
    }

    const message = new Message({ text, image: imageUrl, senderId, receiverId }); // Create new message

    await message.save(); // Save message

    res.status(200).json({ message: "Message sent successfully" }); // Return success message

  } catch (error) {
    res.status(500).json({ message: "Internal server error" }); // Handle server error
  }
}