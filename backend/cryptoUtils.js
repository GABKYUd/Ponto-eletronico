const crypto = require('crypto');
require('dotenv').config();

// Ensure the encryption key is 32 characters (256 bits).
// We pad or slice a configured secret.
const RAW_SECRET = process.env.TOTP_ENCRYPTION_KEY || 'default_insecure_development_totp_key_32_bytes_limit';
const ENCRYPTION_KEY = crypto.scryptSync(RAW_SECRET, 'salt', 32);
const IV_LENGTH = 16; // AES block size

const encrypt = (text) => {
    if (!text) return null;
    const iv = crypto.randomBytes(IV_LENGTH);
    const cipher = crypto.createCipheriv('aes-256-cbc', ENCRYPTION_KEY, iv);
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    return iv.toString('hex') + ':' + encrypted;
};

const decrypt = (text) => {
    if (!text) return null;
    try {
        const textParts = text.split(':');
        const ivHex = textParts.shift();
        const iv = Buffer.from(ivHex, 'hex');
        const encryptedText = Buffer.from(textParts.join(':'), 'hex');
        const decipher = crypto.createDecipheriv('aes-256-cbc', ENCRYPTION_KEY, iv);
        let decrypted = decipher.update(encryptedText, 'hex', 'utf8');
        decrypted += decipher.final('utf8');
        return decrypted;
    } catch (err) {
        console.error('Decryption failed, returning raw string assuming legacy unencrypted secret', err);
        return text;
    }
};

module.exports = { encrypt, decrypt };
