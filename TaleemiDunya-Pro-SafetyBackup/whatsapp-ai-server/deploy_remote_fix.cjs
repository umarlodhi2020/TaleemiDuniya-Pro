const { NodeSSH } = require('node-ssh');
const fs = require('fs');
const path = require('path');

async function main() {
  const ssh = new NodeSSH();
  const localServerPath = path.join(__dirname, 'server.js');
  const remoteServerPath = '/home/umarhayat/TaleemiDunya-Pro/whatsapp-ai-server/server.js';

  console.log('Connecting to Alwaysdata...');
  await ssh.connect({
    host: 'ssh-umarhayat.alwaysdata.net',
    username: 'umarhayat',
    password: 'umar9900'
  });

  console.log('Uploading corrected server.js to remote host...');
  await ssh.putFile(localServerPath, remoteServerPath);

  console.log('Verifying remote file contents...');
  const verify = await ssh.execCommand(`node -p "const fs=require('fs'); const s=fs.readFileSync('${remoteServerPath}','utf8'); JSON.stringify({importMissing:s.includes('waValidation'), helperPresent:s.includes('function buildSchoolMenuText'), sample:s.slice(s.indexOf('function buildSchoolMenuText')||0, s.indexOf('function buildSchoolMenuText')+180)})"`);
  console.log(verify.stdout || verify.stderr || 'No remote verification output');

  console.log('Stopping old bot processes...');
  await ssh.execCommand("bash -lc 'pkill -f \"node server.js\" || true; pkill -f \"server.js\" || true; sleep 2' ");
  await new Promise((resolve) => setTimeout(resolve, 2000));

  console.log('Starting remote bot process...');
  await ssh.execCommand("bash -lc 'cd /home/umarhayat/TaleemiDunya-Pro/whatsapp-ai-server && nohup node server.js > server.log 2>&1 &' ");
  await new Promise((resolve) => setTimeout(resolve, 7000));

  console.log('Checking process and log...');
  const ps = await ssh.execCommand("bash -lc 'ps -eo pid,cmd --sort=pid | grep \"node server.js\" | grep -v grep || true'");
  console.log(ps.stdout || ps.stderr || 'No remote process output');

  const logTail = await ssh.execCommand("bash -lc 'tail -n 25 /home/umarhayat/TaleemiDunya-Pro/whatsapp-ai-server/server.log || true'");
  console.log(logTail.stdout || logTail.stderr || 'No remote log output');

  console.log('Triggering remote session endpoints...');
  try {
    const res1 = await fetch('https://umarhayat.alwaysdata.net/api/rules?schoolId=default_school');
    console.log('RULES_STATUS=' + res1.status);
    const res2 = await fetch('https://umarhayat.alwaysdata.net/api/session/start', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ schoolId: 'default_school' })
    });
    const data = await res2.json();
    console.log('SESSION_RESPONSE=' + JSON.stringify(data));
  } catch (err) {
    console.log('FETCH_ERROR=' + err.message);
  }

  ssh.dispose();
  console.log('Remote bot update and restart finished.');
}

main().catch((err) => {
  console.error('DEPLOY_ERR=', err);
  process.exit(1);
});
