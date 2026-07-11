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

const { connectDB, disconnectDB } = require('./config/db');
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

// ── ENVIRONMENT VALIDATION ───────────────────────────────────────────────
const validateEnvironment = () => {
  const required = ['SESSION_SECRET'];
  const missing = [];

  required.forEach(envVar => {
    if (!process.env[envVar]) {
      missing.push(envVar);
    }
  });

  if (missing.length > 0) {
    console.error('❌ Missing required environment variables:');
    missing.forEach(v => console.error(`   - ${v}`));
    console.error('\nPlease add these to your .env file');
    process.exit(1);
  }

  // Warn if MONGODB_URI is not set (but allow local fallback)
  if (!process.env.MONGODB_URI && process.env.USE_LOCAL_DB !== 'true') {
    console.warn('⚠️  MONGODB_URI not set. Will attempt local MongoDB fallback.');
    console.warn('   Set USE_LOCAL_DB=true to explicitly use local MongoDB');
  }
};

// ── PORT AVAILABILITY CHECK ───────────────────────────────────────────────
const findAvailablePort = async (startPort, maxAttempts = 10) => {
  const net = require('net');
  
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const port = startPort + attempt;
    
    const isAvailable = await new Promise((resolve) => {
      const server = net.createServer();
      
      const timeout = setTimeout(() => {
        server.close();
        resolve(false);
      }, 1000); // 1 second timeout per port check
      
      server.once('error', (err) => {
        clearTimeout(timeout);
        if (err.code === 'EADDRINUSE') {
          resolve(false);
        } else {
          console.error(`⚠️  Unexpected error checking port ${port}:`, err.message);
          resolve(false);
        }
      });
      
      server.once('listening', () => {
        clearTimeout(timeout);
        server.close(() => {
          resolve(true);
        });
      });
      
      server.listen(port, '127.0.0.1').on('error', (err) => {
        clearTimeout(timeout);
        resolve(false);
      });
    });
    
    if (isAvailable) {
      return port;
    } else {
      console.log(`   Port ${port} is in use, trying next...`);
    }
  }
  
  throw new Error(`No available ports found between ${startPort} and ${startPort + maxAttempts - 1}`);
};

// ── GRACEFUL SHUTDOWN ─────────────────────────────────────────────────────
let serverInstance = null;

const gracefulShutdown = async (signal) => {
  console.log(`\n${signal} received. Starting graceful shutdown...`);
  
  try {
    // Close server
    if (serverInstance) {
      await new Promise((resolve) => {
        serverInstance.close(() => {
          console.log('✅ Server closed');
          resolve();
        });
      });
    }
    
    // Close MongoDB connection
    await disconnectDB();
    
    // Exit process
    console.log('✅ Graceful shutdown completed');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error during graceful shutdown:', error.message);
    process.exit(1);
  }
};

// Handle shutdown signals
process.on('SIGINT', () => gracefulShutdown('SIGINT'));
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error('❌ Uncaught Exception:', error.message);
  console.error(error.stack);
  gracefulShutdown('uncaughtException');
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
  gracefulShutdown('unhandledRejection');
});

// ── START SERVER ─────────────────────────────────────────────────────────
const startServer = async () => {
  try {
    // Validate environment variables
    validateEnvironment();
    
    // Connect to MongoDB
    await connectDB();
    
    // Get desired port from environment or default to 3000
    const desiredPort = parseInt(process.env.PORT, 10) || 3000;
    
    // Find available port (will try desiredPort first, then increment)
    console.log(`\n🚀 Starting ResumeAI...`);
    console.log(`🔍 Checking port availability starting from ${desiredPort}...`);
    const PORT = await findAvailablePort(desiredPort);
    
    // Update process.env.PORT to the selected port for consistency
    process.env.PORT = PORT.toString();
    
    if (PORT !== desiredPort) {
      console.log(`⚠️  Port ${desiredPort} was occupied`);
      console.log(`✅ Automatically using port ${PORT} instead`);
    } else {
      console.log(`✅ Port ${desiredPort} is available`);
    }
    
    // Start the server
    console.log(`🌐 Starting Express server on port ${PORT}...`);
    serverInstance = app.listen(PORT, '127.0.0.1', () => {
      console.log(`\n${'='.repeat(50)}`);
      console.log(`✅ ResumeAI is running successfully!`);
      console.log(`${'='.repeat(50)}`);
      console.log(`📍 URL: http://localhost:${PORT}`);
      console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
      console.log(`🔌 Port: ${PORT}`);
      console.log(`${'='.repeat(50)}`);
      console.log(`   Press Ctrl+C to stop the server\n`);
    });

    // Handle server errors (should not happen due to port check, but just in case)
    serverInstance.on('error', (error) => {
      if (error.code === 'EADDRINUSE') {
        console.error(`❌ Port ${PORT} is already in use (race condition detected)`);
        console.error(`   This should not happen after port detection`);
        console.error(`   Another process may have grabbed the port`);
      } else {
        console.error('❌ Server error:', error.message);
      }
      gracefulShutdown('server-error');
    });

  } catch (error) {
    console.error('\n❌ Failed to start server:', error.message);
    console.error('   Please check the error above and try again\n');
    process.exit(1);
  }
};

startServer();
