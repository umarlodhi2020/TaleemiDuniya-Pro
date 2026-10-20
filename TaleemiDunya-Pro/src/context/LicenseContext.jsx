import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import {
  verifyLicense,
  verifyWebDomainLock,
  getSavedLicenseToken,
  saveLicenseToken,
  clearSavedLicenseToken,
  recordClockTick
} from '../services/licenseCrypto';
import { db } from '../services/firebase';
import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';

const LicenseContext = createContext();

export const useLicense = () => {
  const context = useContext(LicenseContext);
  if (!context) {
    throw new Error('useLicense must be used within a LicenseProvider');
  }
  return context;
};

export const LicenseProvider = ({ children }) => {
  const [isLicensed, setIsLicensed] = useState(false);
  const [licenseData, setLicenseData] = useState(null);
  const [licenseError, setLicenseError] = useState(null);
  const [errorMessage, setErrorMessage] = useState('');
  const [hwid, setHwid] = useState('');
  const [isChecking, setIsChecking] = useState(true);
  const [isDesktop, setIsDesktop] = useState(false);
  const [isOnline, setIsOnline] = useState(typeof navigator !== 'undefined' ? navigator.onLine : true);

  // Detect platform and HWID
  const detectPlatform = useCallback(async () => {
    const desktopDetected = Boolean(
      (typeof window !== 'undefined' && window.electronLicense?.isDesktop) ||
      window.location.protocol === 'file:' ||
      navigator.userAgent.toLowerCase().includes('electron')
    );
    setIsDesktop(desktopDetected);

    let detectedHwid = 'WEB-BROWSER-CLIENT';
    if (desktopDetected && window.electronLicense?.getHwid) {
      try {
        detectedHwid = await window.electronLicense.getHwid();
      } catch (err) {
        console.error('[LicenseProvider] Failed to fetch HWID:', err);
        detectedHwid = 'HWID_FETCH_ERROR';
      }
    }
    setHwid(detectedHwid);
    return { desktopDetected, detectedHwid };
  }, []);

  // Main license evaluation routine
  const checkLicenseStatus = useCallback(async () => {
    setIsChecking(true);
    setLicenseError(null);
    setErrorMessage('');

    try {
      const { desktopDetected, detectedHwid } = await detectPlatform();

      // --- WEB MODE CHECKS ---
      if (!desktopDetected) {
        // Run anti-piracy domain lock
        const domainCheck = verifyWebDomainLock();
        if (!domainCheck.valid) {
          setIsLicensed(false);
          setLicenseError(domainCheck.code);
          setErrorMessage(domainCheck.message);
          setIsChecking(false);
          return;
        }

        // On Web, school subscription is handled primarily through school tenant accounts
        // but can also accept a Master License Token if stored
        const savedToken = getSavedLicenseToken();
        if (savedToken) {
          const result = await verifyLicense(savedToken, {
            currentHwid: detectedHwid,
            isDesktop: false
          });
          if (result.valid) {
            setIsLicensed(true);
            setLicenseData(result.payload);
            setLicenseError(null);
          } else {
            // Expired or invalid web token
            setIsLicensed(false);
            setLicenseError(result.code);
            setErrorMessage(result.message);
          }
        } else {
          // Web without local token: Allow auth flow to proceed normally
          setIsLicensed(true);
          setLicenseData(null);
        }
        setIsChecking(false);
        return;
      }

      // --- DESKTOP ELECTRON CHECKS (STRICT HWID + CRYPTO SIGNATURE) ---
      let token = null;

      // Try reading from Electron native file first
      if (window.electronLicense?.readLicenseFile) {
        try {
          token = await window.electronLicense.readLicenseFile();
        } catch (e) {}
      }

      // Fallback to localStorage
      if (!token) {
        token = getSavedLicenseToken();
      }

      if (!token) {
        setIsLicensed(false);
        setLicenseError('NO_LICENSE');
        setErrorMessage('This installation is not activated. A valid license key locked to this computer is required.');
        setIsChecking(false);
        return;
      }

      // Verify Cryptographic Signature & HWID
      const result = await verifyLicense(token, {
        currentHwid: detectedHwid,
        isDesktop: true
      });

      if (!result.valid) {
        setIsLicensed(false);
        setLicenseError(result.code);
        setErrorMessage(result.message);
        setIsChecking(false);
        return;
      }

      // License signature and local HWID are 100% valid!
      setLicenseData(result.payload);

      // --- ONLINE SYNC & CLOUD KILL-SWITCH (If Internet is available) ---
      if (navigator.onLine && db) {
        try {
          const licenseDocRef = doc(db, 'licenses', detectedHwid);
          const snap = await getDoc(licenseDocRef);

          if (snap.exists()) {
            const cloudData = snap.data();
            // Check for Remote Kill-Switch
            if (cloudData.isRevoked || cloudData.status === 'blocked' || cloudData.status === 'revoked') {
              setIsLicensed(false);
              setLicenseError('REMOTE_REVOKED');
              setErrorMessage('This license has been suspended or revoked remotely by the software administrator.');
              setIsChecking(false);
              return;
            }

            // If Super Admin updated expiry or token in the cloud, sync locally
            if (cloudData.token && cloudData.token !== token) {
              const cloudVerify = await verifyLicense(cloudData.token, {
                currentHwid: detectedHwid,
                isDesktop: true
              });
              if (cloudVerify.valid) {
                token = cloudData.token;
                setLicenseData(cloudVerify.payload);
                if (window.electronLicense?.saveLicenseFile) {
                  await window.electronLicense.saveLicenseFile(token);
                }
                saveLicenseToken(token);
              }
            }
          } else {
            // First time online check: Register device heartbeat in cloud
            setDoc(licenseDocRef, {
              hwid: detectedHwid,
              schoolId: result.payload.schoolId || 'UNKNOWN',
              schoolName: result.payload.schoolName || 'Unknown School',
              plan: result.payload.plan || 'enterprise',
              expiresAt: result.payload.expiresAt,
              firstSeen: new Date().toISOString(),
              lastHeartbeat: new Date().toISOString(),
              status: 'active',
              isRevoked: false
            }, { merge: true }).catch(() => {});
          }
        } catch (cloudErr) {
          // Cloud sync failed (network glitch or rules restriction)
          // Fall back gracefully to offline crypto verification!
          console.warn('[LicenseSync] Cloud sync check skipped, proceeding in offline mode.');
        }
      }

      // Valid and active!
      setIsLicensed(true);
      setLicenseError(null);
      setErrorMessage('');
    } catch (err) {
      console.error('[LicenseProvider] Evaluation exception:', err);
      setIsLicensed(false);
      setLicenseError('SYSTEM_ERROR');
      setErrorMessage(err.message || 'An error occurred while validating the license.');
    } finally {
      setIsChecking(false);
    }
  }, [detectPlatform]);

  // Activate a new license token provided by the user
  const activateLicense = async (tokenInput) => {
    if (!tokenInput || typeof tokenInput !== 'string') {
      return { success: false, error: 'Please enter a valid license key string.' };
    }

    const clean = tokenInput.trim();
    const { detectedHwid } = await detectPlatform();

    const result = await verifyLicense(clean, {
      currentHwid: detectedHwid,
      isDesktop: isDesktop
    });

    if (!result.valid) {
      setLicenseError(result.code);
      setErrorMessage(result.message);
      return { success: false, error: result.message, code: result.code };
    }

    // Save to native file if in desktop
    if (window.electronLicense?.saveLicenseFile) {
      await window.electronLicense.saveLicenseFile(clean);
    }
    // Also save in localStorage
    saveLicenseToken(clean);

    // Register activation online if connected
    if (navigator.onLine && db) {
      try {
        const licenseRef = doc(db, 'licenses', detectedHwid);
        await setDoc(licenseRef, {
          hwid: detectedHwid,
          schoolId: result.payload.schoolId,
          schoolName: result.payload.schoolName,
          plan: result.payload.plan,
          expiresAt: result.payload.expiresAt,
          activatedAt: new Date().toISOString(),
          lastHeartbeat: new Date().toISOString(),
          status: 'active',
          isRevoked: false
        }, { merge: true });
      } catch (e) {
        console.warn('[LicenseProvider] Online activation record skipped (offline).');
      }
    }

    setIsLicensed(true);
    setLicenseData(result.payload);
    setLicenseError(null);
    setErrorMessage('');
    return { success: true, payload: result.payload };
  };

  // Deactivate license
  const deactivateLicense = async () => {
    if (window.electronLicense?.deleteLicenseFile) {
      await window.electronLicense.deleteLicenseFile();
    }
    clearSavedLicenseToken();
    setIsLicensed(false);
    setLicenseData(null);
    setLicenseError('NO_LICENSE');
    setErrorMessage('License deactivated.');
  };

  // Listeners for network & clock ticks
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      checkLicenseStatus();
    };
    const handleOffline = () => {
      setIsOnline(false);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Periodically update clock tick to prevent clock rollback
    const clockInterval = setInterval(() => {
      recordClockTick();
    }, 60000);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      clearInterval(clockInterval);
    };
  }, [checkLicenseStatus]);

  // Initial check on mount
  useEffect(() => {
    checkLicenseStatus();
  }, [checkLicenseStatus]);

  const value = {
    isLicensed,
    licenseData,
    licenseError,
    errorMessage,
    hwid,
    isChecking,
    isDesktop,
    isOnline,
    activateLicense,
    deactivateLicense,
    recheckLicense: checkLicenseStatus
  };

  return (
    <LicenseContext.Provider value={value}>
      {children}
    </LicenseContext.Provider>
  );
};
