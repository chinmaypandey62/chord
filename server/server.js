import express from "express";
import cors from "cors";
import corsConfig from "./config/corsConfig.js";
import connectDB from "./db.js"; // Correct path to db.js
import routes from "./routes/index.js";
import { setupSocketHandlers } from "./sockets/socketHandlers.js";
import { createServer } from "http";
import { Server } from "socket.io";
import cookieParser from "cookie-parser";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const server = createServer(app);
const io = new Server(server, {
  cors: corsConfig,
});

// Connect to MongoDB
connectDB();

// Middleware
app.use(cors(corsConfig));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Mount routes
routes(app);

// Global error handler middleware
app.use((err, req, res, next) => {
  console.error('Global error handler caught:', err);
  const statusCode = err.statusCode || 500;
  const message = err.message || 'Internal Server Error';
  res.status(statusCode).json({ message, error: process.env.NODE_ENV === 'development' ? err.stack : undefined });
});

// Setup socket handlers
setupSocketHandlers(io);

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});
