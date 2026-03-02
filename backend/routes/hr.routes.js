const express = require('express');
const crypto = require('crypto');
const { stringify } = require('csv-stringify/sync');
const { authenticateUser, authenticateHR, assertOwnership } = require('../auth');
const userService = require('../users');
const { run, all, get, logAudit } = require('../database');

// Helper: Sanitize User Inputs against XSS
const createDOMPurify = require('dompurify');
const { JSDOM } = require('jsdom');
const window = new JSDOM('').window;
const DOMPurify = createDOMPurify(window);
const sanitize = (text) => {
    if (!text) return '';
    if (typeof text !== 'string') {
        text = String(text);
    }
    return DOMPurify.sanitize(text);
};

const router = express.Router();

// Helper: Analyze Records
const analyzeRecords = (records, users = []) => {
    const report = {};
    const employees = [...new Set(records.map(r => r.user_id))];

    employees.forEach(empId => {
        const empName = users.find(u => u.id === empId)?.name || 'Unknown';
        const empRecords = records
            .filter(r => r.user_id === empId)
            .sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));

        const anomalies = [];
        const shiftLogs = [];
        let i = 0;

        while (i < empRecords.length) {
            const current = empRecords[i];
            const next = empRecords[i + 1];

            if (current.type === 'IN' || current.type === 'BREAK_END') {
                if (current.type === 'BREAK_END') {
                    const prev = i > 0 ? empRecords[i - 1] : null;
                    if (!prev || prev.type !== 'BREAK_START') {
                        anomalies.push({ type: 'Missing BREAK_START', detail: 'Ended Break without Starting', time: current.timestamp });
                    }
                }

                if (next && (next.type === 'OUT' || next.type === 'BREAK_START')) {
                    const start = new Date(current.timestamp);
                    const end = new Date(next.timestamp);
                    const durationHrs = (end - start) / (1000 * 60 * 60);

                    shiftLogs.push({ start: current.timestamp, end: next.timestamp, duration: durationHrs.toFixed(2), status: 'Valid', type: 'SHIFT' });

                    if (durationHrs < 0.016) anomalies.push({ type: 'Suspicious Duration', detail: 'Shift less than 1 minute', time: current.timestamp });
                    else if (durationHrs > 14) anomalies.push({ type: 'Suspicious Duration', detail: 'Shift greater than 14 hours', time: current.timestamp });

                    if (next.type === 'OUT') i += 2;
                    else i += 1;
                } else {
                    anomalies.push({ type: 'Missing OUT', detail: 'Clocked IN/BREAK_END without Clocking OUT/BREAK_START', time: current.timestamp });
                    shiftLogs.push({ start: current.timestamp, end: null, status: 'Incomplete', type: 'SHIFT' });
                    i += 1;
                }
            } else if (current.type === 'BREAK_START') {
                if (next && next.type === 'BREAK_END') {
                    const start = new Date(current.timestamp);
                    const end = new Date(next.timestamp);
                    const durationMins = (end - start) / (1000 * 60);

                    shiftLogs.push({ start: current.timestamp, end: next.timestamp, duration: (durationMins / 60).toFixed(2), status: 'Valid', type: 'BREAK' });
                    i += 1;
                } else {
                    anomalies.push({ type: 'Missing BREAK_END', detail: 'Started Break without Ending', time: current.timestamp });
                    shiftLogs.push({ start: current.timestamp, end: null, status: 'Incomplete', type: 'BREAK' });
                    i += 1;
                }
            } else if (current.type === 'OUT') {
                const prev = i > 0 ? empRecords[i - 1] : null;
                if (!prev || (prev.type !== 'IN' && prev.type !== 'BREAK_END')) {
                    anomalies.push({ type: 'Missing IN', detail: 'Clocked OUT without Clocking IN or Ending Break', time: current.timestamp });
                }
                shiftLogs.push({ start: null, end: current.timestamp, status: 'Incomplete', type: 'SHIFT' });
                i += 1;
            } else {
                i += 1;
            }
        }

        report[empId] = {
            name: empName,
            shift_expectation: users.find(u => u.id === empId)?.shift_expectation || 8,
            totalShifts: shiftLogs.filter(s => s.type === 'SHIFT' && s.end && s.start).length,
            anomalies,
            logs: shiftLogs
        };
    });

    return report;
};

