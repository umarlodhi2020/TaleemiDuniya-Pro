const { NodeSSH } = require('node-ssh');
const ssh = new NodeSSH();

ssh.connect({
  host: 'ssh-umarhayat.alwaysdata.net',
  username: 'umarhayat',
  password: 'umar9900'
}).then(async () => {
  const script = `const fs = require('fs');
const code = fs.readFileSync('/home/umarhayat/TaleemiDunya-Pro/whatsapp-ai-server/server.js', 'utf8');
const updated = code.replace(/sessions\\.delete\\(schoolId\\);\\s*qrCodes\\.delete\\(schoolId\\);/g, 'sessions.delete(schoolId);\\n        qrCodes.delete(schoolId);\\n        const sessionDir = \\'./auth_sessions/\\' + schoolId;\\n        if (fs.existsSync(sessionDir)) {\\n          fs.rmSync(sessionDir, { recursive: true, force: true });\\n        }\\n        console.log(\\'Cleared corrupted session dir for \\', schoolId);');
fs.writeFileSync('/home/umarhayat/TaleemiDunya-Pro/whatsapp-ai-server/server.js', updated);`;

  await ssh.execCommand('node -e "' + script.replace(/"/g, '\\"') + '"');
  await ssh.execCommand('touch /home/umarhayat/TaleemiDunya-Pro/whatsapp-ai-server/tmp/restart.txt');
  
  // also manually remove the folder
  await ssh.execCommand('rm -rf /home/umarhayat/TaleemiDunya-Pro/whatsapp-ai-server/auth_sessions/*');
  
  console.log('Fixed server.js and deleted all existing corrupted sessions!');
  process.exit(0);
}).catch(console.error);
