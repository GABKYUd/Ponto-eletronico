// Using global fetch
// Since we removed node-fetch dependency in step 245, we should use global fetch.

async function verifyAdmin() {
    console.log('Verifying Admin Login...');
    try {
        const res = await fetch('http://localhost:3001/api/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id: 'admin', password: 'admin123' })
        });

        const data = await res.json();
        if (res.ok && data.token) {
            console.log('SUCCESS: Admin logged in.');
            console.log('Token:', data.token);
        } else {
            console.error('FAILED:', data);
        }
    } catch (err) {
        console.error('ERROR:', err);
    }
}

verifyAdmin();
