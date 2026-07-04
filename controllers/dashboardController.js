/**
 * controllers/dashboardController.js
 * ----------------------------------------------------------
 * Renders the main user dashboard showing all resumes
 * belonging to the currently logged-in user.
 * ----------------------------------------------------------
 */

const Resume = require('../models/Resume');

// ── GET /dashboard ────────────────────────────────────────
exports.index = async (req, res) => {
  try {
    // Fetch all resumes owned by the current user, newest first
    const resumes = await Resume.find({ user: req.session.userId })
      .sort({ updatedAt: -1 })
      .lean();

    res.render('dashboard/index', {
      title: 'My Dashboard – AI Resume Builder',
      resumes,
    });
  } catch (err) {
    console.error('Dashboard Error:', err);
    req.flash('error', 'Could not load your resumes. Please try again.');
    res.redirect('/');
  }
};
