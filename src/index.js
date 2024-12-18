// server.js
require("dotenv").config(); // To load the HLS_SECRET from the .env file
const express = require("express");
const path = require("path");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");
const rateLimit = require("express-rate-limit");
const crypto = require("crypto");

const app = express();
const PORT = process.env.PORT || 3000;
const SECRET = process.env.HLS_SECRET || "your-very-strong-secret-key";

// ------------------------ Middleware ------------------------

// Set secure HTTP headers
app.use(helmet());

// Enable CORS
app.use(cors({
  origin: "*"
}));

// HTTP request logging
app.use(morgan("combined"));

// Rate Limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000, // Limit each IP to 1000 requests per windowMs
  message: "Too many requests from this IP, please try again after 15 minutes."
});
app.use(limiter);

// ------------------------ Utilities ------------------------

/**
 * Generate a signed URL for secure access.
 * @param {string} filePath - The file path (relative to /hls).
 * @param {number} expiresIn - Time in seconds for URL validity.
 * @returns {string} - Signed URL.
 */
function generateSignedUrl(filePath, expiresIn) {
  const expires = Math.floor(Date.now() / 1000) + expiresIn; // Expiry timestamp
  const signature = crypto
    .createHmac("sha256", SECRET)
    .update(`${filePath}:${expires}`)
    .digest("hex");
  return `${filePath}?expires=${expires}&signature=${signature}`;
}

/**
 * Verify a signed URL.
 * @param {string} filePath - The file path.
 * @param {number} expires - Expiry timestamp.
 * @param {string} signature - Provided signature.
 * @returns {boolean} - Whether the signature is valid and not expired.
 */
function verifySignedUrl(filePath, expires, signature) {
  if (!expires || !signature) return false;
  if (Math.floor(Date.now() / 1000) > parseInt(expires, 10)) return false; // Expired

  const expectedSignature = crypto
    .createHmac("sha256", SECRET)
    .update(`${filePath}:${expires}`)
    .digest("hex");
  return expectedSignature === signature;
}

// ------------------------ Routes ------------------------

// Health Check
app.get("/health", (req, res) => {
  res.status(200).send("Server is running!");
});

// Generate Signed URL Endpoint (for testing/automation)
app.get("/generate-url", (req, res) => {
  const { file, expiresIn } = req.query;
  if (!file) {
    return res.status(400).json({ error: "Missing 'file' query parameter." });
  }

  const expires = parseInt(expiresIn, 10) || 3600; // Default to 1 hour
  const signedUrl = generateSignedUrl(file, expires);
  res.json({ signedUrl });
});

// Serve HLS Files with Signed URL Validation
app.get("/hls/*", (req, res) => {
  const requestedPath = req.params[0]; // e.g., 'g/master.m3u8'
  const { expires, signature } = req.query;

  // Normalize and validate the path
  const safePath = path.normalize(requestedPath).replace(/^(\.\.(\/|\\|$))+/, '');
  const hlsDirectory = path.resolve(__dirname, "hls");
  const filePath = path.resolve(hlsDirectory, safePath);

  if (!filePath.startsWith(hlsDirectory)) {
    return res.status(403).json({ error: "Access denied." });
  }

  // Validate the signed URL
  if (!verifySignedUrl(`/hls/${safePath}`, expires, signature)) {
    return res.status(403).json({ error: "Invalid or expired signature." });
  }

  // Determine Content-Type based on file extension
  if (filePath.endsWith(".m3u8")) {
    res.setHeader("Content-Type", "application/vnd.apple.mpegurl");
  } else if (filePath.endsWith(".ts")) {
    res.setHeader("Content-Type", "video/mp2t");
  } else if (filePath.endsWith(".vtt")) {
    res.setHeader("Content-Type", "text/vtt");
  } else {
    return res.status(400).json({ error: "Unsupported file type." });
  }

  // Serve the file
  res.sendFile(filePath, (err) => {
    if (err) {
      console.error(`Error serving file ${requestedPath}:`, err);
      res.status(404).json({ error: "File not found." });
    }
  });
});

// Catch-All for Undefined Routes
app.use((req, res, next) => {
  res.status(404).json({ error: "Endpoint not found." });
});

// Error Handler
app.use((err, req, res, next) => {
  console.error("Internal Server Error:", err);
  res.status(500).json({ error: "Internal Server Error." });
});

// ------------------------ Start Server ------------------------

app.listen(PORT, () => {
  console.log(`HLS server running at http://localhost:${PORT}`);
});
