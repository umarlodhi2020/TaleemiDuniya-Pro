const { NodeSSH } = require('node-ssh');
const ssh = new NodeSSH();
const http = require('https');
const path = require('path');

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
        req.on('error', () => resolve('error'));
        req.end();
    });
}

async function uploadAndRestart() {
    console.log('⏳ Uploading updated server.js...');
    await ssh.connect({
        host: 'ssh-umarhayat.alwaysdata.net',
        username: 'umarhayat',
        password: 'umar9900'
    });
    
    const remoteDir = '/home/umarhayat/TaleemiDunya-Pro/whatsapp-ai-server';
    await ssh.putFile(path.join(__dirname, 'server.js'), `${remoteDir}/server.js`);
    console.log('✅ File uploaded successfully.');
    
    console.log('⏳ Rebooting server...');
    const res = await reboot();
    console.log('✅ Reboot Triggered:', res);
    
    process.exit(0);
}

uploadAndRestart();
