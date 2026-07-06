const mongoose = require('mongoose');

const CoverLetterSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  },
  resume: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Resume',
  },
  title: {
    type: String,
    required: [true, 'Cover Letter title is required'],
    trim: true,
    default: 'My Cover Letter',
  },
  personalInfo: {
    fullName: { type: String, trim: true, default: '' },
    email:    { type: String, trim: true, default: '' },
    phone:    { type: String, trim: true, default: '' },
    address:  { type: String, trim: true, default: '' }
  },
  employerInfo: {
    companyName:   { type: String, trim: true, default: '' },
    hiringManager: { type: String, trim: true, default: '' },
    address:       { type: String, trim: true, default: '' }
  },
  jobTitle: { type: String, trim: true, default: '' },
  date: { type: String, default: '' },
  content: { type: String, trim: true, default: '' },
}, { timestamps: true });

module.exports = mongoose.model('CoverLetter', CoverLetterSchema);
