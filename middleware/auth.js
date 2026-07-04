/**
 * middleware/auth.js
 * ----------------------------------------------------------
 * Authentication middleware functions.
 *
 * ensureAuthenticated  – Blocks unauthenticated users from
 *                        accessing protected routes.
 * ensureGuest          – Redirects already-logged-in users
 *                        away from login/register pages.
 * ----------------------------------------------------------
 */

/**
 * ensureAuthenticated
 * Checks whether the current session contains a valid userId.
 * If yes, passes control to the next handler.
 * If no,  saves the intended URL, flashes a message, and
 * redirects to /auth/login.
 *
 * @param {import('express').Request}  req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 */
const ensureAuthenticated = (req, res, next) => {
  if (req.session && req.session.userId) {
    return next();
  }

  // Save the URL the user was trying to reach
  req.session.returnTo = req.originalUrl;

  req.flash('error', 'Please log in to access this page.');
  res.redirect('/auth/login');
};

/**
 * ensureGuest
 * Prevents authenticated users from visiting login/register.
 * Redirects them to the dashboard instead.
 *
 * @param {import('express').Request}  req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 */
const ensureGuest = (req, res, next) => {
  if (req.session && req.session.userId) {
    return res.redirect('/dashboard');
  }
  next();
};

module.exports = { ensureAuthenticated, ensureGuest };
