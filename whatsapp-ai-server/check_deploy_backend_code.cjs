const fs = require('fs');
const path = require('path');

const file = path.join(__dirname, 'deploy_category2_backend.cjs');
if (fs.existsSync(file)) {
  const content = fs.readFileSync(file, 'utf8');
  console.log('=== DEPLOY_CATEGORY2_BACKEND.CJS CONTENT ===');
  console.log(content);
} else {
  console.log('deploy_category2_backend.cjs not found');
}
