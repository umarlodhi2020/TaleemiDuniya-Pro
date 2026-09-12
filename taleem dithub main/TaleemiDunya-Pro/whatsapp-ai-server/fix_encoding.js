const fs = require('fs');

const original = fs.readFileSync('server.js', 'utf8');

// Try to decode it
try {
  const fixed = Buffer.from(original, 'latin1').toString('utf8');
  // Let's print out the buildSchoolMenuText function to see if it looks right
  const match = fixed.match(/function buildSchoolMenuText[\s\S]+?\}/);
  if (match) {
    console.log("FIXED MENU:\n", match[0]);
  } else {
    console.log("Could not find function in fixed text.");
  }
} catch(e) {
  console.log("Error decoding:", e);
}
