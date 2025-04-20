import friendRoutes from './friendRoutes.js';
import authRoutes from './authRoutes.js'; // Import authRoutes
import roomRoutes from './roomRoutes.js'; // Import roomRoutes
import userRoutes from './userRoutes.js'; // Import userRoutes
// import { protect } from '../middleware/authMiddleware.js'; // Import the protect middleware if needed
// Import other route files as needed


const routes = (app) => {

  // Mount API routes
  app.use('/api/friends', friendRoutes);
  app.use('/api/auth', authRoutes); // Mount authRoutes
  app.use('/api/rooms', roomRoutes)
  app.use('/api/users', userRoutes); // Mount userRoutes
  
  // Simple test route
  app.get('/api', (req, res) => {
    res.json({ message: 'API is running' });
  });
};

export default routes;