const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

// Generate 2048-bit RSA key pair
const { publicKey, privateKey } = crypto.generateKeyPairSync('rsa', {
  modulusLength: 2048,
  publicKeyEncoding: {
    type: 'spki',
    format: 'pem'
  },
  privateKeyEncoding: {
    type: 'pkcs8',
    format: 'pem'
  }
});

console.log('--- PUBLIC KEY (Put into App) ---');
console.log(publicKey);

console.log('--- PRIVATE KEY (Secret, only Super Admin / License Generator) ---');
console.log(privateKey);

// Test signing a license
const licensePayload = {
  schoolId: 'DEMO-SCHOOL-01',
  schoolName: 'The Smart School Campus',
  hwid: 'TD-0588-ADCC-A54B-32C0',
  plan: 'enterprise',
  issuedAt: new Date().toISOString(),
  expiresAt: '2028-12-31T23:59:59Z',
  type: 'desktop_hwid'
};

const payloadString = JSON.stringify(licensePayload);
const signer = crypto.createSign('SHA256');
signer.update(payloadString);
signer.end();
const signature = signer.sign(privateKey, 'base64');

const licenseToken = 'TDLIC-' + Buffer.from(payloadString).toString('base64url') + '.' + Buffer.from(signature).toString('base64url');
console.log('\n--- SAMPLE GENERATED LICENSE TOKEN ---');
console.log(licenseToken);

// Test verification
const [prefix, rawBody] = licenseToken.split('-');
const [bodyB64, sigB64] = rawBody.split('.');
const recoveredPayload = Buffer.from(bodyB64, 'base64url').toString('utf8');
const recoveredSignature = Buffer.from(sigB64, 'base64url').toString('utf8');

const verifier = crypto.createVerify('SHA256');
verifier.update(recoveredPayload);
verifier.end();
const isValid = verifier.verify(publicKey, recoveredSignature, 'base64');
console.log('\n--- VERIFICATION RESULT ---');
console.log('Signature Valid:', isValid);
console.log('Payload Data:', JSON.parse(recoveredPayload));
