async function testReboot() {
    console.log('=== TESTING POST /api/server/reboot ON ALWAYSDATA ===');
    try {
        const res = await fetch('https://umarhayat.alwaysdata.net/api/server/reboot', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ schoolId: 'default_school' })
        });
        const text = await res.text();
        console.log(`HTTP ${res.status}:`, text);
    } catch (e) {
        console.error('Error:', e.message);
    }
}
testReboot();
