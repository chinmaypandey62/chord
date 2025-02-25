import mongoose from 'mongoose';

// Define the schema for a user
const userSchema = new mongoose.Schema({
    // Full name of the user
    fullName: {
        type: String,
        required: true,
        trim: true
    },
    // Email address of the user
    email: {
        type: String,
        required: true,
        unique: true,
        trim: true
    },
    // Password of the user
    password: {
        type: String,
        required: true,
        trim: true
    },
    // URL of the user's profile picture
    profilePicture: {
        type: String,
        default: ''
    }, 
    // List of friends (references to other User documents)
    friends: {
        type: [{
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User'
        }],
        default: []
    }
}, {timestamps: true}); // Automatically add createdAt and updatedAt timestamps

// Create a model from the schema
const User = mongoose.model('User', userSchema);

// Export the model to be used in other parts of the application
export default User;
