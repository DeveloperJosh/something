// middleware/verifySignedURL.js
const { generateSignature } = require("../utils/signature");

/**
 * Middleware to verify signed URLs.
 * Ensures that the URL has not expired and the signature is valid.
 */
function verifySignedURL(req, res, next) {
  const file = req.params.file;
  const { expires, signature } = req.query;

  if (!expires || !signature) {
    return res
      .status(400)
      .json({ error: "Missing 'expires' or 'signature' query parameters." });
  }

  const currentTime = Math.floor(Date.now() / 1000);
  if (currentTime > parseInt(expires, 10)) {
    return res.status(403).json({ error: "URL has expired." });
  }

  const expectedSignature = generateSignature(file, expires);
  if (signature !== expectedSignature) {
    return res.status(403).json({ error: "Invalid signature." });
  }

  next();
}

module.exports = verifySignedURL;
