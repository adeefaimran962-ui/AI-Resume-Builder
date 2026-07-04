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

module.exports = router;
