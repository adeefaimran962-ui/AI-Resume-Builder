/**
 * controllers/dashboardController.js
 */
const Resume = require('../models/Resume');
const User   = require('../models/User');

/* ── Dashboard index ─────────────────────────────────────────────────── */
exports.index = async (req, res) => {
  try {
    const page  = parseInt(req.query.page, 10) || 1;
    const limit = 6;
    const skip  = (page - 1) * limit;

    // Active (non-deleted) resumes only
    const query = { user: req.session.userId, isDeleted: { $ne: true } };

    if (req.query.search) {
      query.$or = [
        { title: { $regex: req.query.search, $options: 'i' } },
        { 'personalInfo.fullName': { $regex: req.query.search, $options: 'i' } },
      ];
    }
    if (req.query.template) query.template = req.query.template;

    let sortQuery = { updatedAt: -1 };
    if      (req.query.sort === 'oldest') sortQuery = { createdAt:  1 };
    else if (req.query.sort === 'newest') sortQuery = { createdAt: -1 };
    else if (req.query.sort === 'score')  sortQuery = { atsScore:  -1 };

    const resumes    = await Resume.find(query).sort(sortQuery).skip(skip).limit(limit).lean();
    const totalCount = await Resume.countDocuments(query);
    const totalPages = Math.ceil(totalCount / limit);

    // Global stats (active only)
    const allActive      = await Resume.find({ user: req.session.userId, isDeleted: { $ne: true } }).lean();
    const totalResumes   = allActive.length;
    const totalDownloads = allActive.reduce((s, r) => s + (r.downloadCount || 0), 0);
    const totalAts       = allActive.reduce((s, r) => s + (r.atsScore || 0), 0);
    const avgAtsScore    = totalResumes > 0 ? Math.round(totalAts / totalResumes) : 0;
    const lastUpdated    = allActive.length > 0
      ? new Date(allActive.sort((a, b) => b.updatedAt - a.updatedAt)[0].updatedAt)
          .toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
      : 'N/A';

    const recentActivity = allActive
      .sort((a, b) => b.updatedAt - a.updatedAt)
      .slice(0, 3)
      .map(r => ({
        text: `Updated "${r.title}"`,
        time: new Date(r.updatedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      }));

    // Trash count badge for sidebar
    const trashCount = await Resume.countDocuments({ user: req.session.userId, isDeleted: true });

    res.render('dashboard/index', {
      title: 'Dashboard – ResumeAI',
      resumes,
      stats: { totalResumes, totalDownloads, lastUpdated, avgAtsScore },
      recentActivity,
      trashCount,
      pagination: { page, totalPages, hasNext: page < totalPages, hasPrev: page > 1, totalCount },
      filters: {
        search:   req.query.search   || '',
        template: req.query.template || '',
        sort:     req.query.sort     || 'latest',
      },
    });
  } catch (err) {
    console.error('Dashboard Error:', err);
    req.flash('error', 'Could not load your resumes.');
    res.redirect('/');
  }
};

/* ── Trash / Recycle Bin ─────────────────────────────────────────────── */
exports.trash = async (req, res) => {
  try {
    const trashedResumes = await Resume.find({
      user:      req.session.userId,
      isDeleted: true,
    }).sort({ deletedAt: -1 }).lean();

    res.render('dashboard/trash', {
      title:    'Trash – ResumeAI',
      resumes:  trashedResumes,
      trashCount: trashedResumes.length,
    });
  } catch (err) {
    console.error('Trash Error:', err);
    req.flash('error', 'Could not load trash.');
    res.redirect('/dashboard');
  }
};

/* ── Profile ─────────────────────────────────────────────────────────── */
exports.getProfile = async (req, res) => {
  try {
    const user = await User.findById(req.session.userId);
    res.render('dashboard/profile', {
      title: 'My Profile – ResumeAI',
      user,
    });
  } catch (err) {
    console.error('Profile Error:', err);
    req.flash('error', 'Could not load profile.');
    res.redirect('/dashboard');
  }
};

exports.updateProfile = async (req, res) => {
  try {
    const { name, email, password } = req.body;
    const user = await User.findById(req.session.userId);

    user.name  = name;
    user.email = email;
    if (password) user.password = password;
    if (req.file) user.avatar = '/uploads/' + req.file.filename;

    await user.save();
    req.session.userName   = user.name;
    req.session.userAvatar = user.avatar;

    req.flash('success', 'Profile updated successfully.');
    res.redirect('/dashboard/profile');
  } catch (err) {
    console.error('Update Profile Error:', err);
    req.flash('error', 'Error updating profile.');
    res.redirect('/dashboard/profile');
  }
};
