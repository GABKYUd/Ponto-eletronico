const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const { authenticateUser } = require('../auth');
const cloudinary = require('cloudinary').v2;
const fs = require('fs');
const sharp = require('sharp');
const FileType = require('file-type');
const logger = require('../logger');

if (process.env.CLOUDINARY_URL) {
    console.log('Using Cloudinary for file uploads.');
} else {
    console.log('No CLOUDINARY_URL found. Falling back to local disk storage.');
}

// Receive file into memory for L3 Hardening (Magic Bytes + Sharp EXIF removal)
const storage = multer.memoryStorage();
const upload = multer({
    storage,
    limits: { fileSize: 5 * 1024 * 1024 } // 5MB limit
});

router.post('/', authenticateUser, (req, res) => {
    upload.single('file')(req, res, async (err) => {
        if (err) return res.status(400).json({ error: err.message });
        if (!req.file) return res.status(400).json({ error: 'No file uploaded.' });

        try {
            // 1. Magic byte detection (Ignores misleading extensions)
            const fileType = await FileType.fromBuffer(req.file.buffer);
            if (!fileType || !['image/jpeg', 'image/png', 'image/webp'].includes(fileType.mime)) {
                logger.warn(`Suspicious file upload attempt by user ${req.user.id}`, { ip: req.ip, fileMime: req.file.mimetype, detectedMime: fileType?.mime });
                return res.status(400).json({ error: 'Invalid file type. Only genuine JPG, PNG, and WEBP are allowed.' });
            }

            // 2. Strip EXIF and re-encode using sharp
            const processedBuffer = await sharp(req.file.buffer)
                .rotate() // Auto-rotate based on EXIF (if any)
                // Omit .withMetadata() to ensure EXIF is completely stripped
                .toFormat(fileType.ext) // Enforce consistent encoding format
                .toBuffer();

            // 3. Save to configured storage provider
            if (process.env.CLOUDINARY_URL) {
                // Upload buffer to Cloudinary via stream
                const uploadStream = cloudinary.uploader.upload_stream({
                    folder: 'ponto-uploads',
                    resource_type: 'image'
                }, (error, result) => {
                    if (error) {
                        logger.error('Cloudinary upload failed', { error });
                        return res.status(500).json({ error: 'Upload failed remotely.' });
                    }
                    res.json({ success: true, imageUrl: result.secure_url });
                });

                uploadStream.end(processedBuffer);
            } else {
                // Save locally
                const filename = `${Date.now()}_secured.${fileType.ext}`;
                const filepath = path.join(__dirname, '../uploads', filename);
                fs.writeFileSync(filepath, processedBuffer);
                res.json({ success: true, imageUrl: `http://localhost:3001/uploads/${filename}` });
            }
        } catch (processErr) {
            logger.error('File hardening process error', { error: processErr.message, traceback: processErr.stack });
            res.status(500).json({ error: 'Failed to securely process image.' });
        }
    });
});

module.exports = router;
