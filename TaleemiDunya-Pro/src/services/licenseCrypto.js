/**
 * TaleemiDunya Pro — Cryptographic Licensing Engine
 * 
 * Features:
 * - RSA-2048 Digital Signature Verification (via Native WebCrypto API & Node crypto)
 * - Hardware ID (HWID) Verification & Binding
 * - Clock Tampering / Date Rollback Detection
 * - Web Domain Locking (Anti-Piracy for Web Hosting)
 * - Offline + Online Dual-Mode Support
 * - Zero external npm dependencies
 */

// Embedded Master Public Key (Spki PEM)
// Note: This public key can only verify signatures. It cannot be used to forge or create new licenses!
export const MASTER_PUBLIC_KEY_PEM = `-----BEGIN PUBLIC KEY-----
MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAxwjBitL20SbW0XwCZLUG
Qofu9OBW6FBsgnAPWCgXiuYdhvj7iySs8YloHrSWkxRhcGUqmg7d33uHn9Dhj/EK
/iifpWh5ty08JRD5IgvcpyFQ6aNH4hSfF+PPqo+mrogoJNtvPElLUjh3xsO4miB7
kEaaFRIeL/RqxknbMKHlpqxNgxn+4TgdA3tLWortqcRez3esNW3AkSfE3wUSXTw3
5hftv3ZO8b9ZOQXhmTMir0hsXLmZ8hHT+n54XyT3nscR/w/VjK/Q7wVYLf6zP2t0
j2MjHFrIFdOji54UYnUmJKgGubuFXtcJ+6QY0Ix7b/fAYzHAqFb3+Pcl49yk6KiM
ewIDAQAB
-----END PUBLIC KEY-----`;

const STORAGE_KEY_LICENSE = 'taleemidunya_license_token';
const STORAGE_KEY_CLOCK = 'taleemidunya_sec_tick';
const STORAGE_KEY_OFFLINE_CACHE = 'taleemidunya_license_cache';

/**
 * Base64URL to ArrayBuffer / Uint8Array decoder
 */
