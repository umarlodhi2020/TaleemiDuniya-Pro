#!/usr/bin/env node
/**
 * TaleemiDunya Pro — Master License Key Generator CLI
 * 
 * Usage:
 *   node scripts/license-cli.cjs generate --hwid TD-XXXX-YYYY-ZZZZ-WWWW --school "Dar-e-Arqam" --schoolId SCH-01 --days 365 --plan enterprise
 *   node scripts/license-cli.cjs verify <licenseToken>
 */

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const privateKeyPath = path.join(__dirname, '..', 'master-license-keys', 'taleemidunya_master_private.pem');
const publicKeyPath = path.join(__dirname, '..', 'master-license-keys', 'taleemidunya_master_public.pem');

if (!fs.existsSync(privateKeyPath)) {
  console.error('Error: Master private key not found at', privateKeyPath);
  process.exit(1);
}

const privateKey = fs.readFileSync(privateKeyPath, 'utf8');
const publicKey = fs.readFileSync(publicKeyPath, 'utf8');

function generateLicense({ hwid, school, schoolId, days, plan, maxStudents, features, type }) {
  const now = new Date();
  let expiresAt;

  if (!days || days === 'lifetime' || days === -1) {
    expiresAt = '2099-12-31T23:59:59Z';
  } else {
    const exp = new Date(now.getTime() + Number(days) * 24 * 60 * 60 * 1000);
    expiresAt = exp.toISOString();
  }

  const payload = {
    app: 'TaleemiDunya-Pro',
    schoolId: schoolId || 'SCH-' + Math.floor(10000 + Math.random() * 90000),
    schoolName: school || 'Registered School',
    hwid: hwid ? hwid.trim().toUpperCase() : 'ANY_MACHINE',
    plan: plan || 'enterprise',
    maxStudents: maxStudents || 5000,
    features: features || ['all'],
    issuedAt: now.toISOString(),
    expiresAt: expiresAt,
    type: type || 'desktop_hwid'
  };

  const payloadString = JSON.stringify(payload);

  const signer = crypto.createSign('SHA256');
  signer.update(payloadString);
  signer.end();
  const signatureRaw = signer.sign(privateKey);

  const b64Payload = Buffer.from(payloadString).toString('base64url');
  const b64Sig = signatureRaw.toString('base64url');

  const token = `TDLIC-${b64Payload}.${b64Sig}`;
  return { token, payload };
}

function verifyLicense(token, expectedHwid) {
  try {
    if (!token.startsWith('TDLIC-')) return { valid: false, error: 'Invalid token prefix' };
    const parts = token.slice(6).split('.');
    if (parts.length !== 2) return { valid: false, error: 'Malformed token structure' };

    const payloadString = Buffer.from(parts[0], 'base64url').toString('utf8');
    const signatureBuffer = Buffer.from(parts[1], 'base64url');
    const payload = JSON.parse(payloadString);

    const verifier = crypto.createVerify('SHA256');
    verifier.update(payloadString);
    verifier.end();

    const isSigValid = verifier.verify(publicKey, signatureBuffer);
    if (!isSigValid) return { valid: false, error: 'Cryptographic signature mismatch! Tampered key.' };

    if (expectedHwid && payload.hwid !== 'ANY_MACHINE') {
      const allowed = (payload.hwid || '').split(',').map(h => h.trim().toUpperCase());
      if (!allowed.includes(expectedHwid.trim().toUpperCase())) {
        return { valid: false, error: `HWID mismatch! Registered to [${payload.hwid}], current PC is [${expectedHwid}]` };
      }
    }

    const expiryTime = new Date(payload.expiresAt).getTime();
    if (Date.now() > expiryTime) {
      return { valid: false, error: `License expired on ${payload.expiresAt}` };
    }

    return { valid: true, payload };
  } catch (err) {
    return { valid: false, error: err.message };
  }
}

// Simple CLI Arg Parser
const args = process.argv.slice(2);
const command = args[0] || 'help';

if (command === 'generate') {
  const getArg = (flag, def) => {
    const idx = args.indexOf(flag);
    return idx !== -1 && args[idx + 1] ? args[idx + 1] : def;
  };

  const hwid = getArg('--hwid', null);
  const school = getArg('--school', 'Client School');
  const schoolId = getArg('--schoolId', 'SCH-1001');
  const days = getArg('--days', 365);
  const plan = getArg('--plan', 'enterprise');

  if (!hwid) {
    console.warn('⚠️ Warning: No --hwid provided! License will not be locked to a specific PC unless --hwid is set.');
  }

  const result = generateLicense({ hwid, school, schoolId, days, plan });
  console.log('\n============================================================');
  console.log('✅ LICENSE SUCCESSFULLY GENERATED');
  console.log('============================================================');
  console.log('School:   ', result.payload.schoolName);
  console.log('School ID:', result.payload.schoolId);
  console.log('HWID Lock:', result.payload.hwid);
  console.log('Plan:     ', result.payload.plan);
  console.log('Expires:  ', result.payload.expiresAt);
  console.log('\n🔑 LICENSE KEY (Copy & Give to Client):');
  console.log(result.token);
  console.log('============================================================\n');

  // Also write to a file in scratch or licenses folder for easy copy
  const outDir = path.join(__dirname, '..', 'master-license-keys', 'issued');
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });
  const outFile = path.join(outDir, `${result.payload.schoolId}_${result.payload.hwid || 'unlocked'}.tdlic`);
  fs.writeFileSync(outFile, result.token, 'utf8');
  console.log(`Saved backup license file to: ${outFile}\n`);
} else if (command === 'verify') {
  const token = args[1];
  const hwid = args[2];
  if (!token) {
    console.error('Usage: node scripts/license-cli.cjs verify <licenseToken> [currentHWID]');
    process.exit(1);
  }
  const res = verifyLicense(token, hwid);
  console.log('Verification Result:', res);
} else {
  console.log(`
TaleemiDunya Pro License Generator CLI

Commands:
  node scripts/license-cli.cjs generate --hwid <HWID> --school <Name> --days <365|lifetime> --plan <enterprise>
  node scripts/license-cli.cjs verify <token> [hwid]
  `);
}

module.exports = { generateLicense, verifyLicense };
