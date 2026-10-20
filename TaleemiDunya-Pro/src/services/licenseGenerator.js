/**
 * TaleemiDunya Pro — Master License Key Generator (Admin & Super-Admin)
 * 
 * Supports:
 * - Native WebCrypto API (In-Browser Super Admin Panel)
 * - Node.js crypto (In CLI / Backend)
 * - Pure cryptographic RSA-2048 signing
 */

import { base64UrlToUint8Array } from './licenseCrypto';

/**
 * ArrayBuffer to Base64URL string converter
 */
export function arrayBufferToBase64Url(buffer) {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

/**
 * Clean PKCS#8 PEM string to ArrayBuffer for WebCrypto import
 */
export function pemToPkcs8Der(privateKeyPem) {
  const b64 = privateKeyPem
    .replace(/-----BEGIN PRIVATE KEY-----/, '')
    .replace(/-----END PRIVATE KEY-----/, '')
    .replace(/\s+/g, '');
  const binaryString = atob(b64);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes.buffer;
}

/**
 * Sign license payload using Private Key in Browser WebCrypto
 */
export async function generateLicenseWebCrypto(payloadParams, privateKeyPem) {
  const {
    schoolId,
    schoolName,
    hwid,
    days,
    plan = 'enterprise',
    maxStudents = 5000,
    features = ['all'],
    type = 'desktop_hwid'
  } = payloadParams;

  const now = new Date();
  let expiresAt;
  if (!days || days === 'lifetime' || Number(days) === -1) {
    expiresAt = '2099-12-31T23:59:59Z';
  } else {
    const exp = new Date(now.getTime() + Number(days) * 24 * 60 * 60 * 1000);
    expiresAt = exp.toISOString();
  }

  const payload = {
    app: 'TaleemiDunya-Pro',
    schoolId: schoolId || 'SCH-' + Math.floor(10000 + Math.random() * 90000),
    schoolName: schoolName || 'Client School',
    hwid: hwid ? hwid.trim().toUpperCase() : 'ANY_MACHINE',
    plan,
    maxStudents,
    features,
    issuedAt: now.toISOString(),
    expiresAt,
    type
  };

  const payloadString = JSON.stringify(payload);

  const subtle = window?.crypto?.subtle || globalThis?.crypto?.subtle;
  if (!subtle) {
    throw new Error('WebCrypto subtle is not supported in this browser environment');
  }

  const pkcs8Der = pemToPkcs8Der(privateKeyPem);
  const privateCryptoKey = await subtle.importKey(
    'pkcs8',
    pkcs8Der,
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
    false,
    ['sign']
  );

  const encoder = new TextEncoder();
  const dataBytes = encoder.encode(payloadString);

  const signatureBuffer = await subtle.sign(
    'RSASSA-PKCS1-v1_5',
    privateCryptoKey,
    dataBytes
  );

  const b64Payload = arrayBufferToBase64Url(dataBytes.buffer);
  const b64Signature = arrayBufferToBase64Url(signatureBuffer);

  const token = `TDLIC-${b64Payload}.${b64Signature}`;

  return {
    token,
    payload
  };
}
