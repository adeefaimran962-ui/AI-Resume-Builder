/**
 * config/db.js
 * ----------------------------------------------------------
 * MongoDB Atlas connection using Mongoose with retry logic
 * and fallback to local MongoDB.
 * Reads the connection URI from environment variables so
 * credentials are never hard-coded in source code.
 * ----------------------------------------------------------
 */

const mongoose = require('mongoose');

// Connection configuration
const MAX_RETRIES = 3;
const RETRY_DELAY = 5000; // 5 seconds
const LOCAL_DB_URI = 'mongodb://127.0.0.1:27017/resume_ai';

/**
 * sleep
 * Helper function to add delay between retries
 */
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * validateURI
 * Validates MongoDB URI format and checks for placeholders
 */
const validateURI = (uri) => {
  if (!uri) {
    return {
      valid: false,
      error: '❌ Missing MONGODB_URI in .env'
    };
  }

  // Detect any remaining angle-bracket placeholders, e.g. <cluster>
  if (/<[^>]+>/.test(uri)) {
    return {
      valid: false,
      error: '❌ MONGODB_URI still contains placeholder values (e.g. <username>, <password>, <cluster>)'
    };
  }

  // Basic URI format validation
  if (!uri.startsWith('mongodb://') && !uri.startsWith('mongodb+srv://')) {
    return {
      valid: false,
      error: '❌ Invalid MONGODB_URI format. Must start with mongodb:// or mongodb+srv://'
    };
  }

  return { valid: true };
};

/**
 * getDetailedErrorMessage
 * Provides detailed error messages based on error type
 */
const getDetailedErrorMessage = (error) => {
  const message = error.message || '';
  const name = error.name || '';

  // Authentication failed
  if (message.includes('Authentication failed') || name === 'MongoServerError' && message.includes('auth')) {
    return {
      type: 'AUTHENTICATION_FAILED',
      message: 'Authentication failed',
      details: [
        'Wrong username or password',
        'Check your Atlas database user credentials in Database Access',
        'Ensure username and password are URL-encoded if they contain special characters',
        'Format: mongodb+srv://USERNAME:PASSWORD@CLUSTER.mongodb.net/DBNAME'
      ]
    };
  }

  // IP whitelist issue
  if (message.includes('IP') || message.includes('whitelist') || message.includes('network') || name === 'MongoServerError') {
    return {
      type: 'IP_NOT_WHITELISTED',
      message: 'IP not whitelisted in MongoDB Atlas',
      details: [
        'Your current IP is not whitelisted in MongoDB Atlas',
        'Steps to fix:',
        '1. Go to MongoDB Atlas → Network Access',
        '2. Click "Add IP Address"',
        '3. Add your current IP address OR',
        '4. Temporarily allow access from anywhere (0.0.0.0/0) for testing',
        '5. Verify database username and password are correct',
        '6. Ensure your cluster is active (not paused)'
      ]
    };
  }

  // DNS/SRV issue
  if (message.includes('EBADNAME') || message.includes('querySrv') || message.includes('ENOTFOUND')) {
    return {
      type: 'DNS_FAILURE',
      message: 'DNS resolution failed',
      details: [
        'Your cluster hostname in MONGODB_URI looks invalid',
        'Double-check it in the Atlas dashboard under Connect → Drivers',
        'Verify the cluster name is correct',
        'Check your internet connection'
      ]
    };
  }

  // Connection timeout
  if (message.includes('timeout') || name === 'MongooseServerSelectionError' || message.includes('ReplicaSetNoPrimary')) {
    return {
      type: 'CONNECTION_TIMEOUT',
      message: 'Connection timeout or cluster unavailable',
      details: [
        'Connection timeout. Possible causes:',
        '1. Your IP is not whitelisted in Atlas Network Access',
        '2. Cluster is paused or not running',
        '3. Network connectivity issues',
        '4. Incorrect cluster name in connection string',
        '5. Database name does not exist in the cluster'
      ]
    };
  }

  // Cluster paused
  if (message.includes('paused') || message.includes('suspended')) {
    return {
      type: 'CLUSTER_PAUSED',
      message: 'MongoDB Atlas cluster is paused',
      details: [
        'Your cluster is currently paused',
        'Go to MongoDB Atlas → Clusters',
        'Click on your cluster and select "Resume" to activate it'
      ]
    };
  }

  // Generic error
  return {
    type: 'UNKNOWN_ERROR',
    message: message,
    details: [
      'An unexpected error occurred',
      'Check your MongoDB Atlas cluster status',
      'Verify your connection string is correct'
    ]
  };
};

