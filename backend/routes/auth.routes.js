const express = require('express');
const speakeasy = require('speakeasy');
const qrcode = require('qrcode');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt'); // Required for change-password
const rateLimit = require('express-rate-limit');
const userService = require('../users');
const { get, run } = require('../database');
const { authenticateUser, JWT_SECRET } = require('../auth');

const router = express.Router();

const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 20, // Limit each IP to 20 requests per windowMs
    message: { error: 'Too many authentication attempts. Please try again later.' }
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
        return res.status(400).json({ error: 'Missing required fields (Name, ID, Role, Password, Email).' });
    }

    if (role === 'HR' && specialCode !== 'KYUUK') {
        return res.status(403).json({ error: 'Invalid Special Code for HR registration.' });
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
            qrcode.toDataURL(secret.otpauth_url, (err, data_url) => {
                if (err) {
                    console.error('QR Generate Error:', err);
                    return res.json({ success: true, message: 'User registered, but QR generation failed.', qrCode: null });
                }
                res.json({ success: true, message: 'User registered successfully.', qrCode: data_url, secret: secret.base32 });
            });
        } else {
            res.status(500).json({ error: 'Failed to create user.' });
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
            return res.status(401).json({ success: false, error: 'Invalid ID' });
        }

        let authenticated = false;

        if (password) {
            authenticated = await userService.verifyPassword(user, password);
        } else if (code) {
            if (!user.two_factor_secret) {
                return res.status(400).json({ success: false, error: '2FA not set up for this user.' });
            }
            authenticated = speakeasy.totp.verify({
                secret: user.two_factor_secret,
                encoding: 'base32',
                token: code,
                window: 1 // Allow 30sec slack
            });
        } else {
            return res.status(400).json({ success: false, error: 'Password or 2FA Code required.' });
        }

        if (authenticated) {
            const token = jwt.sign({ id, role: user.role }, JWT_SECRET, { expiresIn: '8h' });
            res.json({ success: true, token, userId: id, role: user.role });
        } else {
            res.status(401).json({ success: false, error: 'Invalid Credentials' });
        }
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
});

// API: Change Password
router.post('/change-password', authenticateUser, async (req, res) => {
    const { oldPassword, newPassword } = req.body;
    const userId = req.user.id;
    try {
        const user = await get("SELECT password FROM users WHERE id = ?", [userId]);
        if (!user) return res.status(404).json({ error: 'User not found' });

        const match = await bcrypt.compare(oldPassword, user.password);
        if (!match) return res.status(400).json({ error: 'Incorrect old password' });

        const saltRounds = 10;
        const hash = await bcrypt.hash(newPassword, saltRounds);

        await run("UPDATE users SET password = ? WHERE id = ?", [hash, userId]);

        res.json({ success: true, message: 'Password updated' });
    } catch (error) {
        console.error('Password change error:', error);
        res.status(500).json({ error: 'Failed to update password' });
    }
});

// API: Get 2FA QR
router.get('/2fa/qr/:userId', authenticateUser, async (req, res) => {
    const { userId } = req.params;
    if (userId !== req.user.id) {
        return res.status(403).json({ error: 'Forbidden' });
    }

    try {
        const user = await get("SELECT two_factor_secret FROM users WHERE id = ?", [userId]);
        if (!user || !user.two_factor_secret) return res.status(404).json({ error: 'Secret not found' });

        const safeId = userId.replace(/\s+/g, '_');
        const otpauth_url = `otpauth://totp/PontoEletronico-${safeId}?secret=${user.two_factor_secret}`;

        qrcode.toDataURL(otpauth_url, (err, data_url) => {
            if (err) return res.status(500).json({ error: 'QR generation failed' });
            res.json({ qrCode: data_url });
        });
    } catch (err) {
        res.status(500).json({ error: 'Failed fetching 2FA detail' });
    }
});

module.exports = router;