// API: Get Reliability Report (Protected)
router.get('/reports', authenticateHR, async (req, res) => {
    try {
        const records = await all("SELECT * FROM punches");
        const users = await userService.getAllUsers();
        const analysis = analyzeRecords(records, users);
        res.json(analysis);
    } catch (err) {
        console.error('Error reading DB:', err);
        res.status(500).json({ error: 'Falha ao gerar relatório.' });
    }
});

// API: Export for PowerBI (Protected)
router.get('/export/powerbi', authenticateHR, async (req, res) => {
    try {
        const records = await all("SELECT * FROM punches ORDER BY user_id, timestamp");
        const users = await userService.getAllUsers();
        const analysis = analyzeRecords(records, users);
        const flatData = [];

        Object.keys(analysis).forEach(empId => {
            const empName = users.find(u => u.id === empId)?.name || 'Unknown';
            const logs = analysis[empId].logs;

            logs.forEach(log => {
                flatData.push({
                    EmployeeID: empId,
                    EmployeeName: empName,
                    Date: log.start ? log.start.split('T')[0] : (log.end ? log.end.split('T')[0] : 'N/A'),
                    ClockIn: log.start || 'MISSING',
                    ClockOut: log.end || 'MISSING',
                    DurationHours: log.duration || 0,
                    Status: log.status || 'Valid',
                    Type: log.type || 'SHIFT'
                });
            });
        });

        const csvData = stringify(flatData, { header: true });
        res.header('Content-Type', 'text/csv');
        res.attachment('powerbi_export.csv');
        res.send(csvData);

    } catch (err) {
        console.error('Error exporting:', err);
        res.status(500).send('Export failed');
    }
});

// API: Get All Users (for Chat/Social Sidebar)
router.get('/users', authenticateUser, async (req, res) => {
    try {
        const users = await all("SELECT id, name, role FROM users");
        res.json(users);
    } catch (err) {
        res.status(500).json({ error: 'Falha ao buscar usuários.' });
    }
});

// API: Generate HR Invite Token
router.post('/hr/invite', authenticateHR, async (req, res) => {
    // Only HR Managers (not Assistants) should ideally generate tokens, but we will allow the role as per current schema scope unless otherwise limited.
    if (req.user.role !== 'HR') {
        await logAudit('403_FORBIDDEN', req.user.id, 'HRAssistant attempted to generate invite token', req.ip);
        return res.status(403).json({ error: 'Apenas Gerentes de RH (HR) podem gerar códigos de convite.' });
    }

    try {
        const rawToken = crypto.randomBytes(8).toString('hex'); // 16 characters
        const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');
        const expiresAt = new Date();
        expiresAt.setHours(expiresAt.getHours() + 24); // 24-hour expiry
        const inviteId = crypto.randomBytes(4).toString('hex');

        await run("INSERT INTO hr_invites (id, token_hash, expires_at) VALUES (?, ?, ?)", [inviteId, tokenHash, expiresAt.toISOString()]);
        await logAudit('HR_INVITE_GENERATED', req.user.id, `Invite ${inviteId} generated`, req.ip);

        res.json({ success: true, inviteToken: rawToken, expiresAt: expiresAt.toISOString() });
    } catch (err) {
        console.error('Invite generation failed:', err);
        res.status(500).json({ error: 'Falha ao gerar convite.' });
    }
});

// API: List Generate HR Invites (HR Only)
router.get('/hr/invites', authenticateHR, async (req, res) => {
    try {
        const invites = await all("SELECT id, expires_at, used FROM hr_invites ORDER BY expires_at DESC");
        res.json(invites);
    } catch (err) {
        res.status(500).json({ error: 'Falha ao buscar convites.' });
    }
});

