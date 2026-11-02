const path = require('path');
const { NodeSSH } = require(path.join(__dirname, 'node_modules', 'node-ssh'));
const ssh = new NodeSSH();

async function doFix() {
  await ssh.connect({
    host: 'ssh-umarhayat.alwaysdata.net',
    username: 'umarhayat',
    password: 'umar9900'
  });
  console.log('✅ Connected to Alwaysdata server.');

  // 1. Clean the 781 MB temporary files
  console.log('🗑️ Cleaning node-gyp temporary folders from admin/tmp...');
  await ssh.execCommand('rm -rf /home/umarhayat/admin/tmp/node-gyp-tmp-*');
  
  // 2. Check disk usage
  const du = await ssh.execCommand('du -sh /home/umarhayat/*');
  console.log('📊 Current disk usage:');
  console.log(du.stdout);

  // 3. Check node processes
  const ps = await ssh.execCommand('ps aux | grep node');
  console.log('🔍 Running node processes:');
  console.log(ps.stdout);

  process.exit(0);
}

doFix().catch(e => {
  console.error('Error:', e.message);
  process.exit(1);
});

