const { spawn } = require('child_process');

const host = 'ssh-umarhayat.alwaysdata.net';
const user = 'umarhayat';
const pass = 'umar9900';
const dir = '/home/umarhayat/TaleemiDunya-Pro/whatsapp-ai-server';

const commands = [
    `pkill -9 -u ${user} node`,
    `pkill -9 -u ${user} uwsgi`,
    `rm -rf ${dir}/auth_sessions/.lock_*`,
    `rm ${dir}/server.log ${dir}/auth_audit.log || true`,
    `cd ${dir} && PORT=8100 nohup node server.js > server.log 2>&1 < /dev/null &`,
    'sleep 5',
    `cat ${dir}/server.log`
].join('; ');

console.log('Connecting to SSH and executing commands...');

const ssh = spawn('ssh', ['-t', '-o', 'StrictHostKeyChecking=no', `${user}@${host}`, commands]);

ssh.stdout.on('data', (data) => {
    process.stdout.write(data);
});

ssh.stderr.on('data', (data) => {
    const output = data.toString();
    // Some SSH clients might prompt on stderr
    if (output.toLowerCase().includes('password:')) {
        ssh.stdin.write(pass + '\n');
    } else {
        process.stderr.write(data);
    }
});

ssh.on('close', (code) => {
    console.log(`\nSSH process exited with code ${code}`);
});
