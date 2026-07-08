/**
 * controllers/jobController.js
 * Job Application Tracker Controller - Full Featured
 */
'use strict';

const Job = require('../models/Job');

/* ── ownership guard ── */
const ownsJob = async (req, res) => {
  const job = await Job.findById(req.params.id).lean();
  if (!job) {
    req.flash('error', 'Job application not found.');
    res.redirect('/jobs');
    return null;
  }
  if (String(job.user) !== String(req.session.userId)) {
    req.flash('error', 'Not authorized.');
    res.redirect('/jobs');
    return null;
  }
  return job;
};

/* ── GET /jobs ── */
exports.index = async (req, res) => {
  try {
    const page  = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = 12;
    const skip  = (page - 1) * limit;

    const baseQuery = { user: req.session.userId };

    // Search filter
    if (req.query.search) {
      baseQuery.$or = [
        { company:  { $regex: req.query.search, $options: 'i' } },
        { position: { $regex: req.query.search, $options: 'i' } },
        { location: { $regex: req.query.search, $options: 'i' } },
      ];
    }

    // Status filter
    if (req.query.status) baseQuery.status = req.query.status;

    // Priority filter
    if (req.query.priority) baseQuery.priority = req.query.priority;

    // Sort
    const sortMap = {
      newest:    { createdAt: -1 },
      oldest:    { createdAt:  1 },
      company:   { company:    1 },
      position:  { position:   1 },
      status:    { status:     1 },
      interview: { interviewDate: 1 },
      deadline:  { deadline:   1 },
    };
    const sortQuery = sortMap[req.query.sort] || { createdAt: -1 };

    const [jobs, totalCount] = await Promise.all([
      Job.find(baseQuery).sort(sortQuery).skip(skip).limit(limit).lean(),
      Job.countDocuments(baseQuery),
    ]);

    const totalPages = Math.ceil(totalCount / limit);

    // Stats (always on all jobs, ignoring filters)
    const allJobs = await Job.find({ user: req.session.userId }).lean();
    const stats = {
      total:      allJobs.length,
      wishlist:   allJobs.filter(j => j.status === 'Wishlist').length,
      applied:    allJobs.filter(j => j.status === 'Applied').length,
      assessment: allJobs.filter(j => j.status === 'Assessment').length,
      interview:  allJobs.filter(j => j.status === 'Interview').length,
      offer:      allJobs.filter(j => j.status === 'Offer').length,
      rejected:   allJobs.filter(j => j.status === 'Rejected').length,
    };

    // Upcoming interviews
    const now = new Date();
    const upcomingInterviews = allJobs
      .filter(j => j.status === 'Interview' && j.interviewDate && new Date(j.interviewDate) >= now)
      .sort((a, b) => new Date(a.interviewDate) - new Date(b.interviewDate))
      .slice(0, 5);

    // Upcoming deadlines
    const upcomingDeadlines = allJobs
      .filter(j => j.deadline && new Date(j.deadline) >= now && j.status !== 'Rejected' && j.status !== 'Withdrawn')
      .sort((a, b) => new Date(a.deadline) - new Date(b.deadline))
      .slice(0, 5);

    res.render('jobs/index', {
      title: 'Job Tracker – ResumeAI',
      jobs,
      stats,
      upcomingInterviews,
      upcomingDeadlines,
      pagination: {
        page,
        totalPages,
        hasNext:    page < totalPages,
        hasPrev:    page > 1,
        totalCount,
      },
      filters: {
        search:   req.query.search   || '',
        status:   req.query.status   || '',
        priority: req.query.priority || '',
        sort:     req.query.sort     || 'newest',
      },
    });
  } catch (err) {
    console.error('Job Index Error:', err);
    req.flash('error', 'Could not load job applications.');
    res.redirect('/dashboard');
  }
};

/* ── GET /jobs/new ── */
exports.showCreateForm = (req, res) => {
  res.render('jobs/form', { title: 'Add Job Application', job: null, errors: [] });
};

