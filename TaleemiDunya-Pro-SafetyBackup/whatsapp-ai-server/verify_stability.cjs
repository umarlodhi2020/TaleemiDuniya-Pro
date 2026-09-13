const { NodeSSH } = require('node-ssh');
const ssh = new NodeSSH();

async function verifyBotStability() {
  console.log('=== VERIFYING BOT STABILITY ===');
  await ssh.connect({
    host: 'ssh-umarhayat.alwaysdata.net',
    username: 'umarhayat',
    password: 'umar9900'
  });

  // Check last 60 lines of logs for conflict errors or stable connected state
  const logs = await ssh.execCommand('tail -n 60 /home/umarhayat/admin/logs/sites/2026/*.log');
  const lines = (logs.stdout || '').split('\n');
  
  console.log('=== KEY LOG LINES (last 2 minutes) ===');
  let conflictCount = 0;
  let connectedCount = 0;
  let msgReceivedCount = 0;
  let replySentCount = 0;

  for (const line of lines) {
    if (!line.includes('STDOUT:')) continue;
    const content = line.split('STDOUT:').pop().trim();
    if (!content) continue;
    
    if (content.includes('conflict')) { conflictCount++; console.log('  ❌ CONFLICT:', content.substring(0, 100)); }
    if (content.includes('[CONNECTED]')) { connectedCount++; console.log('  ✅ CONNECTED:', content.substring(0, 100)); }
    if (content.includes('[MSG RECEIVED]')) { msgReceivedCount++; console.log('  📩 MSG:', content.substring(0, 100)); }
    if (content.includes('[AI REPLY SENT]')) { replySentCount++; console.log('  🤖 REPLY:', content.substring(0, 100)); }
    if (content.includes('[LOCK]') || content.includes('LOCK HELD')) { console.log('  🔒 LOCK:', content.substring(0, 100)); }
    if (content.includes('[DISCONNECTED]')) { console.log('  🔴 DISC:', content.substring(0, 100)); }
    if (content.includes('default_school') && content.includes('QR')) { console.log('  ⚠️  OLD CODE QR:', content.substring(0, 100)); }
  }

  console.log('\n=== SUMMARY ===');
  console.log(`  Conflicts:  ${conflictCount}`);
  console.log(`  Connected:  ${connectedCount}`);
  console.log(`  Msgs Recv:  ${msgReceivedCount}`);
  console.log(`  Replies:    ${replySentCount}`);

  // Quick API status check
  try {
    const r = await fetch('https://umarhayat.alwaysdata.net/api/session/status?schoolId=NNRuCtHxQNjISc9EPgMs');
    const d = await r.json();
    console.log('\n=== API STATUS ===');
    console.log('  Status:', d.status);
    console.log('  Phone:', d.phone);
  } catch(e) {
    console.log('\nAPI check failed:', e.message);
  }

  ssh.dispose();
}

verifyBotStability().catch(console.error);
