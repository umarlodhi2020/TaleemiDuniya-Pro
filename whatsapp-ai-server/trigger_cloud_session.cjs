const { NodeSSH } = require('node-ssh');
const ssh = new NodeSSH();

async function triggerCloud() {
    await ssh.connect({
        host: 'ssh-umarhayat.alwaysdata.net',
        username: 'umarhayat',
        password: 'umar9900'
    });
    console.log('=== TRIGGERING VIA NODE INSIDE CLOUD ===');
    const res = await ssh.execCommand(`node -e "
        fetch('http://localhost:4000/api/session/start', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ schoolId: 'default_school' })
        }).then(r => r.json()).then(console.log).catch(console.error);
    " && sleep 4 && curl -s http://localhost:4000/api/session/status`);
    console.log(res.stdout || res.stderr);
    process.exit(0);
}
triggerCloud();
