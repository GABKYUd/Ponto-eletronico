const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcrypt');
const path = require('path');

const dbPath = path.resolve(__dirname, '../ponto.db');
const db = new sqlite3.Database(dbPath);

async function seedAdmin() {
    const adminUser = {
        id: 'admin',
        name: 'System Admin',
        role: 'HR',
        password: 'admin123',
        email: 'admin@system.com',
        two_factor_secret: null
    };

    const hashedPassword = await bcrypt.hash(adminUser.password, 10);

    db.get("SELECT id FROM users WHERE id = ?", [adminUser.id], (err, row) => {
        if (err) {
            console.error(err);
            return;
        }

        if (row) {
            console.log('Admin user already exists.');
        } else {
            db.run(
                "INSERT INTO users (id, name, role, password, email, two_factor_secret) VALUES (?, ?, ?, ?, ?, ?)",
                [adminUser.id, adminUser.name, adminUser.role, hashedPassword, adminUser.email, adminUser.two_factor_secret],
                (err) => {
                    if (err) console.error('Failed to create admin:', err);
                    else console.log('Admin user created successfully. ID: admin, Password: admin123');
                }
            );
        }
    });
}

seedAdmin();
