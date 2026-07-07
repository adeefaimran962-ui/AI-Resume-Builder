/**
 * controllers/coverLetterController.js
 * Cover Letter CRUD, preview, PDF download — linked to resumes.
 */
'use strict';

const CoverLetter = require('../models/CoverLetter');
const Resume      = require('../models/Resume');
const PDFDocument = require('pdfkit');
const { generateContent } = require('../lib/aiService');

const ownsCoverLetter = async (req, res) => {
  const letter = await CoverLetter.findById(req.params.id).lean();
  if (!letter) {
    req.flash('error', 'Cover letter not found.');
    res.redirect('/dashboard');
    return null;
  }
  if (String(letter.user) !== String(req.session.userId)) {
    req.flash('error', 'Not authorized.');
    res.redirect('/dashboard');
    return null;
  }
  // Exclude soft-deleted letters from normal operations (except restore/permanent delete)
  if (letter.isDeleted && !req.path.includes('/restore') && !req.path.includes('/permanent')) {
    req.flash('error', 'Cover letter is in trash. Restore it first.');
    res.redirect('/dashboard');
    return null;
  }
  return letter;
};

const parseCoverLetterBody = (body) => ({
  title: (body.title || 'My Cover Letter').trim(),
  resume: body.resumeId || body.resume || null,
  personalInfo: {
    fullName: (body.fullName || '').trim(),
    email:    (body.email    || '').trim(),
    phone:    (body.phone    || '').trim(),
    address:  (body.address  || '').trim(),
  },
  employerInfo: {
    companyName:   (body.companyName   || '').trim(),
    hiringManager: (body.hiringManager || '').trim(),
    address:       (body.employerAddress || body.address || '').trim(),
  },
  jobTitle: (body.jobTitle || '').trim(),
  date:     (body.date || new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })).trim(),
  content:  (body.content || '').trim(),
});

const getUserResumes = (userId) =>
  Resume.find({ user: userId, isDeleted: { $ne: true } })
    .sort({ updatedAt: -1 })
    .select('title personalInfo.fullName personalInfo.jobTitle')
    .lean();

/* ── Get Cover Letter by Resume ID ──────────────────────────────────────────── */
exports.getByResume = async (req, res) => {
  try {
    const resumeId = req.params.resumeId;
    const coverLetter = await CoverLetter.findOne({ 
      resume: resumeId, 
      user: req.session.userId 
    }).lean();
    
    if (!coverLetter) {
      return res.json({ success: false, message: 'No cover letter found for this resume.' });
    }
    
    res.json({ success: true, coverLetter });
  } catch (err) {
    console.error('Get Cover Letter by Resume Error:', err);
    res.status(500).json({ success: false, message: 'Error fetching cover letter.' });
  }
};

/** GET /cover-letter/new */
exports.showCreateForm = async (req, res) => {
  try {
    const resumes = await getUserResumes(req.session.userId);
    let prefill = null;
    const resumeId = req.query.resumeId;

    if (resumeId) {
      const resume = await Resume.findOne({
        _id: resumeId,
        user: req.session.userId,
        isDeleted: { $ne: true },
      }).lean();
      if (resume) {
        prefill = {
          resume: resume._id,
          title: `Cover Letter – ${resume.title}`,
          personalInfo: resume.personalInfo || {},
          jobTitle: resume.personalInfo?.jobTitle || '',
        };
      }
    }

    res.render('cover-letter/form', {
      title: 'Create Cover Letter',
      letter: prefill,
      resumes,
      action: '/cover-letter',
      method: 'POST',
      errors: [],
    });
  } catch (err) {
    console.error('Cover Letter Create Form Error:', err);
    req.flash('error', 'Could not load cover letter form.');
    res.redirect('/dashboard');
  }
};

