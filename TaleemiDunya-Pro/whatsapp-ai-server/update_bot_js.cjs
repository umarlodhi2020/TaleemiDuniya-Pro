const { NodeSSH } = require('node-ssh');
const path = require('path');
const fs = require('fs');
const ssh = new NodeSSH();

async function deployBotJs() {
  await ssh.connect({
    host: 'ssh-umarhayat.alwaysdata.net',
    username: 'umarhayat',
    password: 'umar9900'
  });

  const remoteServerDir = '/home/umarhayat/TaleemiDunya-Pro/whatsapp-ai-server';

  const localServerJs = path.join(__dirname, 'server.js');
  const content = fs.readFileSync(localServerJs, 'utf8');
  const b64 = Buffer.from(content, 'utf8').toString('base64');

  const localPkg = path.join(__dirname, 'package.json');
  const pkgContent = fs.readFileSync(localPkg, 'utf8');
  const pkgB64 = Buffer.from(pkgContent, 'utf8').toString('base64');

  await ssh.execCommand(`echo "${b64}" | base64 -d > "${remoteServerDir}/bot.js"`);
  await ssh.execCommand(`echo "${b64}" | base64 -d > "${remoteServerDir}/server.js"`);
  await ssh.execCommand(`echo "${pkgB64}" | base64 -d > "${remoteServerDir}/package.json"`);
  
  console.log('Files updated on Alwaysdata!');

  console.log('Touching restart markers to trigger Alwaysdata uWSGI reload...');
  await ssh.execCommand(`touch /home/umarhayat/admin/restart.txt`);
  await ssh.execCommand(`touch ${remoteServerDir}/tmp/restart.txt`);
  await ssh.execCommand(`touch ${remoteServerDir}/restart.txt`);
  
  await ssh.execCommand(`pkill -u umarhayat node 2>/dev/null || true`);

  ssh.dispose();
  console.log('Done!');
}
deployBotJs();
