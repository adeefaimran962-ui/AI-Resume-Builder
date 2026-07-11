/**
 * controllers/resumeController.js
 * Full CRUD + PDF (template-aware) + AI generation (rule-based).
 *
 * BUG FIXES (2024-07-06):
 *  1. create()  – now uses `new Resume() + save()` so every submission
 *                 ALWAYS produces a brand-new MongoDB document.
 *  2. update()  – wraps payload in `{ $set: ... }` so findByIdAndUpdate
 *                 never replaces the whole document; arrays merge correctly.
 *  3. ownsResume – redirected + returned atomically; no silent pass-through.
 *  4. userId guard – create() validates session.userId is present before
 *                    inserting to avoid orphaned documents.
 */
const Resume        = require('../models/Resume');
const ResumeVersion = require('../models/ResumeVersion');
const PDFDocument   = require('pdfkit');
const fs            = require('fs');
const path          = require('path');
const { scoreResume } = require('../lib/atsScorer');
const { generateContent } = require('../lib/aiService');

/* ── ownership guard ──────────────────────────────────────────────────────
 * Returns the resume lean object if the current user owns it.
 * Pass allowDeleted=true to also match soft-deleted (trashed) resumes.
 * On any failure it handles the redirect itself and returns null.
 * Callers must check: `if (!resume) return;`
 * ──────────────────────────────────────────────────────────────────────── */
const ownsResume = async (req, res, { allowDeleted = false } = {}) => {
  const query = { _id: req.params.id };
  if (!allowDeleted) query.isDeleted = { $ne: true };
  const resume = await Resume.findOne(query).lean();
  if (!resume) {
    req.flash('error', 'Resume not found.');
    res.redirect('/dashboard');
    return null;
  }
  if (String(resume.user) !== String(req.session.userId)) {
    req.flash('error', 'Not authorized.');
    res.redirect('/dashboard');
    return null;
  }
  return resume;
};

/* ── parse form body into nested schema ── */
const parseResumeBody = (body) => {
  const { title, template, summary, fullName, email, phone, address,
          city, country, zipCode, website, jobTitle, linkedin, github, skillsRaw } = body;

  const skills = skillsRaw ? skillsRaw.split(',').map(s => s.trim()).filter(Boolean) : [];

  // Extracts indexed form arrays: prefix[0][field], prefix[1][field], ...
  const extract = (prefix) => {
    const map = {};
    Object.keys(body).forEach(k => {
      const m = k.match(new RegExp(`^${prefix}\\[(\\d+)\\]\\[(.+)\\]$`));
      if (m) {
        const idx = parseInt(m[1], 10);
        if (!map[idx]) map[idx] = {};
        map[idx][m[2]] = body[k];
      }
    });
    return Object.keys(map)
      .sort((a, b) => a - b)
      .map(k => map[k])
      .filter(item => Object.values(item).some(v => v && String(v).trim() !== ''));
  };

  return {
    title:    (title    || 'My Resume').trim(),
    template:  template  || 'modern',
    summary:  (summary  || '').trim(),
    // Flat personalInfo — all fields always present (empty string if not filled)
    // photo is handled separately from the uploaded file, not from body
    personalInfo: {
      fullName: (fullName || '').trim(),
      email:    (email    || '').trim(),
      phone:    (phone    || '').trim(),
      address:  (address  || '').trim(),
      city:     (city     || '').trim(),
      country:  (country  || '').trim(),
      zipCode:  (zipCode  || '').trim(),
      website:  (website  || '').trim(),
      jobTitle: (jobTitle || '').trim(),
      linkedin: (linkedin || '').trim(),
      github:   (github   || '').trim(),
    },
    skills,
    education:      extract('education'),
    workExperience: extract('workExperience'),
    projects:       extract('projects'),
    certifications: extract('certifications'),
    languages:      extract('languages'),
    achievements:   extract('achievements'),
    socialLinks:    extract('socialLinks'),
    skillsArray:    extract('skillsList'),
    references:     extract('references'),
    volunteerExperience: extract('volunteerExperience'),
    interests:      extract('interests'),
  };
};

/* ── CRUD ────────────────────────────────────────────────────────────── */

/**
 * GET /resume/new
 * Always renders a completely blank form (resume: null).
 * No existing data is ever pre-populated here.
 */
exports.showCreateForm = (req, res) => {
  res.render('resume/form', {
    title:  'Create Resume',
    resume: null,           // ← null ensures the EJS renders empty fields
    action: '/resume',
    method: 'POST',
    errors: [],
  });
};

/**
 * POST /resume
 * ALWAYS creates a brand-new MongoDB document.
 * Uses `new Resume() + save()` (not findOneAndUpdate / upsert)
 * so there is zero risk of touching an existing record.
 */
exports.create = async (req, res) => {
  try {
    // Guard: session must have a valid userId
    if (!req.session || !req.session.userId) {
      req.flash('error', 'Session expired. Please log in again.');
      return res.redirect('/auth/login');
    }

    // ── DEBUG: confirm req.body reaches the controller ──────────────────
    console.log('[DEBUG create] req.body keys:', Object.keys(req.body));
    console.log('[DEBUG create] req.body sample:', JSON.stringify(req.body).slice(0, 500));
    // ────────────────────────────────────────────────────────────────────

    const data = parseResumeBody(req.body);

    // ── DEBUG: confirm parseResumeBody output ────────────────────────────
    console.log('[DEBUG create] parsed data:', JSON.stringify(data).slice(0, 800));
    // ────────────────────────────────────────────────────────────────────

    if (!data.title) {
      return res.status(400).render('resume/form', {
        title:  'Create Resume',
        resume: null,
        action: '/resume',
        method: 'POST',
        errors: ['Resume title is required.'],
      });
    }

    // Calculate ATS score
    const scoreObj = scoreResume(data);

    // ── NEW DOCUMENT – never touches any existing record ────────────────
    const resume = new Resume({
      user: req.session.userId,   // ← always the currently logged-in user
      ...data,
      atsScore: scoreObj.score
    });
    await resume.save();          // ← creates a fresh _id in MongoDB
    // ────────────────────────────────────────────────────────────────────

    if (req.xhr || req.headers['x-requested-with'] === 'XMLHttpRequest') {
      return res.json({ success: true, id: resume._id });
    }

    console.log('[DEBUG create] saved resume _id:', resume._id);
    req.flash('success', 'Resume created successfully!');
    res.redirect('/resume/' + resume._id + '/preview');
  } catch (err) {
    console.error('Create Resume Error:', err);
    req.flash('error', 'Could not create resume. Please try again.');
    res.redirect('/resume/new');
  }
};

/**
 * GET /resume/:id/edit
 * Loads the specific resume identified by :id and pre-fills the form.
 * Unauthorized access is rejected by ownsResume().
 */
exports.showEditForm = async (req, res) => {
  try {
    const resume = await ownsResume(req, res);
    if (!resume) return; // ownsResume already redirected

    res.render('resume/form', {
      title:  'Edit – ' + resume.title,
      resume,                                   // ← only THIS resume's data
      action: '/resume/' + resume._id + '?_method=PUT',
      method: 'POST',
      errors: [],
    });
  } catch (err) {
    console.error('Show Edit Form Error:', err);
    req.flash('error', 'Could not load resume for editing.');
    res.redirect('/dashboard');
  }
};