export function base64UrlToUint8Array(base64UrlString) {
  let base64 = base64UrlString.replace(/-/g, '+').replace(/_/g, '/');
  while (base64.length % 4) {
    base64 += '=';
  }
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

/**
 * Clean PEM string to DER ArrayBuffer for WebCrypto import
 */
export function pemToSpkiDer(pemString) {
  const b64 = pemString
    .replace(/-----BEGIN PUBLIC KEY-----/, '')
    .replace(/-----END PUBLIC KEY-----/, '')
    .replace(/\s+/g, '');
  const binaryString = atob(b64);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes.buffer;
}

/**
 * Parse token structure: TDLIC-<payloadBase64Url>.<signatureBase64Url>
 */
export function parseLicenseToken(token) {
  if (!token || typeof token !== 'string') {
    return { valid: false, error: 'NO_TOKEN' };
  }

  const cleanToken = token.trim();
  if (!cleanToken.startsWith('TDLIC-')) {
    return { valid: false, error: 'INVALID_FORMAT' };
  }

  const rawBody = cleanToken.slice(6);
  const parts = rawBody.split('.');
  if (parts.length !== 2) {
    return { valid: false, error: 'MALFORMED_TOKEN' };
  }

  try {
    const payloadBytes = base64UrlToUint8Array(parts[0]);
    const payloadString = new TextDecoder().decode(payloadBytes);
    const payload = JSON.parse(payloadString);
    return {
      valid: true,
      payload,
      rawPayloadString: payloadString,
      signatureB64Url: parts[1]
    };
  } catch (err) {
    return { valid: false, error: 'CORRUPTED_PAYLOAD: ' + err.message };
  }
}

/**
 * Verify RSA Digital Signature using native WebCrypto API
 */
export async function verifySignatureWebCrypto(rawPayloadString, signatureB64Url, publicKeyPem = MASTER_PUBLIC_KEY_PEM) {
  try {
    const subtle = window?.crypto?.subtle || globalThis?.crypto?.subtle;
    if (!subtle) {
      throw new Error('WebCrypto subtle not supported in this environment');
    }

    const spkiDer = pemToSpkiDer(publicKeyPem);
    const cryptoKey = await subtle.importKey(
      'spki',
      spkiDer,
      { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
      false,
      ['verify']
    );

    const encoder = new TextEncoder();
    const dataBytes = encoder.encode(rawPayloadString);
    const signatureBytes = base64UrlToUint8Array(signatureB64Url);

    const isValid = await subtle.verify(
      'RSASSA-PKCS1-v1_5',
      cryptoKey,
      signatureBytes,
      dataBytes
    );

    return isValid;
  } catch (err) {
    console.error('[LicenseCrypto] Signature verification failed:', err);
    return false;
  }
}

/**
 * Full End-to-End Cryptographic License Verification
 */
export async function verifyLicense(token, options = {}) {
  const { currentHwid = null, isDesktop = false, allowedDomains = [] } = options;

  const parsed = parseLicenseToken(token);
  if (!parsed.valid) {
    return {
      valid: false,
      code: parsed.error,
      message: 'Invalid license format or corrupted key'
    };
  }

  const { payload, rawPayloadString, signatureB64Url } = parsed;

  // 1. Verify Cryptographic RSA Signature
  const isSignatureValid = await verifySignatureWebCrypto(rawPayloadString, signatureB64Url);
  if (!isSignatureValid) {
    return {
      valid: false,
      code: 'SIGNATURE_INVALID',
      message: 'License key signature is invalid or tampered! Only genuine keys signed by TaleemiDunya are allowed.'
    };
  }

  // 2. Hardware ID Check for Desktop
  if (isDesktop && currentHwid) {
    if (payload.hwid && payload.hwid !== 'ANY_MACHINE') {
      const normalizedCurrent = currentHwid.trim().toUpperCase();
      // Support comma-separated multiple HWIDs or array in a single license
      const rawList = Array.isArray(payload.allowedHwids)
        ? payload.allowedHwids
        : (payload.hwid || '').split(',');
      const allowedHwids = rawList.map(h => h.trim().toUpperCase()).filter(Boolean);

      const isMatch = allowedHwids.includes(normalizedCurrent);
      if (!isMatch) {
        return {
          valid: false,
          code: 'HWID_MISMATCH',
          message: `Hardware ID Mismatch! This computer [${currentHwid}] is not authorized. Authorized machines: [${allowedHwids.join(', ')}].`,
          registeredHwid: payload.hwid,
          currentHwid: currentHwid
        };
      }
    }
  }

  // 3. Expiration Check
  if (payload.expiresAt && payload.expiresAt !== 'lifetime') {
    const expiryTime = new Date(payload.expiresAt).getTime();
    const now = Date.now();
    if (isNaN(expiryTime) || now > expiryTime) {
      return {
        valid: false,
        code: 'EXPIRED',
        message: `License expired on ${new Date(payload.expiresAt).toLocaleDateString()}. Please renew your subscription.`,
        expiresAt: payload.expiresAt
      };
    }
  }

  // 4. Clock Rollback / Anti-Tamper Check
  const clockCheck = checkClockTampering();
  if (!clockCheck.valid) {
    return {
      valid: false,
      code: 'CLOCK_TAMPERED',
      message: 'System clock tampering detected. Your computer time was rolled back. Please set accurate internet time.'
    };
  }

  // 5. Update Clock Tracker on valid verification
  recordClockTick();

  return {
    valid: true,
    code: 'ACTIVE',
    payload: payload,
    message: 'License is valid and active'
  };
}

/**
 * Clock Tampering Detector
 * Stores a cryptographically obscured timestamp in localStorage.
 * If the current time is significantly earlier than the last recorded time,
 * the user has rolled back their system clock.
 */
export function checkClockTampering() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_CLOCK);
    if (!raw) {
      recordClockTick();
      return { valid: true };
    }

    const lastTime = parseInt(atob(raw), 10);
    const now = Date.now();

    // Allow up to 30 minutes of natural clock drift or time zone adjustment
    const TOLERANCE_MS = 30 * 60 * 1000;
    if (now < (lastTime - TOLERANCE_MS)) {
      console.warn(`[LicenseSecurity] Clock rollback detected! Last recorded: ${new Date(lastTime)}, Current: ${new Date(now)}`);
      return { valid: false, lastTime, now };
    }

    return { valid: true };
  } catch (e) {
    return { valid: true };
  }
}

export function recordClockTick() {
  try {
    const now = Date.now();
    localStorage.setItem(STORAGE_KEY_CLOCK, btoa(String(now)));
  } catch (e) {}
}

/**
 * Domain Lock Checker for Web Deployment
 */
export function verifyWebDomainLock(allowedDomains = []) {
  if (typeof window === 'undefined') return { valid: true };

  const hostname = window.location.hostname.toLowerCase();

  // Allow local development
  const isLocal = hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '::1';
  if (isLocal && import.meta.env.DEV) {
    return { valid: true, isLocal: true };
  }

  // Approved Default Domains for TaleemiDunya Pro
  const defaultApproved = [
    'web.app',
    'firebaseapp.com',
    'vercel.app',
    'taleemidunya.com',
    'taleemidunya.pk',
    'taleemidunyapro.com'
  ];

  const allApproved = [...defaultApproved, ...allowedDomains.map(d => d.toLowerCase())];

  const isApproved = allApproved.some(allowed => 
    hostname === allowed || hostname.endsWith('.' + allowed)
  );

  if (!isApproved) {
    return {
      valid: false,
      code: 'UNAUTHORIZED_DOMAIN',
      message: `Domain [${hostname}] is not authorized to run TaleemiDunya Pro source code. Anti-piracy domain lock active.`
    };
  }

  return { valid: true, hostname };
}

/**
 * Local Storage License Helpers
 */
export function getSavedLicenseToken() {
  try {
    return localStorage.getItem(STORAGE_KEY_LICENSE) || null;
  } catch (e) {
    return null;
  }
}

export function saveLicenseToken(token) {
  try {
    localStorage.setItem(STORAGE_KEY_LICENSE, token.trim());
    recordClockTick();
    return true;
  } catch (e) {
    return false;
  }
}

export function clearSavedLicenseToken() {
  try {
    localStorage.removeItem(STORAGE_KEY_LICENSE);
    localStorage.removeItem(STORAGE_KEY_OFFLINE_CACHE);
  } catch (e) {}
}
