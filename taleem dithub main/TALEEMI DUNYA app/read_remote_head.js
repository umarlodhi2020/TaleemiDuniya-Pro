const { spawn } = require('child_process');
const host = 'ssh-umarhayat.alwaysdata.net';
const user = 'umarhayat';
const pass = 'umar9900';
const filePath = '/home/umarhayat/TaleemiDunya-Pro/whatsapp-ai-server/server.js';

const runSsh = (cmd) => {
    return new Promise((resolve, reject) => {
        const ssh = spawn('ssh', ['-o', 'StrictHostKeyChecking=no', `${user}@${host}`, cmd]);
        let stdout = '';
        let stderr = '';

        ssh.stdout.on('data', (data) => {
            const output = data.toString();
            stdout += output;
            if (output.includes('Password:')) {
                ssh.stdin.write(pass + '\n');
            }
        });

        ssh.stderr.on('data', (data) => {
            const output = data.toString();
            stderr += output;
            if (output.includes('Password:')) {
                ssh.stdin.write(pass + '\n');
            }
        });

        ssh.on('close', (code) => {
            resolve({stdout, stderr, code});
        });
    });
};

runSsh(`head -n 200 ${filePath}`).then(res => {
    console.log(res.stdout);
    if (res.stderr) console.error(res.stderr);
});