/**
 * PUT /resume/:id   (method-override: POST + ?_method=PUT)
 *
 * ROOT CAUSE OF BUG (Mongoose 8 + findByIdAndUpdate + $set):
 * ──────────────────────────────────────────────────────────
 * Mongoose 8 silently drops nested plain-object paths and array-of-subdocument
 * paths when they are passed inside a { $set: data } call to findByIdAndUpdate
 * with runValidators:true.  Only top-level scalar fields (like `template`) were
 * actually reaching MongoDB — everything else was stripped before the write.
 *
 * FIX: Use findById() → mutate fields directly → doc.save().
 * This goes through Mongoose's normal document pipeline (casting, validation,
 * middleware) and guarantees every field is written, including nested objects
 * and subdocument arrays.
 */
exports.update = async (req, res) => {
  try {
    const owned = await ownsResume(req, res);
    if (!owned) return; // ownsResume already redirected

    // ── DEBUG: confirm req.body reaches the controller ──────────────────
    console.log('[DEBUG update] req.body keys:', Object.keys(req.body));
    console.log('[DEBUG update] req.body sample:', JSON.stringify(req.body).slice(0, 500));
    // ────────────────────────────────────────────────────────────────────

    const data = parseResumeBody(req.body);

    // ── DEBUG: confirm parseResumeBody output ────────────────────────────
    console.log('[DEBUG update] parsed data:', JSON.stringify(data).slice(0, 800));
    console.log('[DEBUG update] template from parsed data:', data.template);
    // ────────────────────────────────────────────────────────────────────

    // ── Fetch the live Mongoose document (NOT lean) ──────────────────────
    const doc = await Resume.findById(req.params.id);
    if (!doc) {
      req.flash('error', 'Resume not found.');
      return res.redirect('/dashboard');
    }

    // ── Save version snapshot before updating ───────────────────────────
    try {
      const lastVersion = await ResumeVersion.findOne({ resumeId: req.params.id })
        .sort({ versionNumber: -1 })
        .lean();
      const nextVersionNumber = lastVersion ? lastVersion.versionNumber + 1 : 1;
      
      const snapshot = {
        title: doc.title,
        template: doc.template,
        summary: doc.summary,
        personalInfo: doc.personalInfo,
        skills: doc.skills,
        education: doc.education,
        workExperience: doc.workExperience,
        projects: doc.projects,
        certifications: doc.certifications,
        languages: doc.languages,
        achievements: doc.achievements,
        socialLinks: doc.socialLinks,
        atsScore: doc.atsScore,
      };
      
      await ResumeVersion.create({
        resumeId: req.params.id,
        versionNumber: nextVersionNumber,
        snapshot,
      });
    } catch (versionErr) {
      console.error('Version save error (non-critical):', versionErr);
      // Continue with update even if version save fails
    }
    // ─────────────────────────────────────────────────────────────────────

    // ── Assign every field directly ──────────────────────────────────────
    doc.title    = data.title;
    doc.template = data.template;
    doc.summary  = data.summary;

    // ── DEBUG: Log template before save ───────────────────────────────────
    console.log('[DEBUG update] Setting doc.template to:', data.template);
    console.log('[DEBUG update] doc.isModified("template"):', doc.isModified('template'));
    console.log('[DEBUG update] doc.template value after assignment:', doc.template);
    // ────────────────────────────────────────────────────────────────────

    // Nested plain-object path: assign each sub-field individually, then
    // explicitly mark the parent path modified so Mongoose 8 flushes it.
    doc.personalInfo.fullName = data.personalInfo.fullName;
    doc.personalInfo.email    = data.personalInfo.email;
    doc.personalInfo.phone    = data.personalInfo.phone;
    doc.personalInfo.address  = data.personalInfo.address;
    doc.personalInfo.city     = data.personalInfo.city;
    doc.personalInfo.country  = data.personalInfo.country;
    doc.personalInfo.zipCode  = data.personalInfo.zipCode;
    doc.personalInfo.website  = data.personalInfo.website;
    doc.personalInfo.jobTitle = data.personalInfo.jobTitle;
    doc.personalInfo.linkedin = data.personalInfo.linkedin;
    doc.personalInfo.github   = data.personalInfo.github;

    // Photo is managed independently via the /upload-photo and /remove-photo
    // AJAX endpoints. Do NOT touch doc.personalInfo.photo here — it must be
    // preserved unchanged across every normal (URL-encoded) form save.

    // ── CRITICAL FIX: markModified for nested object + all arrays ────────
    // Mongoose 8 does not always detect mutations on nested plain objects
    // or array replacements. Calling markModified() forces it to include
    // these paths in the next save() write — without this, only top-level
    // scalars (title, template, summary) were ever persisted to MongoDB.
    doc.markModified('personalInfo');

    // Arrays: replace entirely with the parsed values from the form.
    doc.skills         = data.skills;
    doc.education      = data.education;
    doc.workExperience = data.workExperience;
    doc.projects       = data.projects;
    doc.certifications = data.certifications;
    doc.languages      = data.languages;
    doc.achievements   = data.achievements;
    doc.socialLinks    = data.socialLinks;

    // Mark all array paths modified so Mongoose flushes them even when
    // the new array is empty (length 0 → Mongoose may skip unmodified).
    doc.markModified('skills');
    doc.markModified('education');
    doc.markModified('workExperience');
    doc.markModified('projects');
    doc.markModified('certifications');
    doc.markModified('languages');
    doc.markModified('achievements');
    doc.markModified('socialLinks');
    // ─────────────────────────────────────────────────────────────────────

    // Calculate ATS score on update
    const scoreObj = scoreResume(doc);
    doc.atsScore = scoreObj.score;

    await doc.save(); // ← now writes ALL paths to MongoDB

    if (req.xhr || req.headers['x-requested-with'] === 'XMLHttpRequest') {
      return res.json({ success: true, id: doc._id });
    }

    console.log('[DEBUG update] saved doc _id:', doc._id, '| template:', doc.template, '| fullName:', doc.personalInfo.fullName);

    req.flash('success', 'Resume updated successfully!');
    res.redirect('/resume/' + req.params.id + '/preview');
  } catch (err) {
    console.error('Update Resume Error:', err);
    req.flash('error', 'Could not update resume. Please try again.');
    res.redirect('/resume/' + req.params.id + '/edit');
  }
};

/**
 * DELETE /resume/:id  (method-override: POST + ?_method=DELETE)
 * SOFT DELETE — moves the resume to the Recycle Bin instead of erasing it.
 */
exports.destroy = async (req, res) => {
  try {
    const resume = await ownsResume(req, res);
    if (!resume) return;

    await Resume.findByIdAndUpdate(req.params.id, {
      $set: { isDeleted: true, deletedAt: new Date() }
    });
    req.flash('success', 'Resume moved to Trash. You can restore it from the Trash section.');
    res.redirect('/dashboard');
  } catch (err) {
    console.error('Delete Resume Error:', err);
    req.flash('error', 'Could not delete resume.');
    res.redirect('/dashboard');
  }
};

/**
 * POST /resume/:id/restore
 * Restores a trashed resume back to the active list.
 */
exports.restore = async (req, res) => {
  try {
    const resume = await ownsResume(req, res, { allowDeleted: true });
    if (!resume) return;

    await Resume.findByIdAndUpdate(req.params.id, {
      $set: { isDeleted: false, deletedAt: null }
    });
    req.flash('success', 'Resume restored successfully!');
    res.redirect('/dashboard/trash');
  } catch (err) {
    console.error('Restore Resume Error:', err);
    req.flash('error', 'Could not restore resume.');
    res.redirect('/dashboard/trash');
  }
};

