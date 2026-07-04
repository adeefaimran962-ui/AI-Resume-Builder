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
const { ensureGuest } = require('../middleware/auth');

// Register
router.get('/register',  ensureGuest, authController.showRegister);
router.post('/register', ensureGuest, authController.register);

// Login
router.get('/login',  ensureGuest, authController.showLogin);
router.post('/login', ensureGuest, authController.login);

// Logout (GET is fine – no state change via form, just a link)
router.get('/logout', authController.logout);

module.exports = router;
