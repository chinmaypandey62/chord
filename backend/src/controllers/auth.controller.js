import User from "../models/user.model.js";
import bcrypt from "bcryptjs";
import cloudinary from "../lib/cloudinary.js";
import generateToken from "../lib/utils.js";

// Controller function for user login
export const loginAuth = async (req, res) => {
    const { email, password } = req.body;
    if(!email || !password) {
      return res.status(404).json({ message: "Please fill in all fields" });
    }

    const user = await User.findOne({ email });

    if(!user) {
      return res.status(404).json({ message: "Invalid Credentials" });
    }

    const isMatch = await bcrypt.compare(password, user.password);

    if(isMatch) {
      generateToken(user._id, res);
      res.status(200).json(user);
    } else { 
      return res.status(404).json({message: "Invalid Credentials"});
    }
};

// Controller function for user registration
export const registerAuth = async (req, res) => {
  try {
    console.log("Registration Started");
    const {fullName, email, password} = req.body;
  
    if(!fullName || !email || !password) {
      return res.status(404).json({ message: "Please fill in all fields" });
    }
  
    if(password.length < 6) {
      return res.status(404).json({ message: "Password must be at least 6 characters" });
    }
  
    const existingUser = await User.findOne({ email });
    if(existingUser) {
      return res.status(404).json({ message: "User already exists" });
    }
  
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);
  
    const newUser = new User({ 
      fullName, 
      email, 
      password: hashedPassword,
   });
    
    if(newUser) {
        generateToken(newUser._id, res);
        await newUser.save();
        return res.status(201).json(newUser);
    }
    return res.status(401).json({message: "Internal Server Error"});
  } catch (error) {
        return res.status(404).json({message: "Error in register controller" + error});
  }
};

// Controller function for user logout
export const logoutAuth = async (req, res) => {
  try {
    res.clearCookie("jwt");
    res.status(200).json({ message: "Logout successful" });
  } catch {
    return res.status(404).json({ message: "Error in logout controller" });
  }
};

// Controller function for updating user profile picture
export const updateProfile = async (req, res) => {
  try {
    const { profilePic } = req.body;

    if (!profilePic) {
      return res.status(404).json({ message: "Please select an image" });
    }

    console.log("Uploading image to Cloudinary...");
    cloudinary.uploader.upload(profilePic, async (err, result) => {
      if (err) {
        console.error("Error uploading image:", err);
        return res.status(404).json({ message: "Error uploading image" });
      }

      console.log("Image uploaded successfully:", result.secure_url);
      const user = await User.findById(req.user._id);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      user.profilePicture = result.secure_url;
      await user.save();
      console.log("User profile updated successfully");
      res.status(200).json(user);
    });
  } catch (error) {
    console.error("Error in update profile controller:", error);
    return res.status(404).json({ message: "Error in update profile controller" });
  }
};

// Controller function to check if the user is authenticated
export const checkAuth = async (req, res) => {
  try {
    res.status(200).json({ message: "User is authenticated" });
  } catch {
    return res.status(404).json({ message: "Error in check auth controller" });
  }
};