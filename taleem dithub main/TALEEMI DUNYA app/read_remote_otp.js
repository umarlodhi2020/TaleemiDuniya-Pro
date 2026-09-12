const { spawn } = require('child_process');

const host = 'ssh-umarhayat.alwaysdata.net';
const user = 'umarhayat';
const pass = 'umar9900';
const filePath = '/home/umarhayat/TaleemiDunya-Pro/whatsapp-ai-server/server.js';

// We'll run grep first to find the line number.
const command1 = `grep -n "request-otp" ${filePath}`;

const runSsh = (cmd) => {
    return new Promise((resolve, reject) => {
        const ssh = spawn('ssh', ['-o', 'StrictHostKeyChecking=no', `${user}@${host}`, cmd]);
        let stdout = '';
        let stderr = '';

        ssh.stdout.on('data', (data) => {
            const output = data.toString();
            stdout += output;
            console.log(`STDOUT: ${output}`);
            if (output.toLowerCase().includes('password:')) {
                ssh.stdin.write(pass + '\n');
            }
        });

        ssh.stderr.on('data', (data) => {
            const output = data.toString();
            stderr += output;
            console.log(`STDERR: ${output}`);
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
        console.log("Finding line number...");
        const grepOutput = await runSsh(command1);
        console.log("Grep Output:", grepOutput);

        const match = grepOutput.match(/^(\d+):/);
        if (!match) {
            console.error("Could not find line number in output");
            return;
        }

        const lineNum = parseInt(match[1]);
        const start = Math.max(1, lineNum - 10);
        const end = lineNum + 100;

        console.log(`Reading lines ${start} to ${end}...`);
        const sedCommand = `sed -n "${start},${end}p" ${filePath}`;
        const snippet = await runSsh(sedCommand);

        console.log("CODE_SNIPPET_START");
        console.log(snippet);
        console.log("CODE_SNIPPET_END");
    } catch (err) {
        console.error("Error:", err);
    }
}

main();