/**
 * DELETE /resume/:id/permanent  (method-override POST + ?_method=DELETE)
 * Permanently removes a trashed resume and its uploaded photo.
 */
exports.destroyPermanent = async (req, res) => {
  try {
    const resume = await ownsResume(req, res, { allowDeleted: true });
    if (!resume) return;

    // Delete profile photo from disk if present
    if (resume.personalInfo && resume.personalInfo.photo) {
      const fs   = require('fs');
      const path = require('path');
      const oldPath = path.join(__dirname, '../public', resume.personalInfo.photo);
      fs.unlink(oldPath, () => {});
    }

    await Resume.findByIdAndDelete(req.params.id);
    req.flash('success', 'Resume permanently deleted.');
    res.redirect('/dashboard/trash');
  } catch (err) {
    console.error('Permanent Delete Error:', err);
    req.flash('error', 'Could not permanently delete resume.');
    res.redirect('/dashboard/trash');
  }
};

/**
 * POST /resume/:id/duplicate
 * Duplicates an existing resume.
 */
exports.duplicate = async (req, res) => {
  try {
    const original = await ownsResume(req, res);
    if (!original) return;
    
    const duplicateData = { ...original };
    delete duplicateData._id;
    delete duplicateData.createdAt;
    delete duplicateData.updatedAt;
    duplicateData.title = original.title + ' (Copy)';
    
    const newResume = new Resume(duplicateData);
    await newResume.save();
    
    req.flash('success', 'Resume duplicated successfully!');
    res.redirect('/dashboard');
  } catch (err) {
    console.error('Duplicate Resume Error:', err);
    req.flash('error', 'Could not duplicate resume.');
    res.redirect('/dashboard');
  }
};

/**
 * POST /resume/:id/rename
 * Renames an existing resume.
 */
exports.rename = async (req, res) => {
  try {
    const resume = await ownsResume(req, res);
    if (!resume) return;

    if (!req.body.title || req.body.title.trim() === '') {
      req.flash('error', 'Title cannot be empty.');
      return res.redirect('/dashboard');
    }

    await Resume.findByIdAndUpdate(req.params.id, { $set: { title: req.body.title.trim() } });
    req.flash('success', 'Resume renamed successfully!');
    res.redirect('/dashboard');
  } catch (err) {
    console.error('Rename Resume Error:', err);
    req.flash('error', 'Could not rename resume.');
    res.redirect('/dashboard');
  }
};

/**
 * GET /resume/:id/preview
 * Renders the template-specific preview for the resume.
 */
exports.preview = async (req, res) => {
  try {
    const resume = await ownsResume(req, res);
    if (!resume) return;

    const pi = resume.personalInfo || {};
    const contact = [];
    if (pi.email) contact.push(pi.email);
    if (pi.phone) contact.push(pi.phone);
    if (pi.website) contact.push(pi.website);
    if (pi.city || pi.country) contact.push([pi.city, pi.country].filter(Boolean).join(', '));

    // ?tpl= allows preview-only switching without saving
    const VALID_TEMPLATES = ['modern','classic','minimal','professional','executive','creative','compact','tech','elegant','ats-professional','minimal-pro','modern-gradient','sharp'];
    const tpl = (VALID_TEMPLATES.includes(req.query.tpl) ? req.query.tpl : null) || resume.template || 'modern';

    // ── DEBUG: Log template being used for preview ────────────────────────
    console.log('[DEBUG preview] resume._id:', resume._id);
    console.log('[DEBUG preview] resume.template from DB:', resume.template);
    console.log('[DEBUG preview] req.query.tpl:', req.query.tpl);
    console.log('[DEBUG preview] final tpl used:', tpl);
    // ────────────────────────────────────────────────────────────────────────

    res.render('resume/preview', {
      title: 'Preview – ' + resume.title,
      resume,
      tpl,
      pi,
      contact,
      isShared: false
    });
  } catch (err) {
    console.error('Preview Error:', err);
    req.flash('error', 'Could not load resume preview.');
    res.redirect('/dashboard');
  }
};

/**
 * GET /resume/:id/score
 * Renders the ATS Score Card for the resume.
 */
exports.score = async (req, res) => {
  try {
    const resume = await ownsResume(req, res);
    if (!resume) return; // ownsResume already redirected

    const atsResult = scoreResume(resume);

    res.render('resume/score', {
      title: 'ATS Score – ' + resume.title,
      resume,
      score: atsResult
    });
  } catch (err) {
    console.error('Score Error:', err);
    req.flash('error', 'Could not calculate ATS score.');
    res.redirect('/dashboard');
  }
};

/**
 * GET /resume/ats-checker
 * Shows the standalone ATS checker page (select from saved resumes or paste text).
 */
exports.atsChecker = async (req, res) => {
  try {
    const resumes = await Resume.find({
      user: req.session.userId,
      isDeleted: { $ne: true },
    }).select('title personalInfo.fullName atsScore').sort({ updatedAt: -1 }).lean();

    res.render('resume/ats-checker', {
      title: 'ATS Resume Checker – ResumeAI',
      resumes,
      result: null,
    });
  } catch (err) {
    console.error('ATS Checker Error:', err);
    req.flash('error', 'Could not load ATS Checker.');
    res.redirect('/dashboard');
  }
};

/**
 * POST /resume/ats/check
 * Scores a selected resume and returns the result.
 */
exports.atsCheck = async (req, res) => {
  try {
    const { resumeId } = req.body;
    if (!resumeId) {
      return res.status(400).json({ success: false, error: 'Resume ID is required.' });
    }

    const resume = await Resume.findOne({
      _id: resumeId,
      user: req.session.userId,
      isDeleted: { $ne: true },
    }).lean();

    if (!resume) {
      return res.status(404).json({ success: false, error: 'Resume not found.' });
    }

    const result = scoreResume(resume);

    // Persist the score
    await Resume.findByIdAndUpdate(resumeId, { $set: { atsScore: result.score } });

    return res.json({ success: true, result, resume: { title: resume.title, id: resume._id } });
  } catch (err) {
    console.error('ATS Check Error:', err);
    return res.status(500).json({ success: false, error: 'Could not score resume.' });
  }
};


exports.share = async (req, res) => {
  try {
    const resume = await ownsResume(req, res);
    if (!resume) return;

    // Generate or retrieve share token
    if (!resume.shareToken) {
      const crypto = require('crypto');
      const shareToken = crypto.randomBytes(32).toString('hex');
      await Resume.findByIdAndUpdate(req.params.id, { shareToken, isShared: true });
      resume.shareToken = shareToken;
    } else {
      await Resume.findByIdAndUpdate(req.params.id, { isShared: true });
    }

    const shareUrl = `${req.protocol}://${req.get('host')}/resume/${resume._id}/share/${resume.shareToken}`;
    
    res.render('resume/share', {
      title: `Share ${resume.title}`,
      resume,
      shareUrl,
      currentUser: req.session.user
    });
  } catch (err) {
    console.error('Share error:', err);
    req.flash('error', 'Failed to generate share link.');
    res.redirect('/dashboard');
  }
};

exports.viewShared = async (req, res) => {
  try {
    const { id, token } = req.params;
    const resume = await Resume.findOne({ _id: id, shareToken: token, isShared: true }).lean();
    
    if (!resume) {
      return res.status(404).render('404', { title: 'Shared Resume Not Found' });
    }

    res.render('resume/shared-view', {
      title: resume.title,
      resume,
      isShared: true
    });
  } catch (err) {
    console.error('View shared error:', err);
    res.status(500).render('error', { title: 'Error', message: 'Could not load shared resume.' });
  }
};

