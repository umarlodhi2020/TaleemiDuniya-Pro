/**
 * CCTV Connector & Network Diagnostic Engine — Frontend/Server Bridge
 * 
 * Provides unified connector state tracking, diagnostic evaluation,
 * and gateway communication methods for Dahua XVR (DH-XVR1B16-I/T).
 */

export const CONNECTOR_DIAGNOSTIC_CODES = {
  CONNECTOR_OFFLINE: {
    code: 'CONNECTOR_OFFLINE',
    title: 'Connector Offline',
    description: 'School LAN Connector daemon is not running or unreachable.',
    severity: 'error',
    action: 'Start the CCTV Connector daemon on the school LAN PC.'
  },
  DVR_UNREACHABLE: {
    code: 'DVR_UNREACHABLE',
    title: 'DVR Unreachable (192.168.100.82)',
    description: 'Cannot reach Dahua DVR IP address over local school network.',
    severity: 'error',
    action: 'Verify DVR power, network cable, and LAN IP address.'
  },
  TCP_37777_UNAVAILABLE: {
    code: 'TCP_37777_UNAVAILABLE',
    title: 'TCP Port 37777 Closed',
    description: 'Dahua TCP Port 37777 connection refused or timed out.',
    severity: 'error',
    action: 'Enable TCP Port 37777 in Dahua XVR Network Settings.'
  },
  RTSP_554_UNAVAILABLE: {
    code: 'RTSP_554_UNAVAILABLE',
    title: 'RTSP Port 554 Closed',
    description: 'RTSP Port 554 connection refused or timed out.',
    severity: 'warning',
    action: 'Enable RTSP Streaming Port 554 on Dahua XVR.'
  },
  HTTP_80_UNAVAILABLE: {
    code: 'HTTP_80_UNAVAILABLE',
    title: 'HTTP Port 80 Unavailable',
    description: 'Dahua HTTP web interface port 80 timed out.',
    severity: 'warning',
    action: 'Ensure HTTP Web Service port 80 is enabled.'
  },
  AUTHENTICATION_FAILURE: {
    code: 'AUTHENTICATION_FAILURE',
    title: 'Wrong DVR Credentials',
    description: 'DVR rejected the provided username or password.',
    severity: 'error',
    action: 'Check DVR admin username & password.'
  },
  CONNECTED: {
    code: 'CONNECTED',
    title: 'DVR & Connector Active',
    description: 'Dahua XVR and School LAN Connector are online and healthy.',
    severity: 'success',
    action: 'Ready to stream 16 channels.'
  }
};

/**
 * Query active status of School LAN Connector for a tenant
 */
export async function getConnectorStatus(schoolId) {
  try {
    const res = await fetch(`/api/cctv/connector/status?schoolId=${encodeURIComponent(schoolId || 'default')}`);
    if (res.ok) {
      return await res.json();
    }
  } catch (err) {
    console.warn('Connector status query failed:', err.message);
  }

  return {
    success: false,
    online: false,
    diagnosticCode: 'CONNECTOR_OFFLINE',
    message: 'School LAN Connector is offline or waiting to connect.'
  };
}

/**
 * Dispatch connection test via Cloud Gateway API -> Connector -> Dahua DVR
 */
export async function requestTestConnection(config, schoolId) {
  try {
    const res = await fetch('/api/cctv/test-connection', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ schoolId, ...config })
    });

    if (res.ok) {
      return await res.json();
    }

    const errData = await res.json().catch(() => ({}));
    return {
      success: false,
      diagnosticCode: errData.diagnosticCode || 'DVR_UNREACHABLE',
      message: errData.message || 'Connection test failed.'
    };
  } catch (err) {
    return {
      success: false,
      diagnosticCode: 'CLOUD_PROXY_UNAVAILABLE',
      message: `Gateway API request failed: ${err.message}`
    };
  }
}

/**
 * Dispatch channel discovery via Cloud Gateway API -> Connector -> Dahua DVR
 */
export async function requestDiscoverChannels(config, schoolId) {
  try {
    const res = await fetch('/api/cctv/discover-channels', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ schoolId, ...config })
    });

    if (res.ok) {
      const data = await res.json();
      return data.channels || [];
    }
  } catch (err) {
    console.warn('Discover channels error:', err.message);
  }

  return [];
}
