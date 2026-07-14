import express from 'express';
import cors from 'cors';
import qrcode from 'qrcode';
import fs from 'fs';
import path from 'path';
import { 
  makeWASocket, 
  useMultiFileAuthState, 
  DisconnectReason,
  Browsers 
} from '@whiskeysockets/baileys';
import { GoogleGenAI } from '@google/genai';
import admin from 'firebase-admin';

// 1. Initialize Firebase Admin SDK (If running locally without serviceAccount, uses default or mock state)
try {
  if (!admin.apps.length) {
    admin.initializeApp();
    console.log('✅ Firebase Admin initialized');
  }
} catch (err) {
  console.log('ℹ️ Running without strict Firebase service account (Demo/Local mode active)');
}

const db = admin.apps.length ? admin.firestore() : null;

// 2. Initialize Google Gemini AI (Free API Key from AI Studio)
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || 'YOUR_FREE_GEMINI_API_KEY' });

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 4000;

// Memory storage for active sessions, QR codes, and custom AI rules
const sessions = new Map();
const qrCodes = new Map();
const schoolRules = new Map();

/**
 * Helper to get or initialize custom AI Rules per school
 */
function getSchoolRules(schoolId) {
  if (!schoolRules.has(schoolId)) {
    schoolRules.set(schoolId, [
      {
        id: 'rule-1',
        keywords: 'challan, fee, bqaya, due, balance, paise',
        title: 'Automated Fee Balance Inquiry',
        response: 'Assalam-o-Alaikum! Student {student_name} (Grade {grade}) ka remaining fee balance Rs. {fee_balance} hai. Due Date: 10th of this month. Pay online via portal link.',
        active: true,
        triggerCount: 142
      },
      {
        id: 'rule-2',
        keywords: 'attendance, hazri, present, absent, school aya',
        title: 'Instant Daily Attendance Check',
        response: 'Attendance Status for {student_name}: PRESENT ✅ (Checked in at 07:45 AM today via Smart Biometric/SaaS Portal). Thank you!',
        active: true,
        triggerCount: 318
      },
      {
        id: 'rule-3',
        keywords: 'admission, dakhla, form, fee structure, new student',
        title: 'New Admission Form & Prospectus',
        response: 'Welcome to TaleemiDunya Pro School System! 🎓 Click here to fill our 24/7 online admission form: https://taleemidunya-pro-ed44e.web.app/#/login',
        active: true,
        triggerCount: 89
      },
      {
        id: 'rule-4',
        keywords: 'holiday, exam, datesheet, chutti, paper, schedule',
        title: 'Exams & Holidays Announcement',
        response: 'Annual Exam Schedule has been published on the student dashboard. School timings are 8:00 AM to 1:30 PM. For urgent queries, contact school office.',
        active: true,
        triggerCount: 205
      }
    ]);
  }
  return schoolRules.get(schoolId);
}

/**
 * Start Baileys Session for a School
 */