exports.downloadPDF = async (req, res) => {
  try {
    const resume = await ownsResume(req,res); if (!resume) return;
    
    // ── DEBUG: Log the template being used for PDF generation ─────────────
    console.log('[DEBUG downloadPDF] resume._id:', resume._id);
    console.log('[DEBUG downloadPDF] resume.template from DB:', resume.template);
    console.log('[DEBUG downloadPDF] using template:', resume.template || 'modern');
    console.log('[DEBUG downloadPDF] template type check:', typeof resume.template);
    console.log('[DEBUG downloadPDF] is template truthy?:', !!resume.template);
    // ────────────────────────────────────────────────────────────────────────
    
    Resume.findByIdAndUpdate(req.params.id,{$inc:{downloadCount:1}}).catch(()=>{});

    const doc = new PDFDocument({size:'A4',margins:{top:50,bottom:50,left:60,right:60},
      info:{Title:resume.title,Author:resume.personalInfo.fullName||'ResumeAI'}});
    const fn = ((resume.personalInfo.fullName||'resume').replace(/\s+/g,'_'))+'_resume.pdf';
    res.setHeader('Content-Type','application/pdf');
    res.setHeader('Content-Disposition','attachment; filename="'+fn+'"');
    doc.pipe(res);

    const tpl = resume.template || 'modern';
    const pi  = resume.personalInfo;
    const PW  = doc.page.width - 120;

    /* palette per template - now supports all 13 templates */
    let CP, CD, CM, CL, headerH, hdrSub;
    
    switch(tpl) {
      case 'classic':
        CP='#1E3A5F'; CD='#1a1a2e'; CM='#555566'; CL='#FFF8F0'; headerH=140; hdrSub='#F6AD55';
        break;
      case 'minimal':
      case 'minimal-pro':
        CP='#111827'; CD='#1F2937'; CM='#6B7280'; CL='#FFFFFF'; headerH=110; hdrSub='#374151';
        break;
      case 'professional':
        CP='#2563EB'; CD='#1E293B'; CM='#64748B'; CL='#F8FAFC'; headerH=130; hdrSub='#93C5FD';
        break;
      case 'executive':
        CP='#1E293B'; CD='#0F172A'; CM='#475569'; CL='#F1F5F9'; headerH=140; hdrSub='#94A3B8';
        break;
      case 'creative':
        CP='#EC4899'; CD='#1E293B'; CM='#64748B'; CL='#FCE7F3'; headerH=135; hdrSub='#F9A8D4';
        break;
      case 'compact':
      case 'ats-professional':
        CP='#059669'; CD='#1F2937'; CM='#6B7280'; CL='#F0FDF4'; headerH=120; hdrSub='#86EFAC';
        break;
      case 'tech':
        CP='#00D4AA'; CD='#0F172A'; CM='#64748B'; CL='#1E293B'; headerH=125; hdrSub='#5EEAD4';
        break;
      case 'elegant':
        CP='#8B5CF6'; CD='#1E293B'; CM='#64748B'; CL='#FAF5FF'; headerH=135; hdrSub='#C4B5FD';
        break;
      case 'modern-gradient':
        CP='#6366F1'; CD='#1E293B'; CM='#64748B'; CL='#EEF2FF'; headerH=130; hdrSub='#A5B4FC';
        break;
      case 'sharp':
        CP='#DC2626'; CD='#1F2937'; CM='#6B7280'; CL='#FEF2F2'; headerH=125; hdrSub='#FCA5A5';
        break;
      case 'modern':
      default:
        CP='#6C63FF'; CD='#1E293B'; CM='#64748B'; CL='#F1F5F9'; headerH=130; hdrSub='#C4B5FD';
        break;
    }

    const contact = [pi.email, pi.phone,
      pi.city&&pi.country ? pi.city+', '+pi.country : (pi.city||pi.country),
      pi.website].filter(Boolean);

    /* ── TWO-COLUMN LAYOUT: all templates except minimal variants ── */
    const isMinimalLayout = (tpl === 'minimal' || tpl === 'minimal-pro');
    
    if (!isMinimalLayout) {
      const CW=180, CRS=60+CW+20, CRW=PW-CW-20;

      doc.rect(0,0,doc.page.width,headerH).fill(CP);
      if (tpl==='classic') doc.rect(0,headerH-6,doc.page.width,6).fill('#F6AD55');
      if (tpl==='sharp') doc.rect(0,headerH-4,doc.page.width,4).fill(CP);

      // Profile photo in header
      let photoX = 60;
      if (pi.photo) {
        try {
          const fs = require('fs');
          const path = require('path');
          const photoPath = path.join(__dirname, '../public', pi.photo);
          if (fs.existsSync(photoPath)) {
            doc.image(photoPath, 60, 30, { width: 80, height: 80 });
            photoX = 160;
          }
        } catch (photoErr) {
          console.error('Error loading photo for PDF:', photoErr);
        }
      }

      doc.fillColor('#fff').fontSize(26).font('Helvetica-Bold')
         .text(pi.fullName||resume.title,photoX,38,{width:PW-photoX-20});
      if(pi.jobTitle) doc.fontSize(13).font('Helvetica')
         .fillColor(tpl==='classic'?'#F6AD55':'rgba(255,255,255,0.88)')
         .text(pi.jobTitle,photoX,70,{width:PW-photoX-20});
      if(contact.length) doc.fontSize(9).fillColor(hdrSub)
         .text(contact.join('  |  '),photoX,98,{width:PW-photoX-20});

      doc.rect(0,headerH,60+CW,doc.page.height-headerH).fill(CL);

      const sL=(t,y)=>{
        doc.fillColor(CP).fontSize(10).font('Helvetica-Bold').text(t.toUpperCase(),60,y,{width:CW});
        doc.moveTo(60,doc.y+2).lineTo(60+CW,doc.y+2).strokeColor(CP).lineWidth(1).stroke();
        return doc.y+6;
      };
      const sR=(t,y)=>{
        doc.fillColor(CP).fontSize(11).font('Helvetica-Bold').text(t.toUpperCase(),CRS,y,{width:CRW});
        doc.moveTo(CRS,doc.y+2).lineTo(CRS+CRW,doc.y+2).strokeColor(CP).lineWidth(1).stroke();
        return doc.y+6;
      };

      let lY=headerH+18;
      if(resume.skills&&resume.skills.length){
        lY=sL('Skills',lY);
        resume.skills.forEach(s=>{doc.fillColor(CD).fontSize(9).font('Helvetica').text('• '+s,60,lY,{width:CW});lY=doc.y+2;});
        lY+=8;
      }
      if(resume.languages&&resume.languages.length){
        lY=sL('Languages',lY);
        resume.languages.forEach(l=>{
          doc.fillColor(CD).fontSize(9).font('Helvetica-Bold').text(l.language,60,lY,{width:CW});lY=doc.y;
          doc.fillColor(CM).fontSize(8).font('Helvetica').text(l.proficiency,60,lY,{width:CW});lY=doc.y+4;
        });
        lY+=6;
      }
      if(resume.certifications&&resume.certifications.length){
        lY=sL('Certifications',lY);
        resume.certifications.forEach(c=>{
          doc.fillColor(CD).fontSize(9).font('Helvetica-Bold').text(c.name,60,lY,{width:CW});lY=doc.y;
          if(c.issuer){doc.fillColor(CM).fontSize(8).font('Helvetica').text(c.issuer,60,lY,{width:CW});lY=doc.y+4;}
        });
      }
      if(resume.socialLinks&&resume.socialLinks.length){
        lY=sL('Links',lY);
        resume.socialLinks.forEach(s=>{
          doc.fillColor(CP).fontSize(8).font('Helvetica').text((s.platform?s.platform+': ':'')+s.url,60,lY,{width:CW});
          lY=doc.y+3;
        });
      }

      let rY=headerH+18;
      if(resume.summary){
        rY=sR('Summary',rY);
        doc.fillColor(CD).fontSize(9.5).font('Helvetica').text(resume.summary,CRS,rY,{width:CRW,align:'justify'});
        rY=doc.y+14;
      }
      if(resume.workExperience&&resume.workExperience.length){
        rY=sR('Work Experience',rY);
        resume.workExperience.forEach(w=>{
          doc.fillColor(CD).fontSize(10).font('Helvetica-Bold').text(w.jobTitle||'',CRS,rY,{width:CRW});rY=doc.y;
          doc.fillColor(CP).fontSize(9).font('Helvetica-Bold').text(w.company||'',CRS,rY,{continued:true,width:CRW/2});
          doc.fillColor(CM).font('Helvetica').text((w.startDate||'')+' – '+(w.current?'Present':(w.endDate||'')),{align:'right'});
          rY=doc.y+2;
          if(w.description){doc.fillColor(CD).fontSize(9).font('Helvetica').text(w.description,CRS,rY,{width:CRW});rY=doc.y;}
          rY+=8;
        });
      }
      if(resume.education&&resume.education.length){
        rY=sR('Education',rY);
        resume.education.forEach(e=>{
          doc.fillColor(CD).fontSize(10).font('Helvetica-Bold').text((e.degree||'')+(e.fieldOfStudy?' in '+e.fieldOfStudy:''),CRS,rY,{width:CRW});rY=doc.y;
          doc.fillColor(CP).fontSize(9).font('Helvetica-Bold').text(e.institution||'',CRS,rY,{continued:true,width:CRW/2});
          doc.fillColor(CM).font('Helvetica').text((e.startDate||'')+' – '+(e.endDate||''),{align:'right'});
          rY=doc.y+8;
        });
      }
      if(resume.projects&&resume.projects.length){
        rY=sR('Projects',rY);
        resume.projects.forEach(p=>{
          doc.fillColor(CD).fontSize(10).font('Helvetica-Bold').text(p.name||'',CRS,rY,{width:CRW});rY=doc.y;
          if(p.techStack){doc.fillColor(CM).fontSize(8).font('Helvetica-Oblique').text(p.techStack,CRS,rY,{width:CRW});rY=doc.y+2;}
          if(p.description){doc.fillColor(CD).fontSize(9).font('Helvetica').text(p.description,CRS,rY,{width:CRW});rY=doc.y;}
          rY+=8;
        });
      }
      if(resume.achievements&&resume.achievements.length){
        rY=sR('Achievements',rY);
        resume.achievements.forEach(a=>{
          doc.fillColor(CD).fontSize(9.5).font('Helvetica-Bold').text('• '+(a.title||''),CRS,rY,{width:CRW});rY=doc.y;
          if(a.description){doc.fillColor(CM).fontSize(9).font('Helvetica').text(a.description,CRS+8,rY,{width:CRW-8});rY=doc.y;}
          rY+=4;
        });
      }

    /* ── MINIMAL: single column ── */
    } else {
      doc.rect(0,0,doc.page.width,4).fill('#111827');
      let y=50;
      
      // Profile photo for minimal template
      let textX = 60;
      if (pi.photo) {
        try {
          const fs = require('fs');
          const path = require('path');
          const photoPath = path.join(__dirname, '../public', pi.photo);
          if (fs.existsSync(photoPath)) {
            doc.image(photoPath, 60, 45, { width: 70, height: 70 });
            textX = 150;
          }
        } catch (photoErr) {
          console.error('Error loading photo for PDF:', photoErr);
        }
      }
      
      doc.fillColor(CD).fontSize(28).font('Helvetica-Bold').text(pi.fullName||resume.title,textX,y,{width:PW-textX-20});
      y=doc.y+4;
      if(pi.jobTitle){doc.fillColor(CM).fontSize(13).font('Helvetica').text(pi.jobTitle,textX,y,{width:PW-textX-20});y=doc.y+4;}
      if(contact.length){doc.fillColor(CM).fontSize(9).font('Helvetica').text(contact.join('  ·  '),textX,y,{width:PW-textX-20});y=doc.y+8;}
      doc.moveTo(textX,y).lineTo(doc.page.width-60,y).strokeColor('#D1D5DB').lineWidth(0.5).stroke(); y+=14;

      const sMin=(t)=>{
        doc.fillColor(CD).fontSize(10).font('Helvetica-Bold').text(t.toUpperCase(),60,y,{width:PW,characterSpacing:1.5});
        y=doc.y+2;
        doc.moveTo(60,y).lineTo(doc.page.width-60,y).strokeColor(CD).lineWidth(0.5).stroke();
        y+=8;
      };

      if(resume.summary){
        sMin('Summary');
        doc.fillColor(CD).fontSize(9.5).font('Helvetica').text(resume.summary,60,y,{width:PW,align:'justify'});
        y=doc.y+14;
      }
      if(resume.workExperience&&resume.workExperience.length){
        sMin('Work Experience');
        resume.workExperience.forEach(w=>{
          doc.fillColor(CD).fontSize(10).font('Helvetica-Bold').text(w.jobTitle||'',60,y,{width:PW});y=doc.y;
          doc.fillColor(CP).fontSize(9).font('Helvetica-Bold').text(w.company||'',60,y,{continued:true,width:PW/2});
          doc.fillColor(CM).font('Helvetica').text((w.startDate||'')+' – '+(w.current?'Present':(w.endDate||'')),{align:'right'});
          y=doc.y+2;
          if(w.description){doc.fillColor(CD).fontSize(9).font('Helvetica').text(w.description,60,y,{width:PW});y=doc.y;}
          y+=8;
        });
      }
      if(resume.skills&&resume.skills.length){
        sMin('Skills');
        doc.fillColor(CD).fontSize(9).font('Helvetica').text(resume.skills.join(', '),60,y,{width:PW});
        y=doc.y+14;
      }
      if(resume.education&&resume.education.length){
        sMin('Education');
        resume.education.forEach(e=>{
          doc.fillColor(CD).fontSize(10).font('Helvetica-Bold').text((e.degree||'')+(e.fieldOfStudy?' in '+e.fieldOfStudy:''),60,y,{width:PW});y=doc.y;
          doc.fillColor(CP).fontSize(9).font('Helvetica-Bold').text(e.institution||'',60,y,{continued:true,width:PW/2});
          doc.fillColor(CM).font('Helvetica').text((e.startDate||'')+' – '+(e.endDate||''),{align:'right'});
          y=doc.y+8;
        });
      }
      if(resume.projects&&resume.projects.length){
        sMin('Projects');
        resume.projects.forEach(p=>{
          doc.fillColor(CD).fontSize(10).font('Helvetica-Bold').text(p.name||'',60,y,{width:PW});y=doc.y;
          if(p.techStack){doc.fillColor(CM).fontSize(8).font('Helvetica-Oblique').text(p.techStack,60,y,{width:PW});y=doc.y+2;}
          if(p.description){doc.fillColor(CD).fontSize(9).font('Helvetica').text(p.description,60,y,{width:PW});y=doc.y;}
          y+=8;
        });
      }
      if(resume.achievements&&resume.achievements.length){
        sMin('Achievements');
        resume.achievements.forEach(a=>{
          doc.fillColor(CD).fontSize(9.5).font('Helvetica-Bold').text('• '+(a.title||''),60,y,{width:PW});y=doc.y;
          if(a.description){doc.fillColor(CM).fontSize(9).font('Helvetica').text(a.description,68,y,{width:PW-8});y=doc.y;}
          y+=4;
        });
      }
      if(resume.certifications&&resume.certifications.length){
        sMin('Certifications');
        resume.certifications.forEach(c=>{
          doc.fillColor(CD).fontSize(9).font('Helvetica-Bold').text(c.name,60,y,{width:PW});y=doc.y;
          if(c.issuer){doc.fillColor(CM).fontSize(8).font('Helvetica').text(c.issuer,60,y,{width:PW});y=doc.y+4;}
        });
        y+=6;
      }
      if(resume.languages&&resume.languages.length){
        sMin('Languages');
        resume.languages.forEach(l=>{
          doc.fillColor(CD).fontSize(9).font('Helvetica-Bold').text(l.language,60,y,{continued:true,width:PW/2});
          doc.fillColor(CM).fontSize(9).font('Helvetica').text(l.proficiency,{align:'right'});
          y=doc.y+4;
        });
      }
    }

    doc.end();
  } catch (err) {
    console.error('Download PDF Error:', err);
    if (!res.headersSent) {
      res.status(500).json({
        success: false,
        message: 'Could not generate PDF. Please try again.',
      });
    }
  }
};

