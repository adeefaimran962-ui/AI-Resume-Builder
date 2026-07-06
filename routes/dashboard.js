/**
 * routes/dashboard.js
 */
const express               = require('express');
const router                = express.Router();
const dc                    = require('../controllers/dashboardController');
const { ensureAuthenticated } = require('../middleware/auth');
const multer = require('multer');
const path   = require('path');

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, 'public/uploads/'),
  filename:    (req, file, cb) => cb(null, req.session.userId + '-' + Date.now() + path.extname(file.originalname)),
});
const upload = multer({ storage });

router.get('/',         ensureAuthenticated, dc.index);
router.get('/trash',    ensureAuthenticated, dc.trash);
router.get('/profile',  ensureAuthenticated, dc.getProfile);
router.post('/profile', ensureAuthenticated, upload.single('avatar'), dc.updateProfile);

module.exports = router;