/** POST /cover-letter */
exports.create = async (req, res) => {
  try {
    if (!req.session?.userId) {
      req.flash('error', 'Session expired. Please log in again.');
      return res.redirect('/auth/login');
    }

    const data = parseCoverLetterBody(req.body);
    if (!data.title) {
      const resumes = await getUserResumes(req.session.userId);
      return res.status(400).render('cover-letter/form', {
        title: 'Create Cover Letter',
        letter: data,
        resumes,
        action: '/cover-letter',
        method: 'POST',
        errors: ['Cover letter title is required.'],
      });
    }

    if (data.resume) {
      const linked = await Resume.findOne({ _id: data.resume, user: req.session.userId }).lean();
      if (!linked) data.resume = null;
    }

    const letter = new CoverLetter({ user: req.session.userId, ...data });
    await letter.save();

    req.flash('success', 'Cover letter created successfully!');
    res.redirect('/cover-letter/' + letter._id + '/preview');
  } catch (err) {
    console.error('Create Cover Letter Error:', err);
    req.flash('error', 'Could not create cover letter.');
    res.redirect('/cover-letter/new');
  }
};

/** GET /cover-letter/:id/edit */
exports.showEditForm = async (req, res) => {
  try {
    const letter = await ownsCoverLetter(req, res);
    if (!letter) return;

    const resumes = await getUserResumes(req.session.userId);
    res.render('cover-letter/form', {
      title: 'Edit – ' + letter.title,
      letter,
      resumes,
      action: '/cover-letter/' + letter._id + '?_method=PUT',
      method: 'POST',
      errors: [],
    });
  } catch (err) {
    console.error('Cover Letter Edit Form Error:', err);
    req.flash('error', 'Could not load cover letter.');
    res.redirect('/dashboard');
  }
};

/** PUT /cover-letter/:id */
exports.update = async (req, res) => {
  try {
    const owned = await ownsCoverLetter(req, res);
    if (!owned) return;

    const data = parseCoverLetterBody(req.body);
    const doc = await CoverLetter.findById(req.params.id);
    if (!doc) {
      req.flash('error', 'Cover letter not found.');
      return res.redirect('/dashboard');
    }

    doc.title = data.title;
    doc.jobTitle = data.jobTitle;
    doc.date = data.date;
    doc.content = data.content;
    doc.personalInfo.fullName = data.personalInfo.fullName;
    doc.personalInfo.email    = data.personalInfo.email;
    doc.personalInfo.phone    = data.personalInfo.phone;
    doc.personalInfo.address  = data.personalInfo.address;
    doc.employerInfo.companyName   = data.employerInfo.companyName;
    doc.employerInfo.hiringManager = data.employerInfo.hiringManager;
    doc.employerInfo.address       = data.employerInfo.address;

    if (data.resume) {
      const linked = await Resume.findOne({ _id: data.resume, user: req.session.userId }).lean();
      doc.resume = linked ? data.resume : doc.resume;
    } else {
      doc.resume = null;
    }

    doc.markModified('personalInfo');
    doc.markModified('employerInfo');
    await doc.save();

    req.flash('success', 'Cover letter updated successfully!');
    res.redirect('/cover-letter/' + req.params.id + '/preview');
  } catch (err) {
    console.error('Update Cover Letter Error:', err);
    req.flash('error', 'Could not update cover letter.');
    res.redirect('/cover-letter/' + req.params.id + '/edit');
  }
};

/** DELETE /cover-letter/:id (soft delete - move to trash) */
exports.destroy = async (req, res) => {
  try {
    const letter = await ownsCoverLetter(req, res);
    if (!letter) return;

    letter.isDeleted = true;
    letter.deletedAt = new Date();
    await letter.save();
    req.flash('success', 'Cover letter moved to trash.');
    res.redirect('/dashboard');
  } catch (err) {
    console.error('Delete Cover Letter Error:', err);
    req.flash('error', 'Could not delete cover letter.');
    res.redirect('/dashboard');
  }
};

