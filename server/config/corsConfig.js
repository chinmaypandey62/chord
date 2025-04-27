// CORS configuration
const corsConfig = {
  origin: [process.env.CLIENT_URI, process.env.LOCAL_CLIENT_URI],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
};

export default corsConfig;