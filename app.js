/**
 * app.js
 * =========================================================
 * ROOT CAUSE OF CRUD BUG — FIXED HERE
 * =========================================================
 *
 * The critical bug: express.urlencoded({ extended: true })
 * uses the "qs" library which automatically parses bracket-
 * notation form fields into nested objects BEFORE the
 * controller receives req.body.
 *
 * Example — what the browser sends (flat):
 *   workExperience[0][jobTitle]=Engineer&workExperience[0][company]=Google
 *
 * What qs produces in req.body (nested):
 *   { workExperience: [{ jobTitle: 'Engineer', company: 'Google' }] }
 *
 * parseResumeBody() in the controller uses a regex that looks
 * for FLAT string keys like "workExperience[0][jobTitle]" in
 * Object.keys(req.body).  With qs pre-parsing, Object.keys()
 * only returns ["workExperience"], so the regex NEVER matches
 * and extract() returns [] for every dynamic section.
 *
 * FIX: extended: false  — uses Node's built-in querystring
 * module which keeps keys flat:
 *   req.body["workExperience[0][jobTitle]"] = "Engineer"
 * This is exactly the format the controller expects.
 *
 * No other files need changing for the CRUD fix; this single
 * change makes Create, Edit, and all dynamic sections work.
 * =========================================================
 */
require('dotenv').config();

const express        = require('express');
const path           = require('path');
const session        = require('express-session');
const flash          = require('connect-flash');
const methodOverride = require('method-override');
const helmet         = require('helmet');
const rateLimit      = require('express-rate-limit');
const compression    = require('compression');

const connectDB  = require('./config/db');
const setLocals  = require('./middleware/locals');

const indexRouter        = require('./routes/index');
const authRouter         = require('./routes/auth');
const dashboardRouter    = require('./routes/dashboard');
const resumeRouter       = require('./routes/resume');
const coverLetterRouter  = require('./routes/coverLetter');
const jobsRouter         = require('./routes/jobs');
const certificatesRouter = require('./routes/certificates');
const interviewRouter    = require('./routes/interview');
const skillGapRouter     = require('./routes/skillGap');
const careerRouter       = require('./routes/career');

connectDB();

const app = express();

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// ── STATIC FILES WITH CACHE HEADERS ─────────────────────────────────────
// Main static files (CSS, JS, etc.)
app.use(express.static(path.join(__dirname, 'public'), {
  maxAge: process.env.NODE_ENV === 'production' ? '1d' : '0'
}));

// Uploaded files with cache-busting and longer cache for photos
app.use('/uploads', express.static(path.join(__dirname, 'public/uploads'), {
  maxAge: process.env.NODE_ENV === 'production' ? '7d' : '0',
  etag: true,
  lastModified: true
}));

// ── BODY PARSERS ─────────────────────────────────────────────────────────
// CRITICAL FIX: extended: false preserves flat bracket-notation keys.
// extended: true (qs) was converting them to nested objects and breaking
// parseResumeBody()'s regex extraction in the controller.
app.use(express.urlencoded({ extended: false, limit: '10mb' }));
app.use(express.json({ limit: '10mb' }));

// ── METHOD OVERRIDE ──────────────────────────────────────────────────────
// Reads ?_method=PUT or ?_method=DELETE from the query string.
// Must come AFTER body parsers.
app.use(methodOverride('_method'));

// ── SESSION ──────────────────────────────────────────────────────────────
app.use(session({
  secret:            process.env.SESSION_SECRET || 'fallback_dev_secret',
  resave:            false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    secure:   process.env.NODE_ENV === 'production',
    maxAge:   1000 * 60 * 60 * 24,
  },
}));

app.use(flash());
app.use(setLocals);

// ── PERFORMANCE MIDDLEWARE ───────────────────────────────────────────────────
// Compression middleware for gzip
app.use(compression());

// ── SECURITY MIDDLEWARE ─────────────────────────────────────────────────────
// Helmet for security headers
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://cdn.jsdelivr.net"],
      scriptSrc: ["'self'", "'unsafe-inline'", "https://cdn.jsdelivr.net"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'"],
      fontSrc: ["'self'", "https://cdn.jsdelivr.net"],
    },
  },
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.',
});
app.use('/auth', limiter);

// ── ROUTES ───────────────────────────────────────────────────────────────
app.use('/',             indexRouter);
app.use('/auth',         authRouter);
app.use('/dashboard',    dashboardRouter);
app.use('/resume',       resumeRouter);
app.use('/cover-letter', coverLetterRouter);
app.use('/jobs',         jobsRouter);
app.use('/certificates', certificatesRouter);
app.use('/interview',    interviewRouter);
app.use('/skill-gap',    skillGapRouter);
app.use('/career-roadmap', careerRouter);

// ── 404 ──────────────────────────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).render('404', { title: '404 – Page Not Found' });
});

// ── GLOBAL ERROR HANDLER ─────────────────────────────────────────────────
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
  console.log(`ResumeAI running on http://localhost:${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
});
