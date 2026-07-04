/**
 * models/Resume.js
 * ----------------------------------------------------------
 * Mongoose schema and model for the Resumes collection.
 * A resume belongs to exactly one User (via ObjectId ref).
 * All 10 resume sections are modelled as sub-documents or
 * arrays of sub-documents for clean, structured storage.
 * ----------------------------------------------------------
 */

const mongoose = require('mongoose');

// ── Sub-document schemas ───────────────────────────────────

const EducationSchema = new mongoose.Schema({
  institution: { type: String, trim: true, default: '' },
  degree:      { type: String, trim: true, default: '' },
  fieldOfStudy:{ type: String, trim: true, default: '' },
  startDate:   { type: String, default: '' },
  endDate:     { type: String, default: '' },
  grade:       { type: String, trim: true, default: '' },
  description: { type: String, trim: true, default: '' },
}, { _id: true });

const WorkExperienceSchema = new mongoose.Schema({
  company:     { type: String, trim: true, default: '' },
  jobTitle:    { type: String, trim: true, default: '' },
  location:    { type: String, trim: true, default: '' },
  startDate:   { type: String, default: '' },
  endDate:     { type: String, default: '' },
  current:     { type: Boolean, default: false },
  description: { type: String, trim: true, default: '' },
}, { _id: true });

const ProjectSchema = new mongoose.Schema({
  name:        { type: String, trim: true, default: '' },
  description: { type: String, trim: true, default: '' },
  techStack:   { type: String, trim: true, default: '' }, // comma-separated
  link:        { type: String, trim: true, default: '' },
  startDate:   { type: String, default: '' },
  endDate:     { type: String, default: '' },
}, { _id: true });

const CertificationSchema = new mongoose.Schema({
  name:         { type: String, trim: true, default: '' },
  issuer:       { type: String, trim: true, default: '' },
  issueDate:    { type: String, default: '' },
  expiryDate:   { type: String, default: '' },
  credentialId: { type: String, trim: true, default: '' },
  url:          { type: String, trim: true, default: '' },
}, { _id: true });

const LanguageSchema = new mongoose.Schema({
  language:    { type: String, trim: true, default: '' },
  proficiency: {
    type: String,
    enum: ['Beginner', 'Elementary', 'Intermediate', 'Upper-Intermediate', 'Advanced', 'Native'],
    default: 'Intermediate',
  },
}, { _id: true });

const AchievementSchema = new mongoose.Schema({
  title:       { type: String, trim: true, default: '' },
  description: { type: String, trim: true, default: '' },
  date:        { type: String, default: '' },
}, { _id: true });

const SocialLinkSchema = new mongoose.Schema({
  platform: { type: String, trim: true, default: '' }, // e.g. LinkedIn, GitHub
  url:      { type: String, trim: true, default: '' },
}, { _id: true });

// ── Main Resume Schema ─────────────────────────────────────

const ResumeSchema = new mongoose.Schema(
  {
    // Owner reference
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },

    // Resume meta
    title: {
      type: String,
      required: [true, 'Resume title is required'],
      trim: true,
      maxlength: [100, 'Title cannot exceed 100 characters'],
      default: 'My Resume',
    },

    template: {
      type: String,
      enum: ['modern', 'classic', 'minimal'],
      default: 'modern',
    },

    // ── Section 1: Personal Information ──────────────────
    personalInfo: {
      fullName:  { type: String, trim: true, default: '' },
      email:     { type: String, trim: true, default: '' },
      phone:     { type: String, trim: true, default: '' },
      address:   { type: String, trim: true, default: '' },
      city:      { type: String, trim: true, default: '' },
      country:   { type: String, trim: true, default: '' },
      zipCode:   { type: String, trim: true, default: '' },
      website:   { type: String, trim: true, default: '' },
      jobTitle:  { type: String, trim: true, default: '' },
    },

    // ── Section 2: Professional Summary ──────────────────
    summary: {
      type: String,
      trim: true,
      default: '',
      maxlength: [1000, 'Summary cannot exceed 1000 characters'],
    },

    // ── Section 3: Education ──────────────────────────────
    education: [EducationSchema],

    // ── Section 4: Work Experience ────────────────────────
    workExperience: [WorkExperienceSchema],

    // ── Section 5: Skills ─────────────────────────────────
    skills: {
      type: [String], // Array of skill strings e.g. ['JavaScript', 'React']
      default: [],
    },

    // ── Section 6: Projects ───────────────────────────────
    projects: [ProjectSchema],

    // ── Section 7: Certifications ─────────────────────────
    certifications: [CertificationSchema],

    // ── Section 8: Languages ──────────────────────────────
    languages: [LanguageSchema],

    // ── Section 9: Achievements ───────────────────────────
    achievements: [AchievementSchema],

    // ── Section 10: Social Links ──────────────────────────
    socialLinks: [SocialLinkSchema],
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model('Resume', ResumeSchema);
