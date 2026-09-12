const fs = require('fs');
const content = fs.readFileSync('server.js', 'utf8');

try {
  // If the file was saved as UTF-8 but its contents are Latin-1 encoded UTF-8 bytes:
  const fixed = Buffer.from(content, 'latin1').toString('utf8');
  console.log("SUCCESSFUL DECODE PREVIEW:");
  console.log(fixed.substring(7000, 7500));
} catch(e) {
  console.log("Error:", e);
}
