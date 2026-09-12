const { spawn } = require('child_process');
const host = 'ssh-umarhayat.alwaysdata.net';
const user = 'umarhayat';
const pass = 'umar9900';

const runSsh = (cmd) => {
    return new Promise((resolve, reject) => {
        // Use -o StrictHostKeyChecking=no and -o UserKnownHostsFile=/dev/null to avoid host key issues
        const ssh = spawn('ssh', ['-o', 'StrictHostKeyChecking=no', '-o', 'UserKnownHostsFile=/dev/null', `${user}@${host}`, cmd]);
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
            resolve({ stdout, stderr, code });
        });
    });
};

async function main() {
    const remoteCmd = `
        cd /home/umarhayat/TaleemiDunya-Pro/whatsapp-ai-server/ && \
        node -e "
            const admin = require('firebase-admin');
            const fs = require('fs');
            const serviceAccount = JSON.parse(fs.readFileSync('serviceAccountKey.json', 'utf8'));
            admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
            const db = admin.firestore();
            async function run() {
                try {
                    const snapshot = await db.collection('students').where('name', '==', 'Umar Hayat').get();
                    if (snapshot.empty) {
                        console.log('STUDENT_NOT_FOUND');
                        return;
                    }
                    const doc = snapshot.docs[0];
                    const data = doc.data();
                    console.log('STUDENT_JSON_START');
                    console.log(JSON.stringify({ id: doc.id, ...data }, null, 2));
                    console.log('STUDENT_JSON_END');

                    console.log('ANALYSIS_START');
                    console.log('rollNumber type:', typeof data.rollNumber);
                    console.log('phone:', data.phone);
                    console.log('parentPhone:', data.parentPhone);
                    console.log('ANALYSIS_END');
                } catch (e) {
                    console.error('ERROR:', e.message);
                }
            }
            run();
        "
    `;

    try {
        console.log("Running remote query...");
        const result = await runSsh(remoteCmd);
        console.log(result.stdout);
        if (result.stderr) console.error("STDERR:", result.stderr);
    } catch (err) {
        console.error("FAILED:", err);
    }
}

main();
