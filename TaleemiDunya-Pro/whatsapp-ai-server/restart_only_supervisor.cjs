const { NodeSSH } = require('node-ssh');
const ssh = new NodeSSH();

async function restartSupervisorOnly() {
    console.log('⏳ Connecting to Alwaysdata Cloud...');
    await ssh.connect({
        host: 'ssh-umarhayat.alwaysdata.net',
        username: 'umarhayat',
        password: 'umar9900'
    });
    console.log('✅ Connected.');

    const remoteDir = '/home/umarhayat/TaleemiDunya-Pro/whatsapp-ai-server';

    console.log('⏳ Killing all manual pm2/nohup node processes and wiping session...');
    const cmd = `cd ${remoteDir} && export PATH=$PATH:$HOME/.npm-global/bin && pm2 kill 2>/dev/null || true; killall -9 node 2>/dev/null || true; rm -rf auth_sessions && sleep 2`;
    await ssh.execCommand(cmd);
    console.log('✅ Cleaned.');

    console.log('⏳ Waiting 8 seconds for Alwaysdata internal supervisor to auto-start server on assigned PORT...');
    await new Promise(r => setTimeout(r, 8000));

    const psRes = await ssh.execCommand(`ps aux | grep node | grep -v grep`);
    console.log('=== RUNNING NODE PROCESSES AFTER CLEAN ===');
    console.log(psRes.stdout || psRes.stderr);

    process.exit(0);
}
restartSupervisorOnly();
