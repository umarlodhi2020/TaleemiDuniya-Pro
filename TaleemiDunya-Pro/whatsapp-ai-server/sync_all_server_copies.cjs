const { NodeSSH } = require('node-ssh');
const path = require('path');
const fs = require('fs');
const ssh = new NodeSSH();

async function syncAll() {
  console.log('=== SYNCING FIXED SERVER.JS TO ALL PATHS ON ALWAYSDATA ===');
  await ssh.connect({
    host: 'ssh-umarhayat.alwaysdata.net',
    username: 'umarhayat',
    password: 'umar9900'
  });

  const localServerJs = path.join(__dirname, 'server.js');
  const content = fs.readFileSync(localServerJs, 'utf8');
  if (!content.includes('const __dirname = path.dirname(__filename)')) {
    console.error('ERROR: Local server.js missing __dirname fix');
    process.exit(1);
  }

  const b64 = Buffer.from(content, 'utf8').toString('base64');

  // Overwrite both /home/umarhayat/TaleemiDunya-Pro/whatsapp-ai-server/server.js and @grpc/grpc-js/build/src/server.js
  await ssh.execCommand(`echo "${b64}" | base64 -d > "/home/umarhayat/TaleemiDunya-Pro/whatsapp-ai-server/server.js"`);
  await ssh.execCommand(`mkdir -p "/home/umarhayat/TaleemiDunya-Pro/whatsapp-ai-server/node_modules/@grpc/grpc-js/build/src"`);
  await ssh.execCommand(`echo "${b64}" | base64 -d > "/home/umarhayat/TaleemiDunya-Pro/whatsapp-ai-server/node_modules/@grpc/grpc-js/build/src/server.js"`);
  console.log('Both server.js files updated with __dirname fix!');

  console.log('Wiping node compile cache and touching restart...');
  await ssh.execCommand(`rm -rf /home/umarhayat/admin/tmp/node-compile-cache/* 2>/dev/null || true`);
  await ssh.execCommand(`touch /home/umarhayat/admin/tmp/restart.txt /home/umarhayat/TaleemiDunya-Pro/whatsapp-ai-server/node_modules/@grpc/grpc-js/build/src/server.js /home/umarhayat/TaleemiDunya-Pro/whatsapp-ai-server/server.js`);
  await ssh.execCommand(`killall -9 node 2>/dev/null || true`);

  await new Promise(r => setTimeout(r, 4000));

  console.log('=== HITTING SITE STATUS ===');
  for (let i = 0; i < 5; i++) {
    try {
      const res = await fetch('https://umarhayat.alwaysdata.net/api/session/status?schoolId=default_school');
      const text = await res.text();
      console.log(`Attempt ${i + 1} Status: ${res.status}`);
      if (res.status === 200 && text.includes('{')) {
        console.log('🎉 SUCCESS! JSON returned:', text);
        break;
      } else {
        console.log('Response snippet:', text.substring(0, 250));
      }
    } catch (err) {
      console.log(`Attempt ${i + 1} Error:`, err.message);
    }
    await new Promise(r => setTimeout(r, 2000));
  }

  const siteLog = await ssh.execCommand(`tail -n 25 /home/umarhayat/admin/logs/sites/2026/sites-2026-07-15.log`);
  console.log('=== LATEST SITE LOGS ===');
  console.log(siteLog.stdout || siteLog.stderr);

  ssh.dispose();
}

syncAll().catch(e => { console.error(e); process.exit(1); });
