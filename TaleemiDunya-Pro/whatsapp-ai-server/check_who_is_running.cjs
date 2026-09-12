const { NodeSSH } = require('node-ssh');
const ssh = new NodeSSH();

async function checkWho() {
    await ssh.connect({
        host: 'ssh-umarhayat.alwaysdata.net',
        username: 'umarhayat',
        password: 'umar9900'
    });
    const logRes = await ssh.execCommand(`tail -n 20 /home/umarhayat/admin/logs/sites/2026/sites-2026-07-14.log`);
    console.log('=== SITE SUPERVISOR LOG ===');
    console.log(logRes.stdout || logRes.stderr);

    const psRes = await ssh.execCommand(`ps aux | grep node`);
    console.log('=== PS AUX ON SSH1 ===');
    console.log(psRes.stdout || psRes.stderr);

    // Also check if we can run `alwaysdata` CLI tool
    const cliRes = await ssh.execCommand(`which alwaysdata || which ad || echo "No CLI"`);
    console.log('=== CLI CHECK ===');
    console.log(cliRes.stdout || cliRes.stderr);
    process.exit(0);
}
checkWho();
