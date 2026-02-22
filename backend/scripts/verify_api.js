const API_URL = 'http://localhost:3001/api';
const HR_ID = 'admin';
const HR_PASS = 'admin';
const TEST_USER = {
    name: 'AutoTest User',
    id: `test_${Date.now()}`,
    role: 'Employee',
    email: 'test@example.com',
    password: 'password123'
};

async function runTests() {
    console.log('--- Starting API Verification ---');
    try {
        // Helper for requests
        const request = async (url, method, body = null, token = null) => {
            const headers = { 'Content-Type': 'application/json' };
            if (token) headers['Authorization'] = `Bearer ${token}`;
            const opts = { method, headers };
            if (body) opts.body = JSON.stringify(body);

            const res = await fetch(url, opts);
            const data = await res.json().catch(() => ({}));
            if (!res.ok) throw new Error(`${method} ${url} failed: ${data.error || res.statusText}`);
            return data;
        };

        // 0. Register Temp HR (to ensure we have access)
        const TEMP_HR = { name: 'Test HR', id: `hr_${Date.now()}`, role: 'HR', password: 'password123', email: 'hr@example.com', specialCode: 'KYUUK' };
        console.log('0. Registering Temp HR...');
        await request(`${API_URL}/auth/register`, 'POST', TEMP_HR);
        console.log('   [SUCCESS] Temp HR registered.');

        // 1. Admin Login
        console.log('1. Logging in as Temp HR...');
        const loginData = await request(`${API_URL}/auth/login`, 'POST', { id: TEMP_HR.id, password: TEMP_HR.password });
        const hrToken = loginData.token;
        if (!hrToken) throw new Error('No token returned');
        console.log('   [SUCCESS] Admin Token received.');

        // 2. Register User
        console.log(`2. Registering User ${TEST_USER.id}...`);
        const regRes = await request(`${API_URL}/auth/register`, 'POST', { ...TEST_USER, specialCode: 'KYUUK' });
        console.log('   [SUCCESS] User registered.');
        if (regRes.qrCode) console.log('   [INFO] QR Code generated.');

        // 2.5 Employee Login (New Test)
        console.log('2.5 Verify Employee Login...');
        const empLogin = await request(`${API_URL}/auth/login`, 'POST', { id: TEST_USER.id, password: TEST_USER.password });
        if (!empLogin.token) throw new Error('Employee login failed');
        console.log('   [SUCCESS] Employee Logged in.');

        // 3. Clock In
        console.log('3. Clocking IN...');
        await request(`${API_URL}/clock`, 'POST', { employeeId: TEST_USER.id, type: 'IN' });
        console.log('   [SUCCESS] Clocked IN.');

        // 4. Start Break
        console.log('4. Starting Break...');
        await request(`${API_URL}/clock`, 'POST', { employeeId: TEST_USER.id, type: 'BREAK_START' });
        console.log('   [SUCCESS] Break Started.');

        // 5. Send Chat Message
        console.log('5. Sending Chat Message...');
        await request(`${API_URL}/chat`, 'POST', {
            userId: TEST_USER.id,
            userName: TEST_USER.name,
            content: 'Automated Test Message'
        });
        console.log('   [SUCCESS] Message Sent.');

        // 6. Verify Chat
        console.log('6. Verifying Chat...');
        const messages = await request(`${API_URL}/chat`, 'GET');
        const msg = messages.find(m => m.user_id === TEST_USER.id && m.content === 'Automated Test Message');
        if (!msg) throw new Error('Message not found in chat history');
        console.log('   [SUCCESS] Message verified.');

        // 7. Create Campaign
        console.log('7. Creating Campaign...');
        await request(`${API_URL}/campaigns`, 'POST', {
            name: 'Test Campaign',
            description: 'A test adventure',
            dmId: TEST_USER.id
        });
        console.log('   [SUCCESS] Campaign created.');

        // 8. Verify Campaign
        console.log('8. Verifying Campaign...');
        const campaigns = await request(`${API_URL}/campaigns`, 'GET');
        const camp = campaigns.find(c => c.dm_id === TEST_USER.id && c.name === 'Test Campaign');
        if (!camp) throw new Error('Campaign not found');
        console.log('   [SUCCESS] Campaign verified.');

        console.log('\n--- VERIFICATION COMPLETE: ALL TESTS PASSED ---');

    } catch (err) {
        console.error('\n--- VERIFICATION FAILED ---');
        console.error(err.message);
    }
}

runTests();
