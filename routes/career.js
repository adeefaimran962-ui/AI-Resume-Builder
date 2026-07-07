/**
 * routes/career.js
 * Career Roadmap Generator Routes
 */
const express = require('express');
const router = express.Router();
const careerController = require('../controllers/careerController');
const { ensureAuthenticated } = require('../middleware/auth');

// Apply authentication middleware to all routes
router.use(ensureAuthenticated);

// Career roadmap routes
router.get('/', careerController.index);
router.post('/generate', careerController.generate);

module.exports = router;