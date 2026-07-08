/**
 * models/Job.js
 * Job Application Tracker Model - Full Featured
 */
'use strict';

const mongoose = require('mongoose');

const jobSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  },
  company: {
    type: String,
    required: true,
    trim: true,
  },
  position: {
    type: String,
    required: true,
    trim: true,
  },
  status: {
    type: String,
    enum: ['Wishlist', 'Applied', 'Assessment', 'Interview', 'Offer', 'Rejected', 'Withdrawn'],
    default: 'Applied',
  },
  priority: {
    type: String,
    enum: ['High', 'Medium', 'Low'],
    default: 'Medium',
  },
  // Location
  location: {
    type: String,
    trim: true,
    default: '',
  },
  // Salary
  salary: {
    type: String,
    trim: true,
    default: '',
  },
  // Application URL
  applicationUrl: {
    type: String,
    trim: true,
    default: '',
  },
  // Deadline
  deadline: {
    type: Date,
  },
  // Dates
  appliedDate: {
    type: Date,
    default: Date.now,
  },
  interviewDate: {
    type: Date,
  },
  // Notes
  notes: {
    type: String,
    trim: true,
    default: '',
  },
  // Contact person
  contactPerson: {
    type: String,
    trim: true,
    default: '',
  },
  contactEmail: {
    type: String,
    trim: true,
    default: '',
  },
}, {
  timestamps: true,
});

// Index for faster queries
jobSchema.index({ user: 1, status: 1 });
jobSchema.index({ user: 1, createdAt: -1 });

module.exports = mongoose.model('Job', jobSchema);
