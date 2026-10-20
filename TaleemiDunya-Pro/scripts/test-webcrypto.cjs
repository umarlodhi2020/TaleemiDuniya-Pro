const crypto = require('crypto');
const { webcrypto } = crypto;
const subtle = webcrypto.subtle;

// Generate keys
const { publicKey, privateKey } = crypto.generateKeyPairSync('rsa', {
  modulusLength: 2048,
  publicKeyEncoding: { type: 'spki', format: 'pem' },
  privateKeyEncoding: { type: 'pkcs8', format: 'pem' }
});

const payload = JSON.stringify({
  schoolId: 'DEMO-SCHOOL-01',
  schoolName: 'The Smart School Campus',
  hwid: 'TD-0588-ADCC-A54B-32C0',
  plan: 'enterprise',
  issuedAt: new Date().toISOString(),
  expiresAt: '2028-12-31T23:59:59Z',
  type: 'desktop_hwid'
});

// Sign raw bytes
const signer = crypto.createSign('SHA256');
signer.update(payload);
signer.end();
const signatureRawBuffer = signer.sign(privateKey); // Raw Buffer

const token = 'TDLIC-' + Buffer.from(payload).toString('base64url') + '.' + signatureRawBuffer.toString('base64url');

// Now verify with WebCrypto
async function verifyWithWebCrypto(tokenStr, pubPem) {
  const parts = tokenStr.slice(6).split('.');
  const rawPayload = Buffer.from(parts[0], 'base64url').toString('utf8');
  const sigBuffer = Buffer.from(parts[1], 'base64url');

  const b64 = pubPem.replace(/-----BEGIN PUBLIC KEY-----/, '').replace(/-----END PUBLIC KEY-----/, '').replace(/\s+/g, '');
  const der = Buffer.from(b64, 'base64');

  const key = await subtle.importKey('spki', der, { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' }, false, ['verify']);
  const encoder = new TextEncoder();
  const data = encoder.encode(rawPayload);

  const isValid = await subtle.verify('RSASSA-PKCS1-v1_5', key, sigBuffer, data);
  console.log('RESULT: isValid =', isValid);
  console.log('PAYLOAD:', JSON.parse(rawPayload));
}

verifyWithWebCrypto(token, publicKey);
