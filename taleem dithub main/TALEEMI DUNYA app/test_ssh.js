const { spawn } = require('child_process');
const host = 'ssh-umarhayat.alwaysdata.net';
const user = 'umarhayat';
const pass = 'umar9900';

const runSsh = (cmd) => {
    return new Promise((resolve, reject) => {
        const ssh = spawn('ssh', ['-o', 'StrictHostKeyChecking=no', `${user}@${host}`, cmd]);
        let stdout = '';
        let stderr = '';

        ssh.stdout.on('data', (data) => {
            const output = data.toString();
            stdout += output;
            process.stdout.write('[OUT] ' + output);
            if (output.toLowerCase().includes('password:')) {
                ssh.stdin.write(pass + '\n');
            }
        });

        ssh.stderr.on('data', (data) => {
            const output = data.toString();
            stderr += output;
            process.stdout.write('[ERR] ' + output);
            if (output.toLowerCase().includes('password:')) {
                ssh.stdin.write(pass + '\n');
            }
        });

        ssh.on('close', (code) => {
            console.log(`SSH closed with code ${code}`);
            resolve(stdout);
        });
    });
};

runSsh('ls -la');