/* ── AI Text Generation (uses aiService for professional ATS-friendly content) ── */
exports.aiGenerate = async (req, res) => {
  try {
    const { type, jobTitle, company, skills, years, inputText, education, experienceSummary, projectName } = req.body;
    
    const result = await generateContent(type, {
      jobTitle,
      company,
      skills,
      years,
      inputText,
      education,
      experienceSummary,
      projectName,
    });
    
    res.json({ success: true, result });
  } catch (err) {
    console.error('AI Generation Error:', err);
    res.status(500).json({ success: false, message: 'AI generation failed.' });
  }
};

/* ────────────────────────────────────────────────────────────────────────────
   AJAX SECTION MANAGEMENT
   Individual CRUD operations for dynamic resume sections (workExperience,
   education, projects, certifications, languages, achievements, socialLinks)
──────────────────────────────────────────────────────────────────────────── */

const VALID_SECTIONS = ['workExperience', 'education', 'projects', 'certifications', 'languages', 'achievements', 'socialLinks'];

/**
 * POST /resume/:id/section/:sectionName
 * Add a new item to a specific section
 */
exports.addSectionItem = async (req, res) => {
  try {
    const { sectionName } = req.params;
    if (!VALID_SECTIONS.includes(sectionName)) {
      return res.status(400).json({ success: false, message: 'Invalid section name' });
    }

    const resume = await Resume.findOne({ _id: req.params.id, user: req.session.userId });
    if (!resume) {
      return res.status(404).json({ success: false, message: 'Resume not found' });
    }

    // Create new item with data from request body
    const newItem = req.body;
    resume[sectionName].push(newItem);
    resume.markModified(sectionName);
    await resume.save();

    // Return the newly created item with its _id
    const addedItem = resume[sectionName][resume[sectionName].length - 1];
    
    console.log(`[addSectionItem] Added item to ${sectionName}:`, addedItem._id);
    res.json({ success: true, item: addedItem });
  } catch (err) {
    console.error('Add section item error:', err);
    res.status(500).json({ success: false, message: 'Failed to add item' });
  }
};

