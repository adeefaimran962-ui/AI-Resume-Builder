/**
 * routes/jobs.js
 * Job Application Tracker Routes
 */
const express = require('express');
const router = express.Router();
const jobController = require('../controllers/jobController');
const { ensureAuthenticated } = require('../middleware/auth');

// Apply authentication middleware to all routes
router.use(ensureAuthenticated);

// Job tracker routes
router.get('/', jobController.index);
router.get('/new', jobController.showCreateForm);
router.post('/', jobController.create);
router.get('/:id', jobController.show);
router.get('/:id/edit', jobController.showEditForm);
router.put('/:id', jobController.update);
router.delete('/:id', jobController.destroy);

module.exports = router;