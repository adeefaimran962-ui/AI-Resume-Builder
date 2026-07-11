/**
 * routes/resume.js
 */
const express                 = require('express');
const router                  = express.Router();
const path                    = require('path');
const multer                  = require('multer');
const rc                      = require('../controllers/resumeController');
const { ensureAuthenticated } = require('../middleware/auth');

/* ── Multer: profile photo upload ─────────────────────────────────────── */
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, path.join(__dirname, '../public/uploads/photos'));
  },
  filename: function (req, file, cb) {
    const ext  = path.extname(file.originalname).toLowerCase();
    const name = 'photo_' + Date.now() + '_' + Math.round(Math.random() * 1e6) + ext;
    cb(null, name);
  },
});

const fileFilter = function (req, file, cb) {
  const allowed = ['.jpg', '.jpeg', '.png', '.webp'];
  const ext = path.extname(file.originalname).toLowerCase();
  if (allowed.includes(ext)) {
    cb(null, true);
  } else {
    cb(new Error('Only JPG, JPEG, PNG, and WebP images are allowed.'), false);
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 2 * 1024 * 1024 }, // 2 MB
});

// Multer error handler — JSON for AJAX, flash+redirect for regular forms
function handleUpload(req, res, next) {
  upload.single('profilePhoto')(req, res, function (err) {
    if (!err) return next();

    const isAjax = req.xhr ||
      (req.headers.accept && req.headers.accept.includes('application/json'));
    let message = 'Upload failed.';
    if (err instanceof multer.MulterError && err.code === 'LIMIT_FILE_SIZE') {
      message = 'Profile photo must be 2 MB or smaller.';
    } else if (err && err.message) {
      message = err.message;
    }

    if (isAjax) return res.status(400).json({ success: false, message });
    req.flash('error', message);
    return res.redirect('back');
  });
}

// All resume routes require login
router.use(ensureAuthenticated);

// ── AI generation ──────────────────────────────────────────────────────
router.post('/ai/generate', rc.aiGenerate);

// ── ATS Checker (static routes MUST come before /:id dynamic routes) ───
router.get('/ats-checker', rc.atsChecker);
router.post('/ats/check',  rc.atsCheck);

// ── Create ─────────────────────────────────────────────────────────────
router.get('/new', rc.showCreateForm);
router.post('/',   rc.create);

// ── Read ───────────────────────────────────────────────────────────────
router.get('/:id/preview',       rc.preview);
router.get('/:id/download',      rc.downloadPDF);
router.get('/:id/download-docx', rc.downloadDOCX);
router.get('/:id/score',         rc.score);
router.get('/:id/share',         rc.share);
router.get('/:id/share/:token', rc.viewShared);
router.get('/:id/match',         rc.renderMatch);
router.post('/:id/match',        rc.calculateMatch);
router.post('/:id/toggle-share', rc.toggleShare);
router.post('/:id/set-template', rc.setTemplate);

// ── Update ─────────────────────────────────────────────────────────────
router.get('/:id/edit', rc.showEditForm);
router.put('/:id',      rc.update);         // plain urlencoded — no file

// ── AJAX Section Management (Individual CRUD for dynamic sections) ────
router.post('/:id/section/:sectionName',            rc.addSectionItem);
router.put('/:id/section/:sectionName/:itemId',     rc.updateSectionItem);
router.delete('/:id/section/:sectionName/:itemId',  rc.deleteSectionItem);
router.post('/:id/section/:sectionName/reorder',    rc.reorderSection);
router.post('/:id/section/:sectionName/:itemId/duplicate', rc.duplicateSectionItem);

// ── Profile photo (dedicated AJAX multipart endpoints) ─────────────────
router.post('/:id/upload-photo', handleUpload, rc.uploadPhoto);
router.post('/:id/remove-photo', rc.removePhoto);

// ── Soft delete → Trash ────────────────────────────────────────────────
router.delete('/:id', rc.destroy);            // moves to trash

// ── Trash actions ──────────────────────────────────────────────────────
router.post('/:id/restore',    rc.restore);          // restore from trash
router.delete('/:id/permanent', rc.destroyPermanent); // permanent delete

// ── Rename & Duplicate ─────────────────────────────────────────────────
router.post('/:id/duplicate', rc.duplicate);
router.post('/:id/rename',    rc.rename);

// ── Version History ─────────────────────────────────────────────────────
router.get('/:id/versions',              rc.listVersions);
router.get('/:id/versions/:versionNumber', rc.previewVersion);
router.post('/:id/versions/:versionNumber/restore', rc.restoreVersion);

module.exports = router;
