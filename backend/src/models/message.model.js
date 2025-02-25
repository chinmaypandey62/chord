import mongoose from "mongoose";
import User from "./user.model.js";

// Define the schema for a message
const messageSchema = new mongoose.Schema(
    {
        // Text content of the message
        text: {
            type: String,
        },
        // URL of the image attached to the message
        image: {
            type: String,
        },
        // ID of the user who sent the message
        senderId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: User,
            required: true,
        },
        // ID of the user who received the message
        receiverId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: User,
            required: true,
        },
    },
    {
        // Automatically add createdAt and updatedAt timestamps
        timestamps: true,
    }
);

// Create a model from the schema
const Message = mongoose.model("Message", messageSchema);

// Export the model to be used in other parts of the application
export default Message;