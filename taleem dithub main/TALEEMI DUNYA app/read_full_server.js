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
        const fullContent = await runSsh(`cat ${filePath}`);
        process.stdout.write(fullContent);
    } catch (err) {
        console.error("Error:", err);
        process.exit(1);
    }
}

main();
