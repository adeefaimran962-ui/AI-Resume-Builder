/**
 * models/Resume.js
 * Mongoose schema – 12 templates + soft-delete (Recycle Bin) support.
 */
const mongoose = require('mongoose');

const EducationSchema = new mongoose.Schema({
  institution:  { type: String, trim: true, default: '' },
  degree:       { type: String, trim: true, default: '' },
  fieldOfStudy: { type: String, trim: true, default: '' },
  startDate:    { type: String, default: '' },
  endDate:      { type: String, default: '' },
  grade:        { type: String, trim: true, default: '' },
  description:  { type: String, trim: true, default: '' },
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
  techStack:   { type: String, trim: true, default: '' },
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
    enum: ['Beginner','Elementary','Intermediate','Upper-Intermediate','Advanced','Native'],
    default: 'Intermediate',
  },
}, { _id: true });

const AchievementSchema = new mongoose.Schema({
  title:       { type: String, trim: true, default: '' },
  description: { type: String, trim: true, default: '' },
  date:        { type: String, default: '' },
}, { _id: true });

const SocialLinkSchema = new mongoose.Schema({
  platform: { type: String, trim: true, default: '' },
  url:      { type: String, trim: true, default: '' },
}, { _id: true });

const SkillSchema = new mongoose.Schema({
  skill:       { type: String, trim: true, default: '' },
  proficiency: {
    type: String,
    enum: ['Beginner','Intermediate','Advanced','Expert'],
    default: 'Intermediate',
  },
}, { _id: true });

const ReferenceSchema = new mongoose.Schema({
  name:     { type: String, trim: true, default: '' },
  position: { type: String, trim: true, default: '' },
  company:  { type: String, trim: true, default: '' },
  email:    { type: String, trim: true, default: '' },
  phone:    { type: String, trim: true, default: '' },
}, { _id: true });

const VolunteerExperienceSchema = new mongoose.Schema({
  organization: { type: String, trim: true, default: '' },
  role:         { type: String, trim: true, default: '' },
  startDate:    { type: String, default: '' },
  endDate:      { type: String, default: '' },
  description:  { type: String, trim: true, default: '' },
}, { _id: true });

const InterestSchema = new mongoose.Schema({
  interest: { type: String, trim: true, default: '' },
}, { _id: true });

const ResumeSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  },
  title: {
    type: String,
    required: [true, 'Resume title is required'],
    trim: true,
    maxlength: [100, 'Title cannot exceed 100 characters'],
    default: 'My Resume',
  },
  // 12 ATS-friendly templates
  template: {
    type: String,
    enum: [
      'modern',           // Purple gradient sidebar
      'classic',          // Traditional two-column
      'minimal',          // Clean single column
      'executive',        // Dark header, serif feel
      'creative',         // Colourful accent bar
      'tech',             // Dark theme, code-inspired
      'elegant',          // Gold accents, premium
      'compact',          // ATS-friendly single column
      'professional',     // LinkedIn-inspired
      'ats-professional', // ★ NEW – clean ATS-optimized with teal accent
      'minimal-pro',      // Refined minimal with accent line
      'modern-gradient',  // Vibrant gradient header, two-col
      'sharp',            // Bold typography, executive accent
    ],
    default: 'modern',
  },
  shareToken: {
    type: String,
    default: null,
  },
  isShared: {
    type: Boolean,
    default: false,
  },
  downloads: {
    type: Number,
    default: 0,
  },
  personalInfo: {
    fullName: { type: String, trim: true, default: '' },
    email:    { type: String, trim: true, default: '' },
    phone:    { type: String, trim: true, default: '' },
    address:  { type: String, trim: true, default: '' },
    city:     { type: String, trim: true, default: '' },
    country:  { type: String, trim: true, default: '' },
    zipCode:  { type: String, trim: true, default: '' },
    website:  { type: String, trim: true, default: '' },
    jobTitle: { type: String, trim: true, default: '' },
    linkedin: { type: String, trim: true, default: '' },
    github:   { type: String, trim: true, default: '' },
    photo:    { type: String, trim: true, default: '' }, // uploaded profile photo path
  },
  summary:        { type: String, trim: true, default: '', maxlength: [2000, 'Summary too long'] },
  education:      [EducationSchema],
  workExperience: [WorkExperienceSchema],
  skills:         { type: [String], default: [] },
  skillsArray:    [SkillSchema],
  projects:       [ProjectSchema],
  certifications: [CertificationSchema],
  languages:      [LanguageSchema],
  achievements:   [AchievementSchema],
  socialLinks:    [SocialLinkSchema],
  references:     [ReferenceSchema],
  volunteerExperience: [VolunteerExperienceSchema],
  interests:      [InterestSchema],
  // Track downloads
  downloadCount:  { type: Number, default: 0 },
  // Public sharing
  isPublic:       { type: Boolean, default: false },
  // ATS Score
  atsScore:       { type: Number, default: 0 },
  // ── Recycle Bin (soft-delete) ──────────────────────────────────────────
  isDeleted:      { type: Boolean, default: false, index: true },
  deletedAt:      { type: Date,    default: null },
}, { timestamps: true });

module.exports = mongoose.model('Resume', ResumeSchema);
