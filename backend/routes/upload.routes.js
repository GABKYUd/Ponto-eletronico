const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const { authenticateUser } = require('../auth');
const cloudinary = require('cloudinary').v2;
const cloudinaryStorage = require('multer-storage-cloudinary');
const fs = require('fs');

if (process.env.CLOUDINARY_URL) {
    console.log('Using Cloudinary for file uploads.');
} else {
    console.log('No CLOUDINARY_URL found. Falling back to local disk storage.');
}

const mimeToExt = {
    'image/jpeg': '.jpg',
    'image/png': '.png',
    'image/webp': '.webp'
};

const localStorage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, 'uploads/'),
    filename: (req, file, cb) => {
        const safeExt = mimeToExt[file.mimetype] || '.bin';
        cb(null, Date.now() + safeExt);
    }
});

let cloudStorage;
if (process.env.CLOUDINARY_URL) {
    cloudStorage = cloudinaryStorage({
        cloudinary: cloudinary,
        folder: 'ponto-uploads',
        allowedFormats: ['jpg', 'png', 'webp', 'jpeg'],
    });
}

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

router.post('/', authenticateUser, (req, res) => {
    upload.single('file')(req, res, (err) => {
        if (err) return res.status(400).json({ error: err.message });
        if (!req.file) return res.status(400).json({ error: 'No file uploaded.' });

        const imageUrl = process.env.CLOUDINARY_URL ? req.file.path : `http://localhost:3001/uploads/${req.file.filename}`;
        res.json({ success: true, imageUrl: imageUrl });
    });
});

module.exports = router;
