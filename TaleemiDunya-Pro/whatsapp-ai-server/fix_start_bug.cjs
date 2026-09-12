const { NodeSSH } = require('node-ssh');
const ssh = new NodeSSH();

ssh.connect({
  host: 'ssh-umarhayat.alwaysdata.net',
  username: 'umarhayat',
  password: 'umar9900'
}).then(async () => {
  const script = `const fs = require('fs');
const code = fs.readFileSync('/home/umarhayat/TaleemiDunya-Pro/whatsapp-ai-server/server.js', 'utf8');
const updated = code.replace(/app\\.post\\('\\/api\\/session\\/start', async \\(req, res\\) => {\\s+const { schoolId = 'default_school' } = req\\.body;\\s+if \\(!sessions\\.has\\(schoolId\\)\\) {\\s+await startWhatsAppSession\\(schoolId\\);\\s+}\\s+res\\.json\\({ success: true, message: \\\`Session triggered for school: \\$\\{schoolId\\}\\\` }\\);\\s+}\\);/g, 
  "app.post('/api/session/start', async (req, res) => {\\n" +
  "  const { schoolId = 'default_school' } = req.body;\\n" +
  "  if (sessions.has(schoolId)) {\\n" +
  "    sessions.get(schoolId).end();\\n" +
  "    sessions.delete(schoolId);\\n" +
  "    qrCodes.delete(schoolId);\\n" +
  "    const sessionDir = './auth_sessions/' + schoolId;\\n" +
  "    if (fs.existsSync(sessionDir)) { fs.rmSync(sessionDir, { recursive: true, force: true }); }\\n" +
  "  }\\n" +
  "  await startWhatsAppSession(schoolId);\\n" +
  "  res.json({ success: true, message: 'Session forcefully started for school: ' + schoolId });\\n" +
  "});"
);
fs.writeFileSync('/home/umarhayat/TaleemiDunya-Pro/whatsapp-ai-server/server.js', updated);`;

  await ssh.execCommand('node -e "' + script.replace(/"/g, '\\"') + '"');
  await ssh.execCommand('touch /home/umarhayat/TaleemiDunya-Pro/whatsapp-ai-server/tmp/restart.txt');
  
  console.log('Fixed POST /api/session/start to forcefully regenerate session!');
  process.exit(0);
}).catch(console.error);
