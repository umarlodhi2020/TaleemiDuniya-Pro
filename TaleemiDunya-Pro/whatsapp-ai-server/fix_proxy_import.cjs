const { NodeSSH } = require('node-ssh');
const ssh = new NodeSSH();
async function run() {
    await ssh.connect({host: 'ssh-umarhayat.alwaysdata.net', username: 'umarhayat', password: 'umar9900'});
    const script = `
import http from 'http';
const port = process.env.PORT || 8080;
const targetPort = 4000;
const server = http.createServer((req, res) => {
  let body = [];
  req.on('data', chunk => body.push(chunk));
  req.on('end', () => {
    body = Buffer.concat(body);
    const options = {
      hostname: 'localhost',
      port: targetPort,
      path: req.url,
      method: req.method,
      headers: req.headers
    };
    const proxyReq = http.request(options, (proxyRes) => {
      res.writeHead(proxyRes.statusCode, proxyRes.headers);
      proxyRes.pipe(res, { end: true });
    });
    proxyReq.on('error', (err) => {
      res.writeHead(502);
      res.end('Bad Gateway: ' + err.message);
    });
    proxyReq.write(body);
    proxyReq.end();
  });
});
server.listen(port, () => console.log('Proxy listening on port', port));
`;
    await ssh.execCommand(`cat << 'EOF' > /home/umarhayat/TaleemiDunya-Pro/whatsapp-ai-server/server.js\n${script}\nEOF`);
    await ssh.execCommand(`touch /home/umarhayat/TaleemiDunya-Pro/whatsapp-ai-server/tmp/restart.txt`);
    console.log('REPLACED PROXY SCRIPT TO LOCALHOST');
    process.exit(0);
}
run();
