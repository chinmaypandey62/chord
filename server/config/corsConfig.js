// CORS configuration
const corsConfig = {
  origin: ['http://localhost:3000', 'https://chord-app.onrender.com'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
};

export default corsConfig;