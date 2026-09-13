const { NodeSSH } = require('node-ssh');
const ssh = new NodeSSH();
async function run() {
    await ssh.connect({host: 'ssh-umarhayat.alwaysdata.net', username: 'umarhayat', password: 'umar9900'});
    const code = `const http = require('http');
const port = process.env.PORT || 8080;
const targetPort = 4000;
const server = http.createServer((req, res) => {
  let body = [];
  req.on('data', chunk => body.push(chunk));
  req.on('end', () => {
    body = Buffer.concat(body);
    const options = {
      hostname: '127.0.0.1',
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
server.listen(port, () => console.log('Proxy listening on port', port));`;
    await ssh.execCommand("cat << 'EOF' > /home/umarhayat/TaleemiDunya-Pro/whatsapp-ai-server/server.js\n" + code + "\nEOF");
    await ssh.execCommand("cd /home/umarhayat/TaleemiDunya-Pro/whatsapp-ai-server && nohup node bot.js > server.log 2>&1 &");
    await ssh.execCommand("mkdir -p /home/umarhayat/TaleemiDunya-Pro/whatsapp-ai-server/tmp && touch /home/umarhayat/TaleemiDunya-Pro/whatsapp-ai-server/tmp/restart.txt");
    await ssh.execCommand("touch /home/umarhayat/TaleemiDunya-Pro/whatsapp-ai-server/restart.txt");
    await ssh.execCommand("touch /home/umarhayat/TaleemiDunya-Pro/restart.txt");
    console.log('DEPLOYED PROXY AND RESTARTED BOT');
    process.exit(0);
}
run();
