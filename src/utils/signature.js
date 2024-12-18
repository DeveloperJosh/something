// utils/signature.js
const crypto = require("crypto");
const config = require("../config/config");

/**
 * Generates a HMAC SHA256 signature based on file path and expiration time.
 * @param {string} filePath - The path to the file.
 * @param {number} expires - The expiration timestamp.
 * @returns {string} - The generated signature in hexadecimal format.
 */
function generateSignature(filePath, expires) {
  return crypto
    .createHmac("sha256", config.hlsSecret)
    .update(`${filePath}${expires}`)
    .digest("hex");
}

module.exports = { generateSignature };
