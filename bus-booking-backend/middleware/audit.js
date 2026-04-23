import AuditLog from '../models/AuditLog.js';

/**
 * Middleware to automatically log actions to audit_logs table
 * @param {string} action - The action being performed (e.g., 'CREATE', 'UPDATE', 'DELETE')
 * @param {string} entity - The entity type (e.g., 'user', 'booking', 'bus')
 * @returns {Function} Express middleware
 */
export const audit = (action, entity) => {
    return async (req, res, next) => {
        // Store original send function to capture response body (optional)
        const originalSend = res.send;
        let responseBody = null;
        
        // Override send to capture response data
        res.send = function (data) {
            responseBody = data;
            return originalSend.call(this, data);
        };
        
        // After response is finished, log the audit
        res.on('finish', async () => {
            // Only log for successful operations (2xx status)
            if (res.statusCode >= 200 && res.statusCode < 300 && req.user) {
                let entityId = null;
                // Try to extract entity ID from request params or response body
                if (req.params.id) {
                    entityId = req.params.id;
                } else if (responseBody && typeof responseBody === 'object') {
                    // Common patterns: { data: { userId } } or { data: { id } }
                    entityId = responseBody.data?.userId || responseBody.data?.id || responseBody.data?.bookingId || null;
                }
                
                // Capture old values for UPDATE/DELETE if needed (optional – can be extended)
                let oldValues = null;
                if (req.method === 'PUT' || req.method === 'PATCH' || req.method === 'DELETE') {
                    // In a real implementation, you would fetch the current record before update
                    // For simplicity, we'll skip or you can implement a pre-fetch hook
                }
                
                await AuditLog.log({
                    userId: req.user.id,
                    action: `${action}_${req.method}`,
                    entity,
                    entityId,
                    oldValues,
                    newValues: req.method !== 'DELETE' ? req.body : null,
                    ipAddress: req.ip,
                    userAgent: req.headers['user-agent']
                });
            }
        });
        
        next();
    };
};

/**
 * Simplified audit middleware that just logs the action without capturing response body
 * More performant but less detailed
 */
export const simpleAudit = (action, entity) => {
    return async (req, res, next) => {
        next();
        // Log after response
        res.on('finish', async () => {
            if (res.statusCode >= 200 && res.statusCode < 300 && req.user) {
                await AuditLog.log({
                    userId: req.user.id,
                    action,
                    entity,
                    entityId: req.params.id || null,
                    ipAddress: req.ip,
                    userAgent: req.headers['user-agent']
                });
            }
        });
    };
};