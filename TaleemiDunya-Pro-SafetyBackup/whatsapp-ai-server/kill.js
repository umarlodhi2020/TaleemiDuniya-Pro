const { execSync } = require('child_process');
try {
  console.log(execSync('ssh umarhayat@ssh-umarhayat.alwaysdata.net -p 22 "killall node; rm -rf /home/umarhayat/TaleemiDunya-Pro/whatsapp-ai-server/auth_info_baileys_*"').toString());
} catch(e) {
  console.log("Error:", e.message);
}
