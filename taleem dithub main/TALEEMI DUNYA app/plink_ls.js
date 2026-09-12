const { spawn } = require('child_process');

const host = 'ssh-umarhayat.alwaysdata.net';
const user = 'umarhayat';
const pass = 'umar9900';

console.log(`Connecting to ${user}@${host} using plink...`);
const plink = spawn('.\\plink.exe', ['-pw', pass, `${user}@${host}`, 'ls -F /home/umarhayat/TaleemiDunya-Pro/whatsapp-ai-server/']);

const handleData = (data) => {
    const out = data.toString();
    console.log('OUTPUT:', out);
    if (out.toLowerCase().includes('store key in cache') || out.toLowerCase().includes('y/n')) {
        console.log('--- MATCHED HOST KEY PROMPT. SENDING "y" ---');
        plink.stdin.write('y\n');
    }
};

plink.stdout.on('data', handleData);
plink.stderr.on('data', handleData);

plink.on('close', (code) => {
    console.log('Exited with code', code);
    process.exit(code);
});

setTimeout(() => {
    console.log('Forced timeout after 60s');
    plink.kill();
    process.exit(1);
}, 60000);
