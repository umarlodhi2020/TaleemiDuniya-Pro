const { NodeSSH } = require('node-ssh');
const ssh = new NodeSSH();

async function cleanAndStart() {
  console.log('Connecting to SSH...');
  await ssh.connect({
    host: 'ssh-umarhayat.alwaysdata.net',
    username: 'umarhayat',
    password: 'umar9900'
  });

  console.log('Killing ALL node processes...');
  // Force kill all Node processes
  await ssh.execCommand('pkill -9 -f node || killall -9 node || true');
  
  console.log('Waiting 5 seconds for cleanup...');
  await new Promise(r => setTimeout(r, 5000));

  console.log('Waking up the Alwaysdata site using curl to trigger a single managed process...');
  // Hit the API to wake the site
  try {
    await fetch('https://umarhayat.alwaysdata.net/api/session/status?schoolId=NNRuCtHxQNjISc9EPgMs');
    console.log('Wake request sent.');
  } catch(e) {
    console.log('Wake request returned (expected since server is booting):', e.message);
  }

  console.log('Waiting 5 seconds for site to boot...');
  await new Promise(r => setTimeout(r, 5000));

  console.log('Verifying running node processes...');
  const res = await ssh.execCommand('ps aux | grep node | grep -v grep');
  console.log('=== CURRENT RUNNING NODE PROCESSES ===');
  console.log(res.stdout || 'None');

  ssh.dispose();
  console.log('Done!');
}

cleanAndStart().catch(console.error);
