const { NodeSSH } = require('node-ssh');
const ssh = new NodeSSH();

async function touchAll() {
    console.log('=== TOUCHING RESTART.TXT EVERYWHERE ===');
    await ssh.connect({
        host: 'ssh-umarhayat.alwaysdata.net',
        username: 'umarhayat',
        password: 'umar9900'
    });
    
    const dirs = [
        '/home/umarhayat',
        '/home/umarhayat/admin',
        '/home/umarhayat/admin/tmp',
        '/home/umarhayat/TaleemiDunya-Pro',
        '/home/umarhayat/TaleemiDunya-Pro/tmp',
        '/home/umarhayat/TaleemiDunya-Pro/whatsapp-ai-server',
        '/home/umarhayat/TaleemiDunya-Pro/whatsapp-ai-server/tmp',
        '/home/umarhayat/www'
    ];

    for (const d of dirs) {
        await ssh.execCommand(`mkdir -p ${d}/tmp 2>/dev/null; touch ${d}/restart.txt ${d}/tmp/restart.txt 2>/dev/null || true`);
    }

    console.log('✅ All restart.txt markers touched across filesystem.');
    process.exit(0);
}
touchAll();
