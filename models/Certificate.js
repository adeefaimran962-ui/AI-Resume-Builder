/**
 * models/Certificate.js
 * Certificate Manager Model
 */
'use strict';

const mongoose = require('mongoose');

const certificateSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  name: {
    type: String,
    required: true,
    trim: true,
  },
  issuer: {
    type: String,
    required: true,
    trim: true,
  },
  issueDate: {
    type: Date,
    required: true,
  },
  credentialId: {
    type: String,
    trim: true,
  },
  credentialUrl: {
    type: String,
    trim: true,
  },
  filePath: {
    type: String,
    trim: true,
  },
}, {
  timestamps: true,
});

module.exports = mongoose.model('Certificate', certificateSchema);
