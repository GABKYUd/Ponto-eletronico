const crypto = require('crypto');
require('dotenv').config();

// Ensure the encryption key is 32 characters (256 bits).
const RAW_SECRET = process.env.TOTP_ENCRYPTION_KEY || 'default_insecure_development_totp_key_32_bytes_limit';
const ENCRYPTION_KEY = crypto.scryptSync(RAW_SECRET, 'salt', 32);

// GCM uses a 12-byte initialization vector (nonce)
const GCM_IV_LENGTH = 12;

const encrypt = (text) => {
    if (!text) return null;
    const iv = crypto.randomBytes(GCM_IV_LENGTH);
    const cipher = crypto.createCipheriv('aes-256-gcm', ENCRYPTION_KEY, iv);

    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    const authTag = cipher.getAuthTag().toString('hex');

    // Format: iv:ciphertext:authTag
    return iv.toString('hex') + ':' + encrypted + ':' + authTag;
};

const decrypt = (text) => {
    if (!text) return null;
    try {
        const textParts = text.split(':');

        // GCM Format: iv:ciphertext:authTag
        if (textParts.length === 3) {
            const iv = Buffer.from(textParts[0], 'hex');
            const encryptedText = Buffer.from(textParts[1], 'hex');
            const authTag = Buffer.from(textParts[2], 'hex');

            const decipher = crypto.createDecipheriv('aes-256-gcm', ENCRYPTION_KEY, iv);
            decipher.setAuthTag(authTag);

            let decrypted = decipher.update(encryptedText, 'hex', 'utf8');
            decrypted += decipher.final('utf8');
            return decrypted;
        }

        // Legacy CBC Format: iv:ciphertext
        if (textParts.length === 2) {
            const iv = Buffer.from(textParts[0], 'hex');
            const encryptedText = Buffer.from(textParts[1], 'hex');

            const decipher = crypto.createDecipheriv('aes-256-cbc', ENCRYPTION_KEY, iv);
            let decrypted = decipher.update(encryptedText, 'hex', 'utf8');
            decrypted += decipher.final('utf8');
            return decrypted;
        }

        // Plaintext fallback (no colons)
        return text;
    } catch (err) {
        console.error('Decryption failed. Invalid key or tampered ciphertext.', err);
        throw new Error('Decryption Failed: Tampered or invalid ciphertext');
    }
};

module.exports = { encrypt, decrypt };
