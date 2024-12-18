// src/utils/logger.js

const { createLogger, format, transports } = require("winston");
const path = require("path");

// Define log format
const logFormat = format.combine(
  format.timestamp({ format: "YYYY-MM-DD HH:mm:ss" }),
  format.errors({ stack: true }),
  format.splat(),
  format.json()
);

// Create logger instance
const logger = createLogger({
  level: "info",
  format: logFormat,
  defaultMeta: { service: "hls-server" },
  transports: [
    // Log errors to a file
    new transports.File({ filename: path.join(__dirname, "../logs/error.log"), level: "error" }),
    // Log all other info to a file
    new transports.File({ filename: path.join(__dirname, "../logs/combined.log") })
  ],
});

// If not in production, also log to the console with a simpler format
if (process.env.NODE_ENV !== "production") {
  logger.add(new transports.Console({
    format: format.combine(
      format.colorize(),
      format.simple()
    )
  }));
}

module.exports = logger;
