/**
 * Send a success response
 * @param {Object} res - Express response object
 * @param {string} message - Success message
 * @param {*} data - Data to send (optional)
 * @param {number} statusCode - HTTP status code (default 200)
 */
export const successResponse = (res, message, data = null, statusCode = 200) => {
    const response = {
        success: true,
        message,
    };
    if (data !== null) {
        response.data = data;
    }
    res.status(statusCode).json(response);
};

/**
 * Send an error response
 * @param {Object} res - Express response object
 * @param {string} message - Error message
 * @param {number} statusCode - HTTP status code (default 400)
 * @param {*} errors - Detailed errors (optional)
 */
export const errorResponse = (res, message, statusCode = 400, errors = null) => {
    const response = {
        success: false,
        message,
    };
    if (errors !== null) {
        response.errors = errors;
    }
    res.status(statusCode).json(response);
};

/**
 * Send a paginated response
 * @param {Object} res - Express response object
 * @param {Array} data - Data array
 * @param {number} total - Total count
 * @param {number} page - Current page
 * @param {number} limit - Items per page
 * @param {string} message - Success message
 */
export const paginatedResponse = (res, data, total, page, limit, message = 'Data retrieved') => {
    const totalPages = Math.ceil(total / limit);
    res.status(200).json({
        success: true,
        message,
        data,
        pagination: {
            current_page: page,
            per_page: limit,
            total,
            total_pages: totalPages,
            has_next: page < totalPages,
            has_prev: page > 1
        }
    });
};