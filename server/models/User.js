import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const userSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true,
    unique: true
  },
  email: {
    type: String,
    required: true,
    unique: true
  },
  password: {
    type: String,
    required: true
  },
  profilePicture: {
    type: String,
    default: ''
  },
  status: {
    type: String,
    enum: ['online', 'offline'], // Can only be 'online' or 'offline'
    default: 'offline'          // Default status when a user is created
  },
  lastSeen: {
    type: Date,
    default: Date.now           // Default to the time the user was created
  }
}, { timestamps: true });

// Hash password before saving
userSchema.pre('save', async function(next) {
  //prevents double hashing
  if (!this.isModified('password')) {
    return next();
  }
  
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

// Method to check password
userSchema.methods.matchPassword = async function(enteredPassword) {
  const isMatch = await bcrypt.compare(enteredPassword, this.password);
  console.log(`Password match for user ${this.username}:`, isMatch);
  return isMatch;
};

const User = mongoose.model('User', userSchema);

export default User;