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
// OWASP Security Headers (Helmet)
app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'"],
            styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
            imgSrc: ["'self'", "data:", "http://localhost:3001", "https:"],
            connectSrc: ["'self'", "http://localhost:3001", "ws://localhost:3001", "wss:", "https:"]
        }
    },
    crossOriginResourcePolicy: { policy: "cross-origin" }
}));

app.use(cors());
app.use(express.json());

// Ensure uploads directory exists
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir);
}
app.use('/uploads', express.static(uploadsDir));

// Cloudinary Setup
const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');

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

const cloudStorage = new CloudinaryStorage({
    cloudinary: cloudinary,
    params: {
        folder: 'ponto-uploads',
        allowed_formats: ['jpg', 'png', 'webp', 'jpeg']
    },
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

// Apply Routes
app.use('/api/auth', authRoutes);
app.use('/api/clock', clockRoutes);
app.use('/api', hrRoutes); // Contains /users, /mails, /reports
app.use('/api', socialRoutes); // Contains /chat, /posts, /profile, /certifications

// API: Get Message of the Day (MOTD)
app.get('/api/motd', (req, res) => {
    const messages = [
        "Roll for initiative... against the Monday blues! 🎲",
        "You pretend to pay me, I pretend to work. 👀",
        "Cannot align text-center. Send help. CSS is hard. 🎨",
        "It's not a bug, it's a feature. 🐞"
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
    socket.on('disconnect', () => {
        console.log('Client disconnected:', socket.id);
    });
});

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
