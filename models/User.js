/**
 * models/User.js
 * ----------------------------------------------------------
 * Mongoose schema and model for the Users collection.
 * Passwords are stored as bcrypt hashes — never plain text.
 * ----------------------------------------------------------
 */

const mongoose = require('mongoose');
const bcrypt = require('bcrypt');

const SALT_ROUNDS = 12; // Higher = more secure but slower

const UserSchema = new mongoose.Schema(
  {
    // ── Basic Info ────────────────────────────────────────
    name: {
      type: String,
      required: [true, 'Name is required'],
      trim: true,
      minlength: [2, 'Name must be at least 2 characters'],
      maxlength: [50, 'Name cannot exceed 50 characters'],
    },

    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      trim: true,
      match: [
        /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,})+$/,
        'Please enter a valid email address',
      ],
    },

    password: {
      type: String,
      required: [true, 'Password is required'],
      minlength: [6, 'Password must be at least 6 characters'],
    },

    // ── Password Reset ────────────────────────────────────
    resetPasswordToken: {
      type: String,
      default: null,
    },
    resetPasswordExpires: {
      type: Date,
      default: null,
    },

    // ── Optional Profile ──────────────────────────────────
    avatar: {
      type: String,
      default: '', // URL or filename of profile picture
    },

    // ── Timestamps ────────────────────────────────────────
  },
  {
    timestamps: true, // adds createdAt + updatedAt automatically
  }
);

// ── Pre-save Hook: Hash password before storing ───────────
UserSchema.pre('save', async function (next) {
  // Only hash the password if it has been modified (or is new)
  if (!this.isModified('password')) return next();

  try {
    this.password = await bcrypt.hash(this.password, SALT_ROUNDS);
    next();
  } catch (err) {
    next(err);
  }
});

// ── Instance Method: Compare plain password with hash ─────
UserSchema.methods.matchPassword = async function (enteredPassword) {
  return bcrypt.compare(enteredPassword, this.password);
};

module.exports = mongoose.model('User', UserSchema);
