const { execSync } = require('child_process');
const crypto = require('crypto');
const os = require('os');

function getMachineHardwareId() {
  let raw = '';
  if (process.platform === 'win32') {
    try {
      const out = execSync('powershell.exe -NoProfile -Command "[Console]::OutputEncoding = [System.Text.Encoding]::UTF8; (Get-CimInstance Win32_ComputerSystemProduct).UUID"', {
        encoding: 'utf8',
        timeout: 5000,
        windowsHide: true
      }).trim();
      if (out && out.length > 5 && !out.toLowerCase().includes('error')) {
        raw += out;
      }
    } catch (e) {}

    try {
      const mb = execSync('powershell.exe -NoProfile -Command "(Get-CimInstance Win32_BaseBoard).SerialNumber"', {
        encoding: 'utf8',
        timeout: 5000,
        windowsHide: true
      }).trim();
      if (mb && mb.length > 3) raw += ':' + mb;
    } catch (e) {}
  }

  // Fallback to network MACs + CPU + username if wmic/powershell fails or on other OS
  if (!raw || raw.length < 5) {
    const interfaces = os.networkInterfaces();
    let macs = [];
    for (const name in interfaces) {
      for (const iface of interfaces[name]) {
        if (!iface.internal && iface.mac && iface.mac !== '00:00:00:00:00:00') {
          macs.push(iface.mac);
        }
      }
    }
    raw = (macs.sort().join('-') || 'UNKNOWN_NIC') + ':' + os.hostname() + ':' + os.cpus()[0]?.model;
  }

  // Hash to clean standardized format: TD-XXXX-YYYY-ZZZZ-WWWW
  const hash = crypto.createHash('sha256').update(raw.trim()).digest('hex').toUpperCase();
  const chunk1 = hash.substring(0, 4);
  const chunk2 = hash.substring(4, 8);
  const chunk3 = hash.substring(8, 12);
  const chunk4 = hash.substring(12, 16);
  return `TD-${chunk1}-${chunk2}-${chunk3}-${chunk4}`;
}

const hwid = getMachineHardwareId();
console.log('GENERATED_HWID:', hwid);
