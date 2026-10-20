const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const keysDir = path.join(__dirname, '..', 'master-license-keys');
if (!fs.existsSync(keysDir)) {
  fs.mkdirSync(keysDir, { recursive: true });
}

const privateKeyPath = path.join(keysDir, 'taleemidunya_master_private.pem');
const publicKeyPath = path.join(keysDir, 'taleemidunya_master_public.pem');

if (!fs.existsSync(privateKeyPath) || !fs.existsSync(publicKeyPath)) {
  console.log('Generating new Master RSA 2048-bit Key Pair...');
  const { publicKey, privateKey } = crypto.generateKeyPairSync('rsa', {
    modulusLength: 2048,
    publicKeyEncoding: { type: 'spki', format: 'pem' },
    privateKeyEncoding: { type: 'pkcs8', format: 'pem' }
  });

  fs.writeFileSync(privateKeyPath, privateKey, 'utf8');
  fs.writeFileSync(publicKeyPath, publicKey, 'utf8');
  console.log('Master Keypair successfully created in master-license-keys/');
} else {
  console.log('Master Keypair already exists in master-license-keys/');
}

const pubKey = fs.readFileSync(publicKeyPath, 'utf8');
console.log('\n=== MASTER PUBLIC KEY (Will be embedded in application) ===');
console.log(pubKey);
