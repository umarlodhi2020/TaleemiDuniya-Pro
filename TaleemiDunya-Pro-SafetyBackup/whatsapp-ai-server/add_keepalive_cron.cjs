const { NodeSSH } = require('node-ssh');
const ssh = new NodeSSH();

async function addCron() {
  console.log('Connecting to SSH...');
  await ssh.connect({
    host: 'ssh-umarhayat.alwaysdata.net',
    username: 'umarhayat',
    password: 'umar9900'
  });

  console.log('Checking current crontab...');
  const current = await ssh.execCommand('crontab -l');
  console.log('Current crontab:', current.stdout || 'None');

  console.log('Adding keep-alive cron job...');
  const cronJob = '*/1 * * * * curl -s "https://umarhayat.alwaysdata.net/api/session/status?schoolId=NNRuCtHxQNjISc9EPgMs" >/dev/null 2>&1\n';
  
  // Write to a temp file and install crontab
  await ssh.execCommand(`echo '${cronJob}' > /tmp/cron_temp && crontab /tmp/cron_temp && rm /tmp/cron_temp`);

  console.log('Verifying new crontab...');
  const verified = await ssh.execCommand('crontab -l');
  console.log('Verified crontab:', verified.stdout);

  ssh.dispose();
  console.log('Done!');
}

addCron().catch(console.error);
