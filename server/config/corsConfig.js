// CORS configuration
const corsConfig = {
  origin: ["https://chord-app.onrender.com", process.env.CLIENT_URI_LOCAL],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
};

export default corsConfig;