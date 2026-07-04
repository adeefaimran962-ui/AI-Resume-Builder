/**
 * controllers/resumeController.js
 * ----------------------------------------------------------
 * Full CRUD + PDF generation for resumes.
 *
 * Routes handled:
 *   GET    /resume/new          – showCreateForm
 *   POST   /resume              – create
 *   GET    /resume/:id/edit     – showEditForm
 *   PUT    /resume/:id          – update
 *   DELETE /resume/:id          – destroy
 *   GET    /resume/:id/preview  – preview
 *   GET    /resume/:id/download – downloadPDF
 * ----------------------------------------------------------
 */

const Resume = require('../models/Resume');
const PDFDocument = require('pdfkit');

// ── Helpers ───────────────────────────────────────────────

/**
 * ownsResume
 * Fetches a resume and confirms ownership.
 * Returns null + 403 response if the resume doesn't belong to
 * the current session user.
 */
const ownsResume = async (req, res) => {
  const resume = await Resume.findById(req.params.id).lean();
  if (!resume) {
    req.flash('error', 'Resume not found.');
    res.redirect('/dashboard');
    return null;
  }
  if (String(resume.user) !== String(req.session.userId)) {
    req.flash('error', 'You are not authorized to access this resume.');
    res.redirect('/dashboard');
    return null;
  }
  return resume;
};

/**
 * parseResumeBody
 * Converts the flat form body into the nested Resume schema structure.
 * Handles arrays of sub-documents sent as indexed form fields.
 */
const parseResumeBody = (body) => {
  const {
    title, template, summary,
    // personalInfo flat fields
    fullName, email, phone, address, city, country, zipCode, website, jobTitle,
    // skills – comma-separated string
    skillsRaw,
  } = body;

  // ── Skills: split comma-separated string into array ───
  const skills = skillsRaw
    ? skillsRaw.split(',').map(s => s.trim()).filter(Boolean)
    : [];

  // ── Helper: extract indexed sub-document arrays ────────
  // Form sends e.g. education[0][institution], education[1][institution]
  // Express body-parser leaves these as: body['education[0][institution]']
  // We need to rebuild them into an array of objects.
  const extractArray = (prefix, fields) => {
    const map = {};
    Object.keys(body).forEach(key => {
      const match = key.match(new RegExp(`^${prefix}\\[(\\d+)\\]\\[(.+)\\]$`));
      if (match) {
        const idx   = parseInt(match[1], 10);
        const field = match[2];
        if (!map[idx]) map[idx] = {};
        map[idx][field] = body[key];
      }
    });
    // Convert map to sorted array and filter out entirely empty entries
    return Object.keys(map)
      .sort((a, b) => a - b)
      .map(k => map[k])
      .filter(item => Object.values(item).some(v => v && v.trim && v.trim() !== ''));
  };

  return {
    title:     title ? title.trim() : 'My Resume',
    template:  template || 'modern',
    summary:   summary ? summary.trim() : '',
    personalInfo: {
      fullName: fullName ? fullName.trim() : '',
      email:    email    ? email.trim()    : '',
      phone:    phone    ? phone.trim()    : '',
      address:  address  ? address.trim()  : '',
      city:     city     ? city.trim()     : '',
      country:  country  ? country.trim()  : '',
      zipCode:  zipCode  ? zipCode.trim()  : '',
      website:  website  ? website.trim()  : '',
      jobTitle: jobTitle ? jobTitle.trim() : '',
    },
    skills,
    education:      extractArray('education',      ['institution','degree','fieldOfStudy','startDate','endDate','grade','description']),
    workExperience: extractArray('workExperience', ['company','jobTitle','location','startDate','endDate','current','description']),
    projects:       extractArray('projects',       ['name','description','techStack','link','startDate','endDate']),
    certifications: extractArray('certifications', ['name','issuer','issueDate','expiryDate','credentialId','url']),
    languages:      extractArray('languages',      ['language','proficiency']),
    achievements:   extractArray('achievements',   ['title','description','date']),
    socialLinks:    extractArray('socialLinks',    ['platform','url']),
  };
};

// ── GET /resume/new ───────────────────────────────────────
exports.showCreateForm = (req, res) => {
  res.render('resume/form', {
    title:  'Create New Resume – AI Resume Builder',
    resume: null,   // null signals "create mode" to the template
    action: '/resume',
    method: 'POST',
    errors: [],
  });
};

