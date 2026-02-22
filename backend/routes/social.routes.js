const express = require('express');
const { authenticateUser } = require('../auth');
const { run, all, get } = require('../database');

// Helper: Sanitize User Inputs against XSS
const createDOMPurify = require('dompurify');
const { JSDOM } = require('jsdom');
const window = new JSDOM('').window;
const DOMPurify = createDOMPurify(window);
const sanitize = (text) => {
    if (!text || typeof text !== 'string') return text;
    return DOMPurify.sanitize(text);
};

const router = express.Router();

// --- Chat API ---

router.get('/chat', authenticateUser, async (req, res) => {
    const { userId, otherId } = req.query;

    if (userId && userId !== req.user.id && req.user.role !== 'HR') {
        return res.status(403).json({ error: 'Forbidden. Cannot read other user chats.' });
    }

    try {
        let messages;
        if (otherId) {
            if (otherId.startsWith('team:')) {
                messages = await all(`
                    SELECT * FROM messages 
                    WHERE recipient_id = ?
                    ORDER BY timestamp DESC LIMIT 50
                `, [otherId]);
                messages = messages.reverse();
            } else {
                messages = await all(`
                    SELECT * FROM messages 
                    WHERE (user_id = ? AND recipient_id = ?) 
                       OR (user_id = ? AND recipient_id = ?)
                    ORDER BY timestamp ASC LIMIT 100
                `, [userId || req.user.id, otherId, otherId, userId || req.user.id]);
            }
        } else {
            messages = await all(`
                SELECT * FROM messages 
                WHERE recipient_id IS NULL 
                ORDER BY timestamp DESC LIMIT 50
            `);
            messages = messages.reverse();
        }
        res.json(messages);
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch messages.' });
    }
});

router.post('/chat', authenticateUser, async (req, res) => {
    const { userName, content, recipientId, type = 'text' } = req.body;
    const userId = req.user.id;

    if (!content) return res.status(400).json({ error: 'Missing content.' });

    try {
        const timestamp = new Date().toISOString();
        const cleanContent = sanitize(content);

        // Save to Database
        await run(
            "INSERT INTO messages (user_id, user_name, content, recipient_id, type, timestamp) VALUES (?, ?, ?, ?, ?, ?)",
            [userId, userName, cleanContent, recipientId || null, type, timestamp]
        );

        // Broadcast the live event to all connected clients
        const io = req.app.get('io');
        if (io) {
            io.emit('new_message', {
                user_id: userId,
                user_name: userName,
                content: cleanContent,
                recipient_id: recipientId || null,
                type: type,
                timestamp: timestamp
            });
        }

        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: 'Failed to send message.' });
    }
});

// --- Social Posts API ---

router.get('/posts', authenticateUser, async (req, res) => {
    try {
        const posts = await all("SELECT * FROM posts ORDER BY timestamp DESC LIMIT 50");
        res.json(posts);
    } catch (err) { res.status(500).json({ error: 'Error fetching posts' }); }
});

router.post('/posts', authenticateUser, async (req, res) => {
    const { userName, content, imageUrl } = req.body;
    const userId = req.user.id;
    try {
        const timestamp = new Date().toISOString();
        await run(
            "INSERT INTO posts (user_id, user_name, content, image_url, timestamp) VALUES (?, ?, ?, ?, ?)",
            [userId, userName, sanitize(content), imageUrl, timestamp]
        );
        res.json({ success: true });
    } catch (err) { res.status(500).json({ error: 'Error creating post' }); }
});

router.post('/posts/:id/like', authenticateUser, async (req, res) => {
    try {
        await run("UPDATE posts SET likes = likes + 1 WHERE id = ?", [req.params.id]);
        res.json({ success: true });
    } catch (err) { res.status(500).json({ error: 'Error liking post' }); }
});

// --- Profile & Certifications API ---

router.get('/profile/:id', authenticateUser, async (req, res) => {
    try {
        const user = await get("SELECT id, name, role, bio, pfp, email FROM users WHERE id = ?", [req.params.id]);
        if (user) res.json(user);
        else res.status(404).json({ error: 'User not found' });
    } catch (err) { res.status(500).json({ error: 'Error fetching profile' }); }
});

router.put('/profile/:id', authenticateUser, async (req, res) => {
    if (req.user.id !== req.params.id && req.user.role !== 'HR') {
        return res.status(403).json({ error: 'Forbidden. You cannot edit another profile.' });
    }

    const { bio, pfp } = req.body;
    try {
        await run("UPDATE users SET bio = ?, pfp = ? WHERE id = ?", [sanitize(bio), pfp, req.params.id]);
        res.json({ success: true });
    } catch (err) { res.status(500).json({ error: 'Error updating profile' }); }
});

router.get('/certifications/:userId', authenticateUser, async (req, res) => {
    try {
        const certs = await all("SELECT * FROM certifications WHERE user_id = ?", [req.params.userId]);
        res.json(certs);
    } catch (err) { res.status(500).json({ error: 'Error fetching certs' }); }
});

router.post('/certifications', authenticateUser, async (req, res) => {
    const { name, issuer, date, imageUrl } = req.body;
    const userId = req.user.id;
    try {
        await run(
            "INSERT INTO certifications (user_id, name, issuer, date, image_url) VALUES (?, ?, ?, ?, ?)",
            [userId, sanitize(name), sanitize(issuer), date, imageUrl]
        );
        res.json({ success: true });
    } catch (err) { res.status(500).json({ error: 'Error adding cert' }); }
});

router.delete('/certifications/:id', authenticateUser, async (req, res) => {
    try {
        const cert = await get("SELECT user_id FROM certifications WHERE id = ?", [req.params.id]);
        if (!cert) return res.status(404).json({ error: 'Certification not found' });
        if (cert.user_id !== req.user.id && req.user.role !== 'HR') {
            return res.status(403).json({ error: 'Forbidden. You do not own this certification.' });
        }

        await run("DELETE FROM certifications WHERE id = ?", [req.params.id]);
        res.json({ success: true });
    } catch (err) { res.status(500).json({ error: 'Error deleting cert' }); }
});

module.exports = router;
