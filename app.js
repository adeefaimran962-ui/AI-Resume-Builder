/**
 * app.js
 * ----------------------------------------------------------
 * Main application entry point for AI Resume Builder.
 *
 * Responsibilities:
 *   1. Load environment variables
 *   2. Connect to MongoDB Atlas
 *   3. Configure Express middleware
 *   4. Mount route handlers
 *   5. Start the HTTP server
 * ----------------------------------------------------------
 */

// ── Load env variables FIRST (before anything uses them) ──
require('dotenv').config();

const express        = require('express');
const path           = require('path');
const session        = require('express-session');
const flash          = require('connect-flash');
const methodOverride = require('method-override');

const connectDB  = require('./config/db');
const setLocals  = require('./middleware/locals');

// ── Route imports ──────────────────────────────────────────
const indexRouter     = require('./routes/index');
const authRouter      = require('./routes/auth');
const dashboardRouter = require('./routes/dashboard');
const resumeRouter    = require('./routes/resume');

// ── Connect to Database ────────────────────────────────────
connectDB();

// ── Create Express App ─────────────────────────────────────
const app = express();

// ── View Engine: EJS ───────────────────────────────────────
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// ── Static Files ───────────────────────────────────────────
app.use(express.static(path.join(__dirname, 'public')));

// ── Body Parsers ───────────────────────────────────────────
app.use(express.urlencoded({ extended: true, limit: '5mb' }));
app.use(express.json({ limit: '5mb' }));

// ── Method Override (PUT / DELETE from HTML forms) ─────────
// Reads ?_method=PUT or ?_method=DELETE from query string
app.use(methodOverride('_method'));

// ── Session ────────────────────────────────────────────────
app.use(
  session({
    secret:            process.env.SESSION_SECRET || 'fallback_secret_change_me',
    resave:            false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,                                   // Prevent client-side JS access
      secure:   process.env.NODE_ENV === 'production',  // HTTPS only in production
      maxAge:   1000 * 60 * 60 * 24,                   // 24 hours
    },
  })
);

// ── Flash Messages ─────────────────────────────────────────
app.use(flash());

// ── Global Template Locals ────────────────────────────────
// Injects currentUser, successMsg, errorMsg into every view
app.use(setLocals);

// ── Routes ─────────────────────────────────────────────────
app.use('/',          indexRouter);
app.use('/auth',      authRouter);
app.use('/dashboard', dashboardRouter);
app.use('/resume',    resumeRouter);

// ── 404 Handler ────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).render('404', {
    title: '404 – Page Not Found',
  });
});

// ── Global Error Handler ───────────────────────────────────
app.use((err, req, res, next) => {
  console.error('Unhandled Error:', err.stack);
  res.status(500).render('error', {
    title:   '500 – Internal Server Error',
    message: process.env.NODE_ENV === 'production'
      ? 'Something went wrong. Please try again later.'
      : err.message,
  });
});

// ── Start Server ───────────────────────────────────────────
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀  AI Resume Builder running on http://localhost:${PORT}`);
  console.log(`   Environment: ${process.env.NODE_ENV || 'development'}`);
});
