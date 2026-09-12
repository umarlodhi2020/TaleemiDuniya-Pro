const { NodeSSH } = require('node-ssh');
const ssh = new NodeSSH();

async function check() {
  await ssh.connect({
    host: 'ssh-umarhayat.alwaysdata.net',
    username: 'umarhayat',
    password: 'umar9900'
  });

  console.log('Sending wake request...');
  try {
    const fetchPromise = fetch('https://umarhayat.alwaysdata.net/api/session/status?schoolId=NNRuCtHxQNjISc9EPgMs');
    // Don't await it forever, just timeout after 5s in case it hangs
    const timeout = new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), 5000));
    await Promise.race([fetchPromise, timeout]);
  } catch(e) {
    console.log('Wake request error:', e.message);
  }

  for (let i = 1; i <= 6; i++) {
    console.log(`Polling processes (attempt ${i})...`);
    const res = await ssh.execCommand('ps aux | grep node | grep -v grep');
    console.log(res.stdout || 'None');
    await new Promise(r => setTimeout(r, 5000));
  }

  ssh.dispose();
}

check().catch(console.error);
