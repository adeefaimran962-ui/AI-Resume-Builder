/**
 * routes/dashboard.js
 * All dashboard routes — protected by ensureAuthenticated.
 *
 *   GET  /dashboard           → dc.index    (active resumes)
 *   GET  /dashboard/trash     → dc.trash    (recycle bin)
 *   GET  /dashboard/profile   → dc.getProfile
 *   POST /dashboard/profile   → dc.updateProfile
 */
'use strict';

const express               = require('express');
const router                = express.Router();
const path                  = require('path');
const multer                = require('multer');
const dc                    = require('../controllers/dashboardController');
const { ensureAuthenticated } = require('../middleware/auth');

/* ── Avatar upload for profile page ─────────────────────────────────── */
const avatarStorage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, path.join(__dirname, '../public/uploads/')),
  filename:    (req, file, cb) =>
    cb(null, req.session.userId + '-' + Date.now() + path.extname(file.originalname)),
});
const uploadAvatar = multer({ storage: avatarStorage });

/* ── Routes ──────────────────────────────────────────────────────────── */
// NOTE: /trash MUST be declared BEFORE any dynamic /:param routes to avoid
// Express treating "trash" as a parameter value.
router.get('/',         ensureAuthenticated, dc.index);
router.get('/trash',    ensureAuthenticated, dc.trash);
router.get('/profile',  ensureAuthenticated, dc.getProfile);
router.post('/profile', ensureAuthenticated, uploadAvatar.single('avatar'), dc.updateProfile);

module.exports = router;
