const express = require('express');
const crypto = require('crypto');
const speakeasy = require('speakeasy');
const qrcode = require('qrcode');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const bcrypt = require('bcrypt'); // Required for change-password
const rateLimit = require('express-rate-limit');
const userService = require('../users');
const { get, run, all, logAudit } = require('../database');
const { authenticateUser, ACTIVE_JWT_SECRET, verifyToken } = require('../auth');
const { encrypt, decrypt } = require('../cryptoUtils');

const router = express.Router();

const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 20, // Limit each IP to 20 requests per windowMs
    message: { error: 'Muitas tentativas de autenticação. Tente novamente mais tarde.' }
});

// Helper: Sanitize User Inputs against XSS
const createDOMPurify = require('dompurify');
const { JSDOM } = require('jsdom');
const window = new JSDOM('').window;
const DOMPurify = createDOMPurify(window);
const sanitize = (text) => {
    if (!text) return '';
    if (typeof text !== 'string') {
        // Prevent array injection / type juggling bypasses
        text = String(text);
        // If they passed a complex object, String(obj) is '[object Object]' which is safe
    }
    return DOMPurify.sanitize(text);
};

// API: Register User
router.post('/register', authLimiter, async (req, res) => {
    const { name, id, role, password, email, specialCode } = req.body;

    if (!name || !id || !role || !password || !email) {
        return res.status(400).json({ error: 'Campos obrigatórios ausentes (Nome, ID, Cargo, Senha, Email).' });
    }

    if (['HR', 'HRAssistant'].includes(role)) {
        if (!specialCode) {
            return res.status(403).json({ error: 'Código de convite obrigatório para registro de RH.' });
        }
        // Verify Token
        const tokenHash = crypto.createHash('sha256').update(specialCode).digest('hex');
        const invite = await get("SELECT * FROM hr_invites WHERE token_hash = ? AND used = 0", [tokenHash]);

        if (!invite) {
            return res.status(403).json({ error: 'Código de convite inválido ou já utilizado.' });
        }

        const now = new Date();
        const expiresAt = new Date(invite.expires_at);
        if (now > expiresAt) {
            return res.status(403).json({ error: 'Código de convite expirado.' });
        }

        // Mark Used
        await run("UPDATE hr_invites SET used = 1 WHERE id = ?", [invite.id]);
    }

    try {
        const safeId = id.replace(/\s+/g, '_');
        const secret = speakeasy.generateSecret({ name: `PontoEletronico-${safeId}` });

        const newUser = {
            ID: id,
            Name: sanitize(name),
            Role: role,
            Password: password,
            Email: sanitize(email),
            TwoFactorSecret: encrypt(secret.base32)
        };

        const success = await userService.createUser(newUser);

        if (success) {
            await logAudit('USER_REGISTERED', id, `Role: ${role}, Email: ${email}`, req.ip);
            qrcode.toDataURL(secret.otpauth_url, (err, data_url) => {
                if (err) {
                    console.error('QR Generate Error:', err);
                    return res.json({ success: true, message: 'Usuário registrado, mas a geração do QR falhou.', qrCode: null });
                }
                res.json({ success: true, message: 'Usuário registrado com sucesso.', qrCode: data_url, secret: secret.base32 });
            });
        } else {
            res.status(500).json({ error: 'Falha ao criar usuário.' });
        }

    } catch (err) {
        res.status(400).json({ error: err.message });
    }
});

