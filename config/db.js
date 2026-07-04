/**
 * config/db.js
 * ----------------------------------------------------------
 * MongoDB Atlas connection using Mongoose.
 * Reads the connection URI from environment variables so
 * credentials are never hard-coded in source code.
 * ----------------------------------------------------------
 */

const mongoose = require('mongoose');

/**
 * connectDB
 * Establishes a connection to MongoDB Atlas.
 * Exits the process on failure so the app doesn't start
 * in a broken state.
 *
 * Common errors and their causes:
 *   querySrv EBADNAME  → URI still contains placeholder text like <cluster>
 *   Authentication failed → wrong username or password
 *   ENOTFOUND          → cluster hostname is wrong or network is down
 */
const connectDB = async () => {
  const uri = process.env.MONGODB_URI;

  // ── Guard: catch unfilled placeholders before DNS even tries ──
  if (!uri) {
    console.error('❌  MONGODB_URI is not set. Add it to your .env file.');
    process.exit(1);
  }

  // Detect any remaining angle-bracket placeholders, e.g. <cluster>
  if (/<[^>]+>/.test(uri)) {
    console.error('❌  MONGODB_URI still contains placeholder values (e.g. <username>, <password>, <cluster>).');
    console.error('    Open your .env file and replace them with your real MongoDB Atlas credentials.');
    console.error('    Format: mongodb+srv://USERNAME:PASSWORD@CLUSTER.mongodb.net/DBNAME?retryWrites=true&w=majority');
    process.exit(1);
  }

  try {
    const conn = await mongoose.connect(uri);
    console.log(`✅  MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    console.error(`❌  MongoDB Connection Error: ${error.message}`);

    // Give actionable hints for the most common Atlas errors
    if (error.message.includes('EBADNAME') || error.message.includes('querySrv')) {
      console.error('    Hint: Your cluster hostname in MONGODB_URI looks invalid. Double-check it in the Atlas dashboard.');
    } else if (error.message.includes('Authentication failed')) {
      console.error('    Hint: Wrong username or password. Check your Atlas database user credentials.');
    } else if (error.message.includes('ENOTFOUND')) {
      console.error('    Hint: Cluster hostname not found. Verify the cluster URL in Atlas → Connect → Drivers.');
    } else if (error.message.includes('IP')) {
      console.error('    Hint: Your IP may not be whitelisted. In Atlas go to Network Access and add your IP.');
    }

    process.exit(1);
  }
};

module.exports = connectDB;
