const http = require('https');

function reboot() {
    return new Promise((resolve) => {
        const req = http.request('https://umarhayat.alwaysdata.net/api/server/reboot', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' }
        }, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => resolve(data));
        });
        req.end();
    });
}

async function run() {
    const res = await reboot();
    console.log("REBOOT RESPONSE:", res);
}
run();