/** POST /cover-letter/:id/restore (restore from trash) */
exports.restore = async (req, res) => {
  try {
    const letter = await ownsCoverLetter(req, res);
    if (!letter) return;

    letter.isDeleted = false;
    letter.deletedAt = null;
    await letter.save();
    req.flash('success', 'Cover letter restored.');
    res.redirect('/dashboard');
  } catch (err) {
    console.error('Restore Cover Letter Error:', err);
    req.flash('error', 'Could not restore cover letter.');
    res.redirect('/dashboard');
  }
};

/** DELETE /cover-letter/:id/permanent (permanent delete) */
exports.destroyPermanent = async (req, res) => {
  try {
    const letter = await ownsCoverLetter(req, res);
    if (!letter) return;

    await CoverLetter.findByIdAndDelete(req.params.id);
    req.flash('success', 'Cover letter permanently deleted.');
    res.redirect('/dashboard');
  } catch (err) {
    console.error('Permanent Delete Cover Letter Error:', err);
    req.flash('error', 'Could not permanently delete cover letter.');
    res.redirect('/dashboard');
  }
};

/** GET /cover-letter/:id/preview */
exports.preview = async (req, res) => {
  try {
    const letter = await ownsCoverLetter(req, res);
    if (!letter) return;

    let linkedResume = null;
    if (letter.resume) {
      linkedResume = await Resume.findById(letter.resume).select('title').lean();
    }

    res.render('cover-letter/preview', {
      title: 'Preview – ' + letter.title,
      letter,
      linkedResume,
    });
  } catch (err) {
    console.error('Cover Letter Preview Error:', err);
    req.flash('error', 'Could not load preview.');
    res.redirect('/dashboard');
  }
};

/** GET /cover-letter/:id/download */
exports.downloadPDF = async (req, res) => {
  try {
    const letter = await ownsCoverLetter(req, res);
    if (!letter) return;

    const pi = letter.personalInfo || {};
    const ei = letter.employerInfo || {};
    const fn = ((pi.fullName || 'cover_letter').replace(/\s+/g, '_')) + '_cover_letter.pdf';

    const doc = new PDFDocument({ size: 'A4', margins: { top: 72, bottom: 72, left: 72, right: 72 } });
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename="' + fn + '"');
    doc.pipe(res);

    const PW = doc.page.width - 144;
    let y = 72;

    // Sender block
    doc.fillColor('#1E293B').fontSize(11).font('Helvetica-Bold').text(pi.fullName || '', 72, y, { width: PW });
    y = doc.y + 4;
    const senderLines = [pi.address, pi.email, pi.phone].filter(Boolean);
    senderLines.forEach(line => {
      doc.fillColor('#64748B').fontSize(10).font('Helvetica').text(line, 72, y, { width: PW });
      y = doc.y + 2;
    });
    y += 16;

    // Date
    if (letter.date) {
      doc.fillColor('#64748B').fontSize(10).font('Helvetica').text(letter.date, 72, y, { width: PW });
      y = doc.y + 16;
    }

    // Recipient block
    const recipient = [ei.hiringManager, ei.companyName, ei.address].filter(Boolean);
    recipient.forEach(line => {
      doc.fillColor('#1E293B').fontSize(10).font('Helvetica').text(line, 72, y, { width: PW });
      y = doc.y + 2;
    });
    y += 20;

    // Body
    const content = letter.content || '';
    doc.fillColor('#1E293B').fontSize(11).font('Helvetica').text(content, 72, y, {
      width: PW,
      align: 'left',
      lineGap: 6,
    });

    doc.end();
  } catch (err) {
    console.error('Cover Letter PDF Error:', err);
    req.flash('error', 'Could not generate PDF.');
    res.redirect('/dashboard');
  }
};

/** POST /cover-letter/ai/generate */
exports.aiGenerate = async (req, res) => {
  try {
    const { jobTitle, company, skills, inputText, fullName, hiringManager } = req.body;
    const result = await generateContent('coverletter', {
      jobTitle,
      company,
      skills,
      inputText,
      fullName,
      hiringManager,
    });
    res.json({ success: true, result });
  } catch (err) {
    console.error('Cover Letter AI Error:', err);
    res.status(500).json({ success: false, message: 'AI generation failed.' });
  }
};
