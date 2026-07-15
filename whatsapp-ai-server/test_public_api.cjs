async function testPublic() {
    console.log('=== POSTing to https://umarhayat.alwaysdata.net/api/session/start ===');
    try {
        const startRes = await fetch('https://umarhayat.alwaysdata.net/api/session/start', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ schoolId: 'default_school' })
        });
        const startJson = await startRes.json();
        console.log('Start Response:', startJson);

        await new Promise(r => setTimeout(r, 4000));

        const statusRes = await fetch('https://umarhayat.alwaysdata.net/api/session/status?schoolId=default_school');
        const statusJson = await statusRes.json();
        console.log('Status Response:', {
            schoolId: statusJson.schoolId,
            status: statusJson.status,
            hasQr: !!statusJson.qrDataUrl
        });
    } catch (err) {
        console.error('Error:', err.message);
    }
}
testPublic();
