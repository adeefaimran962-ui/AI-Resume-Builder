/**
 * controllers/dashboardController.js
 * Dashboard with real stats: totalResumes, totalDownloads,
 * templatesUsed, lastUpdated.
 */
const Resume = require('../models/Resume');

exports.index = async (req, res) => {
  try {
    const page = parseInt(req.query.page, 10) || 1;
    const limit = 6; // Resumes per page
    const skip = (page - 1) * limit;

    const query = { user: req.session.userId };

    // Search filter
    if (req.query.search) {
      query.$or = [
        { title: { $regex: req.query.search, $options: 'i' } },
        { 'personalInfo.fullName': { $regex: req.query.search, $options: 'i' } }
      ];
    }

    // Template filter
    if (req.query.template) {
      query.template = req.query.template;
    }

    // Sorting
    let sortQuery = { updatedAt: -1 };
    if (req.query.sort === 'oldest') {
      sortQuery = { createdAt: 1 };
    } else if (req.query.sort === 'score') {
      sortQuery = { atsScore: -1 };
    } else if (req.query.sort === 'latest') {
      sortQuery = { updatedAt: -1 };
    }

    // Fetch resumes with pagination and sorting
    const resumes = await Resume.find(query)
      .sort(sortQuery)
      .skip(skip)
      .limit(limit)
      .lean();

    // Total count for query
    const totalCount = await Resume.countDocuments(query);
    const totalPages = Math.ceil(totalCount / limit);

    // Global stats across ALL user resumes (without pagination limits)
    const allResumes = await Resume.find({ user: req.session.userId }).lean();
    const totalResumes = allResumes.length;
    const totalDownloads = allResumes.reduce((s, r) => s + (r.downloadCount || 0), 0);
    const templatesUsed = [...new Set(allResumes.map(r => r.template))].length;
    
    // Average ATS Score
    const totalAts = allResumes.reduce((s, r) => s + (r.atsScore || 0), 0);
    const avgAtsScore = totalResumes > 0 ? Math.round(totalAts / totalResumes) : 0;

    const lastUpdated = allResumes.length > 0
      ? new Date(allResumes.sort((a,b) => b.updatedAt - a.updatedAt)[0].updatedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
      : 'N/A';

    // Recent Activity (we can just format a list of the last 3 updated/created actions)
    const recentActivity = allResumes
      .sort((a, b) => b.updatedAt - a.updatedAt)
      .slice(0, 3)
      .map(r => ({
        text: `Updated "${r.title}"`,
        time: new Date(r.updatedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
      }));

    res.render('dashboard/index', {
      title: 'Dashboard – ResumeAI',
      resumes,
      stats: { totalResumes, totalDownloads, templatesUsed, lastUpdated, avgAtsScore },
      recentActivity,
      pagination: {
        page,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1,
        totalCount
      },
      filters: {
        search: req.query.search || '',
        template: req.query.template || '',
        sort: req.query.sort || 'latest'
      }
    });
  } catch (err) {
    console.error('Dashboard Error:', err);
    req.flash('error', 'Could not load your resumes.');
    res.redirect('/');
  }
};

const User = require('../models/User');

exports.getProfile = async (req, res) => {
  try {
    const user = await User.findById(req.session.userId);
    res.render('dashboard/profile', {
      title: 'My Profile – ResumeAI',
      user
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

    user.name = name;
    user.email = email;
    if (password) {
      user.password = password;
    }
    
    if (req.file) {
      user.avatar = '/uploads/' + req.file.filename;
    }

    await user.save();
    
    // Update session data
    req.session.userName = user.name;
    req.session.userAvatar = user.avatar;

    req.flash('success', 'Profile updated successfully.');
    res.redirect('/dashboard/profile');
  } catch (err) {
    console.error('Update Profile Error:', err);
    req.flash('error', 'Error updating profile.');
    res.redirect('/dashboard/profile');
  }
};
