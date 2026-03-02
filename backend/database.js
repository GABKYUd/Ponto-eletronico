const sqlite3 = require('sqlite3').verbose();
const { Pool } = require('pg');
const path = require('path');
require('dotenv').config();

const isPostgres = !!process.env.DATABASE_URL;
let db;
let pgPool;

if (isPostgres) {
    console.log('Connecting to PostgreSQL using DATABASE_URL...');
    pgPool = new Pool({
        connectionString: process.env.DATABASE_URL,
        ssl: { rejectUnauthorized: false } // Required for Heroku/Render free tiers usually
    });

    pgPool.connect()
        .then(() => {
            console.log('Connected to PostgreSQL database successfully.');
            initializeSchema();
        })
        .catch(err => console.error('PostgreSQL Connection Error:', err));
} else {
    const DB_PATH = path.join(__dirname, 'ponto.db');
    db = new sqlite3.Database(DB_PATH, (err) => {
        if (err) {
            console.error('Error opening database:', err.message);
        } else {
            console.log('Connected to the local SQLite database.');
            db.exec("PRAGMA journal_mode = WAL;", (pragmaErr) => {
                if (pragmaErr) console.error("Could not set WAL mode", pragmaErr);
            });
            db.run('PRAGMA foreign_keys = ON');
            initializeSchema();
        }
    });
}

// --- Query Translators ---
// Converts SQLite `?` params to PostgreSQL `$1, $2, $3...`
const translateQuery = (sql) => {
    if (!isPostgres) return sql;
    let i = 1;
    return sql.replace(/\?/g, () => `$${i++}`);
};

const run = (sql, params = []) => {
    return new Promise((resolve, reject) => {
        if (isPostgres) {
            const pgSql = translateQuery(sql);
            pgPool.query(pgSql, params)
                .then(res => resolve({ id: null, changes: res.rowCount })) // PG doesn't easily return lastID without RETURNING clause
                .catch(err => reject(err));
        } else {
            db.run(sql, params, function (err) {
                if (err) reject(err);
                else resolve({ id: this.lastID, changes: this.changes });
            });
        }
    });
};

const get = (sql, params = []) => {
    return new Promise((resolve, reject) => {
        if (isPostgres) {
            const pgSql = translateQuery(sql);
            pgPool.query(pgSql, params)
                .then(res => resolve(res.rows[0]))
                .catch(err => reject(err));
        } else {
            db.get(sql, params, (err, row) => {
                if (err) reject(err);
                else resolve(row);
            });
        }
    });
};

const all = (sql, params = []) => {
    return new Promise((resolve, reject) => {
        if (isPostgres) {
            const pgSql = translateQuery(sql);
            pgPool.query(pgSql, params)
                .then(res => resolve(res.rows))
                .catch(err => reject(err));
        } else {
            db.all(sql, params, (err, rows) => {
                if (err) reject(err);
                else resolve(rows);
            });
        }
    });
};

