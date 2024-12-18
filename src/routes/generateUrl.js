// routes/generateUrl.js
const express = require("express");
const path = require("path");
const fs = require("fs");
const { generateSignature } = require("../utils/signature");
const config = require("../config/config");

const router = express.Router();

/**
 * Function to create a signed URL with expiration and signature.
 * @param {object} req - The request object.
 * @param {string} fullPath - The full relative path to the file (e.g., 'folder1/master.m3u8').
 * @returns {string} - The signed URL.
 */
function createSignedURL(req, fullPath) {
  const expires = Math.floor(Date.now() / 1000) + 3600; // URL valid for 1 hour
  const signature = generateSignature(fullPath, expires);
  return `${req.protocol}://${req.get("host")}/hls/${fullPath}?expires=${expires}&signature=${signature}`;
}

/**
 * @route GET /generate-url
 * @desc Generates a signed URL for accessing an HLS file.
 * @access Protected by API Key.
 */
router.get("/", (req, res) => {
  const { file } = req.query;
  if (!file) {
    return res.status(400).json({ error: "File parameter is required." });
  }

  // Normalize the file path to prevent path traversal
  const normalizedPath = path.normalize(file).replace(/^(\.\.(\/|\\|$))+/, '');

  // Ensure the file exists in the 'hls' directory
  const filePath = path.join(__dirname, "../hls", normalizedPath);
  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ error: "File not found." });
  }

  const signedURL = createSignedURL(req, normalizedPath);
  res.json({ url: signedURL });
});

module.exports = router;
