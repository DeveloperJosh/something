// routes/dynamicVariantPlaylist.js
const express = require("express");
const path = require("path");
const fs = require("fs");
const { generateSignature } = require("../utils/signature");
const config = require("../config/config");
const logger = require("../utils/logger");

const router = express.Router();

/**
 * @route GET /hls/g/output.m3u8
 * @desc Serves the variant playlist with signed URLs for segments.
 * @access Protected by Signed URL verification.
 */
router.get("/output.m3u8", (req, res) => {
  const requestedPath = 'g/output.m3u8';
  const { expires, signature } = req.query;

  // Verify the variant playlist's signature
  if (!expires || !signature) {
    return res.status(400).json({ error: "Missing 'expires' or 'signature' query parameters." });
  }

  const currentTime = Math.floor(Date.now() / 1000);
  if (currentTime > parseInt(expires, 10)) {
    return res.status(403).json({ error: "URL has expired." });
  }

  const expectedSignature = generateSignature(requestedPath, expires);
  if (signature !== expectedSignature) {
    return res.status(403).json({ error: "Invalid signature." });
  }

  // Read the static variant playlist template
  const templatePath = path.join(__dirname, "../hls/g/output_template.m3u8");
  fs.readFile(templatePath, 'utf8', (err, data) => {
    if (err) {
      console.error(`Error reading variant template: ${err}`);
      return res.status(500).json({ error: "Internal Server Error" });
    }

    // Replace placeholders with signed URLs for segments
    const signedSegment1URL = `${req.protocol}://${req.get("host")}/hls/g/segment1.ts?expires=${expires}&signature=${signature}`;
    const signedSegment2URL = `${req.protocol}://${req.get("host")}/hls/g/segment2.ts?expires=${expires}&signature=${signature}`;
    let updatedPlaylist = data.replace('{{SIGNED_URL_SEGMENT_1}}', signedSegment1URL);
    updatedPlaylist = updatedPlaylist.replace('{{SIGNED_URL_SEGMENT_2}}', signedSegment2URL);

    res.setHeader("Content-Type", "application/vnd.apple.mpegurl");
    res.send(updatedPlaylist);
  });
});

module.exports = router;
