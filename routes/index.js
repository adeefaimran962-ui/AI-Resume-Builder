/**
 * routes/index.js
 * ----------------------------------------------------------
 * Root router – handles the landing page (/).
 * ----------------------------------------------------------
 */

const express = require('express');
const router  = express.Router();

// GET / – Landing page
router.get('/', (req, res) => {
  // Redirect logged-in users straight to their dashboard
  if (req.session && req.session.userId) {
    return res.redirect('/dashboard');
  }
  res.render('index', { title: 'AI Resume Builder – Build Your Professional Resume' });
});
const Resume = require('../models/Resume');

// GET /shared/:id – View a public resume
router.get('/shared/:id', async (req, res) => {
  try {
    const resume = await Resume.findOne({ _id: req.params.id, isPublic: true }).lean();
    if (!resume) {
      req.flash('error', 'This resume is not public or does not exist.');
      return res.redirect('/');
    }

    // Pass pi and contact explicitly for the templates just like the preview controller does
    const pi = resume.personalInfo || {};
    const contact = [];
    if (pi.email) contact.push(pi.email);
    if (pi.phone) contact.push(pi.phone);
    if (pi.website) contact.push(pi.website);
    if (pi.city || pi.country) contact.push([pi.city, pi.country].filter(Boolean).join(', '));

    res.render('resume/preview', {
      title: `${resume.title} - Shared Resume`,
      resume,
      tpl: resume.template || 'modern',
      pi,
      contact,
      isShared: true // flag to hide edit/download buttons if needed
    });
  } catch (err) {
    console.error('Shared Resume Error:', err);
    res.status(500).send('Server Error');
  }
});

module.exports = router;
