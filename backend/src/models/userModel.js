const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'User name is required'],
      trim: true,
    },
    email: {
      type: String,
      required: [
        function () {
          return !this.isGuest;
        },
        'Email is required for registered users',
      ],
      trim: true,
      lowercase: true,
      unique: true,
      sparse: true,
      index: true,
    },
    passwordHash: {
      type: String,
      select: false,
    },
    avatar: {
      type: String,
      default: '',
    },
    isGuest: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

// Hash password before saving user
userSchema.pre('save', async function () {
  if (!this.isModified('passwordHash') || !this.passwordHash) {
    return;
  }
  const salt = await bcrypt.genSalt(10);
  this.passwordHash = await bcrypt.hash(this.passwordHash, salt);
});

// Compare password method
userSchema.methods.comparePassword = async function (enteredPassword) {
  if (!this.passwordHash) return false;
  return await bcrypt.compare(enteredPassword, this.passwordHash);
};

module.exports = mongoose.model('User', userSchema);
