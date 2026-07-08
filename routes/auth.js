/**
 * routes/auth.js
 * ----------------------------------------------------------
 * Authentication routes:
 *   GET  /auth/register  – Registration form
 *   POST /auth/register  – Process registration
 *   GET  /auth/login     – Login form
 *   POST /auth/login     – Process login
 *   GET  /auth/logout    – Destroy session
 * ----------------------------------------------------------
 */

const express        = require('express');
const router         = express.Router();
const authController = require('../controllers/authController');
const passwordController = require('../controllers/passwordController');
const { ensureGuest } = require('../middleware/auth');

// Register
router.get('/register',  ensureGuest, authController.showRegister);
router.post('/register', ensureGuest, authController.register);

// Login
router.get('/login',  ensureGuest, authController.showLogin);
router.post('/login', ensureGuest, authController.login);

// Logout (GET is fine – no state change via form, just a link)
router.get('/logout', authController.logout);

// Password Reset
router.get('/forgot-password', ensureGuest, passwordController.showForgotPasswordForm);
router.post('/forgot-password', ensureGuest, passwordController.forgotPassword);
router.get('/reset-password/:token', ensureGuest, passwordController.showResetPasswordForm);
router.post('/reset-password/:token', ensureGuest, passwordController.resetPassword);

module.exports = router;
