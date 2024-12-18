// routes/serveHLS.js
const express = require("express");
const path = require("path");
const verifySignedURL = require("../middleware/verifySignedURL");

const router = express.Router();

/**
 * @route GET /hls/:file
 * @desc Serves HLS files (.m3u8, .ts, and .vtt) after verifying the signed URL.
 * @access Protected by Signed URL verification.
 */
router.get("/:file", verifySignedURL, (req, res) => {
  const file = req.params.file;
  const filePath = path.join(__dirname, "../hls", file);

  // Determine Content-Type based on file extension
  if (file.endsWith(".m3u8")) {
    res.setHeader("Content-Type", "application/vnd.apple.mpegurl");
  } else if (file.endsWith(".ts")) {
    res.setHeader("Content-Type", "video/mp2t");
  } else if (file.endsWith(".vtt")) {
    res.setHeader("Content-Type", "text/vtt");
  } else {
    return res.status(400).json({ error: "Unsupported file type." });
  }

  res.sendFile(filePath, (err) => {
    if (err) {
      console.error(`Error serving file ${file}:`, err);
      res.status(404).json({ error: "File not found." });
    }
  });
});

module.exports = router;
