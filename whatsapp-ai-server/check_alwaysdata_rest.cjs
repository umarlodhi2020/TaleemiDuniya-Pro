async function checkRest() {
    console.log('=== CHECKING ALWAYSDATA REST API FOR SITES ===');
    try {
        const authHeader = 'Basic ' + Buffer.from('umarhayat:umar9900').toString('base64');
        const res = await fetch('https://api.alwaysdata.com/v1/site/', {
            headers: { 'Authorization': authHeader }
        });
        const status = res.status;
        const text = await res.text();
        console.log(`HTTP Status: ${status}`);
        console.log(`Response:`, text.substring(0, 500));
    } catch (e) {
        console.error('Error:', e.message);
    }
}
checkRest();
