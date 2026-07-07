/**
 * routes/skillGap.js
 * Skill Gap Analyzer Routes
 */
const express = require('express');
const router = express.Router();
const skillGapController = require('../controllers/skillGapController');
const { ensureAuthenticated } = require('../middleware/auth');

// Apply authentication middleware to all routes
router.use(ensureAuthenticated);

// Skill gap analyzer routes
router.get('/', skillGapController.index);
router.post('/analyze', skillGapController.analyze);

module.exports = router;