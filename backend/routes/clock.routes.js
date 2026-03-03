const express = require('express');
const { authenticateUser, assertOwnership } = require('../auth');
const userService = require('../users');
const { run, all } = require('../database');

const router = express.Router();

// API: Clock In/Out/Break
router.post('/', authenticateUser, async (req, res) => {
    const { type } = req.body;
    const employeeId = req.user.id;

    if (!['IN', 'OUT', 'BREAK_START', 'BREAK_END'].includes(type)) {
        return res.status(400).json({ error: 'Dados inválidos. tipo (IN/OUT/BREAK_START/BREAK_END) é obrigatório.' });
    }

    const user = await userService.findUserById(employeeId);
    if (!user) {
        return res.status(404).json({ error: 'ID de Funcionário não encontrado. Por favor, registre-se primeiro.' });
    }

    const timestamp = new Date().toISOString();

    try {
        await run("INSERT INTO punches (user_id, timestamp, type) VALUES (?, ?, ?)", [employeeId, timestamp, type]);
        console.log(`Recorded: ${employeeId} - ${type} at ${timestamp}`);

        // Broadcast the event via WebSocket to HR Dashboards for Live Tracking
        const io = req.app.get('io');
        if (io) {
            io.emit('global_punch_update', {
                userId: employeeId,
                type: type,
                timestamp: timestamp
            });
        }

        res.json({ success: true, message: `Marcação de ${type} registrada com sucesso para ${user.name}.`, timestamp });
    } catch (err) {
        console.error('Error writing to DB:', err);
        res.status(500).json({ error: 'Erro interno do servidor.' });
    }
});

// API: Get Today's Punches for Break Logic
router.get('/today/:employeeId', authenticateUser, async (req, res) => {
    const { employeeId } = req.params;

    const isOwner = await assertOwnership(req, res, employeeId);
    if (!isOwner) return;

    const today = new Date().toISOString().split('T')[0];
    try {
        const punches = await all(
            "SELECT * FROM punches WHERE user_id = ? AND timestamp LIKE ?",
            [employeeId, `${today}%`]
        );
        res.json(punches);
    } catch (err) {
        res.status(500).json({ error: 'Erro ao buscar marcações' });
    }
});

module.exports = router;
