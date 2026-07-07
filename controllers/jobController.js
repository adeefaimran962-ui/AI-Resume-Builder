/**
 * controllers/jobController.js
 * Job Application Tracker Controller
 */
'use strict';

const Job = require('../models/Job');

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

exports.index = async (req, res) => {
  try {
    const jobs = await Job.find({ user: req.session.userId })
      .sort({ appliedDate: -1 })
      .lean();
    
    // Calculate statistics
    const stats = {
      total: jobs.length,
      applied: jobs.filter(j => j.status === 'Applied').length,
      interview: jobs.filter(j => j.status === 'Interview').length,
      offer: jobs.filter(j => j.status === 'Offer').length,
      rejected: jobs.filter(j => j.status === 'Rejected').length,
    };
    
    // Upcoming interviews (jobs with status 'Interview' and interviewDate in future)
    const upcomingInterviews = jobs.filter(j => 
      j.status === 'Interview' && j.interviewDate && new Date(j.interviewDate) >= new Date()
    ).sort((a, b) => new Date(a.interviewDate) - new Date(b.interviewDate));
    
    res.render('jobs/index', { title: 'Job Tracker', jobs, stats, upcomingInterviews });
  } catch (err) {
    console.error('Job Index Error:', err);
    req.flash('error', 'Could not load job applications.');
    res.redirect('/dashboard');
  }
};

exports.showCreateForm = async (req, res) => {
  try {
    res.render('jobs/form', { title: 'Add Job Application', job: null });
  } catch (err) {
    console.error('Job Create Form Error:', err);
    req.flash('error', 'Could not load form.');
    res.redirect('/jobs');
  }
};

exports.create = async (req, res) => {
  try {
    const jobData = {
      user: req.session.userId,
      company: req.body.company,
      position: req.body.position,
      status: req.body.status || 'Applied',
      appliedDate: req.body.appliedDate || new Date(),
      interviewDate: req.body.interviewDate || null,
      notes: req.body.notes || '',
    };
    
    await Job.create(jobData);
    req.flash('success', 'Job application added successfully!');
    res.redirect('/jobs');
  } catch (err) {
    console.error('Job Create Error:', err);
    req.flash('error', 'Could not add job application.');
    res.redirect('/jobs/new');
  }
};

exports.show = async (req, res) => {
  try {
    const job = await ownsJob(req, res);
    if (!job) return;
    
    res.render('jobs/show', { title: job.company + ' - ' + job.position, job });
  } catch (err) {
    console.error('Job Show Error:', err);
    req.flash('error', 'Could not load job application.');
    res.redirect('/jobs');
  }
};

exports.showEditForm = async (req, res) => {
  try {
    const job = await ownsJob(req, res);
    if (!job) return;
    
    res.render('jobs/form', { title: 'Edit Job Application', job });
  } catch (err) {
    console.error('Job Edit Form Error:', err);
    req.flash('error', 'Could not load form.');
    res.redirect('/jobs');
  }
};

exports.update = async (req, res) => {
  try {
    const job = await Job.findOne({ _id: req.params.id, user: req.session.userId });
    if (!job) {
      req.flash('error', 'Job application not found.');
      return res.redirect('/jobs');
    }
    
    job.company = req.body.company;
    job.position = req.body.position;
    job.status = req.body.status || 'Applied';
    job.appliedDate = req.body.appliedDate || new Date();
    job.interviewDate = req.body.interviewDate || null;
    job.notes = req.body.notes || '';
    
    await job.save();
    req.flash('success', 'Job application updated successfully!');
    res.redirect('/jobs');
  } catch (err) {
    console.error('Job Update Error:', err);
    req.flash('error', 'Could not update job application.');
    res.redirect('/jobs/' + req.params.id + '/edit');
  }
};

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
