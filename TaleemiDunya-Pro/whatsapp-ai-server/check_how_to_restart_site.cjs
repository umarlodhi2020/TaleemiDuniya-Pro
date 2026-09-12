const { NodeSSH } = require('node-ssh');
const ssh = new NodeSSH();

async function checkWrapperScript() {
  await ssh.connect({
    host: 'ssh-umarhayat.alwaysdata.net',
    username: 'umarhayat',
    password: 'umar9900'
  });

  console.log('=== CAT /USR/BIN/ALWRAPPER ===');
  const catAl = await ssh.execCommand(`cat /usr/bin/alwrapper || head -n 50 /usr/bin/alwrapper`);
  console.log(catAl.stdout || catAl.stderr);

  // Check if there are any alwaysdata management tools
  const tools = await ssh.execCommand(`ls -la /usr/alwaysdata/ /usr/alwaysdata/* 2>/dev/null | head -n 30`);
  console.log('=== ALWAYSDATA TOOLS ===');
  console.log(tools.stdout);

  ssh.dispose();
}

checkWrapperScript().catch(e => { console.error(e); process.exit(1); });
