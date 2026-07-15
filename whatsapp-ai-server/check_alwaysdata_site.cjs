const { NodeSSH } = require('node-ssh');
const ssh = new NodeSSH();

async function checkAlwaysdataSite() {
    await ssh.connect({
        host: 'ssh-umarhayat.alwaysdata.net',
        username: 'umarhayat',
        password: 'umar9900'
    });
    const res = await ssh.execCommand(`for port in $(seq 8000 8500); do
        out=$(curl -m 1 -s http://localhost:$port/api/session/status 2>/dev/null)
        if [ ! -z "$out" ]; then
            echo "PORT $port -> $out"
        fi
    done
    echo "=== CHECKING PORT 4000 ==="
    curl -s http://localhost:4000/api/session/status`);
    console.log(res.stdout || res.stderr);
    process.exit(0);
}
checkAlwaysdataSite();