function initializeSchema() {
    const idType = isPostgres ? 'SERIAL PRIMARY KEY' : 'INTEGER PRIMARY KEY AUTOINCREMENT';

    const queries = [
        `CREATE TABLE IF NOT EXISTS users (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            role TEXT NOT NULL,
            password TEXT,
            email TEXT,
            two_factor_secret TEXT,
            bio TEXT,
            pfp TEXT,
            shift_expectation INTEGER DEFAULT 8,
            failed_login_attempts INTEGER DEFAULT 0,
            locked_until TEXT,
            session_valid_after TEXT
        )`,
        `CREATE TABLE IF NOT EXISTS punches (
            id ${idType},
            user_id TEXT NOT NULL,
            timestamp TEXT NOT NULL,
            type TEXT NOT NULL,
            FOREIGN KEY(user_id) REFERENCES users(id)
        )`,
        `CREATE TABLE IF NOT EXISTS posts (
            id ${idType},
            user_id TEXT NOT NULL,
            user_name TEXT NOT NULL,
            content TEXT,
            image_url TEXT,
            likes INTEGER DEFAULT 0,
            timestamp TEXT NOT NULL,
            FOREIGN KEY(user_id) REFERENCES users(id)
        )`,
        `CREATE TABLE IF NOT EXISTS certifications (
            id ${idType},
            user_id TEXT NOT NULL,
            name TEXT NOT NULL,
            issuer TEXT,
            date TEXT,
            image_url TEXT,
            FOREIGN KEY(user_id) REFERENCES users(id)
        )`,
        `CREATE TABLE IF NOT EXISTS messages (
            id ${idType},
            user_id TEXT NOT NULL,
            user_name TEXT NOT NULL,
            recipient_id TEXT,
            type TEXT DEFAULT 'text',
            content TEXT NOT NULL,
            timestamp TEXT NOT NULL,
            FOREIGN KEY(user_id) REFERENCES users(id)
        )`,
        `CREATE TABLE IF NOT EXISTS mails (
            id ${idType},
            sender_id TEXT NOT NULL,
            recipient_id TEXT,
            subject TEXT NOT NULL,
            content TEXT NOT NULL,
            type TEXT DEFAULT 'MAIL',
            bonus_amount INTEGER DEFAULT 0,
            meeting_time TEXT,
            is_read INTEGER DEFAULT 0,
            timestamp TEXT NOT NULL,
            FOREIGN KEY(sender_id) REFERENCES users(id)
        )`,
        `CREATE TABLE IF NOT EXISTS receipts (
            id ${idType},
            user_id TEXT NOT NULL,
            receipt_number TEXT NOT NULL,
            customer_name TEXT NOT NULL,
            total_amount REAL NOT NULL,
            date TEXT NOT NULL,
            data TEXT NOT NULL,
            timestamp TEXT NOT NULL,
            FOREIGN KEY(user_id) REFERENCES users(id)
        )`,
        `CREATE TABLE IF NOT EXISTS audit_logs (
            id ${idType},
            action_type TEXT NOT NULL,
            user_id TEXT,
            description TEXT,
            ip_address TEXT,
            timestamp TEXT NOT NULL
        )`,
        `CREATE TABLE IF NOT EXISTS audit_logs (
            id ${idType},
            action_type TEXT NOT NULL,
            user_id TEXT,
            description TEXT,
            ip_address TEXT,
            timestamp TEXT NOT NULL
        )`,
        `CREATE TABLE IF NOT EXISTS hr_invites (
            id TEXT PRIMARY KEY,
            token_hash TEXT NOT NULL,
            expires_at TEXT NOT NULL,
            used INTEGER DEFAULT 0
        )`,
        `CREATE TABLE IF NOT EXISTS revoked_tokens (
            jti TEXT PRIMARY KEY,
            expires_at INTEGER NOT NULL
        )`
    ];

    const executeQueries = async () => {
        try {
            for (let q of queries) {
                await run(q);
            }

            // Migrations (ignore errors if columns exist)
            if (!isPostgres) {
                db.run("ALTER TABLE users ADD COLUMN bio TEXT", () => { });
                db.run("ALTER TABLE users ADD COLUMN pfp TEXT", () => { });
                db.run("ALTER TABLE users ADD COLUMN shift_expectation INTEGER DEFAULT 8", () => { });
                db.run("ALTER TABLE users ADD COLUMN failed_login_attempts INTEGER DEFAULT 0", () => { });
                db.run("ALTER TABLE users ADD COLUMN locked_until TEXT", () => { });
                db.run("ALTER TABLE users ADD COLUMN session_valid_after TEXT", () => { });
                db.run("ALTER TABLE messages ADD COLUMN recipient_id TEXT", () => { });
                db.run("ALTER TABLE messages ADD COLUMN type TEXT DEFAULT 'text'", () => { });
            } else {
                // Postgres migrations syntax is slightly different but usually failing silently on duplicate column is harder, 
                // so ideally in a real prod env you'd use a migrations folder. 
                // For this dual-adapter, we'll try/catch them individually.
                const pgMigrations = [
                    "ALTER TABLE users ADD COLUMN bio TEXT",
                    "ALTER TABLE users ADD COLUMN pfp TEXT",
                    "ALTER TABLE users ADD COLUMN shift_expectation INTEGER DEFAULT 8",
                    "ALTER TABLE users ADD COLUMN failed_login_attempts INTEGER DEFAULT 0",
                    "ALTER TABLE users ADD COLUMN locked_until TEXT",
                    "ALTER TABLE users ADD COLUMN session_valid_after TEXT",
                    "ALTER TABLE messages ADD COLUMN recipient_id TEXT",
                    "ALTER TABLE messages ADD COLUMN type TEXT DEFAULT 'text'"
                ];
                for (let m of pgMigrations) {
                    try { await run(m); } catch (e) { /* Ignore duplicate column errors */ }
                }
            }

            console.log('Tables initialized. Run seed script to create admin if needed.');
        } catch (err) {
            console.error("Schema init error:", err);
        }
    };

    executeQueries();
}

const logAudit = async (action_type, user_id, description, ip_address) => {
    try {
        const timestamp = new Date().toISOString();
        const sql = `INSERT INTO audit_logs (action_type, user_id, description, ip_address, timestamp) VALUES (?, ?, ?, ?, ?)`;
        await run(sql, [action_type, user_id, description, ip_address, timestamp]);
    } catch (err) {
        console.error("Failed to write audit log:", err);
    }
};

module.exports = { db, pgPool, run, get, all, isPostgres, logAudit };
