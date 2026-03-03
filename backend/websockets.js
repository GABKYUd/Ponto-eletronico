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

    const rateLimitMap = new Map();

    io.on('connection', (socket) => {
        console.log('New authenticated client connected via WebSocket:', socket.id, 'User:', socket.userId);

        socket.use((packet, next) => {
            const now = Date.now();
            let limitInfo = rateLimitMap.get(socket.id);
            if (!limitInfo) {
                limitInfo = { count: 1, windowStart: now };
                rateLimitMap.set(socket.id, limitInfo);
                return next();
            }
            if (now - limitInfo.windowStart > 1000) {
                limitInfo.count = 1;
                limitInfo.windowStart = now;
                return next();
            }
            limitInfo.count++;
            if (limitInfo.count > 10) {
                console.warn(`WebSocket Rate Limit Exceeded: User ${socket.userId} (${socket.id}) sent ${limitInfo.count} msgs/sec`);
                return next(new Error('Rate limit exceeded. Disconnecting.'));
            }
            next();
        });

        socket.on('register_user', (userId) => {
            if (userId !== socket.userId) {
                console.warn(`WebSocket ID Spoof Attempt: Client requested ${userId} but holds token for ${socket.userId}`);
                return socket.disconnect();
            }
            console.log(`Socket ${socket.id} active for user ${socket.userId}`);
        });

        socket.on('disconnect', () => {
            rateLimitMap.delete(socket.id);
            console.log('Client disconnected:', socket.id);
        });
    });

    return io;
}

module.exports = { initWebSockets };
