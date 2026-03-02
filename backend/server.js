const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const path = require('path');
const fs = require('fs');
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

// Import Modular Routes
const authRoutes = require('./routes/auth.routes');
const clockRoutes = require('./routes/clock.routes');
const hrRoutes = require('./routes/hr.routes');
const socialRoutes = require('./routes/social.routes');
const receiptRoutes = require('./routes/receipt.routes');
const uploadRoutes = require('./routes/upload.routes');

// Apply Routes
app.use('/api/auth', authRoutes);
app.use('/api/clock', clockRoutes);
app.use('/api', hrRoutes); // Contains /users, /mails, /reports
app.use('/api', socialRoutes); // Contains /chat, /posts, /profile, /certifications
app.use('/api/receipts', receiptRoutes);
app.use('/api/upload', uploadRoutes);

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
const server = http.createServer(app);

// Initialize WebSockets
const { initWebSockets } = require('./websockets');
const io = initWebSockets(server, app);

// Initialize Auto-Break and Alert Scheduler
const { initScheduler } = require('./scripts/scheduler');
initScheduler(io);

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
