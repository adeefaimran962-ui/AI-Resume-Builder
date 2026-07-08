/**
 * controllers/passwordController.js
 * ----------------------------------------------------------
 * Handles password reset functionality:
 * - Forgot password (request reset link)
 * - Reset password (set new password with token)
 * ----------------------------------------------------------
 */

const crypto = require('crypto');
const User = require('../models/User');

// Generate a secure random token
const generateResetToken = () => {
  return crypto.randomBytes(32).toString('hex');
};

// Hash the token for storage in database
const hashToken = (token) => {
  return crypto.createHash('sha256').update(token).digest('hex');
};

/**
 * GET /auth/forgot-password
 * Renders the forgot password form
 */
exports.showForgotPasswordForm = (req, res) => {
  res.render('auth/forgot-password', {
    title: 'Forgot Password',
    errors: [],
  });
};

/**
 * POST /auth/forgot-password
 * Processes the forgot password request
 * Generates a reset token and sends email
 */
exports.forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.render('auth/forgot-password', {
        title: 'Forgot Password',
        errors: ['Please enter your email address.'],
      });
    }

    // Find user by email
    const user = await User.findOne({ email: email.toLowerCase() });

    // Always show success message even if user doesn't exist (security best practice)
    if (!user) {
      req.flash('success', 'If an account exists with this email, a password reset link has been sent.');
      return res.redirect('/auth/login');
    }

    // Generate reset token
    const resetToken = generateResetToken();
    const hashedToken = hashToken(resetToken);

    // Set token and expiry (15 minutes from now)
    user.resetPasswordToken = hashedToken;
    user.resetPasswordExpires = new Date(Date.now() + 15 * 60 * 1000);
    await user.save();

    // In a real application, you would send an email here using Nodemailer
    // For now, we'll log the token to the console for development
    console.log('═════════════════════════════════════════════════════════');
    console.log('PASSWORD RESET TOKEN (Development Mode)');
    console.log('═════════════════════════════════════════════════════════');
    console.log(`Email: ${user.email}`);
    console.log(`Reset Token: ${resetToken}`);
    console.log(`Reset Link: http://localhost:3000/auth/reset-password/${resetToken}`);
    console.log('═════════════════════════════════════════════════════════');

    // TODO: Implement email sending with Nodemailer
    // const resetUrl = `${process.env.APP_URL || 'http://localhost:3000'}/auth/reset-password/${resetToken}`;
    // await sendPasswordResetEmail(user.email, resetUrl);

    req.flash('success', 'If an account exists with this email, a password reset link has been sent.');
    res.redirect('/auth/login');
  } catch (err) {
    console.error('Forgot Password Error:', err);
    req.flash('error', 'Something went wrong. Please try again.');
    res.redirect('/auth/forgot-password');
  }
};

/**
 * GET /auth/reset-password/:token
 * Renders the reset password form
 * Validates the token before showing the form
 */
exports.showResetPasswordForm = async (req, res) => {
  try {
    const { token } = req.params;
    const hashedToken = hashToken(token);

    // Find user with valid token
    const user = await User.findOne({
      resetPasswordToken: hashedToken,
      resetPasswordExpires: { $gt: Date.now() },
    });

    if (!user) {
      req.flash('error', 'Password reset token is invalid or has expired.');
      return res.redirect('/auth/forgot-password');
    }

    res.render('auth/reset-password', {
      title: 'Reset Password',
      token,
      errors: [],
    });
  } catch (err) {
    console.error('Show Reset Password Form Error:', err);
    req.flash('error', 'Something went wrong. Please try again.');
    res.redirect('/auth/forgot-password');
  }
};

/**
 * POST /auth/reset-password/:token
 * Processes the password reset
 * Validates token and updates password
 */
exports.resetPassword = async (req, res) => {
  try {
    const { token } = req.params;
    const { password, confirmPassword } = req.body;

    // Validation
    if (!password || !confirmPassword) {
      return res.render('auth/reset-password', {
        title: 'Reset Password',
        token,
        errors: ['Please fill in all fields.'],
      });
    }

    if (password !== confirmPassword) {
      return res.render('auth/reset-password', {
        title: 'Reset Password',
        token,
        errors: ['Passwords do not match.'],
      });
    }

    if (password.length < 6) {
      return res.render('auth/reset-password', {
        title: 'Reset Password',
        token,
        errors: ['Password must be at least 6 characters.'],
      });
    }

    const hashedToken = hashToken(token);

    // Find user with valid token
    const user = await User.findOne({
      resetPasswordToken: hashedToken,
      resetPasswordExpires: { $gt: Date.now() },
    });

    if (!user) {
      req.flash('error', 'Password reset token is invalid or has expired.');
      return res.redirect('/auth/forgot-password');
    }

    // Update password and clear reset token
    user.password = password;
    user.resetPasswordToken = null;
    user.resetPasswordExpires = null;
    await user.save();

    req.flash('success', 'Password has been reset successfully. Please log in with your new password.');
    res.redirect('/auth/login');
  } catch (err) {
    console.error('Reset Password Error:', err);
    req.flash('error', 'Something went wrong. Please try again.');
    res.redirect('/auth/forgot-password');
  }
};