/**
 * PUT /resume/:id/section/:sectionName/:itemId
 * Update an existing item in a section
 */
exports.updateSectionItem = async (req, res) => {
  try {
    const { sectionName, itemId } = req.params;
    if (!VALID_SECTIONS.includes(sectionName)) {
      return res.status(400).json({ success: false, message: 'Invalid section name' });
    }

    const resume = await Resume.findOne({ _id: req.params.id, user: req.session.userId });
    if (!resume) {
      return res.status(404).json({ success: false, message: 'Resume not found' });
    }

    // Find the item in the array
    const item = resume[sectionName].id(itemId);
    if (!item) {
      return res.status(404).json({ success: false, message: 'Item not found' });
    }

    // Update all fields from request body
    Object.keys(req.body).forEach(key => {
      item[key] = req.body[key];
    });

    resume.markModified(sectionName);
    await resume.save();

    console.log(`[updateSectionItem] Updated item in ${sectionName}:`, itemId);
    res.json({ success: true, item });
  } catch (err) {
    console.error('Update section item error:', err);
    res.status(500).json({ success: false, message: 'Failed to update item' });
  }
};

/**
 * DELETE /resume/:id/section/:sectionName/:itemId
 * Delete an item from a section
 */
exports.deleteSectionItem = async (req, res) => {
  try {
    const { sectionName, itemId } = req.params;
    if (!VALID_SECTIONS.includes(sectionName)) {
      return res.status(400).json({ success: false, message: 'Invalid section name' });
    }

    const resume = await Resume.findOne({ _id: req.params.id, user: req.session.userId });
    if (!resume) {
      return res.status(404).json({ success: false, message: 'Resume not found' });
    }

    // Remove the item using pull
    resume[sectionName].pull(itemId);
    resume.markModified(sectionName);
    await resume.save();

    console.log(`[deleteSectionItem] Deleted item from ${sectionName}:`, itemId);
    res.json({ success: true, message: 'Item deleted successfully' });
  } catch (err) {
    console.error('Delete section item error:', err);
    res.status(500).json({ success: false, message: 'Failed to delete item' });
  }
};

/**
 * POST /resume/:id/section/:sectionName/reorder
 * Reorder items in a section (drag-and-drop)
 */
exports.reorderSection = async (req, res) => {
  try {
    const { sectionName } = req.params;
    const { order } = req.body; // Array of item IDs in new order

    if (!VALID_SECTIONS.includes(sectionName)) {
      return res.status(400).json({ success: false, message: 'Invalid section name' });
    }

    if (!Array.isArray(order)) {
      return res.status(400).json({ success: false, message: 'Order must be an array of IDs' });
    }

    const resume = await Resume.findOne({ _id: req.params.id, user: req.session.userId });
    if (!resume) {
      return res.status(404).json({ success: false, message: 'Resume not found' });
    }

    // Create a map of items by ID
    const itemMap = {};
    resume[sectionName].forEach(item => {
      itemMap[item._id.toString()] = item;
    });

    // Rebuild array in new order
    const reordered = order.map(id => itemMap[id]).filter(Boolean);
    resume[sectionName] = reordered;
    resume.markModified(sectionName);
    await resume.save();

    console.log(`[reorderSection] Reordered ${sectionName}`);
    res.json({ success: true, message: 'Items reordered successfully' });
  } catch (err) {
    console.error('Reorder section error:', err);
    res.status(500).json({ success: false, message: 'Failed to reorder items' });
  }
};

/**
 * POST /resume/:id/section/:sectionName/:itemId/duplicate
 * Duplicate an item in a section
 */