// API: Revoke Specific HR Invite (HR Only)
router.put('/hr/invites/:id/revoke', authenticateHR, async (req, res) => {
    try {
        await run("UPDATE hr_invites SET used = 1 WHERE id = ?", [req.params.id]);
        await logAudit('HR_INVITE_REVOKED', req.user.id, `Invite ${req.params.id} manually revoked`, req.ip);
        res.json({ success: true, message: 'Convite revogado com sucesso.' });
    } catch (err) {
        res.status(500).json({ error: 'Falha ao revogar convite.' });
    }
});

// Create Mail (HR Only)
router.post('/mails', authenticateHR, async (req, res) => {
    const { recipientId, subject, content, type, bonusAmount, meetingTime } = req.body;

    if (!subject || !content) return res.status(400).json({ error: 'Assunto e Conteúdo são obrigatórios.' });
    if (!['MAIL', 'MEETING', 'REWARD'].includes(type)) return res.status(400).json({ error: 'Tipo de email inválido.' });

    try {
        const timestamp = new Date().toISOString();
        const cleanContent = sanitize(content);
        const cleanSubject = sanitize(subject);

        await run(
            "INSERT INTO mails (sender_id, recipient_id, subject, content, type, bonus_amount, meeting_time, timestamp) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
            [req.user.id, recipientId || null, cleanSubject, cleanContent, type, bonusAmount || 0, meetingTime || null, timestamp]
        );
        res.json({ success: true, message: 'Email enviado com sucesso.' });
    } catch (err) {
        res.status(500).json({ error: 'Falha ao enviar email.' });
    }
});

// Get User's Mails
router.get('/mails/:userId', authenticateUser, async (req, res) => {
    const isOwner = await assertOwnership(req, res, req.params.userId);
    if (!isOwner) return;

    try {
        const mails = await all(`
            SELECT m.*, u.name as sender_name 
            FROM mails m
            LEFT JOIN users u ON m.sender_id = u.id
            WHERE m.recipient_id = ? OR m.recipient_id IS NULL
            ORDER BY m.timestamp DESC
        `, [req.params.userId]);
        res.json(mails);
    } catch (err) {
        res.status(500).json({ error: 'Falha ao buscar emails.' });
    }
});

// Mark Mail as Read
router.put('/mails/:id/read', authenticateUser, async (req, res) => {
    try {
        const mail = await get("SELECT recipient_id FROM mails WHERE id = ?", [req.params.id]);
        if (!mail) return res.status(404).json({ error: 'Email não encontrado' });

        if (mail.recipient_id) {
            const isOwner = await assertOwnership(req, res, mail.recipient_id);
            if (!isOwner) return;
        }

        if (!mail.recipient_id) {
            // It's a company-wide mail. We don't mark it read globally.
            // Just return success so the frontend dismisses it for the current session.
            return res.json({ success: true, message: 'Ignorado localmente' });
        }

        await run("UPDATE mails SET is_read = 1 WHERE id = ?", [req.params.id]);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: 'Falha na atualização.' });
    }
});

// Get User Detail (Profile)
router.get('/users/:id', authenticateUser, async (req, res) => {
    try {
        const user = await get(
            "SELECT id, name, role, email, bio, pfp, shift_expectation FROM users WHERE id = ?",
            [req.params.id]
        );
        if (!user) return res.status(404).json({ error: 'Usuário não encontrado.' });

        // Information Disclosure / IDOR fix: Hide private fields from standard employees
        if (req.user.id !== req.params.id && !['HR', 'HRAssistant'].includes(req.user.role)) {
            // Log IDOR profiling since they are viewing basic social profile info but attempted to pull the full payload organically
            // We won't log an IDOR attempt here for social interaction (chat window pulling basic user data), but we drop the sensitive columns.
            delete user.email;
            delete user.shift_expectation;
        }

        const certifications = await all("SELECT * FROM certifications WHERE user_id = ?", [req.params.id]);
        res.json({ ...user, certifications });
    } catch (err) {
        res.status(500).json({ error: 'Erro no servidor' });
    }
});

