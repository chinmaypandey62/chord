import jwt from 'jsonwebtoken';
import User from '../models/User.js';

// Middleware to protect routes - requires authentication
export const protect = async (req, res, next) => {
  try {
    let token;
    
    // Get token from Authorization header or cookies
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
      console.log('[AuthMiddleware] Token from Authorization header:', token.substring(0, 15) + '...');
    } else if (req.cookies && req.cookies.token) {
      token = req.cookies.token;
      console.log('[AuthMiddleware] Token from cookies:', token.substring(0, 15) + '...');
    }
    
    // Check if token exists
    if (!token) {
      console.log('[AuthMiddleware] No token found in request');
      return res.status(401).json({ message: 'Not authorized, no token' });
    }
    
    // Verify token with debug info
    console.log('[AuthMiddleware] Verifying token with JWT_SECRET:', process.env.JWT_SECRET ? 'Secret exists' : 'SECRET MISSING');
    console.log('[AuthMiddleware] Environment:', process.env.NODE_ENV);
    
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      console.log('[AuthMiddleware] Token successfully verified for user:', decoded.id);
      
      // Get user from database
      const user = await User.findById(decoded.id).select('-password');
      if (!user) {
        console.log(`[AuthMiddleware] User not found in database: ${decoded.id}`);
        return res.status(404).json({ message: 'User not found' });
      }
      
      // Set user in request object
      req.user = user;
      next();
    } catch (jwtError) {
      console.error('[AuthMiddleware] JWT verification error:', jwtError.name, jwtError.message);
      // Add more specific error information for debugging
      if (jwtError.name === 'JsonWebTokenError') {
        return res.status(401).json({ 
          message: 'Invalid token', 
          errorType: jwtError.name,
          errorDetails: jwtError.message 
        });
      }
      if (jwtError.name === 'TokenExpiredError') {
        return res.status(401).json({ 
          message: 'Token expired', 
          errorType: jwtError.name,
          expiredAt: jwtError.expiredAt 
        });
      }
      throw jwtError; // Re-throw for the outer catch
    }
  } catch (error) {
    console.error('Auth middleware error:', error);
    res.status(401).json({ message: 'Not authorized', error: error.message });
  }
};
