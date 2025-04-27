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
axios.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response) {
      console.error(
        "Axios response error:",
        error.response.status,
        error.response.data
      );
    } else if (error.request) {
      // Show more details for debugging
      console.error(
        "Axios response error: No response received",
        {
          url: error.config?.url,
          method: error.config?.method,
          data: error.config?.data,
          request: error.request
        }
      );
    } else {
      console.error("Axios response error: Request setup error", error.message);
    }
    return Promise.reject(error);
  }
);

export default instance;
