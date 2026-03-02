const jwt = require('jsonwebtoken');
require('dotenv').config();
const { logAudit, get } = require('./database');
const { hasPermission } = require('./roles');

// Support multiple keys for rotation. First key is always the signing key.
const JWT_SECRETS = process.env.JWT_SECRETS
    ? process.env.JWT_SECRETS.split(',')
    : [process.env.JWT_SECRET || 'super_secret_production_key_default'];

const ACTIVE_JWT_SECRET = JWT_SECRETS[0];

function verifyToken(token) {
    let lastError;
    // Attempt verification with all active keys in the rotation pool
    for (const secret of JWT_SECRETS) {
        try {
            return jwt.verify(token, secret);
        } catch (err) {
            lastError = err;
        }
    }
    throw lastError; // Token is invalid against all known keys
}

/**
 * Global Authentication Middleware
 * Validates JWT, Denylist, Kill-Switch, and Session Version.
 */
const authenticateUser = async (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) return res.status(401).json({ error: 'Access denied. No token provided.' });

    try {
        const decoded = verifyToken(token);

        // 1. Verify Denylist (Explicit Logouts / Manual Revocations)
        if (decoded.jti) {
            const isRevoked = await get("SELECT * FROM revoked_tokens WHERE jti = ?", [decoded.jti]);
            if (isRevoked) {
                return res.status(401).json({ error: 'Session has been revoked. Please log in again.' });
            }
        }

        const user = await get("SELECT session_valid_after, session_version FROM users WHERE id = ?", [decoded.id]);
        if (!user) return res.status(401).json({ error: 'User no longer exists.' });

        // 2. Verify Session Version (Global Invalidation)
        if (decoded.sessionVersion && user.session_version !== decoded.sessionVersion) {
            return res.status(401).json({ error: 'Session version mismatched. Please log in again.' });
        }

        // 3. Verify Session Valid After (Kill-Switch)
        if (user.session_valid_after) {
            const validAfter = new Date(user.session_valid_after).getTime() / 1000;
            if (decoded.iat < validAfter) {
                return res.status(401).json({ error: 'Session expired due to security policy. Please log in again.' });
            }
        }

        req.user = decoded;
        next();
    } catch (err) {
        await logAudit('TOKEN_VERIFY_FAILED', 'UNKNOWN', 'Invalid token verification attempt', req.ip);
        res.status(401).json({ error: 'Invalid token or signature.' });
    }
};

/**
 * Formal RBAC Authorization Middleware
 * Usage: router.post('/do-thing', authenticateUser, authorize('ACTION_NAME'), (req, res) => ...)
 */
const authorize = (action) => {
    return async (req, res, next) => {
        if (!req.user || !req.user.role) {
            return res.status(403).json({ error: 'Access denied. Unauthenticated context.' });
        }

        if (hasPermission(req.user.role, action)) {
            next();
        } else {
            await logAudit('RBAC_DENIED', req.user.id, `User with role ${req.user.role} attempted unauthorized action: ${action}`, req.ip);
            return res.status(403).json({ error: `Access denied. Requires permission: ${action}` });
        }
    };
};

/**
 * Legacy HR middleware mapping to new RBAC for compatibility.
 * Ideally, routes should migrate to authorize('SPECIFIC_ACTION').
 */
const authenticateHR = async (req, res, next) => {
    authenticateUser(req, res, () => {
        if (['HR', 'HRAssistant', 'MasterAdmin'].includes(req.user.role)) {
            next();
        } else {
            logAudit('403_FORBIDDEN', req.user.id, 'Attempted to access legacy HR route', req.ip);
            res.status(403).json({ error: 'Access denied. Legacy HR/Admin role required.' });
        }
    });
};

/**
 * Global Ownership Validation Helper
 */
const assertOwnership = async (req, res, resourceUserId) => {
    if (req.user.id === resourceUserId) return true;

    if (['HR', 'HRAssistant', 'MasterAdmin', 'Infra'].includes(req.user.role)) return true;

    await logAudit('IDOR_PROBING_ATTEMPT', req.user.id, `User attempted to access resources belonging to ${resourceUserId}`, req.ip);
    res.status(403).json({ error: 'Acesso negado. Recurso não pertence a você e saldo insuficiente de permissões.' });
    return false;
};

module.exports = {
    authenticateHR,
    authenticateUser,
    authorize,
    assertOwnership,
    ACTIVE_JWT_SECRET,
    verifyToken
};
