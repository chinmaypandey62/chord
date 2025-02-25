import jwt from 'jsonwebtoken';

// Function to generate a JWT token and set it as a cookie in the response
const generateToken = (userId, res) => {
    // Generate a JWT token with the userId as the payload and an expiration time of 7 days
    const token = jwt.sign({userId}, process.env.JWT_SECRET_KEY, {expiresIn: "7d"});

    // Set the token as a cookie in the response
    res.cookie("jwt", token, {
        maxAge: 7 * 24 * 60 * 60 * 1000, // Cookie expiration time (7 days)
        httpOnly: true, // Cookie is accessible only by the web server
        sameSite: "strict", // Cookie is sent only to the same site
        secure: process.env.NODE_DEV === "production" ? true : false // Cookie is sent only over HTTPS in production
    });
    
    return token; // Return the generated token
}

// Export the function to be used in other parts of the application
export default generateToken;