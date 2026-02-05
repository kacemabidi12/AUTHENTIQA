// Centralized configuration for server environment variables
// Loads variables from .env when present and exports them for use across the app.
require('dotenv').config();

module.exports = {
  port: process.env.PORT || 5000,
  jwtSecret: process.env.JWT_SECRET || 'changeme',
  mongoUri: process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/authentiqa'
};
