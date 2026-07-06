/**
 * routes/resume.js
 * ─────────────────────────────────────────────────────────
 * FIXES:
 *  - Removed duplicate GET / route (was shadowing GET /new in some cases)
 *  - AI endpoint kept before /:id routes (correct)
 *  - All CRUD routes correctly separated
 * ─────────────────────────────────────────────────────────
 */
const express                 = require('express');
const router                  = express.Router();
const rc                      = require('../controllers/resumeController');
const { ensureAuthenticated } = require('../middleware/auth');

// All resume routes require login
router.use(ensureAuthenticated);

// ── AI generation (POST, AJAX – no :id, must be BEFORE /:id) ──
router.post('/ai/generate', rc.aiGenerate);

// ── Create ─────────────────────────────────────────────────
router.get('/new', rc.showCreateForm);   // Show blank create form
router.post('/',   rc.create);           // Submit new resume

// ── Read ───────────────────────────────────────────────────
router.get('/:id/preview',  rc.preview);     // Preview a resume
router.get('/:id/download', rc.downloadPDF); // Download as PDF
router.get('/:id/download-docx', rc.downloadDOCX); // Download as DOCX
router.get('/:id/score',    rc.score);       // ATS Score Card
router.get('/:id/match',    rc.renderMatch); // Job Match Page
router.post('/:id/match',   rc.calculateMatch); // Job Match Calculate
router.post('/:id/toggle-share', rc.toggleShare); // Toggle Public Sharing

// ── Update ─────────────────────────────────────────────────
router.get('/:id/edit', rc.showEditForm); // Show pre-filled edit form
router.put('/:id',      rc.update);       // Submit edit (method-override converts POST -> PUT)

// ── Delete ─────────────────────────────────────────────────
router.delete('/:id', rc.destroy);        // method-override converts POST -> DELETE

module.exports = router;
