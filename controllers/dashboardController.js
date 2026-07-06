/**
 * controllers/dashboardController.js
 * Dashboard + Trash + Profile controllers.
 */
'use strict';

const Resume      = require('../models/Resume');
const User        = require('../models/User');
const CoverLetter = require('../models/CoverLetter');

/* ─────────────────────────────────────────────────────────────────────────
   GET /dashboard  — Main dashboard (active resumes only)
───────────────────────────────────────────────────────────────────────── */
exports.index = async (req, res) => {
  try {
    const page  = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = 6;
    const skip  = (page - 1) * limit;

    /* Only show active (non-trashed) resumes */
    const baseQuery = { user: req.session.userId, isDeleted: { $ne: true } };

    /* Search */
    if (req.query.search) {
      baseQuery.$or = [
        { title:                      { $regex: req.query.search, $options: 'i' } },
        { 'personalInfo.fullName':    { $regex: req.query.search, $options: 'i' } },
      ];
    }

    /* Template filter */
    if (req.query.template) baseQuery.template = req.query.template;

    /* Sort */
    const sortMap = {
      oldest: { createdAt:  1 },
      newest: { createdAt: -1 },
      score:  { atsScore:  -1 },
    };
    const sortQuery = sortMap[req.query.sort] || { updatedAt: -1 };

    /* Paginated results */
    const [resumes, totalCount] = await Promise.all([
      Resume.find(baseQuery).sort(sortQuery).skip(skip).limit(limit).lean(),
      Resume.countDocuments(baseQuery),
    ]);

    const totalPages = Math.ceil(totalCount / limit);

    /* Global stats — all active resumes (no pagination) */
    const allActive   = await Resume.find({ user: req.session.userId, isDeleted: { $ne: true } }).lean();
    const totalAts    = allActive.reduce((s, r) => s + (r.atsScore || 0), 0);
    const avgAtsScore = allActive.length > 0 ? Math.round(totalAts / allActive.length) : 0;

    const sorted      = allActive.slice().sort((a, b) => b.updatedAt - a.updatedAt);
    const lastUpdated = sorted.length > 0
      ? new Date(sorted[0].updatedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
      : 'N/A';

    const recentActivity = sorted.slice(0, 3).map(r => ({
      text: `Updated "${r.title}"`,
      time: new Date(r.updatedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    }));

    /* Trash badge count */
    const trashCount = await Resume.countDocuments({ user: req.session.userId, isDeleted: true });

    /* Cover letters */
    const coverLetters = await CoverLetter.find({ user: req.session.userId })
      .sort({ updatedAt: -1 })
      .lean();

    return res.render('dashboard/index', {
      title:    'Dashboard – ResumeAI',
      resumes,
      stats: {
        totalResumes:   allActive.length,
        totalDownloads: allActive.reduce((s, r) => s + (r.downloadCount || 0), 0),
      coverLetters,
        avgAtsScore,
        lastUpdated,
      },
      recentActivity,
      trashCount,
      pagination: {
        page,
        totalPages,
        hasNext:    page < totalPages,
        hasPrev:    page > 1,
        totalCount,
      },
      filters: {
        search:   req.query.search   || '',
        template: req.query.template || '',
        sort:     req.query.sort     || 'latest',
      },
    });
  } catch (err) {
    console.error('Dashboard Error:', err);
    req.flash('error', 'Could not load your resumes.');
    return res.redirect('/');
  }
};

/* ─────────────────────────────────────────────────────────────────────────
   GET /dashboard/trash  — Recycle Bin
───────────────────────────────────────────────────────────────────────── */
exports.trash = async (req, res) => {
  try {
    const resumes = await Resume.find({
      user:      req.session.userId,
      isDeleted: true,
    }).sort({ deletedAt: -1 }).lean();

    return res.render('dashboard/trash', {
      title:      'Trash – ResumeAI',
      resumes,
      trashCount: resumes.length,
    });
  } catch (err) {
    console.error('Trash Error:', err);
    req.flash('error', 'Could not load Trash.');
    return res.redirect('/dashboard');
  }
};

/* ─────────────────────────────────────────────────────────────────────────
   Profile
───────────────────────────────────────────────────────────────────────── */
exports.getProfile = async (req, res) => {
  try {
    const user = await User.findById(req.session.userId).lean();
    return res.render('dashboard/profile', {
      title: 'My Profile – ResumeAI',
      user,
    });
  } catch (err) {
    console.error('Profile Error:', err);
    req.flash('error', 'Could not load profile.');
    return res.redirect('/dashboard');
  }
};

exports.updateProfile = async (req, res) => {
  try {
    const { name, email, password } = req.body;
    const user = await User.findById(req.session.userId);

    user.name  = name  || user.name;
    user.email = email || user.email;
    if (password && password.trim() !== '') user.password = password;
    if (req.file) user.avatar = '/uploads/' + req.file.filename;

    await user.save();
    req.session.userName   = user.name;
    req.session.userAvatar = user.avatar;

    req.flash('success', 'Profile updated successfully.');
    return res.redirect('/dashboard/profile');
  } catch (err) {
    console.error('Update Profile Error:', err);
    req.flash('error', 'Error updating profile.');
    return res.redirect('/dashboard/profile');
  }
};
