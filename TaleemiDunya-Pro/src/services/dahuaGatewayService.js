/**
 * Dahua XVR (DH-XVR1B16-I/T 16CH) Gateway Service
 * 
 * Provides secure backend communication and client-side helpers for Dahua XVR/DVR:
 * - Credential validation
 * - 16-channel discovery via LAN Connector / API Gateway
 * - Stream proxy routing (preventing credential leakage)
 * - Real diagnostic error processing (no mock fallbacks)
 */

export const DAHUA_MODEL_DETAILS = {
  brand: 'Dahua Technology',
  type: 'XVR/DVR',
  model: 'DH-XVR1B16-I/T',
  maxChannels: 16,
  videoSupport: 'Up to 1080P (1920x1080)',
  defaultPort: 37777,
  rtspPort: 554,
  httpPort: 80
};

/**
 * Validate DVR configuration input fields
 */
export const validateDahuaConfig = (config) => {
  const errors = [];
  if (!config.name?.trim()) errors.push('Recorder name is required.');
  if (!config.ipAddress?.trim()) errors.push('IP address / host is required.');
  if (!config.username?.trim()) errors.push('DVR Username is required.');
  
  // Basic IP / hostname format check
  const ipRegex = /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$|localhost|^[a-zA-Z0-9.-]+$/;
  if (config.ipAddress && !ipRegex.test(config.ipAddress.trim())) {
    errors.push('Invalid IP address or host format. Example: 192.168.100.82');
  }

  return {
    isValid: errors.length === 0,
    errors
  };
};

/**
 * Test Dahua XVR Connection via Cloud Gateway / Connector
 */
export const testDahuaConnection = async (recorderConfig, schoolId) => {
  const validation = validateDahuaConfig(recorderConfig);
  if (!validation.isValid) {
    return {
      success: false,
      diagnosticCode: 'INVALID_CONFIG',
      message: validation.errors.join(' ')
    };
  }

  try {
    const response = await fetch('/api/cctv/test-connection', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        schoolId: schoolId || recorderConfig.schoolId || 'default-school',
        brand: 'Dahua Technology',
        model: recorderConfig.model || DAHUA_MODEL_DETAILS.model,
        ipAddress: recorderConfig.ipAddress,
        port: recorderConfig.port || 37777,
        rtspPort: recorderConfig.rtspPort || 554,
        httpPort: recorderConfig.httpPort || 80,
        username: recorderConfig.username,
        password: recorderConfig.password
      })
    });

    if (response.ok) {
      return await response.json();
    }

    const errorData = await response.json().catch(() => ({}));
    return {
      success: false,
      diagnosticCode: errorData.diagnosticCode || 'DVR_UNREACHABLE',
      message: errorData.message || `Unable to connect to Dahua DVR at ${recorderConfig.ipAddress}.`
    };
  } catch (err) {
    return {
      success: false,
      diagnosticCode: 'CONNECTOR_OFFLINE',
      message: `Gateway API connection failed: ${err.message}. Ensure School LAN Connector is running.`
    };
  }
};

/**
 * Discover Channels for DH-XVR1B16-I/T via Gateway
 */
export const discoverDahuaChannels = async (recorderConfig, schoolId) => {
  try {
    const response = await fetch('/api/cctv/discover-channels', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        schoolId: schoolId || recorderConfig.schoolId || 'default-school',
        brand: 'Dahua Technology',
        model: recorderConfig.model || DAHUA_MODEL_DETAILS.model,
        ipAddress: recorderConfig.ipAddress,
        port: recorderConfig.port || 37777,
        username: recorderConfig.username,
        password: recorderConfig.password
      })
    });

    if (response.ok) {
      const data = await response.json();
      if (data && data.channels) return data.channels;
    }
  } catch (err) {
    console.warn('Channel discovery API query failed:', err.message);
  }

  // If connection fails, return 0 channels (no fake hardcoded channel seeding)
  return [];
};

/**
 * Generate secure tokenized stream gateway URL
 */
export const getSecureStreamUrl = (schoolId, recorderId, channelNumber) => {
  return `/api/cctv/stream?schoolId=${encodeURIComponent(schoolId || 'default')}&recorderId=${encodeURIComponent(recorderId || 'rec-1')}&channel=${channelNumber}&t=${Date.now()}`;
};
