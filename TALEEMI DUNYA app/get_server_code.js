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
            if (output.toLowerCase().includes('password:')) {
                ssh.stdin.write(pass + '\n');
            }
        });

        ssh.stderr.on('data', (data) => {
            const output = data.toString();
            stderr += output;
            if (output.toLowerCase().includes('password:')) {
                ssh.stdin.write(pass + '\n');
            }
        });

        ssh.on('close', (code) => {
            if (code === 0 || code === null) {
                resolve(stdout);
            } else {
                reject(new Error(`Exit code ${code}. Stderr: ${stderr}`));
            }
        });
    });
};

async function main() {
    try {
        console.log("Reading first 500 lines of server.js...");
        const sedCommand = `head -n 500 ${filePath}`;
        const code = await runSsh(sedCommand);
        console.log("CODE_START");
        console.log(code);
        console.log("CODE_END");
    } catch (err) {
        console.error("Error:", err);
    }
}

main();