exports.duplicateSectionItem = async (req, res) => {
  try {
    const { sectionName, itemId } = req.params;
    if (!VALID_SECTIONS.includes(sectionName)) {
      return res.status(400).json({ success: false, message: 'Invalid section name' });
    }

    const resume = await Resume.findOne({ _id: req.params.id, user: req.session.userId });
    if (!resume) {
      return res.status(404).json({ success: false, message: 'Resume not found' });
    }

    // Find the item to duplicate
    const item = resume[sectionName].id(itemId);
    if (!item) {
      return res.status(404).json({ success: false, message: 'Item not found' });
    }

    // Create a copy (remove _id so MongoDB generates a new one)
    const itemCopy = item.toObject();
    delete itemCopy._id;
    
    // Add " (Copy)" to title/name field if it exists
    const titleField = itemCopy.title || itemCopy.name || itemCopy.jobTitle;
    if (itemCopy.title) itemCopy.title += ' (Copy)';
    if (itemCopy.name) itemCopy.name += ' (Copy)';
    if (itemCopy.jobTitle) itemCopy.jobTitle += ' (Copy)';

    resume[sectionName].push(itemCopy);
    resume.markModified(sectionName);
    await resume.save();

    const duplicatedItem = resume[sectionName][resume[sectionName].length - 1];
    console.log(`[duplicateSectionItem] Duplicated item in ${sectionName}:`, duplicatedItem._id);
    res.json({ success: true, item: duplicatedItem });
  } catch (err) {
    console.error('Duplicate section item error:', err);
    res.status(500).json({ success: false, message: 'Failed to duplicate item' });
  }
};

/* ── Job Description Match ── */
exports.renderMatch = async (req, res) => {
  try {
    const resume = await ownsResume(req, res);
    if (!resume) return; // ownsResume already redirected
    res.render('resume/match', { resume, title: 'Job Description Match' });
  } catch (err) {
    console.error(err);
    req.flash('error', 'Failed to load job match page.');
    res.redirect('/dashboard');
  }
};

