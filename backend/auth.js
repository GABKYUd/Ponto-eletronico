const jwt = require('jsonwebtoken');
require('dotenv').config();
const { logAudit } = require('./database');

const JWT_SECRET = process.env.JWT_SECRET || 'super_secret_production_key_default';

const authenticateHR = async (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) return res.status(401).json({ error: 'Access denied. No token provided.' });

    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        if (!['HR', 'HRAssistant'].includes(decoded.role)) {
            await logAudit('403_FORBIDDEN', decoded.id, 'Attempted to access HR-only route', req.ip);
            return res.status(403).json({ error: 'Access denied. HR role required.' });
        }
        req.user = decoded;
        next();
    } catch (err) {
        await logAudit('TOKEN_VERIFY_FAILED', 'UNKNOWN', 'Invalid HR token verification attempt', req.ip);
        res.status(401).json({ error: 'Invalid token.' });
    }
};

const authenticateUser = async (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) return res.status(401).json({ error: 'Access denied. No token provided.' });

    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        req.user = decoded;
        next();
    } catch (err) {
        await logAudit('TOKEN_VERIFY_FAILED', 'UNKNOWN', 'Invalid user token verification attempt', req.ip);
        res.status(401).json({ error: 'Invalid token.' });
    }
};

/**
 * Global Ownership Validation Helper
 * Ensures the requesting user (reqUser) is either the owner of the resource OR an HR admin.
 * If ownership fails, it writes an IDOR_PROBING_ATTEMPT audit log.
 */
const assertOwnership = async (req, res, resourceUserId) => {
    if (req.user.id !== resourceUserId && !['HR', 'HRAssistant'].includes(req.user.role)) {
        await logAudit('IDOR_PROBING_ATTEMPT', req.user.id, `User attempted to access resources belonging to ${resourceUserId}`, req.ip);
        res.status(403).json({ error: 'Acesso negado. Recurso não pertence a você.' });
        return false;
    }
    return true;
};

module.exports = { authenticateHR, authenticateUser, assertOwnership, JWT_SECRET };
