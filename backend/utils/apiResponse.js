/**
 * Formats a successful API response.
 * @param {Object} res - Express response object
 * @param {any} data - The data to return
 * @param {Object} [meta] - Optional metadata (e.g., pagination)
 */
const success = (res, data, meta = undefined) => {
  const response = {
    success: true,
    data
  };
  
  if (meta !== undefined) {
    response.meta = meta;
  }
  
  return res.json(response);
};

/**
 * Formats an error API response.
 * @param {Object} res - Express response object
 * @param {number} statusCode - HTTP status code
 * @param {string} message - Error message for the client
 * @param {any} [details] - Optional error details (avoid sensitive data)
 */
const error = (res, statusCode, message, details = undefined, code = undefined) => {
  const response = {
    success: false,
    error: {
      message
    }
  };

  if (code !== undefined) {
    response.error.code = code;
  }
  
  if (details !== undefined) {
    response.error.details = details;
  }
  
  return res.status(statusCode).json(response);
};

module.exports = {
  success,
  error
};