// API: Login (HR & Employee)
router.post('/login', authLimiter, async (req, res) => {
    const { id, password, code } = req.body;

    try {
        const user = await get("SELECT * FROM users WHERE id = ?", [id]);
        if (!user) {
            return res.status(401).json({ success: false, error: 'ID Inválido' });
        }

        // Account Lockout Check
        if (user.locked_until) {
            const lockedUntilDate = new Date(user.locked_until);
            if (new Date() < lockedUntilDate) {
                await logAudit('LOGIN_FAILED_LOCKED', id, 'Account locked due to brute force', req.ip);
                return res.status(403).json({ success: false, error: 'Sua conta está temporariamente bloqueada. Tente novamente mais tarde.' });
            }
        }

        let authenticated = false;

        if (password) {
            authenticated = await userService.verifyPassword(user, password);
        } else if (code) {
            if (!user.two_factor_secret) {
                return res.status(400).json({ success: false, error: '2FA não configurado para este usuário.' });
            }
            let decryptedSecret;
            try {
                decryptedSecret = decrypt(user.two_factor_secret);
            } catch (err) {
                return res.status(403).json({ success: false, error: 'Erro de integridade no 2FA. O segredo foi adulterado.' });
            }

            authenticated = speakeasy.totp.verify({
                secret: decryptedSecret,
                encoding: 'base32',
                token: code,
                window: 1 // Allow 30sec slack
            });
        } else {
            return res.status(400).json({ success: false, error: 'Senha ou Código 2FA obrigatório.' });
        }

        if (authenticated) {
            const jti = uuidv4();
            const sessionVersion = user.session_version || 1;

            const token = jwt.sign(
                { id, role: user.role, jti, sessionVersion, type: 'access' },
                ACTIVE_JWT_SECRET,
                { expiresIn: '15m' }
            );

            const refreshToken = jwt.sign(
                { id, jti, sessionVersion, type: 'refresh' },
                ACTIVE_JWT_SECRET,
                { expiresIn: '7d' }
            );

            await logAudit('LOGIN_SUCCESS', id, 'Successful login', req.ip);

            // Reset Failed Attempts
            if (user.failed_login_attempts > 0 || user.locked_until) {
                await run("UPDATE users SET failed_login_attempts = 0, locked_until = NULL WHERE id = ?", [id]);
            }

            res.json({ success: true, token, refreshToken, userId: id, role: user.role });
        } else {
            // Increment Failed Attempts and Check Lockout
            const attempts = (user.failed_login_attempts || 0) + 1;
            if (attempts >= 5) {
                const clockUntil = new Date();
                clockUntil.setMinutes(clockUntil.getMinutes() + 15);
                await run("UPDATE users SET failed_login_attempts = ?, locked_until = ? WHERE id = ?", [attempts, clockUntil.toISOString(), id]);
                await logAudit('ACCOUNT_LOCKED', id, `Account locked for 15M after ${attempts} attempts`, req.ip);
                res.status(403).json({ success: false, error: 'Muitas tentativas falhas. Conta bloqueada por 15 minutos.' });
            } else {
                await run("UPDATE users SET failed_login_attempts = ? WHERE id = ?", [attempts, id]);
                await logAudit('LOGIN_FAILED', id, `Invalid credentials (Attempt ${attempts}/5)`, req.ip);
                res.status(401).json({ success: false, error: 'Credenciais Inválidas' });
            }
        }
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Erro no servidor' });
    }
});

// API: Refresh Token (Mint new Access Token)
router.post('/refresh', async (req, res) => {
    const { refreshToken } = req.body;
    if (!refreshToken) return res.status(401).json({ error: 'Refresh token é obrigatório.' });

    try {
        const decoded = verifyToken(refreshToken);

        if (decoded.type !== 'refresh') {
            return res.status(403).json({ error: 'Token fornecido não é um Refresh Token.' });
        }

        // Check if token's jti was explicitly revoked
        const isRevoked = await get("SELECT * FROM revoked_tokens WHERE jti = ?", [decoded.jti]);
        if (isRevoked) {
            return res.status(401).json({ error: 'Refresh token revogado.' });
        }

        const user = await get("SELECT role, session_version, session_valid_after FROM users WHERE id = ?", [decoded.id]);
        if (!user) return res.status(401).json({ error: 'Usuário não existe mais.' });

        if (decoded.sessionVersion && user.session_version !== decoded.sessionVersion) {
            return res.status(401).json({ error: 'Sessão expirou globalmente (Session Version mismatch).' });
        }

        if (user.session_valid_after) {
            const validAfter = new Date(user.session_valid_after).getTime() / 1000;
            if (decoded.iat < validAfter) {
                return res.status(401).json({ error: 'Sessão terminada via Kill-Switch.' });
            }
        }

        // Issue new Short-Lived Access Token
        const token = jwt.sign(
            { id: decoded.id, role: user.role, jti: decoded.jti, sessionVersion: user.session_version || 1, type: 'access' },
            ACTIVE_JWT_SECRET,
            { expiresIn: '15m' }
        );

        res.json({ success: true, token });

    } catch (err) {
        await logAudit('TOKEN_REFRESH_FAILED', 'UNKNOWN', `Failed refresh attempt from ${req.ip}`, req.ip);
        res.status(401).json({ error: 'Refresh token inválido ou expirado. Faça login novamente.' });
    }
});

