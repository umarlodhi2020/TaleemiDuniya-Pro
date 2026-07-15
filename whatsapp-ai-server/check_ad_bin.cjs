const { NodeSSH } = require('node-ssh');
const ssh = new NodeSSH();

async function checkBin() {
    await ssh.connect({
        host: 'ssh-umarhayat.alwaysdata.net',
        username: 'umarhayat',
        password: 'umar9900'
    });
    
    // Let's check /usr/alwaysdata, /opt, or system systemctl/supervisor
    const res = await ssh.execCommand(`find /usr/alwaysdata /opt /etc -name "*alwaysdata*" -o -name "*restart*" -o -name "*site*" 2>/dev/null | head -n 40`);
    console.log('=== ALWAYS DATA BINARIES ===');
    console.log(res.stdout || res.stderr);

    // Let's also check what `curl -I https://umarhayat.alwaysdata.net` returns (headers etc.)
    process.exit(0);
}
checkBin();
