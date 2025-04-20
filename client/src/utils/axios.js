import axios from "axios";

// Create an Axios instance
const instance = axios.create({
  baseURL: `${process.env.NEXT_PUBLIC_API_URL}/api`, // e.g., http://localhost:5000/api
  withCredentials: true, // ✅ Send cookies (for httpOnly JWTs)
});

// Optional: Log outgoing requests for debugging
instance.interceptors.request.use(
  (config) => {
    console.log("Axios interceptor - Request URL:", config.url); // Log request URL
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Log response errors
instance.interceptors.response.use(
  (response) => response,
  (error) => {
    console.error("Axios response error:", error.response?.status, error.response?.data);
    return Promise.reject(error);
  }
);

export default instance;
