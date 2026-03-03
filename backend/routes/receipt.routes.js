const express = require('express');
const { authenticateUser } = require('../auth');
const { hasPermission } = require('../roles');
const { run, all } = require('../database');

const router = express.Router();

// GET all receipts for the logged-in user (or all if HR)
router.get('/', authenticateUser, async (req, res) => {
    try {
        let receipts;
        if (hasPermission(req.user.role, 'VIEW_ALL_RECEIPTS')) {
            receipts = await all("SELECT * FROM receipts ORDER BY timestamp DESC");
        } else {
            receipts = await all("SELECT * FROM receipts WHERE user_id = ? ORDER BY timestamp DESC", [req.user.id]);
        }
        res.json(receipts);
    } catch (err) {
        console.error('Error fetching receipts:', err);
        res.status(500).json({ error: 'Erro ao buscar recibos.' });
    }
});

// POST a new receipt
router.post('/', authenticateUser, async (req, res) => {
    const { receipt_number, customer_name, total_amount, date, data } = req.body;
    const user_id = req.user.id;
    const timestamp = new Date().toISOString();

    if (!receipt_number || !customer_name || total_amount === undefined || !date || !data) {
        return res.status(400).json({ error: 'Todos os campos do recibo são obrigatórios.' });
    }

    try {
        await run(
            "INSERT INTO receipts (user_id, receipt_number, customer_name, total_amount, date, data, timestamp) VALUES (?, ?, ?, ?, ?, ?, ?)",
            [user_id, receipt_number, customer_name, total_amount, date, JSON.stringify(data), timestamp]
        );
        res.json({ success: true, message: 'Recibo salvo com sucesso.' });
    } catch (err) {
        console.error('Error saving receipt:', err);
        res.status(500).json({ error: 'Erro ao salvar recibo.' });
    }
});

module.exports = router;
