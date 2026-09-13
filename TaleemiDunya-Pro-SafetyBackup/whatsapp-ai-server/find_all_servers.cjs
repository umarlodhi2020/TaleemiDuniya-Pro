const { NodeSSH } = require('node-ssh');
const ssh = new NodeSSH();

async function checkSite() {
    await ssh.connect({
        host: 'ssh-umarhayat.alwaysdata.net',
        username: 'umarhayat',
        password: 'umar9900'
    });
    
    // Find all server.js
    console.log("Finding server.js...");
    const result = await ssh.execCommand(`find /home/umarhayat -name server.js 2>/dev/null`);
    console.log(result.stdout);
    
    // Also check Passenger app root!
    const passenger = await ssh.execCommand(`cat /home/umarhayat/admin/config/nginx.conf 2>/dev/null || cat /etc/nginx/sites-enabled/* 2>/dev/null`);
    console.log("Passenger App Root / Nginx Info (if any):", passenger.stdout.slice(0, 500));

    ssh.dispose();
}
checkSite();
