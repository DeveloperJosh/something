// config/config.js
const dotenv = require("dotenv");

// Load environment variables from .env file
dotenv.config();

module.exports = {
  port: process.env.PORT || 3000,
  hlsSecret: process.env.HLS_SECRET || "default_secret_key",
  apiKey: process.env.API_KEY || "optional_api_key",
};
