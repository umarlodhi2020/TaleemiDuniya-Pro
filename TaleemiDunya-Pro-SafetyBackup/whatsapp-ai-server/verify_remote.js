import { NodeSSH } from 'node-ssh';

const ssh = new NodeSSH();

async function verify() {
  try {
    await ssh.connect({
      host: 'ssh-umarhayat.alwaysdata.net',
      username: 'umarhayat',
      password: 'umar9900'
    });

    console.log('--- REMOTE VERIFICATION ---');
    const resRoot = await ssh.execCommand('curl -v http://127.0.0.1:8100/');
    console.log('Local http://127.0.0.1:8100/ ->', resRoot.stdout, resRoot.stderr);

    const resApi = await ssh.execCommand('curl -v -I http://127.0.0.1:8100/api/mobile/fees/voucher-pdf');
    console.log('Local http://127.0.0.1:8100/api/mobile/fees/voucher-pdf Header ->\n', resApi.stdout, resApi.stderr);

    console.log('--- EXTERNAL VERIFICATION (VIA PUBLIC URL) ---');
    // We'll use a local curl for external
    ssh.dispose();
  } catch (err) {
    console.error('Verification script failed:', err);
  }
}

verify();
