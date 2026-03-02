const { get, all, run } = require('./backend/database');
const { encrypt } = require('./backend/cryptoUtils');

async function migrateSecrets() {
    console.log('--- Starting TOTP DB Encryption Migration (GCM Upgrade) ---');
    try {
        await new Promise(res => setTimeout(res, 1000)); // Wait for SQLite to initialize

        // Fetch all users with 2FA enabled
        const users = await all("SELECT id, name, two_factor_secret FROM users WHERE two_factor_secret IS NOT NULL");
        console.log(`Found ${users.length} users with existing TOTP secrets.`);

        let migratedCount = 0;
        let skippedCount = 0;

        for (const user of users) {
            // We can check if it's AES-256-CBC (2 parts separated by colon)
            const textParts = user.two_factor_secret.split(':');

            // If it's already 3 parts, it's GCM! Skip.
            if (textParts.length === 3) {
                console.log(`[SKIPPED] Secret for user ${user.id} (${user.name}) is already AES-256-GCM.`);
                skippedCount++;
            } else {
                // To migrate, we must decrypt the CBC token using the existing cryptoUtil fallback hook 
                // However, our cryptoUtils.js right now supports *decrypting* CBC dynamically, 
                // but we only *encrypt* via GCM. 
                // So we can decrypt here by dynamically requiring decrypt, then encrypt.
                const { decrypt } = require('./backend/cryptoUtils');
                try {
                    const rawString = decrypt(user.two_factor_secret);
                    const newCiphertext = encrypt(rawString);
                    await run("UPDATE users SET two_factor_secret = ? WHERE id = ?", [newCiphertext, user.id]);
                    console.log(`[MIGRATED] Upgraded secret to AES-256-GCM for user ${user.id} (${user.name})`);
                    migratedCount++;
                } catch (err) {
                    console.error(`[ERROR] Failed to decrypt/migrate secret for user ${user.id}.`);
                }
            }
        }

        console.log(`--- GCM Migration Complete! Upgraded: ${migratedCount} | Skipped: ${skippedCount} ---`);
        process.exit(0);

    } catch (err) {
        console.error("Migration failed:", err);
        process.exit(1);
    }
}

migrateSecrets();
