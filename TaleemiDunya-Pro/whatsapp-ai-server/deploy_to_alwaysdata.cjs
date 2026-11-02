const { NodeSSH } = require('node-ssh');
const fs = require('fs');
const path = require('path');

const ssh = new NodeSSH();

const CONFIG = {
  host: 'ssh-umarhayat.alwaysdata.net',
  username: 'umarhayat',
  password: 'umar9900',
  readyTimeout: 30000,
};

const LOCAL_SERVER = path.join(__dirname, 'server.js');
const REMOTE_DIR = '/home/umarhayat/TaleemiDunya-Pro/whatsapp-ai-server/';

async function deploy() {
  console.log('🚀 Connecting to Alwaysdata SSH...');
  
  await ssh.connect(CONFIG);
  console.log('✅ Connected!');

  // Backup old index.js
  console.log('📦 Backing up old index.js...');
  const backup = await ssh.execCommand('cp ' + REMOTE_DIR + 'index.js ' + REMOTE_DIR + 'index.js.bak 2>/dev/null; echo done');
  console.log('Backup:', backup.stdout || backup.stderr);

  // Upload server.js as both index.js and server.js
  console.log('⬆️  Uploading server.js → index.js ...');
  await ssh.putFile(LOCAL_SERVER, REMOTE_DIR + 'index.js');
  console.log('✅ index.js uploaded!');

  console.log('⬆️  Uploading server.js → server.js ...');
  await ssh.putFile(LOCAL_SERVER, REMOTE_DIR + 'server.js');
  console.log('✅ server.js uploaded!');

  // Verify file size on remote
  const check = await ssh.execCommand('wc -l ' + REMOTE_DIR + 'index.js');
  console.log('📊 Remote index.js lines:', check.stdout);

  ssh.dispose();
  console.log('🎉 Backend deploy complete! Now restarting server via API...');

  // Restart server via API
  const https = require('https');
  const postData = JSON.stringify({});
  const options = {
    hostname: 'umarhayat.alwaysdata.net',
    port: 443,
    path: '/api/server/reboot',
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Content-Length': postData.length }
  };

  const req = https.request(options, (res) => {
    let data = '';
    res.on('data', (chunk) => data += chunk);
    res.on('end', () => {
      console.log('🔄 Reboot response:', data);
      console.log('✅ ALL DONE! Backend is live on Alwaysdata.');
    });
  });
  req.on('error', (e) => console.log('⚠️  Reboot call error (server restarting):', e.message));
  req.write(postData);
  req.end();
}

deploy().catch(err => {
  console.error('❌ Deploy failed:', err.message);
  process.exit(1);
});

