import mongoose from "mongoose";

const roomSchema = new mongoose.Schema({
  name: { type: String },
  isPrivate: { type: Boolean, default: false },
  isDirectMessage: { type: Boolean, default: false }, // <-- Add this line
  admin: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  members: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
  pendingRequests: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
});

const Room = mongoose.model("Room", roomSchema);

export default Room;