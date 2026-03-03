const { v4: uuidv4 } = require('uuid');
const logger = require('./logger');

const requestIdMiddleware = (req, res, next) => {
    // Generate or use existing Correlation ID
    const reqId = req.headers['x-request-id'] || uuidv4();
    req.id = reqId; // Attach to Request Object

    // Attach to Response for client visibility
    res.setHeader('x-request-id', reqId);

    // Initial log of the incoming request
    logger.info('Incoming Request', {
        requestId: req.id,
        method: req.method,
        url: req.originalUrl,
        ip: req.ip,
        userAgent: req.get('user-agent')
    });

    next();
};

module.exports = { requestIdMiddleware };
