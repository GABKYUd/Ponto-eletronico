const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');
const JWT_SECRET = process.env.JWT_SECRET || 'super_secret_production_key_default';

function initWebSockets(server, app) {
    const io = new Server(server, {
        cors: {
            origin: process.env.NODE_ENV === 'production' ? false : "http://localhost:5173",
            methods: ["GET", "POST"]
        }
    });

    app.set('io', io);

    io.use((socket, next) => {
        const token = socket.handshake.auth?.token;
        if (!token) return next(new Error('Authentication Error: Token missing'));

        try {
            const decoded = jwt.verify(token, JWT_SECRET);
            socket.userId = decoded.id;
            socket.userRole = decoded.role;
            next();
        } catch (err) {
            next(new Error('Authentication Error: Invalid token'));
        }
    });

    io.on('connection', (socket) => {
        console.log('New authenticated client connected via WebSocket:', socket.id, 'User:', socket.userId);

        socket.on('register_user', (userId) => {
            if (userId !== socket.userId) {
                console.warn(`WebSocket ID Spoof Attempt: Client requested ${userId} but holds token for ${socket.userId}`);
                return socket.disconnect();
            }
            console.log(`Socket ${socket.id} active for user ${socket.userId}`);
        });

        socket.on('disconnect', () => {
            console.log('Client disconnected:', socket.id);
        });
    });

    return io;
}

module.exports = { initWebSockets };
