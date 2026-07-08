/**
 * routes/jobs.js
 * Job Application Tracker Routes
 */
'use strict';

const express = require('express');
const router  = express.Router();
const jobController           = require('../controllers/jobController');
const { ensureAuthenticated } = require('../middleware/auth');

router.use(ensureAuthenticated);

router.get('/',              jobController.index);
router.get('/new',           jobController.showCreateForm);
router.post('/',             jobController.create);
router.get('/:id',           jobController.show);
router.get('/:id/edit',      jobController.showEditForm);
router.put('/:id',           jobController.update);
router.delete('/:id',        jobController.destroy);
router.patch('/:id/status',  jobController.updateStatus);

module.exports = router;