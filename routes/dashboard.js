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

router.get('/', ensureAuthenticated, dashboardController.index);

module.exports = router;
