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

// --- Characters API ---

// Create Character
router.post('/characters', authenticateUser, async (req, res) => {
    const { name, race, class: charClass, stats, hp, maxHp, ac, inventory, sheetData } = req.body;
    const userId = req.user.id;
    if (!name) return res.status(400).json({ error: 'Name required' });

    try {
        await run(
            `INSERT INTO characters (user_id, name, race, class, stats, hp, max_hp, ac, inventory, sheet_data) 
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [userId, sanitize(name), sanitize(race), sanitize(charClass), JSON.stringify(stats), hp, maxHp, ac, JSON.stringify(inventory), JSON.stringify(sheetData || {})]
        );
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Get User Characters
router.get('/characters/user/:userId', authenticateUser, async (req, res) => {
    if (req.params.userId !== req.user.id && req.user.role !== 'HR') {
        return res.status(403).json({ error: 'Forbidden' });
    }
    try {
        const chars = await all("SELECT * FROM characters WHERE user_id = ?", [req.params.userId]);
        const parsed = chars.map(c => ({
            ...c,
            stats: JSON.parse(c.stats || '{}'),
            inventory: JSON.parse(c.inventory || '[]'),
            sheetData: JSON.parse(c.sheet_data || '{}')
        }));
        res.json(parsed);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Get Single Character
router.get('/characters/:id', authenticateUser, async (req, res) => {
    try {
        const char = await get("SELECT * FROM characters WHERE id = ?", [req.params.id]);
        if (char) {
            if (char.user_id !== req.user.id && req.user.role !== 'HR') {
                return res.status(403).json({ error: 'Forbidden. You do not have permission to view this character.' });
            }
            char.stats = JSON.parse(char.stats || '{}');
            char.inventory = JSON.parse(char.inventory || '[]');
            char.sheetData = JSON.parse(char.sheet_data || '{}');
            res.json(char);
        } else {
            res.status(404).json({ error: 'Character not found' });
        }
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Update Character (IDOR Protected)
router.put('/characters/:id', authenticateUser, async (req, res) => {
    try {
        const char = await get("SELECT user_id FROM characters WHERE id = ?", [req.params.id]);
        if (!char) return res.status(404).json({ error: 'Character not found' });
        if (char.user_id !== req.user.id && req.user.role !== 'HR') {
            return res.status(403).json({ error: 'Forbidden. You do not own this character.' });
        }
    } catch (err) {
        return res.status(500).json({ error: 'Server error checking character ownership.' });
    }

    const { name, hp, maxHp, inventory, stats, sheetData } = req.body;
    try {
        await run(
            `UPDATE characters SET name = ?, hp = ?, max_hp = ?, inventory = ?, stats = ?, sheet_data = ? WHERE id = ?`,
            [sanitize(name), hp, maxHp, JSON.stringify(inventory), JSON.stringify(stats), JSON.stringify(sheetData || {}), req.params.id]
        );
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// --- Campaigns API ---

router.get('/campaigns', authenticateUser, async (req, res) => {
    try {
        const campaigns = await all("SELECT * FROM campaigns ORDER BY created_at DESC");
        res.json(campaigns);
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch campaigns.' });
    }
});

router.post('/campaigns', authenticateUser, async (req, res) => {
    const { name, description } = req.body;
    const dmId = req.user.id;
    if (!name) return res.status(400).json({ error: 'Missing name.' });

    try {
        const createdAt = new Date().toISOString();
        await run("INSERT INTO campaigns (name, description, dm_id, created_at) VALUES (?, ?, ?, ?)", [sanitize(name), sanitize(description), dmId, createdAt]);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: 'Failed to create campaign.' });
    }
});

// Join Campaign
router.post('/campaigns/:id/join', authenticateUser, async (req, res) => {
    const { characterId } = req.body;
    const userId = req.user.id;
    try {
        await run("INSERT INTO campaign_members (campaign_id, user_id) VALUES (?, ?)", [req.params.id, userId]);
        if (characterId) {
            await run("UPDATE characters SET campaign_id = ? WHERE id = ? AND user_id = ?", [req.params.id, characterId, userId]);
        }
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: 'Failed to join campaign (or already joined)' });
    }
});

// Get Campaign Members (with Characters)
router.get('/campaigns/:id/members', authenticateUser, async (req, res) => {
    try {
        const members = await all(`
            SELECT u.id, u.name, c.name as char_name, c.class, c.level, c.hp, c.max_hp
            FROM campaign_members cm
            JOIN users u ON cm.user_id = u.id
            LEFT JOIN characters c ON c.user_id = u.id AND c.campaign_id = cm.campaign_id
            WHERE cm.campaign_id = ?
        `, [req.params.id]);
        res.json(members);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
