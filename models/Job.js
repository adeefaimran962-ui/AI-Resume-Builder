/**
 * models/Job.js
 * Job Application Tracker Model
 */
'use strict';

const mongoose = require('mongoose');

const jobSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
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
    enum: ['Applied', 'Interview', 'Offer', 'Rejected', 'Withdrawn'],
    default: 'Applied',
  },
  appliedDate: {
    type: Date,
    default: Date.now,
  },
  interviewDate: {
    type: Date,
  },
  notes: {
    type: String,
    trim: true,
  },
}, {
  timestamps: true,
});

module.exports = mongoose.model('Job', jobSchema);
