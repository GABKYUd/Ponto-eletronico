const { all } = require('../database');
const userService = require('../users');

function initScheduler(io) {
    setInterval(async () => {
        try {
            const today = new Date().toISOString().split('T')[0];
            const punches = await all("SELECT * FROM punches WHERE timestamp LIKE ? ORDER BY timestamp ASC", [`${today}%`]);
            const users = await userService.getAllUsers();

            for (const user of users) {
                const userPunches = punches.filter(p => p.user_id === user.id);
                if (userPunches.length === 0) continue;

                const lastPunch = userPunches[userPunches.length - 1];
                const now = new Date();
                const lastPunchTime = new Date(lastPunch.timestamp);
                const durationMins = (now - lastPunchTime) / (1000 * 60);

                if (lastPunch.type === 'IN' || lastPunch.type === 'BREAK_END') {
                    if (durationMins >= 60) {
                        console.log(`Alerting user ${user.id} (${user.name}) to take a break`);
                        io.sockets.sockets.forEach(s => {
                            if (s.userId === user.id) {
                                s.emit('auto_break_started', { message: 'Você já trabalhou por muito tempo. Por favor, lembre-se de registrar o início da sua pausa no sistema.' });
                            }
                        });
                    }
                }

                if (lastPunch.type === 'BREAK_START' && durationMins >= 30 && durationMins < 31) {
                    console.log(`Alerting user ${user.id} (${user.name}) that break is over.`);
                    io.sockets.sockets.forEach(s => {
                        if (s.userId === user.id) {
                            s.emit('break_over_alert', { message: 'Atenção: Seu intervalo de 30 minutos terminou. Lembre-se de bater o ponto de volta!' });
                        }
                    });
                }
            }
        } catch (err) {
            console.error('Error in Auto-Break scheduler:', err);
        }
    }, 60 * 1000); // Check every 60 seconds
}

module.exports = { initScheduler };
