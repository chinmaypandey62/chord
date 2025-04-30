// CORS configuration
const corsConfig = {
  origin: ['http://localhost:3000', 'https://chord-app.onrender.com', 'http://172.16.5.87:3000'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
};

export default corsConfig;