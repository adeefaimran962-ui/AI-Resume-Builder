/**
 * routes/interview.js
 * Interview Questions Generator Routes
 */
const express = require('express');
const router = express.Router();
const interviewController = require('../controllers/interviewController');
const { ensureAuthenticated } = require('../middleware/auth');

// Apply authentication middleware to all routes
router.use(ensureAuthenticated);

// Interview questions routes
router.get('/', interviewController.index);
router.post('/generate', interviewController.generate);

module.exports = router;