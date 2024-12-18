// server.js
const express = require("express");
const path = require("path");
const config = require("./config/config");
const authenticateAPIKey = require("./middleware/authenticateAPIKey");

// Import Routes
const generateUrlRoute = require("./routes/generateUrl");
const serveHLSRoute = require("./routes/serveHLS");

const app = express();

// ------------------------ Middleware ------------------------

// Health Check Route
app.get("/health", (req, res) => {
  res.status(200).send("Server is running!");
});

// Generate Signed URL Route (Protected by API Key)
app.use("/generate-url", authenticateAPIKey, generateUrlRoute);

// Serve HLS Files (Protected by Signed URL)
app.use("/hls", serveHLSRoute);

// ------------------------ Start Server ------------------------

app.listen(config.port, () => {
  console.log(`HLS server running at http://localhost:${config.port}`);
});