// ── POST /resume ──────────────────────────────────────────
exports.create = async (req, res) => {
  try {
    const data = parseResumeBody(req.body);

    if (!data.title) {
      return res.status(400).render('resume/form', {
        title:  'Create New Resume – AI Resume Builder',
        resume: null,
        action: '/resume',
        method: 'POST',
        errors: ['Resume title is required.'],
      });
    }

    const resume = await Resume.create({
      user: req.session.userId,
      ...data,
    });

    req.flash('success', 'Resume created successfully!');
    res.redirect(`/resume/${resume._id}/preview`);
  } catch (err) {
    console.error('Create Resume Error:', err);
    req.flash('error', 'Could not create resume. Please try again.');
    res.redirect('/resume/new');
  }
};

// ── GET /resume/:id/edit ──────────────────────────────────
exports.showEditForm = async (req, res) => {
  try {
    const resume = await ownsResume(req, res);
    if (!resume) return;

    res.render('resume/form', {
      title:  `Edit Resume – ${resume.title}`,
      resume,
      action: `/resume/${resume._id}?_method=PUT`,
      method: 'POST',
      errors: [],
    });
  } catch (err) {
    console.error('Edit Form Error:', err);
    req.flash('error', 'Could not load resume for editing.');
    res.redirect('/dashboard');
  }
};

// ── PUT /resume/:id ───────────────────────────────────────
exports.update = async (req, res) => {
  try {
    const resume = await ownsResume(req, res);
    if (!resume) return;

    const data = parseResumeBody(req.body);

    await Resume.findByIdAndUpdate(req.params.id, data, {
      new:          true,
      runValidators: true,
    });

    req.flash('success', 'Resume updated successfully!');
    res.redirect(`/resume/${req.params.id}/preview`);
  } catch (err) {
    console.error('Update Resume Error:', err);
    req.flash('error', 'Could not update resume. Please try again.');
    res.redirect(`/resume/${req.params.id}/edit`);
  }
};

// ── DELETE /resume/:id ────────────────────────────────────
exports.destroy = async (req, res) => {
  try {
    const resume = await ownsResume(req, res);
    if (!resume) return;

    await Resume.findByIdAndDelete(req.params.id);

    req.flash('success', 'Resume deleted successfully.');
    res.redirect('/dashboard');
  } catch (err) {
    console.error('Delete Resume Error:', err);
    req.flash('error', 'Could not delete resume. Please try again.');
    res.redirect('/dashboard');
  }
};

// ── GET /resume/:id/preview ───────────────────────────────
exports.preview = async (req, res) => {
  try {
    const resume = await ownsResume(req, res);
    if (!resume) return;

    res.render('resume/preview', {
      title:  `Preview – ${resume.title}`,
      resume,
    });
  } catch (err) {
    console.error('Preview Error:', err);
    req.flash('error', 'Could not load resume preview.');
    res.redirect('/dashboard');
  }
};

