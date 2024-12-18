// server.js
const express = require("express");
const morgan = require("morgan");
const rateLimit = require("express-rate-limit");
const path = require("path");
const helmet = require("helmet");
const config = require("./config/config");
const authenticateAPIKey = require("./middleware/authenticateAPIKey");
const errorHandler = require("./middleware/errorHandler");
const logger = require("./utils/logger");

// Import Routes
const generateUrlRoute = require("./routes/generateUrl");
const serveHLSRoute = require("./routes/serveHLS");
const dynamicPlaylistRoute = require("./routes/dynamicPlaylist");

const app = express();

// ------------------------ Middleware ------------------------

// Secure HTTP headers
app.use(helmet());

// HTTP request logging with morgan integrated with winston
app.use(morgan("combined", { stream: { write: (message) => logger.info(message.trim()) } }));

// Rate Limiting: Apply to /generate-url route
const generateUrlLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: "Too many requests from this IP, please try again after 15 minutes.",
  handler: (req, res) => {
    logger.warn(`Rate limit exceeded for IP: ${req.ip}`);
    res.status(429).json({ error: "Too many requests, please try again later." });
  }
});
app.use("/generate-url", authenticateAPIKey, generateUrlLimiter);

// Health Check Route
app.get("/health", (req, res) => {
  res.status(200).send("Server is running!");
});

// Generate Signed URL Route (Protected by API Key and Rate Limiting)
app.use("/generate-url", generateUrlRoute);

// Serve Dynamic Playlists
app.use("/hls", dynamicPlaylistRoute);

// Serve Other HLS Files (Protected by Signed URL Verification)
app.use("/hls", serveHLSRoute);

// Centralized Error Handling Middleware
app.use(errorHandler);

// ------------------------ Start Server ------------------------

app.listen(config.port, () => {
  logger.info(`HLS server running at http://localhost:${config.port}`);
});
