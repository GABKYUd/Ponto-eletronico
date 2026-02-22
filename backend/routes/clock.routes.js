const express = require('express');
const { authenticateUser } = require('../auth');
const userService = require('../users');
const { run, all } = require('../database');

const router = express.Router();

// API: Clock In/Out/Break
router.post('/', authenticateUser, async (req, res) => {
    const { type } = req.body;
    const employeeId = req.user.id;

    if (!['IN', 'OUT', 'BREAK_START', 'BREAK_END'].includes(type)) {
        return res.status(400).json({ error: 'Invalid data. type (IN/OUT/BREAK_START/BREAK_END) required.' });
    }

    const user = await userService.findUserById(employeeId);
    if (!user) {
        return res.status(404).json({ error: 'Employee ID not found. Please register first.' });
    }

    const timestamp = new Date().toISOString();

    try {
        await run("INSERT INTO punches (user_id, timestamp, type) VALUES (?, ?, ?)", [employeeId, timestamp, type]);
        console.log(`Recorded: ${employeeId} - ${type} at ${timestamp}`);
        res.json({ success: true, message: `Clock ${type} successful for ${user.name}.`, timestamp });
    } catch (err) {
        console.error('Error writing to DB:', err);
        res.status(500).json({ error: 'Internal server error.' });
    }
});

// API: Get Today's Punches for Break Logic
router.get('/today/:employeeId', authenticateUser, async (req, res) => {
    const { employeeId } = req.params;

    if (employeeId !== req.user.id && req.user.role !== 'HR') {
        return res.status(403).json({ error: 'Forbidden. Cannot view other user punches.' });
    }

    const today = new Date().toISOString().split('T')[0];
    try {
        const punches = await all(
            "SELECT * FROM punches WHERE user_id = ? AND timestamp LIKE ?",
            [employeeId, `${today}%`]
        );
        res.json(punches);
    } catch (err) {
        res.status(500).json({ error: 'Error fetching punches' });
    }
});

module.exports = router;
