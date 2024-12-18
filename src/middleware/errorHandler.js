// middleware/errorHandler.js

/**
 * Centralized error handling middleware.
 * Captures all errors and sends a standardized response.
 */
function errorHandler(err, req, res, next) {
    console.error(err.stack); // Log the error stack for debugging purposes
  
    // Determine the response status code
    const statusCode = err.statusCode || 500;
  
    // Send the error response
    res.status(statusCode).json({
      error: err.message || "Internal Server Error",
    });
  }
  
  module.exports = errorHandler;
  