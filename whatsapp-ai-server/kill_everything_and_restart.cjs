const { NodeSSH } = require('node-ssh');
const ssh = new NodeSSH();

async function killAllWorkers() {
  await ssh.connect({
    host: 'ssh-umarhayat.alwaysdata.net',
    username: 'umarhayat',
    password: 'umar9900'
  });

  console.log('=== FINDING EVERY USER PROCESS AND SOCKET ===');
  const psUser = await ssh.execCommand(`ps -u umarhayat -o pid,ppid,comm,args`);
  console.log(psUser.stdout);

  // Check what sockets exist in /home/umarhayat or /tmp or /var/run
  const sockets = await ssh.execCommand(`find /home/umarhayat /tmp -type s 2>/dev/null`);
  console.log('=== UNIX SOCKETS ===');
  console.log(sockets.stdout);

  console.log('=== FORCE KILLING ALL USER PIDS EXCEPT CURRENT SSH ===');
  const myPid = (await ssh.execCommand(`echo $$`)).stdout.trim();
  console.log('SSH shell PID:', myPid);

  // Kill every single process under umarhayat except bash/ssh
  await ssh.execCommand(`for p in $(pgrep -u umarhayat | grep -v "${myPid}"); do kill -9 $p 2>/dev/null; done`);

  await new Promise(r => setTimeout(r, 3000));

  console.log('=== TESTING ENDPOINT ===');
  for (let i = 0; i < 4; i++) {
    try {
      const res = await fetch('https://umarhayat.alwaysdata.net/api/session/status?schoolId=default_school');
      const text = await res.text();
      console.log(`Attempt ${i + 1} (${res.status}):`, text.substring(0, 200));
      if (res.status === 200) break;
    } catch (e) {
      console.log(`Attempt ${i + 1} Error:`, e.message);
    }
    await new Promise(r => setTimeout(r, 2000));
  }

  ssh.dispose();
}

killAllWorkers().catch(e => { console.error(e); process.exit(1); });