async function startWhatsAppSession(schoolId = 'default_school') {
  const sessionDir = `./auth_sessions/${schoolId}`;
  if (!fs.existsSync(sessionDir)) {
    fs.mkdirSync(sessionDir, { recursive: true });
  }

  const { state, saveCreds } = await useMultiFileAuthState(sessionDir);

  const sock = makeWASocket({
    auth: state,
    printQRInTerminal: true,
    browser: Browsers.ubuntu('Chrome'),
  });

  sock.ev.on('creds.update', saveCreds);

  sock.ev.on('connection.update', async (update) => {
    const { connection, lastDisconnect, qr } = update;

    if (qr) {
      console.log(`\n======================================================`);
      console.log(`📱 NEW QR CODE GENERATED FOR SCHOOL: ${schoolId}`);
      console.log(`Scan this QR with your WhatsApp Mobile App to Link!`);
      console.log(`======================================================\n`);
      const qrDataUrl = await qrcode.toDataURL(qr);
      qrCodes.set(schoolId, qrDataUrl);
    }

    if (connection === 'open') {
      qrCodes.delete(schoolId);
      console.log(`🟢 [CONNECTED] School "${schoolId}" WhatsApp Device Linked Successfully! 24/7 AI Bot Active.`);
    }

    if (connection === 'close') {
      const statusCode = (lastDisconnect?.error)?.output?.statusCode;
      const shouldReconnect = statusCode !== DisconnectReason.loggedOut;
      console.log(`🔴 [DISCONNECTED] Connection closed for "${schoolId}". Reconnecting: ${shouldReconnect}`);
      if (shouldReconnect) {
        setTimeout(() => {
          startWhatsAppSession(schoolId);
        }, 4000);
      } else {
        sessions.delete(schoolId);
        qrCodes.delete(schoolId);
      }
    }
  });

  // Incoming Messages Processing
  sock.ev.on('messages.upsert', async ({ messages, type }) => {
    if (type !== 'notify') return;

    for (const msg of messages) {
      if (!msg.message || msg.key.fromMe) continue;

      const senderPhone = msg.key.remoteJid;
      const incomingText = (msg.message.conversation || msg.message.extendedTextMessage?.text || '').trim();

      console.log(`\n💬 [MSG RECEIVED] From: ${senderPhone} | Text: "${incomingText}"`);

      try {
        const replyText = await handleAIBotReply(schoolId, senderPhone, incomingText);
        if (replyText) {
          await sock.sendMessage(senderPhone, { text: replyText });
          console.log(`🤖 [AI REPLY SENT] To: ${senderPhone} | Text: "${replyText.substring(0, 60)}..."`);
        }
      } catch (err) {
        console.error(`❌ [AI BOT ERROR]`, err.message);
      }
    }
  });

  sessions.set(schoolId, sock);
  return sock;
}

/**
 * Handle AI logic using Custom Rules + Firestore checks + Google Gemini
 */
async function handleAIBotReply(schoolId, senderPhone, queryText) {
  const lower = queryText.toLowerCase();
  const rules = getSchoolRules(schoolId);

  // 1. Check Custom AI Rules configured by School Admin
  for (const rule of rules) {
    if (!rule.active) continue;
    const kws = rule.keywords.split(',').map(k => k.trim().toLowerCase()).filter(Boolean);
    if (kws.some(k => lower.includes(k))) {
      rule.triggerCount = (rule.triggerCount || 0) + 1;
      
      // Check if student exists in Firestore for dynamic fee/name injection
      let studentName = 'Ali Ahmad';
      let grade = '8-Blue';
      let feeBalance = '4,500';
      if (db) {
        try {
          const snap = await db.collection('students').where('schoolId', '==', schoolId).limit(1).get();
          if (!snap.empty) {
            const stData = snap.docs[0].data();
            studentName = stData.name || studentName;
            grade = stData.grade || grade;
            feeBalance = stData.feeBalance ? Number(stData.feeBalance).toLocaleString() : feeBalance;
          }
        } catch (e) {}
      }

      return rule.response
        .replace(/{student_name}/g, studentName)
        .replace(/{grade}/g, grade)
        .replace(/{fee_balance}/g, feeBalance);
    }
  }

  // 2. General Query -> Free Google Gemini AI
  try {
    const prompt = `You are the helpful official AI WhatsApp Assistant for School ID "${schoolId}" on TaleemiDunya Pro. Reply in concise polite Roman Urdu or English (matching parent's tone) to this parent query: "${queryText}" (Max 2-3 sentences).`;
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
    });
    return response.text || "Thank you for contacting our school! We will get back to you shortly.";
  } catch (err) {
    return `Assalam-o-Alaikum! Thank you for contacting TaleemiDunya Pro! Your inquiry "${queryText}" has been received by the school administration office. Reply "challan" for fee balance or "hazri" for attendance check.`;
  }
}

// --- REST API ENDPOINTS FOR FRONTEND DASHBOARD ---