exports.calculateMatch = async (req, res) => {
  try {
    const resume = await ownsResume(req, res);
    if (!resume) return res.status(404).json({ success: false, message: 'Resume not found' });
    const { jobDescription } = req.body;
    if (!jobDescription) return res.json({ success: false, message: 'Job description required' });

    const jdText = jobDescription.toLowerCase();
    const resumeText = [
      resume.summary || '',
      resume.skills ? resume.skills.join(' ') : '',
      resume.workExperience ? resume.workExperience.map(w => w.description || '').join(' ') : '',
      resume.projects ? resume.projects.map(p => p.description || '').join(' ') : ''
    ].join(' ').toLowerCase();

    const stopWords = ['about', 'their', 'there', 'which', 'would', 'could', 'should', 'these', 'those', 'please', 'required', 'experience', 'years', 'working', 'knowledge', 'understanding', 'ability', 'strong', 'excellent', 'skills'];
    const rawWords = jdText.match(/[a-z]+/g) || [];
    const uniqueWords = [...new Set(rawWords)].filter(w => w.length > 3 && !stopWords.includes(w));

    const found = [];
    const missing = [];

    uniqueWords.forEach(w => {
      if (resumeText.includes(w)) found.push(w);
      else missing.push(w);
    });

    const totalKeywords = found.length + missing.length;
    const matchPercentage = totalKeywords > 0 ? Math.round((found.length / totalKeywords) * 100) : 0;
    const topMissing = missing.slice(0, 15);

    res.json({
      success: true,
      matchPercentage,
      foundKeywords: found.slice(0, 15),
      missingKeywords: topMissing,
      tips: [
        `You match ${matchPercentage}% of the keywords extracted from the job description.`,
        topMissing.length > 0 ? `Consider adding these keywords if you have the experience: ${topMissing.slice(0, 5).join(', ')}.` : 'Great job! You have all the key terms.',
        'Ensure your work experience explicitly demonstrates the required skills in action.'
      ]
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error during matching' });
  }
};

/* ── Export to DOCX ── */
exports.downloadDOCX = async (req, res) => {
  try {
    const resume = await ownsResume(req, res);
    if (!resume) return;
    // Since building a full DOCX via the "docx" package requires hundreds of lines of code,
    // we use a simplified HTML-based DOC export trick which opens perfectly in MS Word.
    // Word reads HTML with .doc/.docx extension and renders it.
    
    // Increment download count
    Resume.findByIdAndUpdate(req.params.id, { $inc: { downloadCount: 1 } }).catch(() => {});

    let html = `
      <html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
      <head><meta charset='utf-8'><title>${resume.title}</title>
      <style>
        body { font-family: Arial, sans-serif; font-size: 11pt; color: #000; }
        h1 { font-size: 24pt; margin-bottom: 5px; }
        h2 { font-size: 14pt; border-bottom: 1px solid #ccc; margin-top: 15px; margin-bottom: 5px; }
        p { margin: 0 0 5px 0; }
        .contact { font-size: 10pt; color: #555; margin-bottom: 15px; }
      </style>
      </head><body>
      <h1>${resume.personalInfo.fullName || resume.title}</h1>
      <div class="contact">
        ${resume.personalInfo.email} | ${resume.personalInfo.phone} | ${resume.personalInfo.city}
      </div>
    `;

    if (resume.summary) {
      html += `<h2>Professional Summary</h2><p>${resume.summary}</p>`;
    }
    if (resume.skills && resume.skills.length) {
      html += `<h2>Skills</h2><p>${resume.skills.join(', ')}</p>`;
    }
    if (resume.workExperience && resume.workExperience.length) {
      html += `<h2>Work Experience</h2>`;
      resume.workExperience.forEach(w => {
        html += `<p><strong>${w.jobTitle}</strong> at <em>${w.company}</em> (${w.startDate} - ${w.endDate || 'Present'})<br/>${w.description ? w.description.replace(/\\n/g, '<br/>') : ''}</p>`;
      });
    }
    if (resume.education && resume.education.length) {
      html += `<h2>Education</h2>`;
      resume.education.forEach(e => {
        html += `<p><strong>${e.degree}</strong> in ${e.fieldOfStudy} - <em>${e.institution}</em> (${e.startDate} - ${e.endDate})</p>`;
      });
    }
    
    html += `</body></html>`;

    res.setHeader('Content-Type', 'application/vnd.ms-word');
    res.setHeader('Content-Disposition', `attachment; filename=${resume.title.replace(/\s+/g, '_')}.doc`);
    res.send(html);

  } catch (err) {
    console.error('DOCX Export Error:', err);
    req.flash('error', 'Could not generate DOCX.');
    res.redirect('/dashboard');
  }
};

exports.toggleShare = async (req, res) => {
  try {
    const resume = await Resume.findOne({ _id: req.params.id, user: req.session.userId });
    if (!resume) {
      return res.status(404).json({ success: false, message: 'Resume not found' });
    }
    
    resume.isPublic = !resume.isPublic;
    await resume.save();

    res.json({
      success: true,
      isPublic: resume.isPublic,
      message: `Sharing is now ${resume.isPublic ? 'enabled' : 'disabled'}`
    });
  } catch (err) {
    console.error('Toggle Share Error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

/**
 * POST /resume/:id/set-template
 * Real-time template switch without losing data.
 */
exports.setTemplate = async (req, res) => {
  try {
    const resume = await Resume.findOne({ _id: req.params.id, user: req.session.userId });
    if (!resume) return res.status(404).json({ success: false });
    
    const VALID = ['modern','classic','minimal','professional','executive','creative','compact','tech','elegant','ats-professional','minimal-pro','modern-gradient','sharp'];
    const tpl = req.body.template;
    if (!VALID.includes(tpl)) return res.status(400).json({ success: false, message: 'Invalid template' });
    
    resume.template = tpl;
    await resume.save();
    res.json({ success: true, template: tpl });
  } catch (err) {
    console.error('Set Template Error:', err);
    res.status(500).json({ success: false });
  }
};


/**
 * POST /resume/:id/upload-photo
 * Dedicated multipart endpoint for profile photo uploads.
 * Uses multer (configured in routes/resume.js) via handleUpload middleware.
 * Returns JSON so the form page can update the preview without a page reload.
 */
exports.uploadPhoto = async (req, res) => {
  try {
    const doc = await Resume.findOne({ _id: req.params.id, user: req.session.userId });
    if (!doc) return res.status(404).json({ success: false, message: 'Resume not found.' });

    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No file uploaded.' });
    }

    // Delete the old photo file from disk if one existed
    if (doc.personalInfo.photo) {
      const oldPath = path.join(__dirname, '../public', doc.personalInfo.photo);
      fs.unlink(oldPath, () => {}); // ignore if already gone
    }

    const photoUrl = '/uploads/photos/' + req.file.filename;
    doc.personalInfo.photo = photoUrl;
    doc.markModified('personalInfo');
    await doc.save();

    res.json({ success: true, photoUrl });
  } catch (err) {
    console.error('Upload Photo Error:', err);
    // Clean up the uploaded file if save failed
    if (req.file) {
      fs.unlink(path.join(__dirname, '../public/uploads/photos', req.file.filename), () => {});
    }
    res.status(500).json({ success: false, message: 'Could not save photo.' });
  }
};

/**
 * POST /resume/:id/remove-photo
 * Removes the profile photo from the resume and deletes the file from disk.
 * Returns JSON.
 */
exports.removePhoto = async (req, res) => {
  const fs   = require('fs');
  const path = require('path');
  try {
    const doc = await Resume.findOne({ _id: req.params.id, user: req.session.userId });
    if (!doc) return res.status(404).json({ success: false, message: 'Resume not found.' });

    if (doc.personalInfo.photo) {
      const oldPath = path.join(__dirname, '../public', doc.personalInfo.photo);
      fs.unlink(oldPath, () => {});
    }

    doc.personalInfo.photo = '';
    doc.markModified('personalInfo');
    await doc.save();

    res.json({ success: true });
  } catch (err) {
    console.error('Remove Photo Error:', err);
    res.status(500).json({ success: false, message: 'Could not remove photo.' });
  }
};

/* ── Version History ── */
exports.listVersions = async (req, res) => {
  try {
    const resume = await ownsResume(req, res);
    if (!resume) return;

    const versions = await ResumeVersion.find({ resumeId: req.params.id })
      .sort({ versionNumber: -1 })
      .lean();

    res.render('resume/versions', {
      title: 'Version History – ' + resume.title,
      resume,
      versions,
    });
  } catch (err) {
    console.error('List Versions Error:', err);
    req.flash('error', 'Could not load version history.');
    res.redirect('/resume/' + req.params.id + '/preview');
  }
};

exports.previewVersion = async (req, res) => {
  try {
    const resume = await ownsResume(req, res);
    if (!resume) return;

    const version = await ResumeVersion.findOne({
      resumeId: req.params.id,
      versionNumber: req.params.versionNumber,
    }).lean();

    if (!version) {
      req.flash('error', 'Version not found.');
      return res.redirect('/resume/' + req.params.id + '/versions');
    }

    const versionResume = {
      ...resume,
      ...version.snapshot,
      _isVersion: true,
      _versionNumber: version.versionNumber,
      _versionDate: version.createdAt,
    };

    const pi = versionResume.personalInfo || {};
    const contact = [];
    if (pi.email) contact.push(pi.email);
    if (pi.phone) contact.push(pi.phone);
    if (pi.website) contact.push(pi.website);
    if (pi.city || pi.country) contact.push([pi.city, pi.country].filter(Boolean).join(', '));

    const VALID_TEMPLATES = ['modern','classic','minimal','professional','executive','creative','compact','tech','elegant','ats-professional','minimal-pro','modern-gradient','sharp'];
    const tpl = VALID_TEMPLATES.includes(versionResume.template) ? versionResume.template : 'modern';

    res.render('resume/preview', {
      title: `Version ${version.versionNumber} – ${resume.title}`,
      resume: versionResume,
      tpl,
      pi,
      contact,
      isShared: false,
    });
  } catch (err) {
    console.error('Preview Version Error:', err);
    req.flash('error', 'Could not load version preview.');
    res.redirect('/resume/' + req.params.id + '/versions');
  }
};

exports.restoreVersion = async (req, res) => {
  try {
    const owned = await ownsResume(req, res);
    if (!owned) return;

    const version = await ResumeVersion.findOne({
      resumeId: req.params.id,
      versionNumber: req.params.versionNumber,
    }).lean();

    if (!version) {
      req.flash('error', 'Version not found.');
      return res.redirect('/resume/' + req.params.id + '/versions');
    }

    const doc = await Resume.findById(req.params.id);
    if (!doc) {
      req.flash('error', 'Resume not found.');
      return res.redirect('/dashboard');
    }

    // Save current state as a new version before restoring
    try {
      const lastVersion = await ResumeVersion.findOne({ resumeId: req.params.id })
        .sort({ versionNumber: -1 })
        .lean();
      const nextVersionNumber = lastVersion ? lastVersion.versionNumber + 1 : 1;
      
      const currentSnapshot = {
        title: doc.title,
        template: doc.template,
        summary: doc.summary,
        personalInfo: doc.personalInfo,
        skills: doc.skills,
        education: doc.education,
        workExperience: doc.workExperience,
        projects: doc.projects,
        certifications: doc.certifications,
        languages: doc.languages,
        achievements: doc.achievements,
        socialLinks: doc.socialLinks,
        atsScore: doc.atsScore,
      };
      
      await ResumeVersion.create({
        resumeId: req.params.id,
        versionNumber: nextVersionNumber,
        snapshot: currentSnapshot,
      });
    } catch (versionErr) {
      console.error('Version save error during restore (non-critical):', versionErr);
    }

    // Restore from the selected version
    doc.title = version.snapshot.title;
    doc.template = version.snapshot.template;
    doc.summary = version.snapshot.summary;
    doc.personalInfo = version.snapshot.personalInfo;
    doc.skills = version.snapshot.skills;
    doc.education = version.snapshot.education;
    doc.workExperience = version.snapshot.workExperience;
    doc.projects = version.snapshot.projects;
    doc.certifications = version.snapshot.certifications;
    doc.languages = version.snapshot.languages;
    doc.achievements = version.snapshot.achievements;
    doc.socialLinks = version.snapshot.socialLinks;
    doc.atsScore = version.snapshot.atsScore;

    doc.markModified('personalInfo');
    doc.markModified('skills');
    doc.markModified('education');
    doc.markModified('workExperience');
    doc.markModified('projects');
    doc.markModified('certifications');
    doc.markModified('languages');
    doc.markModified('achievements');
    doc.markModified('socialLinks');

    await doc.save();

    req.flash('success', `Version ${version.versionNumber} restored successfully!`);
    res.redirect('/resume/' + req.params.id + '/preview');
  } catch (err) {
    console.error('Restore Version Error:', err);
    req.flash('error', 'Could not restore version.');
    res.redirect('/resume/' + req.params.id + '/versions');
  }
};
