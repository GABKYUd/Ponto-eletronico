const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const { authenticateUser } = require('./auth');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3001;

// OWASP Security Headers (Helmet)
app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'"],
            styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
            imgSrc: ["'self'", "data:", "http://localhost:3001", "https:"],
            connectSrc: ["'self'", "http://localhost:3001", "ws://localhost:3001", "wss:", "https:"],
            fontSrc: ["'self'", "https://fonts.gstatic.com"],
            objectSrc: ["'none'"],
            upgradeInsecureRequests: [],
        }
    },
    crossOriginResourcePolicy: { policy: "cross-origin" },
    referrerPolicy: { policy: "strict-origin-when-cross-origin" },
    xContentTypeOptions: true,
    xDnsPrefetchControl: { allow: false },
    xFrameOptions: { action: "deny" }
}));

app.use(cors());
app.use(express.json());

// Basic Rate Limiting
const rateLimit = require('express-rate-limit');
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 800, // limit each IP to 800 requests per windowMs to avoid dev/testing issues
    message: { error: 'Too many requests from this IP, please try again after 15 minutes' }
});
app.use('/api/', limiter);

// Ensure uploads directory exists
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir);
}
app.use('/uploads', express.static(uploadsDir));

// Cloudinary Setup
const cloudinary = require('cloudinary').v2;
const cloudinaryStorage = require('multer-storage-cloudinary');

if (process.env.CLOUDINARY_URL) {
    // Cloudinary automatically configures via the CLOUDINARY_URL env var
    console.log('Using Cloudinary for file uploads.');
} else {
    console.log('No CLOUDINARY_URL found. Falling back to local disk storage.');
}

// Multer Storage Configuration (File Upload)
const mimeToExt = {
    'image/jpeg': '.jpg',
    'image/png': '.png',
    'image/webp': '.webp'
};

const localStorage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, 'uploads/'),
    filename: (req, file, cb) => {
        const safeExt = mimeToExt[file.mimetype] || '.bin'; // Hard fallback
        cb(null, Date.now() + safeExt);
    }
});

const cloudStorage = cloudinaryStorage({
    cloudinary: cloudinary,
    folder: 'ponto-uploads',
    allowedFormats: ['jpg', 'png', 'webp', 'jpeg'],
});

const fileFilter = (req, file, cb) => {
    if (['image/jpeg', 'image/png', 'image/webp'].includes(file.mimetype)) {
        cb(null, true);
    } else {
        cb(new Error('Invalid file type. Only JPG, PNG, and WEBP are allowed.'), false);
    }
};
const upload = multer({
    storage: process.env.CLOUDINARY_URL ? cloudStorage : localStorage,
    fileFilter,
    limits: { fileSize: 5 * 1024 * 1024 }
});

// File Upload Route
app.post('/api/upload', authenticateUser, (req, res) => {
    upload.single('file')(req, res, (err) => {
        if (err) return res.status(400).json({ error: err.message });
        if (!req.file) return res.status(400).json({ error: 'No file uploaded.' });

        // Cloudinary puts the URL in req.file.path, local disk puts it in filename
        const imageUrl = process.env.CLOUDINARY_URL ? req.file.path : `http://localhost:3001/uploads/${req.file.filename}`;

        res.json({ success: true, imageUrl: imageUrl });
    });
});

// Import Modular Routes
const authRoutes = require('./routes/auth.routes');
const clockRoutes = require('./routes/clock.routes');
const hrRoutes = require('./routes/hr.routes');
const socialRoutes = require('./routes/social.routes');
const receiptRoutes = require('./routes/receipt.routes');

// Apply Routes
app.use('/api/auth', authRoutes);
app.use('/api/clock', clockRoutes);
app.use('/api', hrRoutes); // Contains /users, /mails, /reports
app.use('/api', socialRoutes); // Contains /chat, /posts, /profile, /certifications
app.use('/api/receipts', receiptRoutes);