// ── GET /resume/:id/download ──────────────────────────────
exports.downloadPDF = async (req, res) => {
  try {
    const resume = await ownsResume(req, res);
    if (!resume) return;

    // ── Build PDF with PDFKit ──────────────────────────
    const doc = new PDFDocument({
      size: 'A4',
      margins: { top: 50, bottom: 50, left: 60, right: 60 },
      info: {
        Title:  resume.title,
        Author: resume.personalInfo.fullName || 'AI Resume Builder',
      },
    });

    // Stream the PDF directly to the response
    const filename = `${(resume.personalInfo.fullName || 'resume').replace(/\s+/g, '_')}_resume.pdf`;
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    doc.pipe(res);

    // ── Color Palette ──────────────────────────────────
    const COLOR_PRIMARY   = '#2563EB'; // blue-600
    const COLOR_DARK      = '#1E293B'; // slate-800
    const COLOR_MUTED     = '#64748B'; // slate-500
    const COLOR_LIGHT_BG  = '#F1F5F9'; // slate-100
    const PAGE_WIDTH      = doc.page.width  - 120; // usable width
    const COL_LEFT_WIDTH  = 180;
    const COL_RIGHT_START = 60 + COL_LEFT_WIDTH + 20;
    const COL_RIGHT_WIDTH = PAGE_WIDTH - COL_LEFT_WIDTH - 20;

    // ── Header ─────────────────────────────────────────
    doc.rect(0, 0, doc.page.width, 130).fill(COLOR_PRIMARY);

    const pi = resume.personalInfo;

    doc.fillColor('#FFFFFF')
       .fontSize(26)
       .font('Helvetica-Bold')
       .text(pi.fullName || resume.title, 60, 40, { width: PAGE_WIDTH });

    if (pi.jobTitle) {
      doc.fontSize(13)
         .font('Helvetica')
         .text(pi.jobTitle, 60, 75, { width: PAGE_WIDTH });
    }

    // Contact line
    const contactParts = [pi.email, pi.phone, pi.city && pi.country ? `${pi.city}, ${pi.country}` : (pi.city || pi.country), pi.website].filter(Boolean);
    if (contactParts.length) {
      doc.fontSize(9)
         .fillColor('#BFDBFE')
         .text(contactParts.join('  |  '), 60, 105, { width: PAGE_WIDTH });
    }

    // ── Left Column Background ─────────────────────────
    doc.rect(0, 130, 60 + COL_LEFT_WIDTH, doc.page.height - 130).fill(COLOR_LIGHT_BG);

    // ── Helper functions ───────────────────────────────

    const sectionHeadingLeft = (text, y) => {
      doc.fillColor(COLOR_PRIMARY)
         .fontSize(10)
         .font('Helvetica-Bold')
         .text(text.toUpperCase(), 60, y, { width: COL_LEFT_WIDTH });
      doc.moveTo(60, doc.y + 2).lineTo(60 + COL_LEFT_WIDTH, doc.y + 2)
         .strokeColor(COLOR_PRIMARY).lineWidth(1).stroke();
      return doc.y + 6;
    };

    const sectionHeadingRight = (text, y) => {
      doc.fillColor(COLOR_PRIMARY)
         .fontSize(11)
         .font('Helvetica-Bold')
         .text(text.toUpperCase(), COL_RIGHT_START, y, { width: COL_RIGHT_WIDTH });
      doc.moveTo(COL_RIGHT_START, doc.y + 2)
         .lineTo(COL_RIGHT_START + COL_RIGHT_WIDTH, doc.y + 2)
         .strokeColor(COLOR_PRIMARY).lineWidth(1).stroke();
      return doc.y + 6;
    };

    // ── LEFT COLUMN ────────────────────────────────────
    let leftY = 148;

    // Skills
    if (resume.skills && resume.skills.length) {
      leftY = sectionHeadingLeft('Skills', leftY);
      resume.skills.forEach(skill => {
        doc.fillColor(COLOR_DARK)
           .fontSize(9)
           .font('Helvetica')
           .text(`• ${skill}`, 60, leftY, { width: COL_LEFT_WIDTH });
        leftY = doc.y + 2;
      });
      leftY += 10;
    }

    // Languages
    if (resume.languages && resume.languages.length) {
      leftY = sectionHeadingLeft('Languages', leftY);
      resume.languages.forEach(l => {
        doc.fillColor(COLOR_DARK)
           .fontSize(9)
           .font('Helvetica-Bold')
           .text(l.language, 60, leftY, { width: COL_LEFT_WIDTH, continued: false });
        leftY = doc.y;
        doc.fillColor(COLOR_MUTED)
           .fontSize(8)
           .font('Helvetica')
           .text(l.proficiency, 60, leftY, { width: COL_LEFT_WIDTH });
        leftY = doc.y + 4;
      });
      leftY += 8;
    }

    // Certifications
    if (resume.certifications && resume.certifications.length) {
      leftY = sectionHeadingLeft('Certifications', leftY);
      resume.certifications.forEach(c => {
        doc.fillColor(COLOR_DARK)
           .fontSize(9)
           .font('Helvetica-Bold')
           .text(c.name, 60, leftY, { width: COL_LEFT_WIDTH });
        leftY = doc.y;
        doc.fillColor(COLOR_MUTED)
           .fontSize(8)
           .font('Helvetica')
           .text(c.issuer || '', 60, leftY, { width: COL_LEFT_WIDTH });
        leftY = doc.y + 4;
      });
      leftY += 8;
    }

    // Social Links
    if (resume.socialLinks && resume.socialLinks.length) {
      leftY = sectionHeadingLeft('Links', leftY);
      resume.socialLinks.forEach(s => {
        doc.fillColor(COLOR_PRIMARY)
           .fontSize(8)
           .font('Helvetica')
           .text(`${s.platform}: ${s.url}`, 60, leftY, { width: COL_LEFT_WIDTH });
        leftY = doc.y + 3;
      });
    }

    // ── RIGHT COLUMN ───────────────────────────────────
    let rightY = 148;

    // Summary
    if (resume.summary) {
      rightY = sectionHeadingRight('Professional Summary', rightY);
      doc.fillColor(COLOR_DARK)
         .fontSize(9.5)
         .font('Helvetica')
         .text(resume.summary, COL_RIGHT_START, rightY, { width: COL_RIGHT_WIDTH, align: 'justify' });
      rightY = doc.y + 14;
    }

    // Work Experience
    if (resume.workExperience && resume.workExperience.length) {
      rightY = sectionHeadingRight('Work Experience', rightY);
      resume.workExperience.forEach(w => {
        doc.fillColor(COLOR_DARK)
           .fontSize(10)
           .font('Helvetica-Bold')
           .text(w.jobTitle, COL_RIGHT_START, rightY, { width: COL_RIGHT_WIDTH });
        rightY = doc.y;
        doc.fillColor(COLOR_PRIMARY)
           .fontSize(9)
           .font('Helvetica-Bold')
           .text(w.company, COL_RIGHT_START, rightY, { continued: true, width: COL_RIGHT_WIDTH / 2 });
        const dateStr = `${w.startDate || ''} – ${w.current ? 'Present' : (w.endDate || '')}`;
        doc.fillColor(COLOR_MUTED)
           .font('Helvetica')
           .text(dateStr, { align: 'right' });
        rightY = doc.y + 2;
        if (w.description) {
          doc.fillColor(COLOR_DARK)
             .fontSize(9)
             .font('Helvetica')
             .text(w.description, COL_RIGHT_START, rightY, { width: COL_RIGHT_WIDTH });
          rightY = doc.y;
        }
        rightY += 8;
      });
    }

    // Education
    if (resume.education && resume.education.length) {
      rightY = sectionHeadingRight('Education', rightY);
      resume.education.forEach(e => {
        doc.fillColor(COLOR_DARK)
           .fontSize(10)
           .font('Helvetica-Bold')
           .text(`${e.degree}${e.fieldOfStudy ? ' in ' + e.fieldOfStudy : ''}`, COL_RIGHT_START, rightY, { width: COL_RIGHT_WIDTH });
        rightY = doc.y;
        doc.fillColor(COLOR_PRIMARY)
           .fontSize(9)
           .font('Helvetica-Bold')
           .text(e.institution, COL_RIGHT_START, rightY, { continued: true, width: COL_RIGHT_WIDTH / 2 });
        const dateStr = `${e.startDate || ''} – ${e.endDate || ''}`;
        doc.fillColor(COLOR_MUTED)
           .font('Helvetica')
           .text(dateStr, { align: 'right' });
        rightY = doc.y + 8;
      });
    }

    // Projects
    if (resume.projects && resume.projects.length) {
      rightY = sectionHeadingRight('Projects', rightY);
      resume.projects.forEach(p => {
        doc.fillColor(COLOR_DARK)
           .fontSize(10)
           .font('Helvetica-Bold')
           .text(p.name, COL_RIGHT_START, rightY, { width: COL_RIGHT_WIDTH });
        rightY = doc.y;
        if (p.techStack) {
          doc.fillColor(COLOR_MUTED)
             .fontSize(8)
             .font('Helvetica-Oblique')
             .text(p.techStack, COL_RIGHT_START, rightY, { width: COL_RIGHT_WIDTH });
          rightY = doc.y + 2;
        }
        if (p.description) {
          doc.fillColor(COLOR_DARK)
             .fontSize(9)
             .font('Helvetica')
             .text(p.description, COL_RIGHT_START, rightY, { width: COL_RIGHT_WIDTH });
          rightY = doc.y;
        }
        rightY += 8;
      });
    }

    // Achievements
    if (resume.achievements && resume.achievements.length) {
      rightY = sectionHeadingRight('Achievements', rightY);
      resume.achievements.forEach(a => {
        doc.fillColor(COLOR_DARK)
           .fontSize(9.5)
           .font('Helvetica-Bold')
           .text(`• ${a.title}`, COL_RIGHT_START, rightY, { width: COL_RIGHT_WIDTH });
        rightY = doc.y;
        if (a.description) {
          doc.fillColor(COLOR_MUTED)
             .fontSize(9)
             .font('Helvetica')
             .text(a.description, COL_RIGHT_START + 8, rightY, { width: COL_RIGHT_WIDTH - 8 });
          rightY = doc.y;
        }
        rightY += 4;
      });
    }

    // ── Footer ─────────────────────────────────────────
    doc.fontSize(8)
       .fillColor(COLOR_MUTED)
       .text(
         `Generated by AI Resume Builder • ${new Date().toLocaleDateString()}`,
         60,
         doc.page.height - 40,
         { align: 'center', width: PAGE_WIDTH }
       );

    doc.end();
  } catch (err) {
    console.error('PDF Generation Error:', err);
    req.flash('error', 'Could not generate PDF. Please try again.');
    res.redirect('/dashboard');
  }
};