/* ── POST /jobs ── */
exports.create = async (req, res) => {
  try {
    const {
      company, position, status, priority, location, salary,
      applicationUrl, appliedDate, deadline, interviewDate,
      notes, contactPerson, contactEmail,
    } = req.body;

    if (!company || !position) {
      req.flash('error', 'Company and position are required.');
      return res.redirect('/jobs/new');
    }

    await Job.create({
      user:           req.session.userId,
      company:        (company   || '').trim(),
      position:       (position  || '').trim(),
      status:         status     || 'Applied',
      priority:       priority   || 'Medium',
      location:       (location  || '').trim(),
      salary:         (salary    || '').trim(),
      applicationUrl: (applicationUrl || '').trim(),
      appliedDate:    appliedDate    ? new Date(appliedDate)    : new Date(),
      deadline:       deadline       ? new Date(deadline)       : undefined,
      interviewDate:  interviewDate  ? new Date(interviewDate)  : undefined,
      notes:          (notes         || '').trim(),
      contactPerson:  (contactPerson || '').trim(),
      contactEmail:   (contactEmail  || '').trim(),
    });

    req.flash('success', 'Job application added successfully!');
    res.redirect('/jobs');
  } catch (err) {
    console.error('Job Create Error:', err);
    req.flash('error', 'Could not add job application.');
    res.redirect('/jobs/new');
  }
};

/* ── GET /jobs/:id ── */
exports.show = async (req, res) => {
  try {
    const job = await ownsJob(req, res);
    if (!job) return;
    res.render('jobs/show', { title: `${job.company} – ${job.position}`, job });
  } catch (err) {
    console.error('Job Show Error:', err);
    req.flash('error', 'Could not load job application.');
    res.redirect('/jobs');
  }
};

/* ── GET /jobs/:id/edit ── */
exports.showEditForm = async (req, res) => {
  try {
    const job = await ownsJob(req, res);
    if (!job) return;
    res.render('jobs/form', { title: 'Edit Job Application', job, errors: [] });
  } catch (err) {
    console.error('Job Edit Form Error:', err);
    req.flash('error', 'Could not load form.');
    res.redirect('/jobs');
  }
};

/* ── PUT /jobs/:id ── */
exports.update = async (req, res) => {
  try {
    const job = await Job.findOne({ _id: req.params.id, user: req.session.userId });
    if (!job) {
      req.flash('error', 'Job application not found.');
      return res.redirect('/jobs');
    }

    const {
      company, position, status, priority, location, salary,
      applicationUrl, appliedDate, deadline, interviewDate,
      notes, contactPerson, contactEmail,
    } = req.body;

    job.company        = (company   || '').trim();
    job.position       = (position  || '').trim();
    job.status         = status     || 'Applied';
    job.priority       = priority   || 'Medium';
    job.location       = (location  || '').trim();
    job.salary         = (salary    || '').trim();
    job.applicationUrl = (applicationUrl || '').trim();
    job.appliedDate    = appliedDate   ? new Date(appliedDate)   : job.appliedDate;
    job.deadline       = deadline      ? new Date(deadline)      : undefined;
    job.interviewDate  = interviewDate ? new Date(interviewDate) : undefined;
    job.notes          = (notes         || '').trim();
    job.contactPerson  = (contactPerson || '').trim();
    job.contactEmail   = (contactEmail  || '').trim();

    await job.save();
    req.flash('success', 'Job application updated successfully!');
    res.redirect('/jobs');
  } catch (err) {
    console.error('Job Update Error:', err);
    req.flash('error', 'Could not update job application.');
    res.redirect(`/jobs/${req.params.id}/edit`);
  }
};

/* ── DELETE /jobs/:id ── */
exports.destroy = async (req, res) => {
  try {
    const job = await ownsJob(req, res);
    if (!job) return;
    await Job.findByIdAndDelete(req.params.id);
    req.flash('success', 'Job application deleted.');
    res.redirect('/jobs');
  } catch (err) {
    console.error('Job Delete Error:', err);
    req.flash('error', 'Could not delete job application.');
    res.redirect('/jobs');
  }
};

/* ── PATCH /jobs/:id/status  (quick status update via AJAX) ── */
exports.updateStatus = async (req, res) => {
  try {
    const job = await Job.findOne({ _id: req.params.id, user: req.session.userId });
    if (!job) return res.status(404).json({ success: false, error: 'Not found' });
    const allowed = ['Wishlist','Applied','Assessment','Interview','Offer','Rejected','Withdrawn'];
    if (!allowed.includes(req.body.status)) return res.status(400).json({ success: false, error: 'Invalid status' });
    job.status = req.body.status;
    await job.save();
    res.json({ success: true, status: job.status });
  } catch (err) {
    console.error('Job Status Update Error:', err);
    res.status(500).json({ success: false, error: 'Server error' });
  }
};
