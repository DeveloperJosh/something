// routes/dynamicPlaylist.js
const express = require("express");
const path = require("path");
const fs = require("fs");
const { generateSignature } = require("../utils/signature");
const config = require("../config/config");
const logger = require("../utils/logger");

const router = express.Router();

router.get("/:folder/*.m3u8", (req, res) => {
  const folder = req.params.folder; // e.g., 'folder1'
  const wildcardPath = req.params[0]; // e.g., 'master.m3u8' or 'output.m3u8'
  const requestedPath = `${folder}/${wildcardPath}`; // e.g., 'folder1/master.m3u8'

  const { expires, signature } = req.query;

  // Verify the playlist's signature
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

  // Read the static playlist template
  const templatePath = path.join(__dirname, "../hls", folder, `${wildcardPath}_template.m3u8`);
  fs.readFile(templatePath, 'utf8', (err, data) => {
    if (err) {
      logger.error(`Error reading playlist template: ${err}`);
      return res.status(500).json({ error: "Internal Server Error" });
    }

    // Replace placeholders with signed URLs
    // Assuming your playlist_template.m3u8 has placeholders like {{SIGNED_URL_SEGMENT_1}}
    let updatedPlaylist = data;

    // Regex to find all placeholders for signed URLs (e.g., {{SIGNED_URL_*}})
    const placeholderRegex = /{{SIGNED_URL_([^}]+)}}/g;
    updatedPlaylist = updatedPlaylist.replace(placeholderRegex, (match, p1) => {
      // p1 could be 'URL_VARIANT' or 'SEGMENT_1', etc.
      // You need to map each placeholder to the actual file path
      let filePath;
      if (p1.startsWith("URL_VARIANT")) {
        // Example: Replace with the signed URL for a variant playlist
        // Define a mapping based on your playlist structure
        // For simplicity, let's assume there's only one variant
        filePath = `${folder}/output.m3u8`;
      } else if (p1.startsWith("SEGMENT")) {
        // Replace with the signed URL for each segment
        const segmentNumber = p1.split("_")[1]; // e.g., '1'
        filePath = `${folder}/segment${segmentNumber}.ts`;
      } else if (p1.startsWith("SUBTITLE")) {
        // Replace with the signed URL for subtitles
        const subtitleLanguage = p1.split("_")[1]; // e.g., 'en'
        filePath = `${folder}/subtitles_${subtitleLanguage}.vtt`;
      } else {
        logger.warn(`Unknown placeholder: ${p1}`);
        return match; // Leave the placeholder unchanged
      }

      const signedURL = `${req.protocol}://${req.get("host")}/hls/${filePath}?expires=${expires}&signature=${signature}`;
      return signedURL;
    });

    res.setHeader("Content-Type", "application/vnd.apple.mpegurl");
    res.send(updatedPlaylist);
  });
});

module.exports = router;
