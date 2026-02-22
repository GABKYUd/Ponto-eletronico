// Using global fetch (Node 18+)

async function verifyMOTD() {
    console.log('--- Verifying MOTD Endpoint ---');
    try {
        const res = await fetch('http://localhost:3001/api/motd');
        const data = await res.json();

        if (res.ok && data.message) {
            console.log('SUCCESS: MOTD received.');
            console.log('Message:', data.message);
        } else {
            console.error('FAILED:', data);
            throw new Error('Invalid MOTD response');
        }

    } catch (err) {
        console.error('--- FAILED ---');
        console.error(err);
    }
}

verifyMOTD();
