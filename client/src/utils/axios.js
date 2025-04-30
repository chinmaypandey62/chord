import axios from 'axios';

// Always use the hosted backend URL
const API_URL = process.env.NEXT_PUBLIC_API_URL;

// Create axios instance with the hosted backend URL
const instance = axios.create({
  baseURL: `${API_URL}/api`,
  timeout: 10000,
  withCredentials: true // Important for cookies
});

// Add request interceptor to attach the JWT token
instance.interceptors.request.use(
  (config) => {
    // Log request URL for debugging
    console.log('Axios interceptor - Request URL:', config.url);
    
    // Only add Authorization header if we have a token in localStorage
    if (typeof window !== 'undefined') {
      const token = localStorage.getItem('token');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
        console.log('Axios interceptor - Adding Authorization header');
      } else {
        console.log('Axios interceptor - No token found in localStorage');
      }
    }
    
    return config;
  },
  (error) => {
    console.error('Axios request interceptor error:', error);
    return Promise.reject(error);
  }
);

// Add response interceptor for better error handling
instance.interceptors.response.use(
  (response) => response,
  (error) => {
    // Handle 401 Unauthorized errors (expired/invalid token)
    if (error.response && error.response.status === 401) {
      console.log('Axios interceptor - 401 Unauthorized response');
      if (typeof window !== 'undefined') {
        // Clear token from localStorage
        localStorage.removeItem('token');
      }
    }
    return Promise.reject(error);
  }
);

export default instance;
