/**
 * app.js
 * ─────────────────────────────────────────────────────────────────────────
 * ROOT CAUSE FIX:
 *
 * The critical bug was: express.urlencoded({ extended: true }) uses the "qs"
 * library which AUTOMATICALLY parses bracket notation like
 *   workExperience[0][jobTitle]=Engineer
 * into a nested JavaScript object:
 *   req.body.workExperience = [{ jobTitle: 'Engineer' }]
 *
 * However, parseResumeBody() in the controller used a regex that searched
 * for FLAT keys like "workExperience[0][jobTitle]" in Object.keys(req.body).
 * Since qs had already converted those flat keys into a nested structure,
 * Object.keys(req.body) only contained "workExperience" (as a key pointing
 * to an array), so the regex NEVER matched and extract() returned [] for
 * every dynamic section.
 *
 * This meant every save() replaced workExperience, education, projects, etc.
 * with EMPTY arrays — only scalar top-level fields (title, template, summary,
 * fullName, email…) were saved correctly because they are flat keys that
 * don't go through the regex extraction.
 *
 * FIX: Change extended: true → extended: false.
 * With extended: false, Express uses Node's built-in querystring module which
 * does NOT parse bracket notation — it keeps keys literally flat:
 *   req.body["workExperience[0][jobTitle]"] = "Engineer"
 * This is exactly the format parseResumeBody()'s regex was written to handle.
 *
 * No other files need to change for this fix.
 * ─────────────────────────────────────────────────────────────────────────
 */
require('dotenv').config();

const express        = require('express');
const path           = require('path');
const session        = require('express-session');
const flash          = require('connect-flash');
const methodOverride = require('method-override');

const connectDB  = require('./config/db');
const setLocals  = require('./middleware/locals');

const indexRouter     = require('./routes/index');
const authRouter      = require('./routes/auth');
const dashboardRouter = require('./routes/dashboard');
const resumeRouter    = require('./routes/resume');

connectDB();

const app = express();

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Static files (no body parsing needed)
app.use(express.static(path.join(__dirname, 'public')));

// ── BODY PARSERS ──────────────────────────────────────────────────────────
//
// CRITICAL: extended: false
// Keeps bracket-notation form fields as flat string keys in req.body, e.g.:
//   "workExperience[0][jobTitle]" → "Engineer"
// This is required so parseResumeBody()'s regex extraction works correctly.
//
// With extended: true, qs would convert those keys to nested objects BEFORE
// the controller sees them, breaking the regex entirely.
//
app.use(express.urlencoded({ extended: false, limit: '10mb' }));
app.use(express.json({ limit: '10mb' }));

// ── METHOD OVERRIDE ───────────────────────────────────────────────────────
// Supports ?_method=PUT and ?_method=DELETE in the query string.
// Must come AFTER body parsers so req.body is already populated.
app.use(methodOverride('_method'));

// ── SESSION ───────────────────────────────────────────────────────────────
app.use(session({
  secret:            process.env.SESSION_SECRET || 'fallback_dev_secret',
  resave:            false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    secure:   process.env.NODE_ENV === 'production',
    maxAge:   1000 * 60 * 60 * 24, // 24 hours
  },
}));

// ── FLASH ─────────────────────────────────────────────────────────────────
app.use(flash());

// ── GLOBAL TEMPLATE LOCALS ────────────────────────────────────────────────
app.use(setLocals);

// ── ROUTES ────────────────────────────────────────────────────────────────
app.use('/',          indexRouter);
app.use('/auth',      authRouter);
app.use('/dashboard', dashboardRouter);
app.use('/resume',    resumeRouter);

// ── 404 ───────────────────────────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).render('404', { title: '404 – Page Not Found' });
});

// ── GLOBAL ERROR HANDLER ──────────────────────────────────────────────────
app.use((err, req, res, next) => {
  console.error('Unhandled Error:', err.stack);
  res.status(500).render('error', {
    title:   '500 – Internal Server Error',
    message: process.env.NODE_ENV === 'production'
      ? 'Something went wrong. Please try again later.'
      : err.message,
  });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`AI Resume Builder running on http://localhost:${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
});
