// routes/serveHLS.js
const express = require("express");
const path = require("path");
const verifySignedURL = require("../middleware/verifySignedURL");
const logger = require("../utils/logger");

const router = express.Router();

/**
 * @route GET /hls/* (e.g., /hls/g/master.m3u8 or /hls/folder1/output.m3u8)
 * @desc Serves HLS files (.m3u8, .ts, and .vtt) after verifying the signed URL.
 * @access Protected by Signed URL verification.
 */
router.get("/*", verifySignedURL, (req, res) => {
  // Extract the requested file path relative to the hls directory
  const requestedPath = req.params[0]; // e.g., 'g/master.m3u8' or 'folder1/output.m3u8'

  // Prevent path traversal by resolving the absolute path and ensuring it's within the hls directory
  const hlsDirectory = path.resolve(__dirname, "../hls");
  const filePath = path.resolve(hlsDirectory, requestedPath);

  if (!filePath.startsWith(hlsDirectory)) {
    // If the resolved path is outside the hls directory, deny access
    logger.warn(`Path traversal attempt detected: ${requestedPath}`);
    return res.status(403).json({ error: "Access denied." });
  }

  // Determine Content-Type based on file extension
  if (filePath.endsWith(".m3u8")) {
    res.setHeader("Content-Type", "application/vnd.apple.mpegurl");
  } else if (filePath.endsWith(".ts")) {
    res.setHeader("Content-Type", "video/mp2t");
  } else if (filePath.endsWith(".vtt")) {
    res.setHeader("Content-Type", "text/vtt");
  } else {
    logger.warn(`Unsupported file type requested: ${requestedPath}`);
    return res.status(400).json({ error: "Unsupported file type." });
  }

  res.sendFile(filePath, (err) => {
    if (err) {
      logger.error(`Error serving file ${requestedPath}: ${err.message}`);
      res.status(404).json({ error: "File not found." });
    } else {
      logger.info(`Served file: ${requestedPath}`);
    }
  });
});

module.exports = router;
