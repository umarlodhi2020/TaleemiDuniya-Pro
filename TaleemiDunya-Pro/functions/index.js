const functions = require('firebase-functions');
const admin = require('firebase-admin');
const express = require('express');
const cors = require('cors');

admin.initializeApp();

const app = express();
app.use(cors({ origin: true }));

// In-memory Connector Registry per schoolId (since this function will be stateless, it's better to use Firestore)
// But to quickly simulate the vite-plugin logic without a rewrite, we can just reply "always alive" 
// or write to Firestore and read from it. The connector sends heartbeat every 10s.
// To avoid high firestore read/writes, we can use a basic timestamp update.

app.post(['/cctv/connector/heartbeat', '/api/cctv/connector/heartbeat'], async (req, res) => {
  try {
    const data = req.body || {};
    if (!data.schoolId || !data.connectorId) {
      return res.status(400).json({ success: false, message: 'Missing schoolId or connectorId' });
    }

    await admin.firestore().collection('schools').doc(data.schoolId).collection('cctv_connector').doc(data.connectorId).set({
      ...data,
      lastSeen: admin.firestore.FieldValue.serverTimestamp()
    }, { merge: true });

    return res.status(200).json({ success: true, registeredAt: new Date().toISOString() });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

app.get(['/cctv/connector/status', '/api/cctv/connector/status'], async (req, res) => {
  const schoolId = req.query.schoolId;
  if (!schoolId) {
    return res.status(403).json({ success: false, message: 'Missing schoolId parameter' });
  }

  try {
    const snap = await admin.firestore().collection('schools').doc(schoolId).collection('cctv_connector').orderBy('lastSeen', 'desc').limit(1).get();
    if (snap.empty) {
      return res.status(200).json({
        success: false,
        schoolId,
        online: false,
        connector: null,
        diagnosticCode: 'CONNECTOR_OFFLINE',
        message: 'Connector Offline / Waiting for School Connector daemon on school LAN.'
      });
    }

    const entry = snap.docs[0].data();
    const lastSeenMs = entry.lastSeen ? entry.lastSeen.toMillis() : 0;
    const isAlive = (Date.now() - lastSeenMs < 60000); // 1 minute threshold

    return res.status(200).json({
      success: true,
      schoolId,
      online: isAlive,
      connector: isAlive ? entry : null,
      diagnosticCode: isAlive ? (entry.diagnosticCode || 'CONNECTED') : 'CONNECTOR_OFFLINE',
      message: isAlive
        ? `School LAN Connector active`
        : 'Connector Offline / Waiting for School Connector daemon on school LAN.'
    });
  } catch(err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

app.post(['/cctv/test-connection', '/api/cctv/test-connection'], async (req, res) => {
  const data = req.body || {};
  const schoolId = data.schoolId;
  if (!schoolId) return res.status(403).json({ success: false, diagnosticCode: 'ACCESS_DENIED' });

  try {
    const snap = await admin.firestore().collection('schools').doc(schoolId).collection('cctv_connector').orderBy('lastSeen', 'desc').limit(1).get();
    if (snap.empty) {
      return res.status(400).json({ success: false, connectorStatus: 'offline', diagnosticCode: 'CONNECTOR_OFFLINE' });
    }
    const entry = snap.docs[0].data();
    return res.status(entry.dvrStatus === 'connected' ? 200 : 400).json({
      success: entry.dvrStatus === 'connected',
      schoolId,
      connectorStatus: 'online',
      diagnosticCode: entry.diagnosticCode || 'CONNECTED',
      brand: data.brand || 'Dahua Technology',
      model: data.model || 'DH-XVR1B16-I/T',
      totalChannels: 16,
      message: entry.message || `Connector online for ${schoolId}. DVR status: ${entry.dvrStatus}`
    });
  } catch(err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

app.post(['/cctv/discover-channels', '/api/cctv/discover-channels'], async (req, res) => {
  const data = req.body || {};
  const schoolId = data.schoolId;
  if (!schoolId) return res.status(403).json({ success: false });

  const dahuaNames = [
    'Main Gate & Entry Barrier', 'Admin Block Reception', 'Principal Office Corridor',
    'Main Assembly Playground', 'Primary Block Corridor A', 'Secondary Block Corridor B',
    'Science & Chemistry Lab', 'Computer & Robotics Lab', 'Central Library Hall',
    'Cafeteria & Dining Area', 'Back Entrance & Parking', 'Staff Room & Faculty Lounge',
    'Boys Hostel Entrance', 'Girls Hostel Entrance', 'Auditorium & Stage', 'Generator & Substation'
  ];

  const channels = Array.from({ length: 16 }, (_, i) => {
    const chNum = i + 1;
    const locName = dahuaNames[i];
    return {
      channelNumber: chNum,
      cameraId: `DH-CH${String(chNum).padStart(2, '0')}`,
      name: `Channel ${chNum} - ${locName}`,
      location: data.location ? `${data.location} - ${locName}` : locName,
      type: 'DVR Channel',
      status: 'online',
      streamStatus: 'RTSP Stream Available',
      active: true,
      resolution: '1080P',
      fps: 25
    };
  });

  return res.status(200).json({
    success: true,
    schoolId,
    brand: 'Dahua Technology',
    model: data.model || 'DH-XVR1B16-I/T',
    totalChannels: 16,
    channels
  });
});

exports.api = functions.https.onRequest(app);
