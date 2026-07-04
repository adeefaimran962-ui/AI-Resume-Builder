/**
 * routes/resume.js
 * ----------------------------------------------------------
 * Resume CRUD routes (all protected).
 *
 *   GET    /resume/new          – New resume form
 *   POST   /resume              – Create resume
 *   GET    /resume/:id/edit     – Edit resume form
 *   PUT    /resume/:id          – Update resume
 *   DELETE /resume/:id          – Delete resume
 *   GET    /resume/:id/preview  – Preview resume
 *   GET    /resume/:id/download – Download as PDF
 *
 * PUT and DELETE are tunnelled via method-override using
 * the ?_method= query string.
 * ----------------------------------------------------------
 */

const express                 = require('express');
const router                  = express.Router();
const resumeController        = require('../controllers/resumeController');
const { ensureAuthenticated } = require('../middleware/auth');

// Apply auth middleware to every resume route
router.use(ensureAuthenticated);

// New & Create
router.get('/',     resumeController.showCreateForm); // fallback to /resume
router.get('/new',  resumeController.showCreateForm);
router.post('/',    resumeController.create);

// Edit & Update  (PUT tunnelled via method-override)
router.get('/:id/edit', resumeController.showEditForm);
router.put('/:id',      resumeController.update);

// Delete (DELETE tunnelled via method-override)
router.delete('/:id', resumeController.destroy);

// Preview & Download
router.get('/:id/preview',  resumeController.preview);
router.get('/:id/download', resumeController.downloadPDF);

module.exports = router;
