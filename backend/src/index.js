// Import necessary modules and packages
import express from "express";
import dotenv from "dotenv";
import cookieParser from "cookie-parser";
import connectDB from "./db/mongodb.js";
import cors from "cors";

// Import route handlers
import authRoutes from "./routes/auth.routes.js";
import messageRoutes from "./routes/message.routes.js";

// Create an instance of the Express application
const app = express();

// Load environment variables from a .env file into process.env
dotenv.config();

// Set cors policy
app.use(cors({ origin: true, credentials: true }));
// Middleware to parse JSON bodies
app.use(express.json());
// Middleware to parse cookies
app.use(cookieParser());
// Route for authentication-related requests
app.use("/api/auth", authRoutes);
// Route for message-related requests
app.use("/api/message", messageRoutes);

// Define the port number from environment variables or default to 3000
const PORT = process.env.PORT || 5000;

// Start the server and listen on the defined port
app.listen(PORT, "0.0.0.0", () => {
  console.log(`Server is running on port: ${PORT}`);
  // Connect to the MongoDB database
  connectDB();
});
