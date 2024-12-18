// middleware/authenticateAPIKey.js
const config = require("../config/config");

/**
 * Middleware to authenticate API requests using an API key.
 * The API key should be provided in the 'x-api-key' header.
 */
function authenticateAPIKey(req, res, next) {
  const apiKey = req.headers["x-api-key"];
  if (apiKey && apiKey === config.apiKey) {
    next();
  } else {
    res.status(401).json({ error: "Unauthorized: Invalid API Key" });
  }
}

module.exports = authenticateAPIKey;