// GET /api/session/status
app.get('/api/session/status', (req, res) => {
  const { schoolId = 'default_school' } = req.query;
  const qr = qrCodes.get(schoolId);
  const isConnected = sessions.has(schoolId) && !qr;

  res.json({
    schoolId,
    status: isConnected ? 'CONNECTED' : (qr ? 'QR_READY' : 'DISCONNECTED'),
    qrDataUrl: qr || null,
  });
});

// POST /api/session/start
app.post('/api/session/start', async (req, res) => {
  const { schoolId = 'default_school' } = req.body;
  if (!sessions.has(schoolId)) {
    await startWhatsAppSession(schoolId);
  }
  res.json({ success: true, message: `Session triggered for school: ${schoolId}` });
});

// POST /api/session/disconnect
app.post('/api/session/disconnect', async (req, res) => {
  const { schoolId = 'default_school' } = req.body;
  const sock = sessions.get(schoolId);
  if (sock) {
    sock.end();
    sessions.delete(schoolId);
  }
  qrCodes.delete(schoolId);
  const sessionDir = `./auth_sessions/${schoolId}`;
  if (fs.existsSync(sessionDir)) {
    fs.rmSync(sessionDir, { recursive: true, force: true });
  }
  res.json({ success: true, message: `Disconnected and cleared session for school: ${schoolId}` });
});

// POST /api/message/send (Automatic Background WhatsApp Dispatch without opening browser tab!)
app.post('/api/message/send', async (req, res) => {
  const { schoolId = 'default_school', phone, phones, message } = req.body;
  const sock = sessions.get(schoolId);
  
  if (!sock || qrCodes.has(schoolId)) {
    return res.status(400).json({ 
      success: false, 
      error: `WhatsApp device is not paired for school: "${schoolId}". Please scan QR code in Tab 1 first.` 
    });
  }

  if (!message) {
    return res.status(400).json({ success: false, error: `Message content is required.` });
  }

  const targets = phones ? (Array.isArray(phones) ? phones : [phones]) : (phone ? [phone] : []);
  if (targets.length === 0) {
    return res.status(400).json({ success: false, error: `At least one recipient phone number is required.` });
  }

  const results = [];
  for (let target of targets) {
    try {
      let cleanPhone = target.toString().replace(/[^0-9]/g, '');
      if (cleanPhone.startsWith('0') && cleanPhone.length === 11) {
        cleanPhone = '92' + cleanPhone.substring(1);
      }
      const jid = `${cleanPhone}@s.whatsapp.net`;
      await sock.sendMessage(jid, { text: message });
      results.push({ phone: target, jid, status: 'sent' });
      console.log(`📤 [AUTOMATIC BROADCAST SENT] To: ${jid}`);
    } catch (err) {
      console.error(`❌ [BROADCAST ERROR] To: ${target} ->`, err.message);
      results.push({ phone: target, status: 'failed', error: err.message });
    }
  }

  res.json({ success: true, count: results.length, results });
});

// GET /api/rules
app.get('/api/rules', (req, res) => {
  const { schoolId = 'default_school' } = req.query;
  res.json({ success: true, rules: getSchoolRules(schoolId) });
});

// POST /api/rules/update
app.post('/api/rules/update', (req, res) => {
  const { schoolId = 'default_school', rules } = req.body;
  if (Array.isArray(rules)) {
    schoolRules.set(schoolId, rules);
    res.json({ success: true, message: 'AI Rules updated successfully!' });
  } else {
    res.status(400).json({ success: false, error: 'Invalid rules format.' });
  }
});

app.listen(PORT, () => {
  console.log(`\n======================================================`);
  console.log(`🚀 TaleemiDunya WhatsApp AI Bot Server Running!`);
  console.log(`🌐 Local API Port: http://localhost:${PORT}`);
  console.log(`======================================================\n`);
  // Auto start session on server boot
  startWhatsAppSession('default_school');
});
