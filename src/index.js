require("dotenv").config();
const express = require("express");
const multer = require("multer");
const AdmZip = require("adm-zip");
const path = require("path");
const fs = require("fs");

const app = express();
const PORT = process.env.PORT || 3000;

const upload = multer({ dest: "uploads/" });

app.use("/hls", express.static(path.join(__dirname, "hls")));

app.get("/hls/*", (req, res, next) => {
  if (req.path.endsWith(".vtt")) {
      res.setHeader("Content-Type", "text/vtt");
  }
  next();
});

function validateToken(req, res, next) {
  const token = req.query.token;
  if (!token) {
    return res.status(403).send("Access denied. Token missing.");
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    res.status(403).send("Invalid or expired token.");
  }
}

app.post("/upload-zip", upload.single("file"), (req, res) => {
  const { folderName } = req.body;

  if (!folderName) {
    return res.status(400).send("Folder name is required.");
  }

  const zipFilePath = req.file.path;
  const outputDir = path.join(__dirname, "hls", folderName);

  try {
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    // Extract the ZIP file
    const zip = new AdmZip(zipFilePath);
    zip.extractAllTo(outputDir, true);

    // Delete the temporary ZIP file
    fs.unlinkSync(zipFilePath);

    res.status(201).send(`Zip file uploaded and extracted successfully to folder: ${folderName}`);
  } catch (err) {
    console.error("Error extracting ZIP file:", err);
    res.status(500).send("Failed to extract ZIP file.");
  }
});

// Generate signed tokens for secure HLS file access (optional)
app.get("/generate-token", (req, res) => {
  const { filePath } = req.query;
  if (!filePath) {
    return res.status(400).send("File path is required.");
  }

  const token = jwt.sign({ filePath }, process.env.JWT_SECRET, { expiresIn: "1h" });
  const signedUrl = `${req.protocol}://${req.get("host")}/hls${filePath}?token=${token}`;

  res.json({ signedUrl });
});

// Serve HLS master playlist with token validation (optional)
app.get("/hls/:folderName/master.m3u8", validateToken, (req, res) => {
  const folderPath = path.join(__dirname, "hls", req.params.folderName);
  const masterFilePath = path.join(folderPath, "master.m3u8");

  if (!fs.existsSync(masterFilePath)) {
    return res.status(404).send("Master playlist not found.");
  }

  res.sendFile(masterFilePath);
});

app.get("/", (req, res) => {
  res.send("HLS Server is running!");
});

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
