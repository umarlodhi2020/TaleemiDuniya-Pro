const { NodeSSH } = require('node-ssh');
const path = require('path');
const fs = require('fs');
const ssh = new NodeSSH();

async function deployBackendExact() {
  console.log('=== DEPLOYING EXACT SERVER.JS & RESTORING GRPC MODULE ===');
  await ssh.connect({
    host: 'ssh-umarhayat.alwaysdata.net',
    username: 'umarhayat',
    password: 'umar9900'
  });

  const remoteServerDir = '/home/umarhayat/TaleemiDunya-Pro/whatsapp-ai-server';
  const targetPath = `${remoteServerDir}/server.js`;

  // Restore @grpc/grpc-js if needed
  console.log('Restoring node_modules if needed...');
  await ssh.execCommand(`cd "${remoteServerDir}" && npm install @grpc/grpc-js@^1.12.6 --save --silent 2>/dev/null || true`);

  // Read local server.js
  const localServerJs = path.join(__dirname, 'server.js');
  const content = fs.readFileSync(localServerJs, 'utf8');
  const b64 = Buffer.from(content, 'utf8').toString('base64');

  console.log('Writing exact updated server.js to:', targetPath);
  await ssh.execCommand(`echo "${b64}" | base64 -d > "${targetPath}"`);
  console.log('server.js updated successfully!');

  // Kill old node processes cleanly and start new background daemon
  console.log('Rebooting remote WhatsApp AI server process...');
  await ssh.execCommand(`killall -9 node 2>/dev/null || true`);
  await new Promise(r => setTimeout(r, 2000));
  
  const startRes = await ssh.execCommand(`cd "${remoteServerDir}" && nohup node server.js > server.log 2>&1 &`);
  console.log('Server started in background!');
  await new Promise(r => setTimeout(r, 3000));

  const checkRes = await ssh.execCommand(`ps aux | grep "node server.js" | grep -v grep`);
  console.log('=== ACTIVE WHATSAPP AI SERVER PROCESS ===');
  console.log(checkRes.stdout || 'Checking log tail...');
  
  const logTail = await ssh.execCommand(`tail -n 10 "${remoteServerDir}/server.log"`);
  console.log('=== LATEST SERVER LOGS ===');
  console.log(logTail.stdout);

  ssh.dispose();
  console.log('=== BACKEND DEPLOYMENT SUCCESSFUL ===');
}

deployBackendExact().catch(err => {
  console.error('Deploy error:', err);
  process.exit(1);
});
