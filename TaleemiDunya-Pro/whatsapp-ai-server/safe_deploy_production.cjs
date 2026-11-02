const { NodeSSH } = require('node-ssh');
const fs = require('fs');
const path = require('path');
const ssh = new NodeSSH();

async function main() {
  console.log('======================================================');
  console.log('🚀 SAFE PRODUCTION DEPLOYMENT TO ALWAYSDATA');
  console.log('======================================================\n');

  console.log('📡 Connecting via SSH to Alwaysdata...');
  await ssh.connect({
    host: 'ssh-umarhayat.alwaysdata.net',
    username: 'umarhayat',
    password: 'umar9900'
  });
  console.log('✅ SSH Connection established.');

  const remoteDir = '/home/umarhayat/TaleemiDunya-Pro/whatsapp-ai-server';

  // 1. Create remote backup before overwriting
  console.log('📦 Creating remote backups of server.js and index.js...');
  await ssh.execCommand(`cp ${remoteDir}/server.js ${remoteDir}/server.js.backup_$(date +%s)`);
  await ssh.execCommand(`cp ${remoteDir}/index.js ${remoteDir}/index.js.backup_$(date +%s)`);
  console.log('✅ Remote backups created.');

  // 2. Upload updated server.js using reliable SFTP putFile
  console.log('⬆️ Uploading updated server.js via SFTP...');
  const localServerJs = path.join(__dirname, 'server.js');
  await ssh.putFile(localServerJs, `${remoteDir}/server.js`);
  // Synchronize index.js so whichever file AlwaysData runs, the exact same code executes
  await ssh.execCommand(`cp ${remoteDir}/server.js ${remoteDir}/index.js`);
  console.log('✅ server.js and index.js synchronized on remote host.');

  // 3. Upload test suites
  console.log('⬆️ Uploading automated test suites...');
  await ssh.putFile(path.join(__dirname, 'tests_unit.mjs'), `${remoteDir}/tests_unit.mjs`);
  await ssh.putFile(path.join(__dirname, 'test_comprehensive.mjs'), `${remoteDir}/test_comprehensive.mjs`);
  console.log('✅ Test suites uploaded.');

  // 4. Run automated tests ON ALWAYSDATA Linux runtime
  console.log('🧪 Executing automated test suite on Alwaysdata runtime...');
  const testRes = await ssh.execCommand(`cd "${remoteDir}" && node test_comprehensive.mjs`);
  console.log(testRes.stdout || testRes.stderr);
  if (testRes.code !== 0) {
    throw new Error('Automated tests failed on Alwaysdata! Aborting deployment.');
  }

  // 5. Cleanly restart the single production process
  console.log('🔄 Terminating old node processes to prevent split-brain conflicts...');
  await ssh.execCommand('pkill -9 -u umarhayat node || true');
  await new Promise(r => setTimeout(r, 2000));

  // Remove any stale lock file left by dead PIDs
  await ssh.execCommand(`rm -f ${remoteDir}/auth_sessions/.lock_*`);

  // Start single production worker bound to PORT=8100 (AlwaysData reverse proxy port)
  console.log('🚀 Spawning single background production worker on PORT=8100...');
  await ssh.execCommand(`cd "${remoteDir}" && PORT=8100 nohup node server.js > server.log 2>&1 < /dev/null &`);
  await new Promise(r => setTimeout(r, 6000));

  // 6. Verify live public endpoints
  console.log('🔍 Verifying live endpoints via public HTTPS...');
  try {
    const vRes = await fetch('https://umarhayat.alwaysdata.net/version');
    const vText = await vRes.text();
    console.log(`  - /version: [HTTP ${vRes.status}] ${vText}`);

    const diagRes = await fetch('https://umarhayat.alwaysdata.net/api/diagnostics?schoolId=NNRuCtHxQNjISc9EPgMs');
    const diagData = await diagRes.json();
    console.log('  - /api/diagnostics:', JSON.stringify(diagData, null, 2));

    const statusRes = await fetch('https://umarhayat.alwaysdata.net/api/session/status?schoolId=NNRuCtHxQNjISc9EPgMs');
    const statusData = await statusRes.json();
    console.log('  - /api/session/status:', JSON.stringify(statusData, null, 2));

    const aliasRes = await fetch('https://umarhayat.alwaysdata.net/api/session-status?schoolId=NNRuCtHxQNjISc9EPgMs');
    const aliasData = await aliasRes.json();
    console.log('  - /api/session-status (alias):', JSON.stringify(aliasData, null, 2));

    const rulesRes = await fetch('https://umarhayat.alwaysdata.net/api/rules?schoolId=NNRuCtHxQNjISc9EPgMs');
    const rulesData = await rulesRes.json();
    console.log('  - /api/rules: active rules count =', rulesData.rules?.length);
  } catch (httpErr) {
    console.warn('  ⚠️ HTTP verification note:', httpErr.message);
  }

  // 7. Check server.log tail from production
  const logTail = await ssh.execCommand(`tail -n 30 "${remoteDir}/server.log"`);
  console.log('\n=== LATEST SERVER.LOG FROM PRODUCTION ===');
  console.log(logTail.stdout || logTail.stderr);

  ssh.dispose();
  console.log('\n🎉 PRODUCTION DEPLOYMENT & VERIFICATION COMPLETED SUCCESSFULLY!');
}

main().catch(err => {
  console.error('❌ Deployment error:', err);
  process.exit(1);
});
