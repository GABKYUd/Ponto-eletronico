const { run, get, all } = require('./database');
const bcrypt = require('bcrypt');

// Get all users
const getAllUsers = async () => {
    try {
        return await all("SELECT * FROM users");
    } catch (err) {
        console.error('Error fetching users:', err);
        return [];
    }
};

// Find user by ID
const findUserById = async (id) => {
    try {
        return await get("SELECT * FROM users WHERE id = ?", [id]);
    } catch (err) {
        console.error('Error finding user:', err);
        return null;
    }
};

// Create new user
const createUser = async (user) => {
    const existing = await findUserById(user.ID);
    if (existing) {
        throw new Error('User ID already exists.');
    }

    try {
        const hashedPassword = user.Password ? await bcrypt.hash(user.Password, 10) : '';
        await run(
            "INSERT INTO users (id, name, role, password, email, two_factor_secret) VALUES (?, ?, ?, ?, ?, ?)",
            [user.ID, user.Name, user.Role, hashedPassword, user.Email, user.TwoFactorSecret]
        );
        return true;
    } catch (err) {
        console.error(err);
        return false;
    }
};

// Verify Password (Generic)
const verifyPassword = async (user, password) => {
    console.log(`Verifying password for user: ${user.id}`);
    if (!user || !user.password) {
        console.log('User or password hash missing.');
        return false;
    }
    const match = await bcrypt.compare(password, user.password);
    console.log(`Password match result: ${match}`);
    return match;
};

// Validate HR Credentials (Legacy support, but can relay to verifyPassword)
const validateHrCredentials = async (id, password) => {
    const user = await findUserById(id);
    if (user && user.role === 'HR') {
        return await verifyPassword(user, password);
    }
    return false;
};

module.exports = {
    getAllUsers,
    findUserById,
    createUser,
    validateHrCredentials,
    verifyPassword
};
