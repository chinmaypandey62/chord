import jwt from "jsonwebtoken";
import dotenv from "dotenv";

// Load environment variables from a .env file into process.env
dotenv.config();

// Middleware function to protect routes
const protectRoutes = (req, res, next) => {
    // Get the token from cookies
    const token = req.cookies.jwt;
    
    // If no token is found, return an unauthorized error
    if(!token) {
        return res.status(401).json({message: "Token not found"});
    }
    
    try {
        // Get the secret key from environment variables or use a default value
        const SECRET_KEY = process.env.JWT_SECRET || "i34t0nv39573430m0IYYakj";
        
        // Verify the token using the secret key
        const decoded = jwt.verify(token, SECRET_KEY);
        
        // Attach the decoded user information to the request object
        req.user = decoded;
        
        // Call the next middleware function in the stack
        next();
    } catch (error) {
        // If token verification fails, return an unauthorized error
        return res.status(401).json({message: "Unauthorized Access" + error});
    }
};

// Export the middleware function to be used in other parts of the application
export default protectRoutes;