// Update User Shift (HR Only)
router.put('/users/:id/shift', authenticateHR, async (req, res) => {
    const { shift_expectation } = req.body;
    try {
        await run("UPDATE users SET shift_expectation = ? WHERE id = ?", [shift_expectation, req.params.id]);
        res.json({ success: true, message: 'Turno atualizado com sucesso.' });
    } catch (err) {
        res.status(500).json({ error: 'Falha ao atualizar limites de turno.' });
    }
});

// API: Kill-Switch (Revoke All Active Sessions for User)
router.post('/users/:id/revoke-sessions', authenticateHR, async (req, res) => {
    try {
        const now = new Date().toISOString();
        await run("UPDATE users SET session_valid_after = ? WHERE id = ?", [now, req.params.id]);
        await logAudit('USER_SESSIONS_REVOKED', req.user.id, `Revoked all active tokens for ${req.params.id}`, req.ip);
        res.json({ success: true, message: 'Todas as sessões do usuário foram instantaneamente revogadas.' });
    } catch (err) {
        res.status(500).json({ error: 'Falha ao revogar sessões do usuário.' });
    }
});

// API: Weekly HR Report
router.get('/reports/weekly', authenticateHR, async (req, res) => {
    try {
        const users = await all("SELECT id, name, shift_expectation FROM users");

        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
        const since = sevenDaysAgo.toISOString();

        const punches = await all("SELECT * FROM punches WHERE timestamp >= ? ORDER BY timestamp ASC", [since]);

        const report = users.map(user => {
            const userPunches = punches.filter(p => p.user_id === user.id);

            // Group by date
            const days = {};
            userPunches.forEach(p => {
                const date = p.timestamp.split('T')[0];
                if (!days[date]) days[date] = [];
                days[date].push(p);
            });

            let totalWorkedMs = 0;
            let daysUnderExpected = 0;
            let missedBreaks = 0;

            Object.keys(days).forEach(date => {
                const dayPunches = days[date];
                let inTime = null, outTime = null;
                let breakStart = null, breakEnd = null;

                dayPunches.forEach(p => {
                    if (p.type === 'IN') inTime = new Date(p.timestamp);
                    if (p.type === 'OUT') outTime = new Date(p.timestamp);
                    if (p.type === 'BREAK_START') breakStart = new Date(p.timestamp);
                    if (p.type === 'BREAK_END') breakEnd = new Date(p.timestamp);
                });

                let breakMs = 0;
                if (breakStart && breakEnd) {
                    breakMs = breakEnd - breakStart;
                } else if (inTime && outTime) {
                    // Missed break condition: they clocked in and out but no complete break
                    missedBreaks++;
                }

                if (inTime && outTime) {
                    let workedMs = (outTime - inTime) - breakMs;
                    if (workedMs < 0) workedMs = 0;
                    totalWorkedMs += workedMs;

                    const hoursWorked = workedMs / (1000 * 60 * 60);
                    const expected = user.shift_expectation || 8;
                    // Tolerance of 10%
                    if (hoursWorked < expected * 0.9) {
                        daysUnderExpected++;
                    }
                }
            });

            return {
                id: user.id,
                name: user.name,
                shift_expectation: user.shift_expectation || 8,
                total_hours_worked: (totalWorkedMs / (1000 * 60 * 60)).toFixed(1),
                days_under_expected: daysUnderExpected,
                missed_breaks: missedBreaks
            };
        });

        res.json(report);
    } catch (err) {
        console.error('Failed to generate weekly report', err);
        res.status(500).json({ error: 'Falha ao gerar relatório semanal' });
    }
});

module.exports = router;
