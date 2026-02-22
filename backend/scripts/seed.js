const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const bcrypt = require('bcrypt');
require('dotenv').config();

const DB_PATH = path.join(__dirname, '../ponto.db');
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'admin'; // Default fallback, but warn in logs

console.log('Connecting to database...');
const db = new sqlite3.Database(DB_PATH);

const seedAdmin = async () => {
    const hashedPassword = await bcrypt.hash(ADMIN_PASSWORD, 10);

    db.serialize(() => {
        // Ensure Users table exists (in case running on fresh DB)
        db.run(`CREATE TABLE IF NOT EXISTS users (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            role TEXT NOT NULL,
            password TEXT
        )`);

        console.log('Checking for existing Admin...');
        db.get("SELECT id FROM users WHERE id = 'admin'", (err, row) => {
            if (err) {
                console.error('Error querying DB:', err);
                return;
            }

            if (row) {
                console.log('Admin user already exists. Skipping creation.');
            } else {
                console.log('Creating Admin user...');
                const stmt = db.prepare("INSERT INTO users (id, name, role, password) VALUES (?, ?, ?, ?)");
                stmt.run("admin", "System Admin", "HR", hashedPassword);
                stmt.finalize();
                console.log('Admin user created successfully.');
            }
            db.close();
        });
    });
};

seedAdmin();