// API: Get Message of the Day (MOTD)
app.get('/api/motd', (req, res) => {
    const messages = [
        "Role a iniciativa... contra a preguiça de segunda-feira! 🎲",
        "Você finge que me paga, eu finjo que trabalho. 👀",
        "Não consigo alinhar o texto no centro. Socorro. CSS é difícil. 🎨",
        "Não é um bug, é uma funcionalidade. 🐞"
    ];
    const index = Math.floor(Math.random() * messages.length);
    res.json({ message: messages[index] });
});

// Create HTTP Server
const http = require('http');
const { Server } = require('socket.io');

const server = http.createServer(app);

// Initialize Socket.io
// Initialize Socket.io
// In production, we allow the same origin, locally we allow Vite's 5173
const io = new Server(server, {
    cors: {
        origin: process.env.NODE_ENV === 'production' ? false : "http://localhost:5173",
        methods: ["GET", "POST"]
    }
});

// Expose io to the routes so they can emit events
app.set('io', io);

io.on('connection', (socket) => {
    console.log('New client connected via WebSocket:', socket.id);

    // Optional: Keep track of active users, read receipts, etc.
    // Store user id on socket when they authenticate/connect
    socket.on('register_user', (userId) => {
        socket.userId = userId;
        console.log(`Socket ${socket.id} registered for user ${userId}`);
    });

    socket.on('disconnect', () => {
        console.log('Client disconnected:', socket.id);
    });
});

// Auto-Break and Alert Scheduler
const { run, all } = require('./database');
const userService = require('./users');

setInterval(async () => {
    try {
        // Run every minute. Get punches for today to determine state.
        const today = new Date().toISOString().split('T')[0];
        const punches = await all("SELECT * FROM punches WHERE timestamp LIKE ? ORDER BY timestamp ASC", [`${today}%`]);
        const users = await userService.getAllUsers();

        users.forEach(async (user) => {
            const userPunches = punches.filter(p => p.user_id === user.id);
            if (userPunches.length === 0) return;

            const lastPunch = userPunches[userPunches.length - 1];
            const now = new Date();
            const lastPunchTime = new Date(lastPunch.timestamp);
            const durationMins = (now - lastPunchTime) / (1000 * 60);

            // 1. Auto-assign break after 1 hour (60 mins) of work
            if (lastPunch.type === 'IN' || lastPunch.type === 'BREAK_END') {
                if (durationMins >= 60) {
                    console.log(`Alerting user ${user.id} (${user.name}) to take a break`);

                    // Notify user via WebSocket
                    io.sockets.sockets.forEach(s => {
                        if (s.userId === user.id) {
                            s.emit('auto_break_started', { message: 'Você já trabalhou por muito tempo. Por favor, lembre-se de registrar o início da sua pausa no sistema.' });
                        }
                    });
                }
            }

            // 2. Alert after 30 mins of break time
            if (lastPunch.type === 'BREAK_START' && durationMins >= 30) {
                // To avoid spamming every minute after 30 mins, we can check if it's exactly 30 or we can just send the alert.
                // Let's just send it if it's between 30 and 31 minutes to trigger once.
                if (durationMins >= 30 && durationMins < 31) {
                    console.log(`Alerting user ${user.id} (${user.name}) that break is over.`);
                    io.sockets.sockets.forEach(s => {
                        if (s.userId === user.id) {
                            s.emit('break_over_alert', { message: 'Atenção: Seu intervalo de 30 minutos terminou. Lembre-se de bater o ponto de volta!' });
                        }
                    });
                }
            }
        });
    } catch (err) {
        console.error('Error in Auto-Break scheduler:', err);
    }
}, 60 * 1000); // Check every 60 seconds

// --- Production Ready Static File Serving ---
// In production, serve the compiled React SPA
if (process.env.NODE_ENV === 'production') {
    const frontendPath = path.join(__dirname, '../frontend/dist');
    app.use(express.static(frontendPath));

    // For any request that doesn't match an API route, serve index.html
    app.get('*', (req, res) => {
        res.sendFile(path.resolve(frontendPath, 'index.html'));
    });
}

server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
