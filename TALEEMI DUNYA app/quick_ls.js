const { spawn } = require('child_process');

const host = 'ssh-umarhayat.alwaysdata.net';
const user = 'umarhayat';
const pass = 'umar9900';

console.log(`Connecting to ${user}@${host}...`);
const ssh = spawn('ssh', ['-o', 'StrictHostKeyChecking=no', `${user}@${host}`, 'ls -F /home/umarhayat/TaleemiDunya-Pro/whatsapp-ai-server/']);

ssh.stdout.on('data', (data) => {
    console.log('STDOUT:', data.toString());
});

ssh.stderr.on('data', (data) => {
    const out = data.toString();
    console.log('STDERR_RAW:', JSON.stringify(out));
    if (out.toLowerCase().includes('password')) {
        console.log('MATCHED PASSWORD PROMPT. Sending password...');
        ssh.stdin.write(pass + '\n');
    }
});

ssh.on('close', (code) => {
    console.log('Exited with code', code);
    process.exit(code);
});

setTimeout(() => {
    console.log('Forced timeout after 45s');
    ssh.kill();
    process.exit(1);
}, 45000);
