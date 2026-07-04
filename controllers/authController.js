/**
 * controllers/authController.js
 * ----------------------------------------------------------
 * Handles all authentication logic:
 *   - showRegister  : Render the registration page
 *   - register      : Process new user sign-up
 *   - showLogin     : Render the login page
 *   - login         : Process login credentials
 *   - logout        : Destroy session and redirect
 * ----------------------------------------------------------
 */

const User = require('../models/User');

// ── Show Registration Page ────────────────────────────────
exports.showRegister = (req, res) => {
  res.render('auth/register', {
    title: 'Create Account – AI Resume Builder',
    errors: [],
    formData: {},
  });
};

// ── Process Registration ──────────────────────────────────
exports.register = async (req, res) => {
  const { name, email, password, confirmPassword } = req.body;

  // ── Server-side validation ────────────────────────────
  const errors = [];

  if (!name || name.trim().length < 2) {
    errors.push('Name must be at least 2 characters.');
  }
  if (!email || !/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,})+$/.test(email)) {
    errors.push('Please enter a valid email address.');
  }
  if (!password || password.length < 6) {
    errors.push('Password must be at least 6 characters.');
  }
  if (password !== confirmPassword) {
    errors.push('Passwords do not match.');
  }

  if (errors.length > 0) {
    return res.status(400).render('auth/register', {
      title: 'Create Account – AI Resume Builder',
      errors,
      formData: { name, email },
    });
  }

  try {
    // Check for existing account
    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      return res.status(400).render('auth/register', {
        title: 'Create Account – AI Resume Builder',
        errors: ['An account with this email already exists.'],
        formData: { name, email },
      });
    }

    // Create and save the new user (password is hashed by pre-save hook)
    const user = await User.create({ name: name.trim(), email: email.toLowerCase(), password });

    // Auto-login after registration
    req.session.userId = user._id;

    req.flash('success', `Welcome, ${user.name}! Your account has been created.`);
    res.redirect('/dashboard');
  } catch (err) {
    console.error('Register Error:', err);
    res.status(500).render('auth/register', {
      title: 'Create Account – AI Resume Builder',
      errors: ['Something went wrong. Please try again.'],
      formData: { name, email },
    });
  }
};

// ── Show Login Page ───────────────────────────────────────
exports.showLogin = (req, res) => {
  res.render('auth/login', {
    title: 'Sign In – AI Resume Builder',
    errors: [],
    formData: {},
  });
};

// ── Process Login ─────────────────────────────────────────
exports.login = async (req, res) => {
  const { email, password } = req.body;

  // Basic presence validation
  const errors = [];
  if (!email) errors.push('Email is required.');
  if (!password) errors.push('Password is required.');

  if (errors.length > 0) {
    return res.status(400).render('auth/login', {
      title: 'Sign In – AI Resume Builder',
      errors,
      formData: { email },
    });
  }

  try {
    // Look up user by email
    const user = await User.findOne({ email: email.toLowerCase() });

    if (!user) {
      return res.status(401).render('auth/login', {
        title: 'Sign In – AI Resume Builder',
        errors: ['Invalid email or password.'],
        formData: { email },
      });
    }

    // Compare entered password with hashed password
    const isMatch = await user.matchPassword(password);
    if (!isMatch) {
      return res.status(401).render('auth/login', {
        title: 'Sign In – AI Resume Builder',
        errors: ['Invalid email or password.'],
        formData: { email },
      });
    }

    // Successful login – store userId in session
    req.session.userId = user._id;

    req.flash('success', `Welcome back, ${user.name}!`);

    // Redirect to originally requested URL if saved, else dashboard
    const redirectTo = req.session.returnTo || '/dashboard';
    delete req.session.returnTo;
    res.redirect(redirectTo);
  } catch (err) {
    console.error('Login Error:', err);
    res.status(500).render('auth/login', {
      title: 'Sign In – AI Resume Builder',
      errors: ['Something went wrong. Please try again.'],
      formData: { email },
    });
  }
};

// ── Logout ────────────────────────────────────────────────
exports.logout = (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      console.error('Logout Error:', err);
    }
    res.redirect('/auth/login');
  });
};
