const express = require('express');
const speakeasy = require('speakeasy');
const qrcode = require('qrcode');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt'); // Required for change-password
const rateLimit = require('express-rate-limit');
const userService = require('../users');
const { get, run, logAudit } = require('../database');
const { authenticateUser, JWT_SECRET } = require('../auth');

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

    if (['HR', 'HRAssistant'].includes(role) && specialCode !== 'KYUUK') {
        return res.status(403).json({ error: 'Código Especial inválido para registro de RH.' });
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
            TwoFactorSecret: secret.base32
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
        const user = await userService.findUserById(id);
        if (!user) {
            return res.status(401).json({ success: false, error: 'ID Inválido' });
        }

        let authenticated = false;

        if (password) {
            authenticated = await userService.verifyPassword(user, password);
        } else if (code) {
            if (!user.two_factor_secret) {
                return res.status(400).json({ success: false, error: '2FA não configurado para este usuário.' });
            }
            authenticated = speakeasy.totp.verify({
                secret: user.two_factor_secret,
                encoding: 'base32',
                token: code,
                window: 1 // Allow 30sec slack
            });
        } else {
            return res.status(400).json({ success: false, error: 'Senha ou Código 2FA obrigatório.' });
        }

        if (authenticated) {
            const token = jwt.sign({ id, role: user.role }, JWT_SECRET, { expiresIn: '8h' });
            await logAudit('LOGIN_SUCCESS', id, 'Successful login', req.ip);
            res.json({ success: true, token, userId: id, role: user.role });
        } else {
            await logAudit('LOGIN_FAILED', id, 'Invalid credentials', req.ip);
            res.status(401).json({ success: false, error: 'Credenciais Inválidas' });
        }
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Erro no servidor' });
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

        const safeId = userId.replace(/\s+/g, '_');
        const otpauth_url = `otpauth://totp/PontoEletronico-${safeId}?secret=${user.two_factor_secret}`;

        qrcode.toDataURL(otpauth_url, (err, data_url) => {
            if (err) return res.status(500).json({ error: 'Falha na geração do QR' });
            res.json({ qrCode: data_url });
        });
    } catch (err) {
        res.status(500).json({ error: 'Falha ao buscar detalhes 2FA' });
    }
});

module.exports = router;
