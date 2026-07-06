/**
 * routes/dashboard.js
 * ----------------------------------------------------------
 * Dashboard routes (all protected by ensureAuthenticated).
 *   GET /dashboard – Main dashboard
 * ----------------------------------------------------------
 */

const express               = require('express');
const router                = express.Router();
const dashboardController   = require('../controllers/dashboardController');
const { ensureAuthenticated } = require('../middleware/auth');
const multer = require('multer');
const path = require('path');

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'public/uploads/')
  },
  filename: function (req, file, cb) {
    cb(null, req.session.userId + '-' + Date.now() + path.extname(file.originalname))
  }
});
const upload = multer({ storage: storage });

router.get('/', ensureAuthenticated, dashboardController.index);
router.get('/profile', ensureAuthenticated, dashboardController.getProfile);
router.post('/profile', ensureAuthenticated, upload.single('avatar'), dashboardController.updateProfile);

module.exports = router;
