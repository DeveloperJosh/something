require("dotenv").config(); // To load the HLS_SECRET from the .env file
const express = require("express");
const path = require("path");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");
const rateLimit = require("express-rate-limit");
const crypto = require("crypto");
const fs = require("fs");

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
 * @param {object} req - Express request object to derive the base URL.
 * @returns {string} - Full signed URL.
 */
function generateSignedUrl(filePath, expiresIn, req) {
  const expires = Math.floor(Date.now() / 1000) + expiresIn; // Expiry timestamp
  const signature = crypto
    .createHmac("sha256", SECRET)
    .update(`${filePath}:${expires}`)
    .digest("hex");

  const baseUrl = `${req.protocol}://${req.get("host")}`;
  console.log(`DEBUG: Base URL is ${baseUrl}`);

  console.log(`DEBUG: Generated URL for ${filePath}`);
  console.log(`DEBUG: Expires at ${expires}`);
  console.log(`DEBUG: Signature is ${signature}`);

  return `${baseUrl}${filePath}?expires=${expires}&signature=${signature}`;
}

/**
 * Verify a signed URL.
 * @param {string} filePath - The file path.
 * @param {number} expires - Expiry timestamp.
 * @param {string} signature - Provided signature.
 * @returns {boolean} - Whether the signature is valid and not expired.
 */
function verifySignedUrl(filePath, expires, signature) {
  if (!expires || !signature) {
    console.error("DEBUG: Missing 'expires' or 'signature' query parameters.");
    return false;
  }

  const currentTime = Math.floor(Date.now() / 1000);
  if (currentTime > parseInt(expires, 10)) {
    console.error(`DEBUG: URL expired. Current time: ${currentTime}, Expires: ${expires}`);
    return false; // Expired
  }

  const expectedSignature = crypto
    .createHmac("sha256", SECRET)
    .update(`${filePath}:${expires}`)
    .digest("hex");

  console.log(`DEBUG: Verifying URL for ${filePath}`);
  console.log(`DEBUG: Expires at ${expires}`);
  console.log(`DEBUG: Expected Signature is ${expectedSignature}`);
  console.log(`DEBUG: Provided Signature is ${signature}`);

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
    console.error("DEBUG: Missing 'file' query parameter in /generate-url");
    return res.status(400).json({ error: "Missing 'file' query parameter." });
  }

  const expires = parseInt(expiresIn, 10) || 3600; // Default to 1 hour
  const signedUrl = generateSignedUrl(`/hls/${file}`, expires, req);
  res.json({ signedUrl });
});

// Serve HLS Files with Signed URL Validation
app.get("/hls/*", (req, res) => {
  const requestedPath = req.params[0];
  const { expires, signature } = req.query;

  // Normalize and validate the path
  const safePath = path.normalize(requestedPath).replace(/^(\.\.(\/|\\|$))+/, '');
  const hlsDirectory = path.resolve(__dirname, "hls");
  const filePath = path.resolve(hlsDirectory, safePath);

  if (!filePath.startsWith(hlsDirectory)) {
    console.error("Access denied: Path traversal detected.");
    return res.status(403).json({ error: "Access denied." });
  }

  if (!verifySignedUrl(`/hls/${safePath}`, expires, signature)) {
    console.error("Invalid or expired signature.");
    return res.status(403).json({ error: "Invalid or expired signature." });
  }

  // Handle Playlist Files
  if (filePath.endsWith(".m3u8")) {
    res.setHeader("Content-Type", "application/vnd.apple.mpegurl");

    fs.readFile(filePath, "utf8", (err, data) => {
      if (err) {
        console.error(`Error reading playlist file: ${filePath}`, err);
        if (!res.headersSent) {
          return res.status(500).json({ error: "Internal Server Error." });
        }
        return;
      }

      const baseUrl = `${req.protocol}://${req.get("host")}`;
      const updatedPlaylist = data.replace(/(.*?\.(m3u8|ts|vtt))/g, (match) => {
        return generateSignedUrl(`/hls/${safePath.split("/").slice(0, -1).join("/")}/${match}`, 3600, req);
      });

      if (!res.headersSent) {
        res.send(updatedPlaylist);
      }
    });

    return;
  }

  // Handle Static HLS Files (segments and subtitles)
  const fileType = filePath.endsWith(".ts") ? "video/mp2t" : filePath.endsWith(".vtt") ? "text/vtt" : null;

  if (!fileType) {
    if (!res.headersSent) {
      return res.status(400).json({ error: "Unsupported file type." });
    }
    return;
  }

  res.setHeader("Content-Type", fileType);

  // Handle Connection Aborts
  req.on("aborted", () => {
    console.warn(`Request aborted by client: ${requestedPath}`);
  });

  // Stream the File
  res.sendFile(filePath, (err) => {
    if (err) {
      console.error(`Error serving file ${requestedPath}:`, err);
      if (!res.headersSent) {
        res.status(404).json({ error: "File not found." });
      }
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
