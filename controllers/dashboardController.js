/**
 * controllers/dashboardController.js
 * Dashboard with real stats: totalResumes, totalDownloads,
 * templatesUsed, lastUpdated.
 */
const Resume = require('../models/Resume');

exports.index = async (req, res) => {
  try {
    const resumes = await Resume.find({ user: req.session.userId })
      .sort({ updatedAt: -1 }).lean();

    const totalResumes   = resumes.length;
    const totalDownloads = resumes.reduce((s,r) => s + (r.downloadCount||0), 0);
    const templatesUsed  = [...new Set(resumes.map(r => r.template))].length;
    const lastUpdated    = resumes.length > 0
      ? new Date(resumes[0].updatedAt).toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'})
      : 'N/A';

    res.render('dashboard/index', {
      title: 'Dashboard – ResumeAI',
      resumes,
      stats: { totalResumes, totalDownloads, templatesUsed, lastUpdated },
    });
  } catch (err) {
    console.error('Dashboard Error:', err);
    req.flash('error', 'Could not load your resumes.');
    res.redirect('/');
  }
};
