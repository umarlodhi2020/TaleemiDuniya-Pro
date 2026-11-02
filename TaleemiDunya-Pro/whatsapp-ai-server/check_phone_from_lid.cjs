const path = require('path');
const { NodeSSH } = require(path.join(__dirname, 'node_modules', 'node-ssh'));
const ssh = new NodeSSH();

async function checkLid() {
  await ssh.connect({
    host: 'ssh-umarhayat.alwaysdata.net',
    username: 'umarhayat',
    password: 'umar9900'
  });

  const cmd = `node -e 'const fs=require("fs"); const m=JSON.parse(fs.readFileSync("/home/umarhayat/TaleemiDunya-Pro/whatsapp-ai-server/auth_sessions/lid_mapping.json","utf8")); console.log("PHONE:", m["212459700883552"] || "Not mapped yet");'`;
  const res = await ssh.execCommand(cmd);
  console.log(res.stdout);

  process.exit(0);
}

checkLid().catch(console.error);

