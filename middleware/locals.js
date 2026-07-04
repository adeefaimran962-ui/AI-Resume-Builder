/**
 * middleware/locals.js
 * ----------------------------------------------------------
 * Injects commonly-needed variables into every EJS template
 * via res.locals so views don't need to receive them
 * explicitly from each controller.
 *
 * Variables exposed to all views:
 *   - currentUser   : The logged-in User document (or null)
 *   - successMsg    : Flash success message (or '')
 *   - errorMsg      : Flash error message   (or '')
 * ----------------------------------------------------------
 */

const User = require('../models/User');

/**
 * setLocals
 * Async middleware that looks up the full User document from
 * the session and attaches it plus flash messages to
 * res.locals before every render.
 *
 * @param {import('express').Request}  req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 */
const setLocals = async (req, res, next) => {
  try {
    // Attach flash messages (connect-flash stores them in the session)
    res.locals.successMsg = req.flash('success')[0] || '';
    res.locals.errorMsg   = req.flash('error')[0]   || '';

    // Attach the current user document if a session exists
    if (req.session && req.session.userId) {
      res.locals.currentUser = await User.findById(req.session.userId).lean();
    } else {
      res.locals.currentUser = null;
    }

    next();
  } catch (err) {
    // Don't crash the app if the user lookup fails
    res.locals.currentUser = null;
    next();
  }
};

module.exports = setLocals;
