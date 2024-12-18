// server.js
const express = require("express");
const path = require("path");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");
const rateLimit = require("express-rate-limit");

const app = express();
const PORT = process.env.PORT || 3000;


app.use(helmet());

app.use(cors({
  origin: "*"
}));

app.use(morgan("combined"));

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, 
  max: 1000, 
  message: "Too many requests from this IP, please try again after 15 minutes."
});
app.use(limiter);

app.get("/health", (req, res) => {
  res.status(200).send("Server is running!");
});

app.get("/hls/*", (req, res) => {
  const requestedPath = req.params[0]; 

  const safePath = path.normalize(requestedPath).replace(/^(\.\.(\/|\\|$))+/, '');

  const hlsDirectory = path.resolve(__dirname, "hls");
  const filePath = path.resolve(hlsDirectory, safePath);

  if (!filePath.startsWith(hlsDirectory)) {
    return res.status(403).json({ error: "Access denied." });
  }

  if (filePath.endsWith(".m3u8")) {
    res.setHeader("Content-Type", "application/vnd.apple.mpegurl");
  } else if (filePath.endsWith(".ts")) {
    res.setHeader("Content-Type", "video/mp2t");
  } else if (filePath.endsWith(".vtt")) {
    res.setHeader("Content-Type", "text/vtt");
  } else {
    return res.status(400).json({ error: "Unsupported file type." });
  }

  res.sendFile(filePath, (err) => {
    if (err) {
      console.error(`Error serving file ${requestedPath}:`, err);
      res.status(404).json({ error: "File not found." });
    }
  });
});

app.use((req, res, next) => {
  res.status(404).json({ error: "Endpoint not found." });
});

app.use((err, req, res, next) => {
  console.error("Internal Server Error:", err);
  res.status(500).json({ error: "Internal Server Error." });
});

app.listen(PORT, () => {
  console.log(`HLS server running at http://localhost:${PORT}`);
});
