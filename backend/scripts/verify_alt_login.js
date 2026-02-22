// Using global fetch
const speakeasy = require('speakeasy');

async function verifyAltLogin() {
    console.log('--- Verifying Alternative Login ---');

    const API_URL = 'http://localhost:3001/api';
    const request = async (url, method, body) => {
        const res = await fetch(url, {
            method,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body)
        });
        const data = await res.json();
        return { ok: res.ok, data };
    };

    try {
        // 1. Register User to get Secret
        const userId = `auth_test_${Date.now()}`;
        console.log(`1. Registering ${userId}...`);
        const reg = await request(`${API_URL}/auth/register`, 'POST', {
            name: 'Auth Test',
            id: userId,
            role: 'Employee',
            email: 'auth@test.com',
            password: 'password123',
            specialCode: 'KYUUK'
        });

        if (!reg.ok) throw new Error('Registration failed');
        const secret = reg.data.secret;
        console.log('   [SUCCESS] Registered. Secret:', secret);

        // 2. Login with Password
        console.log('2. Testing Password Login...');
        const pwLogin = await request(`${API_URL}/auth/login`, 'POST', {
            id: userId,
            password: 'password123'
        });
        if (pwLogin.ok && pwLogin.data.token) console.log('   [SUCCESS] Password Login works.');
        else throw new Error('Password Login failed');

        // 3. Login with 2FA Code
        console.log('3. Testing 2FA Login...');
        const code = speakeasy.totp({
            secret: secret,
            encoding: 'base32'
        });
        console.log(`   Generated TOTP: ${code}`);

        const codeLogin = await request(`${API_URL}/auth/login`, 'POST', {
            id: userId,
            code: code
        });

        if (codeLogin.ok && codeLogin.data.token) console.log('   [SUCCESS] 2FA Login works.');
        else {
            console.error('2FA Login response:', codeLogin.data);
            throw new Error('2FA Login failed');
        }

    } catch (err) {
        console.error('--- FAILED ---');
        console.error(err);
    }
}

verifyAltLogin();
