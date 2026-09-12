const { NodeSSH } = require('node-ssh');
const ssh = new NodeSSH();

async function restartAlwaysdataNode() {
  console.log('=== RESTARTING ALWAYSDATA NODE & UWSGI WORKERS ===');
  await ssh.connect({
    host: 'ssh-umarhayat.alwaysdata.net',
    username: 'umarhayat',
    password: 'umar9900'
  });

  const pids = await ssh.execCommand(`lsof -t -i :4000 2>/dev/null || fuser 4000/tcp 2>/dev/null`);
  console.log('PIDs holding port 4000:', pids.stdout || 'None found by lsof');

  console.log('Killing any processes on port 4000 or node processes...');
  await ssh.execCommand(`fuser -k 4000/tcp 2>/dev/null || true`);
  await ssh.execCommand(`kill -9 $(lsof -t -i :4000) 2>/dev/null || true`);
  await ssh.execCommand(`pkill -u umarhayat node 2>/dev/null || true`);

  console.log('Touching server.js and site root to trigger Alwaysdata supervisor reload...');
  await ssh.execCommand(`touch /home/umarhayat/TaleemiDunya-Pro/whatsapp-ai-server/server.js`);
  await ssh.execCommand(`touch /home/umarhayat/TaleemiDunya-Pro/whatsapp-ai-server/tmp/restart.txt 2>/dev/null || true`);

  await new Promise(r => setTimeout(r, 3000));

  // Hit the site several times to trigger Alwaysdata worker respawn
  console.log('Waking site worker...');
  for (let i = 0; i < 5; i++) {
    try {
      const res = await fetch('https://umarhayat.alwaysdata.net/api/session/status?schoolId=default_school');
      const text = await res.text();
      console.log(`Attempt ${i + 1} Status: ${res.status}`);
      if (res.status === 200 && text.includes('{')) {
        console.log('✅ SUCCESS! JSON returned:', text);
        break;
      } else if (i === 4) {
        console.log('Response text:', text.substring(0, 300));
      }
    } catch (err) {
      console.log(`Attempt ${i + 1} Error:`, err.message);
    }
    await new Promise(r => setTimeout(r, 2000));
  }

  ssh.dispose();
}

restartAlwaysdataNode().catch(e => { console.error(e); process.exit(1); });
