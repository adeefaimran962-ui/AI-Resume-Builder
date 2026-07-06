const mongoose = require('mongoose');

const ResumeVersionSchema = new mongoose.Schema({
  resumeId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Resume',
    required: true,
    index: true,
  },
  versionNumber: {
    type: Number,
    required: true,
  },
  snapshot: {
    type: mongoose.Schema.Types.Mixed,
    required: true,
  },
}, { timestamps: true });

module.exports = mongoose.model('ResumeVersion', ResumeVersionSchema);
