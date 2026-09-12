const { spawn } = require('child_process');
const host = 'ssh-umarhayat.alwaysdata.net';
const user = 'umarhayat';
const pass = 'umar9900';

const ssh = spawn('ssh', ['-o', 'StrictHostKeyChecking=no', `${user}@${host}`, 'ls -F']);

ssh.stdin.write(pass + '\n');

ssh.stdout.on('data', (data) => {
    process.stdout.write(data.toString());
});

ssh.stderr.on('data', (data) => {
    process.stderr.write(data.toString());
});

ssh.on('close', (code) => {
    console.log(`\nExit code: ${code}`);
});
