/**
 * app.js
 * ─────────────────────────────────────────────────────────
 * CRITICAL FIX: Middleware order corrected.
 *
 * BUG WAS: methodOverride was registered AFTER body parsers
 * but BEFORE session. Because methodOverride('_method') reads
 * from the query-string this seemed fine, but the real problem
 * was that express.urlencoded MUST be fully applied before ANY
 * middleware that might need the parsed body, and session MUST
 * be applied before flash and setLocals.
 *
 * CORRECT ORDER:
 *   1. Body parsers        (urlencoded, json)
 *   2. methodOverride      (needs parsed body / query)
 *   3. Session             (needs cookies/body already read)
 *   4. Flash               (needs session)
 *   5. setLocals           (needs session + flash)
 *   6. Routes
 * ─────────────────────────────────────────────────────────
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

// Static files first (no session needed)
app.use(express.static(path.join(__dirname, 'public')));

// ── STEP 1: Body parsers FIRST ─────────────────────────────
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(express.json({ limit: '10mb' }));

// ── STEP 2: methodOverride AFTER body parsers ──────────────
// Supports both query-string (?_method=PUT) AND body (_method field)
app.use(methodOverride(function (req) {
  // Read _method from POST body first (most reliable for HTML forms)
  if (req.body && typeof req.body === 'object' && '_method' in req.body) {
    const method = req.body._method;
    delete req.body._method; // remove so it doesn't interfere with data
    return method;
  }
  // Fallback: read from query string (?_method=PUT)
  if (req.query && req.query._method) {
    return req.query._method;
  }
}));

// ── STEP 3: Session AFTER body/override ───────────────────
app.use(session({
  secret:            process.env.SESSION_SECRET || 'fallback_dev_secret_change_in_production',
  resave:            false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    secure:   process.env.NODE_ENV === 'production',
    maxAge:   1000 * 60 * 60 * 24, // 24 hours
  },
}));

// ── STEP 4: Flash AFTER session ────────────────────────────
app.use(flash());

// ── STEP 5: Global template locals AFTER session + flash ───
app.use(setLocals);

// ── Routes ─────────────────────────────────────────────────
app.use('/',          indexRouter);
app.use('/auth',      authRouter);
app.use('/dashboard', dashboardRouter);
app.use('/resume',    resumeRouter);

// ── 404 ────────────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).render('404', { title: '404 – Page Not Found' });
});

// ── Global error handler ───────────────────────────────────
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