/**
 * connectWithRetry
 * Attempts to connect to MongoDB with retry logic
 */
const connectWithRetry = async (uri, retries = MAX_RETRIES) => {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      console.log(`🔄 MongoDB connection attempt ${attempt}/${retries}...`);
      
      const conn = await mongoose.connect(uri, {
        serverSelectionTimeoutMS: 30000, // 30 seconds timeout
        socketTimeoutMS: 45000, // 45 seconds socket timeout
        bufferCommands: false, // Disable buffering to prevent timeout errors
        maxPoolSize: 10, // Maximum pool size
        minPoolSize: 5, // Minimum pool size
        retryWrites: true, // Retry writes on network errors
        retryReads: true, // Retry reads on network errors
      });

      console.log('✅ MongoDB Connected Successfully');
      console.log(`   Host: ${conn.connection.host}`);
      console.log(`   Database: ${conn.connection.name}`);
      console.log(`   Connection Type: ${uri.includes('mongodb+srv') ? 'Atlas (SRV)' : 'Local/Standard'}`);
      
      return conn;
    } catch (error) {
      const errorDetails = getDetailedErrorMessage(error);
      
      console.error(`❌ Attempt ${attempt} failed: ${errorDetails.message}`);
      
      if (attempt < retries) {
        console.log(`⏳ Retrying in ${RETRY_DELAY / 1000} seconds...`);
        await sleep(RETRY_DELAY);
      } else {
        console.error('\n❌ All connection attempts failed');
        console.error(`\nError Type: ${errorDetails.type}`);
        console.error(`Error Message: ${errorDetails.message}\n`);
        console.error('Troubleshooting Steps:');
        errorDetails.details.forEach(detail => console.error(`  • ${detail}`));
        console.error('\nFull error details:', error);
        throw error;
      }
    }
  }
};

/**
 * connectDB
 * Establishes a connection to MongoDB Atlas or local MongoDB.
 * Supports retry logic and graceful fallback.
 */
const connectDB = async () => {
  const useLocalDB = process.env.USE_LOCAL_DB === 'true';
  let uri = process.env.MONGODB_URI;

  // Use local MongoDB if USE_LOCAL_DB is true
  if (useLocalDB) {
    console.log('📦 Using local MongoDB fallback');
    uri = LOCAL_DB_URI;
  }

  // Validate URI
  const validation = validateURI(uri);
  if (!validation.valid) {
    console.error(validation.error);
    console.error('\nPlease add your MongoDB connection string to the .env file');
    console.error('Atlas Format: mongodb+srv://USERNAME:PASSWORD@CLUSTER.mongodb.net/DBNAME?retryWrites=true&w=majority');
    console.error('Local Format: mongodb://127.0.0.1:27017/resume_ai');
    console.error('\nTo use local MongoDB, set USE_LOCAL_DB=true in .env');
    process.exit(1);
  }

  // Attempt connection with retry logic
  try {
    await connectWithRetry(uri);
  } catch (error) {
    // If Atlas fails and we're not already using local DB, try fallback
    if (!useLocalDB && uri.includes('mongodb+srv')) {
      console.log('\n⚠️ Atlas connection failed. Attempting local MongoDB fallback...');
      console.log('📦 Switching to local MongoDB: ' + LOCAL_DB_URI);
      
      try {
        await connectWithRetry(LOCAL_DB_URI, 1); // Only 1 retry for local
        console.log('✅ Successfully connected to local MongoDB as fallback');
        return;
      } catch (localError) {
        console.error('❌ Local MongoDB fallback also failed');
        console.error('Make sure MongoDB is running locally on port 27017');
        console.error('Or fix your Atlas connection issues');
        process.exit(1);
      }
    } else {
      process.exit(1);
    }
  }
};

/**
 * disconnectDB
 * Gracefully closes MongoDB connection
 */
const disconnectDB = async () => {
  try {
    await mongoose.connection.close();
    console.log('✅ MongoDB connection closed gracefully');
  } catch (error) {
    console.error('❌ Error closing MongoDB connection:', error.message);
  }
};

module.exports = { connectDB, disconnectDB };
