const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    lowercase: true
  },
  password: {
    type: String,
    required: function() {
      return !this.microsoftId; // Password is required only if not using Microsoft auth
    }
  },
  username: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  microsoftId: {
    type: String,
    unique: true,
    sparse: true
  },
  displayName: String,
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Hash password before saving
userSchema.pre('save', async function(next) {
  if (this.isModified('password') && this.password) {
    this.password = await bcrypt.hash(this.password, 10);
  }
  next();
});

// Method to compare password
userSchema.methods.comparePassword = async function(candidatePassword) {
  if (!this.password) return false;
  return bcrypt.compare(candidatePassword, this.password);
};

// Static method to delete user and cleanup associated data
userSchema.statics.deleteUser = async function(userId) {
  const user = await this.findById(userId);
  if (!user) {
    throw new Error('User not found');
  }

  // Delete user's rooms
  const ChatRoom = require('./ChatRoom');
  await ChatRoom.deleteMany({ createdBy: userId });

  // Remove user from all rooms they're a member of
  await ChatRoom.updateMany(
    { members: userId },
    { $pull: { members: userId } }
  );

  // Finally delete the user
  await user.delete();
  return true;
};

const User = mongoose.model('User', userSchema);

module.exports = User; 