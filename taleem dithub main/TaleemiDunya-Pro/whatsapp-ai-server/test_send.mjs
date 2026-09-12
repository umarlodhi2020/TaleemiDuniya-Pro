// Test: Send a message to the connected WhatsApp number to verify bot can send
const resp = await fetch('https://umarhayat.alwaysdata.net/api/message/send', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
        schoolId: 'NNRuCtHxQNjISc9EPgMs',
        phone: '923172234518',
        message: '✅ Bot is ALIVE! If you see this, the sending works. Reply "hello" to test auto-reply.'
    })
});
const data = await resp.json();
console.log('Send result:', JSON.stringify(data, null, 2));
