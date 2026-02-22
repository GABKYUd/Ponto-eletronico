// const fetch = require('node-fetch'); // Rely on global fetch

const API_URL = 'http://localhost:3001/api';

async function runTests() {
    console.log('--- Starting RPG API Verification ---');
    try {
        const timestamp = Date.now();
        const user = { id: `rpg_user_${timestamp}`, name: 'RPG Player', role: 'Employee', email: `rpg${timestamp}@test.com`, password: 'password' };

        // Helper
        const request = async (url, method, body) => {
            const res = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: body ? JSON.stringify(body) : undefined
            });
            const data = await res.json().catch(() => ({}));
            if (!res.ok) throw new Error(`${method} ${url} failed: ${data.error || res.statusText}`);
            return data;
        };

        // 1. Register User
        console.log('1. Registering User...');
        await request(`${API_URL}/auth/register`, 'POST', { ...user, specialCode: 'KYUUK' });

        // 2. Create Character
        console.log('2. Creating Character...');
        const charData = {
            userId: user.id,
            name: 'Thorin Oakenshield',
            race: 'Dwarf',
            class: 'Fighter',
            stats: { str: 16, dex: 10, con: 16, int: 8, wis: 12, cha: 10 },
            hp: 12, maxHp: 12, ac: 16, inventory: ["Sword", "Shield"]
        };
        await request(`${API_URL}/characters`, 'POST', charData);
        console.log('   [SUCCESS] Character created.');

        // 3. Get Characters
        console.log('3. Fetching User Characters...');
        const chars = await request(`${API_URL}/characters/user/${user.id}`, 'GET');
        if (chars.length !== 1 || chars[0].name !== 'Thorin Oakenshield') throw new Error('Character fetch failed');
        console.log('   [SUCCESS] Character fetched.');

        const charId = chars[0].id;

        // 4. Update Character
        console.log('4. Updating Character HP...');
        await request(`${API_URL}/characters/${charId}`, 'PUT', { ...charData, hp: 5 });
        const updatedChar = await request(`${API_URL}/characters/${charId}`, 'GET');
        if (updatedChar.hp !== 5) throw new Error('Update failed');
        console.log('   [SUCCESS] Character updated.');

        // 5. Create Campaign
        console.log('5. Creating Campaign...');
        const campaign = { name: 'The Lonely Mountain', description: 'Far away...', dmId: user.id };
        await request(`${API_URL}/campaigns`, 'POST', campaign);
        const campaigns = await request(`${API_URL}/campaigns`, 'GET');
        const campId = campaigns.find(c => c.name === campaign.name).id;
        console.log(`   [SUCCESS] Campaign created (ID: ${campId}).`);

        // 6. Join Campaign
        console.log('6. Joining Campaign...');
        await request(`${API_URL}/campaigns/${campId}/join`, 'POST', { userId: user.id, characterId: charId });
        console.log('   [SUCCESS] Joined campaign.');

        // 7. Check Members
        console.log('7. Checking Members...');
        const members = await request(`${API_URL}/campaigns/${campId}/members`, 'GET');
        if (members.length !== 1 || members[0].char_name !== 'Thorin Oakenshield') throw new Error('Member check failed');
        console.log('   [SUCCESS] Member verified.');

        console.log('--- RPG VERIFICATION PASSED ---');

    } catch (err) {
        console.error('--- FAILED ---');
        console.error(err.message);
    }
}

runTests();