// API: Change Password
router.post('/change-password', authenticateUser, async (req, res) => {
    const { oldPassword, newPassword } = req.body;
    const userId = req.user.id;
    try {
        const user = await get("SELECT password FROM users WHERE id = ?", [userId]);
        if (!user) return res.status(404).json({ error: 'Usuário não encontrado' });

        const match = await bcrypt.compare(oldPassword, user.password);
        if (!match) return res.status(400).json({ error: 'Senha antiga incorreta' });

        const saltRounds = 10;
        const hash = await bcrypt.hash(newPassword, saltRounds);

        await run("UPDATE users SET password = ? WHERE id = ?", [hash, userId]);
        await logAudit('PASSWORD_CHANGED', userId, 'Password successfully altered', req.ip);

        res.json({ success: true, message: 'Senha atualizada' });
    } catch (error) {
        console.error('Password change error:', error);
        res.status(500).json({ error: 'Falha ao atualizar senha' });
    }
});

// API: Get 2FA QR
router.get('/2fa/qr/:userId', authenticateUser, async (req, res) => {
    const { userId } = req.params;
    if (userId !== req.user.id) {
        return res.status(403).json({ error: 'Acesso negado' });
    }

    try {
        const user = await get("SELECT two_factor_secret FROM users WHERE id = ?", [userId]);
        if (!user || !user.two_factor_secret) return res.status(404).json({ error: 'Segredo não encontrado' });
        let decryptedSecret;
        try {
            decryptedSecret = decrypt(user.two_factor_secret);
        } catch (err) {
            return res.status(403).json({ error: 'Erro de integridade no 2FA. O segredo foi adulterado.' });
        }
        const safeId = userId.replace(/\s+/g, '_');
        const otpauth_url = `otpauth://totp/PontoEletronico-${safeId}?secret=${decryptedSecret}`;

        qrcode.toDataURL(otpauth_url, (err, data_url) => {
            if (err) return res.status(500).json({ error: 'Falha na geração do QR' });
            res.json({ qrCode: data_url });
        });
    } catch (err) {
        res.status(500).json({ error: 'Falha ao buscar detalhes 2FA' });
    }
});

// API: Logout (Revoke Current Token)
router.post('/logout', authenticateUser, async (req, res) => {
    try {
        const { jti, exp } = req.user;
        if (jti && exp) {
            // Check if already revoked to avoid unique constraint errors if multiple calls
            const existing = await get("SELECT * FROM revoked_tokens WHERE jti = ?", [jti]);
            if (!existing) {
                await run("INSERT INTO revoked_tokens (jti, expires_at) VALUES (?, ?)", [jti, exp]);
            }
        }
        await logAudit('LOGOUT', req.user.id, 'User manually logged out', req.ip);
        res.json({ success: true, message: 'Logout realizado com sucesso. Sessão encerrada.' });
    } catch (err) {
        console.error('Logout error:', err);
        res.status(500).json({ error: 'Erro interno ao processar logout.' });
    }
});

module.exports = router;
