import express from 'express';
import cors from 'cors';
import qrcode from 'qrcode';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import PDFDocument from 'pdfkit';
import nodemailer from 'nodemailer';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

import { 
  makeWASocket, 
  useMultiFileAuthState, 
  DisconnectReason,
  Browsers,
  fetchLatestBaileysVersion,
  generateWAMessageFromContent,
  makeCacheableSignalKeyStore,
  proto
} from '@whiskeysockets/baileys';
import { GoogleGenAI } from '@google/genai';
import admin from 'firebase-admin';

// ---------------------------------------------------------------------------
// 1. Email Transporter (Preserved)
// ---------------------------------------------------------------------------
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.GMAIL_USER || 'taleemiduniyapro@gmail.com',
    pass: process.env.GMAIL_PASS || 'bqrbydwkpbmtjdpg'
  }
});

// ---------------------------------------------------------------------------
// 2. Global Crash Protections & Firebase Environment
// ---------------------------------------------------------------------------
process.on('uncaughtException', (err) => {
  console.error('🛡️ [PREVENTED CRASH] Uncaught Exception:', err.message || err);
});
process.on('unhandledRejection', (reason, promise) => {
  console.error('🛡️ [PREVENTED CRASH] Unhandled Rejection at promise:', reason?.message || reason);
});

// Force Firestore REST mode on AlwaysData / Linux to prevent gRPC ESM conflicts
process.env.FIRESTORE_PREFER_REST = '1';
process.env.GOOGLE_CLOUD_DISABLE_GRPC = '1';

let db = null;
try {
  const serviceAccountPath = path.join(__dirname, 'serviceAccountKey.json');
  const serviceAccountExists = fs.existsSync(serviceAccountPath);

  if (!admin.apps.length) {
    const firebaseConfig = {
      projectId: process.env.FIREBASE_PROJECT_ID || 'taleemidunya-pro-ed44e'
    };

    if (serviceAccountExists) {
      const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf8'));
      firebaseConfig.credential = admin.credential.cert(serviceAccount);
      console.log('✅ Firebase Admin using serviceAccountKey.json');
    } else {
      console.log('⚠️ Firebase Admin falling back to application default credentials');
    }

    admin.initializeApp(firebaseConfig);
  }

  db = admin.firestore();
  console.log('✅ Firestore initialized successfully (REST mode)');
} catch (err) {
  console.error('⚠️ Firebase init warning:', err.message);
  db = null;
}

// ---------------------------------------------------------------------------
// 3. Google Gemini AI Initialization
// ---------------------------------------------------------------------------
let ai = null;
try {
  const geminiKey = process.env.GEMINI_API_KEY || 'YOUR_FREE_GEMINI_API_KEY';
  ai = new GoogleGenAI({ apiKey: geminiKey });
} catch (e) {
  console.warn('⚠️ Gemini AI client init fallback:', e.message);
}

// ---------------------------------------------------------------------------
// 4. Pakistani & International Phone Normalization & Sanitized Identity
// ---------------------------------------------------------------------------
function maskIdentifier(id = '') {
  if (!id) return '[EMPTY]';
  const str = String(id).trim();
  if (str.length <= 6) return '***';
  return str.slice(0, 3) + '****' + str.slice(-3);
}

function normalizePhone(input = '') {
  if (!input) return '';
  let str = String(input).trim();
  // If JID format, strip @s.whatsapp.net or @c.us (never treat @lid as phone)
  if (str.endsWith('@s.whatsapp.net') || str.endsWith('@c.us')) {
    str = str.split('@')[0].split(':')[0];
  }
  // Strip all non-digit characters
  let digits = str.replace(/\D/g, '');
  if (!digits) return '';

  // 00923XXXXXXXXX (14 digits starting with 00923) -> 923XXXXXXXXX
  if (digits.startsWith('00923') && digits.length === 14) {
    digits = digits.slice(2);
  }
  // 03XXXXXXXXX (11 digits starting with 03) -> 923XXXXXXXXX
  else if (digits.startsWith('03') && digits.length === 11) {
    digits = '92' + digits.slice(1);
  }
  // 3XXXXXXXXX (10 digits starting with 3) -> 923XXXXXXXXX
  else if (digits.startsWith('3') && digits.length === 10) {
    digits = '92' + digits;
  }
  // 923XXXXXXXXX (12 digits starting with 923) -> already canonical
  else if (digits.startsWith('923') && digits.length === 12) {
    // already canonical
  }

  // Canonical Pakistani number must be exactly 12 digits: 923XXXXXXXXX
  if (/^923\d{9}$/.test(digits)) {
    return digits;
  }

  // International standard E.164 without leading zeros (11 to 15 digits, not starting with 0)
  if (/^[1-9]\d{10,14}$/.test(digits) && !digits.startsWith('0')) {
    return digits;
  }

  // Reject malformed, truncated, or ambiguous input instead of guessing
  return '';
}

function isValidPakistaniPhone(input = '') {
  const cleaned = normalizePhone(input);
  return /^923\d{9}$/.test(cleaned);
}

function isValidPhone(input = '') {
  const cleaned = normalizePhone(input);
  if (!cleaned) return false;
  return /^923\d{9}$/.test(cleaned) || /^[1-9]\d{10,14}$/.test(cleaned);
}

function formatCnic(input = '') {
  const digits = String(input || '').replace(/\D/g, '').slice(0, 13);
  if (digits.length <= 5) return digits;
  if (digits.length <= 12) return `${digits.slice(0, 5)}-${digits.slice(5)}`;
  return `${digits.slice(0, 5)}-${digits.slice(5, 12)}-${digits.slice(12)}`;
}

function isValidCnic(input = '') {
  const digits = String(input || '').replace(/\D/g, '');
  return digits.length === 13;
}

// ---------------------------------------------------------------------------
// 5. In-Memory Message Store & Process Deduplication
// ---------------------------------------------------------------------------
// LRU Message Store: keeps recent messages so Baileys getMessage callback can answer retry receipts
const messageStore = new Map(); // msgId -> proto.IMessage
function saveMessageToStore(id, message) {
  if (!id || !message) return;
  if (messageStore.size > 1500) {
    const firstKey = messageStore.keys().next().value;
    messageStore.delete(firstKey);
  }
  messageStore.set(id, message);
}

// Deduplication store for processed incoming messages
const processedMessageIds = new Map(); // msgId -> timestamp
function isMessageProcessed(msgId) {
  if (!msgId) return false;
  const now = Date.now();
  if (processedMessageIds.has(msgId)) return true;
  if (processedMessageIds.size > 2000) {
    for (const [k, ts] of processedMessageIds.entries()) {
      if (now - ts > 600000) processedMessageIds.delete(k); // Clean older than 10 mins
    }
  }
  processedMessageIds.set(msgId, now);
  return false;
}

// Bidirectional LID <-> Phone map to resolve WhatsApp @lid addresses
const lidToPhoneMap = new Map(); // cleanLidString -> cleanPhoneString
const phoneToLidMap = new Map(); // cleanPhoneString -> cleanLidString

const LID_MAP_FILE = path.join(__dirname, 'auth_sessions', 'lid_mapping.json');

function loadLidMappings() {
  try {
    if (fs.existsSync(LID_MAP_FILE)) {
      const data = JSON.parse(fs.readFileSync(LID_MAP_FILE, 'utf8'));
      for (const [lid, phone] of Object.entries(data)) {
        if (lid && phone && isValidPhone(phone)) {
          lidToPhoneMap.set(lid, phone);
          phoneToLidMap.set(phone, lid);
        }
      }
      console.log(`📋 [LID MAP] Loaded ${lidToPhoneMap.size} authoritative LID-to-Phone mappings from disk.`);
    }
  } catch (e) {
    console.warn('⚠️ Could not load LID mappings from disk:', e.message);
  }
}

let saveLidTimeout = null;
function persistLidMappings() {
  if (saveLidTimeout) return;
  saveLidTimeout = setTimeout(() => {
    saveLidTimeout = null;
    try {
      const obj = Object.fromEntries(lidToPhoneMap.entries());
      const dir = path.dirname(LID_MAP_FILE);
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
      fs.writeFileSync(LID_MAP_FILE, JSON.stringify(obj, null, 2), 'utf8');
    } catch (e) {
      console.warn('⚠️ Could not persist LID mappings to disk:', e.message);
    }
  }, 1000);
}

function registerLidPhoneMapping(lid, phone) {
  if (!lid || !phone) return;
  const cleanLid = String(lid).replace('@lid', '').split('@')[0].split(':')[0].trim();
  // Ensure we don't accidentally treat another LID as a phone number
  if (typeof phone === 'string' && phone.endsWith('@lid')) return;
  const cleanPhone = normalizePhone(phone);
  if (cleanLid && cleanPhone && isValidPhone(cleanPhone)) {
    const prev = lidToPhoneMap.get(cleanLid);
    if (prev !== cleanPhone) {
      lidToPhoneMap.set(cleanLid, cleanPhone);
      phoneToLidMap.set(cleanPhone, cleanLid);
      persistLidMappings();
      console.log(`🔗 [LID MAPPED] LID ${maskIdentifier(cleanLid)} -> Phone ${maskIdentifier(cleanPhone)}`);
    }
  }
}

// Load persisted mappings immediately
loadLidMappings();

// ---------------------------------------------------------------------------
// 6. Multi-Child Smart Family PDF Voucher Generator
// ---------------------------------------------------------------------------
function generateFamilyVoucherPDF(students, schoolName, voucherData, logoBuffer) {
  return new Promise((resolve, reject) => {
    try {
      const studentList = Array.isArray(students) ? students : [students];
      const primaryStudent = studentList[0] || {};
      const numChildren = studentList.length;

      // A5 size: 419.53 x 595.28
      const doc = new PDFDocument({ size: 'A5', margin: 30 });
      const buffers = [];
      doc.on('data', buffers.push.bind(buffers));
      doc.on('end', () => resolve(Buffer.concat(buffers)));

      const width = doc.page.width - 60; // 359.53
      const rightEdge = 30 + width;

      // Header Area
      let currentY = doc.y;
      if (logoBuffer) {
        try {
          doc.image(logoBuffer, 30, currentY, { fit: [50, 50], align: 'center', valign: 'center' });
        } catch(e) {}
      }

      // School Name
      doc.fontSize(14).font('Helvetica-Bold').text(schoolName || 'TaleemiDunya Pro', 90, currentY + 10, { width: width - 60, align: 'left' });
      doc.fontSize(9).font('Helvetica').text('Official Student Fee Challan', 90, doc.y, { align: 'left' });
      doc.moveDown(1);

      // Subheader: PARENT COPY | Voucher #
      const ySub = doc.y;
      doc.fontSize(10).font('Helvetica-Bold').text('PARENT COPY', 30, ySub);

      const vMonth = (voucherData && voucherData.month) ? voucherData.month : new Date().toISOString().slice(0, 7);
      const vNo = (voucherData && voucherData.voucherNo) ? voucherData.voucherNo : ('V-' + Date.now().toString().slice(-4));
      doc.text(`Voucher #${vNo}`, 30, ySub, { align: 'right', width: width });
      doc.moveDown(0.5);

      // Line Separator
      currentY = doc.y;
      doc.moveTo(30, currentY).lineTo(rightEdge, currentY).stroke();
      doc.moveDown(0.5);

      currentY = doc.y;

      // Due Date: use real dueDate, or end of month
      let vDueDate = (voucherData && voucherData.dueDate && voucherData.dueDate.trim()) ? voucherData.dueDate : null;
      if (!vDueDate) {
        const now = new Date();
        const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);
        vDueDate = lastDay.toISOString().slice(0, 10);
      }

      // Info Block
      const labelX = 30;
      const valueX = 120;
      const lineSpacing = 15;

      doc.font('Helvetica-Bold').fontSize(9).text('Month', labelX, currentY);
      doc.font('Helvetica').fontSize(9).text(vMonth, valueX, currentY);
      currentY += lineSpacing;

      doc.font('Helvetica-Bold').fontSize(9).text('DueDate', labelX, currentY);
      doc.font('Helvetica').fontSize(9).text(vDueDate, valueX, currentY);
      currentY += lineSpacing;

      doc.font('Helvetica-Bold').fontSize(9).text('Ft. Name', labelX, currentY);
      doc.font('Helvetica').fontSize(9).text(primaryStudent.fatherName || primaryStudent.guardianName || 'N/A', valueX, currentY);
      currentY += lineSpacing;

      doc.font('Helvetica-Bold').fontSize(9).text('No Of Child', labelX, currentY);
      doc.font('Helvetica').fontSize(9).text(String(numChildren), valueX, currentY);
      currentY += lineSpacing;

      doc.font('Helvetica-Bold').fontSize(9).text('NIC', labelX, currentY);
      doc.font('Helvetica').fontSize(9).text(primaryStudent.fatherCnic || primaryStudent.cnic || 'N/A', valueX, currentY);
      currentY += lineSpacing + 8;

      // Table Header (Grey)
      doc.rect(30, currentY, width, 18).fill('#4a5568');
      doc.fillColor('white').font('Helvetica-Bold').fontSize(8.5);

      const col1X = 30, col1W = 45;   // Adm#
      const col2X = 75, col2W = 125;  // Name
      const col3X = 200, col3W = 45;  // Class
      const col4X = 245, col4W = 50;  // Fee
      const col5X = 295, col5W = 45;  // Arrears
      const col6X = 340, col6W = 49.53; // Total

      doc.text('Adm#', col1X, currentY + 4, { width: col1W, align: 'center' });
      doc.text('Name', col2X + 4, currentY + 4, { width: col2W - 8 });
      doc.text('Class', col3X, currentY + 4, { width: col3W, align: 'center' });
      doc.text('Fee', col4X, currentY + 4, { width: col4W, align: 'right' });
      doc.text('Arrears', col5X, currentY + 4, { width: col5W, align: 'right' });
      doc.text('Total', col6X, currentY + 4, { width: col6W - 4, align: 'right' });

      currentY += 18;
      doc.fillColor('black').font('Helvetica').fontSize(8.5);

      let grandTotal = 0;
      const rowHeight = 22;

      for (let i = 0; i < studentList.length; i++) {
        const st = studentList[i];
        let feeAmt = Number(st.monthlyFee || st.tuitionFee || 0);
        let arrAmt = 0;
        let annAmt = 0;

        // Cross-match with voucher childrenDetails if available
        if (voucherData && Array.isArray(voucherData.childrenDetails)) {
          const detail = voucherData.childrenDetails.find(d => 
            String(d.admNo) === String(st.rollNumber) || 
            String(d.admNo) === String(st.rollNo) ||
            d.id === st.id ||
            d.name?.toLowerCase() === st.name?.toLowerCase()
          );
          if (detail) {
            feeAmt = Number(detail.fee || feeAmt);
            arrAmt = Number(detail.arrears || 0);
            annAmt = Number(detail.annualFee || 0);
          }
        }

        const childTotal = feeAmt + arrAmt + annAmt;
        grandTotal += childTotal;

        // Row background (alternate)
        if (i % 2 === 1) {
          doc.rect(30, currentY, width, rowHeight).fill('#f7fafc');
          doc.fillColor('black');
        }

        // Row borders
        doc.rect(30, currentY, width, rowHeight).stroke('#cbd5e0');
        doc.moveTo(col2X, currentY).lineTo(col2X, currentY + rowHeight).stroke('#cbd5e0');
        doc.moveTo(col3X, currentY).lineTo(col3X, currentY + rowHeight).stroke('#cbd5e0');
        doc.moveTo(col4X, currentY).lineTo(col4X, currentY + rowHeight).stroke('#cbd5e0');
        doc.moveTo(col5X, currentY).lineTo(col5X, currentY + rowHeight).stroke('#cbd5e0');
        doc.moveTo(col6X, currentY).lineTo(col6X, currentY + rowHeight).stroke('#cbd5e0');

        const admNo = st.rollNumber || st.rollNo || st.admissionNo || 'N/A';
        doc.text(admNo, col1X, currentY + 6, { width: col1W, align: 'center' });
        doc.text(st.name || 'Student', col2X + 4, currentY + 6, { width: col2W - 8 });
        doc.text(String(st.class || st.className || 'N/A'), col3X, currentY + 6, { width: col3W, align: 'center' });
        doc.text(feeAmt > 0 ? feeAmt.toLocaleString() : '0', col4X, currentY + 6, { width: col4W, align: 'right' });
        doc.text(arrAmt > 0 ? arrAmt.toLocaleString() : '0', col5X, currentY + 6, { width: col5W, align: 'right' });
        doc.font('Helvetica-Bold').text(childTotal > 0 ? childTotal.toLocaleString() : '0', col6X, currentY + 6, { width: col6W - 4, align: 'right' });
        doc.font('Helvetica');

        currentY += rowHeight;
      }

      // Total Payable Bar
      currentY += 8;
      doc.rect(30, currentY, width, 22).fill('#edf2f7');
      doc.fillColor('black').font('Helvetica-Bold').fontSize(10);
      doc.text('TOTAL PAYABLE (ALL CHILDREN):', 30, currentY + 6, { width: col5X - 35, align: 'right' });
      doc.text(`Rs. ${grandTotal.toLocaleString()}/-`, col5X, currentY + 6, { width: rightEdge - col5X - 5, align: 'right' });
      doc.rect(30, currentY, width, 22).stroke('#4a5568');

      // Footer note
      doc.moveDown(2);
      doc.font('Helvetica').fontSize(8).fillColor('#718096')
         .text('Note: This is a computer-generated voucher valid at school accounts office and authorized online banking portal.', 30, doc.y, { align: 'center', width });

      doc.end();
    } catch(err) {
      reject(err);
    }
  });
}

// ---------------------------------------------------------------------------
// 7. Dynamic School Menu Template
// ---------------------------------------------------------------------------
function buildSchoolMenuText(schoolName = 'TaleemiDunya Pro', isVerified = false, childrenNames = '') {
  const name = String(schoolName || 'TaleemiDunya Pro').trim();
  const greeting = isVerified && childrenNames 
    ? `Assalam-o-Alaikum! Welcome back. (Linked: *${childrenNames}*)`
    : `Assalam-o-Alaikum! Main aapka 24/7 AI Smart Assistant hun.`;

  return `🏫 *${name.toUpperCase()}* 🎓
${greeting}

👇 *Main Menu - Reply with a number (1 - 7):*

1️⃣ *Fee Voucher & Dues* (All linked children)
2️⃣ *Student Attendance* (Daily & monthly report)
3️⃣ *Daily Diary & Homework* (Today's syllabus)
4️⃣ *Exam Results & Marks* (Latest assessments)
5️⃣ *Datesheet & Holidays* (Academic schedule)
6️⃣ *New Admission Inquiry* (Dakhla details)
7️⃣ *Contact School Admin* (Helpline & complaints)

💡 *(Type *menu* or *0* anytime to return to this menu)*`;
}

// ---------------------------------------------------------------------------
// 8. Single Connection Lifecycle Controller & Process Lease
// ---------------------------------------------------------------------------
const sessions = new Map();       // schoolId -> sock
const qrCodes = new Map();        // schoolId -> qrDataUrl
const schoolRules = new Map();     // schoolId -> rules array
const connectionStates = new Map(); // schoolId -> { status, lastConnected, lastDisconnected, disconnectReason, attempts }
const reconnectTimers = new Map(); // schoolId -> timerId

const LOCK_DIR = path.join(__dirname, 'auth_sessions');
const MY_PID = process.pid;

function setConnectionState(schoolId, status, extra = {}) {
  const prev = connectionStates.get(schoolId) || {
    status: 'DISCONNECTED',
    lastConnected: null,
    lastDisconnected: null,
    disconnectReason: null,
    attempts: 0
  };
  connectionStates.set(schoolId, {
    ...prev,
    status,
    ...extra
  });
}

function getConnectionStatus(schoolId) {
  return connectionStates.get(schoolId) || {
    status: sessions.has(schoolId) ? 'CONNECTED' : (qrCodes.has(schoolId) ? 'QR_READY' : 'DISCONNECTED'),
    attempts: 0
  };
}

function acquireLock(schoolId) {
  const lockPath = path.join(LOCK_DIR, `.lock_${schoolId}`);
  try {
    if (!fs.existsSync(LOCK_DIR)) fs.mkdirSync(LOCK_DIR, { recursive: true });
    if (fs.existsSync(lockPath)) {
      const lockData = JSON.parse(fs.readFileSync(lockPath, 'utf8'));
      const age = Date.now() - (lockData.timestamp || 0);
      // Lock is owned by another process and is fresh (< 20 seconds)
      if (lockData.pid !== MY_PID && age < 20000) {
        console.log(`🔒 [LOCK HELD] PID ${lockData.pid} owns WhatsApp socket for ${schoolId} (age ${Math.round(age/1000)}s). Standing by.`);
        return false;
      }
    }
    fs.writeFileSync(lockPath, JSON.stringify({ pid: MY_PID, timestamp: Date.now() }));
    return true;
  } catch(e) {
    return true;
  }
}

function renewLock(schoolId) {
  const lockPath = path.join(LOCK_DIR, `.lock_${schoolId}`);
  try {
    fs.writeFileSync(lockPath, JSON.stringify({ pid: MY_PID, timestamp: Date.now() }));
  } catch(e) {}
}

function releaseLock(schoolId) {
  const lockPath = path.join(LOCK_DIR, `.lock_${schoolId}`);
  try {
    if (fs.existsSync(lockPath)) {
      const lockData = JSON.parse(fs.readFileSync(lockPath, 'utf8'));
      if (lockData.pid === MY_PID) fs.unlinkSync(lockPath);
    }
  } catch(e) {}
}

// Clear any pending reconnect timer for a school
function cancelReconnectTimer(schoolId) {
  if (reconnectTimers.has(schoolId)) {
    clearTimeout(reconnectTimers.get(schoolId));
    reconnectTimers.delete(schoolId);
  }
}

// ---------------------------------------------------------------------------
// 8B. Authoritative WhatsApp Identity Resolution & Cache Warmup
// ---------------------------------------------------------------------------
async function warmupSchoolParentLids(schoolId, sock) {
  if (!sock || !db || !schoolId) return;
  try {
    const snap = await db.collection('students').where('schoolId', '==', schoolId).get();
    const phones = new Set();
    snap.forEach(d => {
      const st = d.data();
      const status = String(st.status || 'Active').toLowerCase();
      if (['inactive', 'transferred', 'deleted', 'withdrawn', 'struck_off', 'passout', 'alumni'].includes(status) || st.isActive === false) return;
      [st.parentPhone, st.phone, st.fatherPhone, st.motherPhone, st.whatsappNumber, st.guardianPhone, st.mobileNumber].forEach(p => {
        const norm = normalizePhone(p);
        if (norm && isValidPhone(norm)) phones.add(norm);
      });
    });

    if (phones.size === 0) return;
    const phoneArr = Array.from(phones);
    console.log(`🔄 [LID WARMUP] Querying onWhatsApp for ${phoneArr.length} registered parent phones for "${schoolId}"...`);
    for (let i = 0; i < phoneArr.length; i += 20) {
      const chunk = phoneArr.slice(i, i + 20);
      try {
        const results = await sock.onWhatsApp(...chunk);
        if (Array.isArray(results)) {
          for (const res of results) {
            if (res.exists && res.lid) {
              registerLidPhoneMapping(res.lid, res.jid);
            }
          }
        }
      } catch (ce) {}
    }
    console.log(`✅ [LID WARMUP] School "${schoolId}" parent LID cache warmup complete.`);
  } catch(e) {
    console.warn(`⚠️ School parent LID cache warmup warning:`, e.message);
  }
}

async function tryResolveLidViaSchoolContacts(schoolId, lidKey, sock) {
  if (!sock || !db || !schoolId || !lidKey) return null;
  if (lidToPhoneMap.has(lidKey)) {
    return lidToPhoneMap.get(lidKey);
  }

  try {
    const snap = await db.collection('students').where('schoolId', '==', schoolId).get();
    const phones = new Set();
    snap.forEach(d => {
      const st = d.data();
      const status = String(st.status || 'Active').toLowerCase();
      if (['inactive', 'transferred', 'deleted', 'withdrawn', 'struck_off', 'passout', 'alumni'].includes(status) || st.isActive === false) return;
      [st.parentPhone, st.phone, st.fatherPhone, st.motherPhone, st.whatsappNumber, st.guardianPhone, st.mobileNumber].forEach(p => {
        const norm = normalizePhone(p);
        if (norm && isValidPhone(norm)) phones.add(norm);
      });
    });

    if (phones.size === 0) return null;
    const phoneArr = Array.from(phones);
    for (let i = 0; i < phoneArr.length; i += 20) {
      const chunk = phoneArr.slice(i, i + 20);
      try {
        const results = await sock.onWhatsApp(...chunk);
        if (Array.isArray(results)) {
          for (const res of results) {
            if (res.exists && res.lid) {
              registerLidPhoneMapping(res.lid, res.jid);
              const resLidKey = String(res.lid).replace('@lid', '').split('@')[0].split(':')[0].trim();
              if (resLidKey === lidKey) {
                const matched = normalizePhone(res.jid);
                return matched;
              }
            }
          }
        }
      } catch (be) {}
    }
  } catch (e) {
    console.warn('⚠️ tryResolveLidViaSchoolContacts warning:', e.message);
  }
  return null;
}

async function resolveSenderIdentity(msg, schoolId, sock) {
  const correlationId = Math.random().toString(36).substring(2, 9);
  const senderJid = String(msg.key?.remoteJid || '').trim();
  const participantJid = String(msg.key?.participant || '').trim();
  const isLid = senderJid.endsWith('@lid');
  const isPhoneJid = senderJid.endsWith('@s.whatsapp.net') || senderJid.endsWith('@c.us');
  const isGroup = senderJid.endsWith('@g.us');

  let resolvedPhone = null;
  let resolutionSource = 'NONE';

  // Case 1: Direct Phone JID
  if (isPhoneJid) {
    const rawDigits = senderJid.split('@')[0].split(':')[0];
    const norm = normalizePhone(rawDigits);
    if (norm && isValidPhone(norm)) {
      resolvedPhone = norm;
      resolutionSource = 'DIRECT_PHONE_JID';
    }
  }

  // Case 2: LID JID — resolve ONLY via authoritative sources
  if (isLid) {
    const lidKey = senderJid.replace('@lid', '').split('@')[0].split(':')[0].trim();

    // Priority A: Baileys 6.7.23 stanza attribute senderPn (sender_pn)
    const senderPn = msg.key?.senderPn || '';
    if (senderPn && !String(senderPn).endsWith('@lid')) {
      const norm = normalizePhone(senderPn);
      if (norm && isValidPhone(norm)) {
        resolvedPhone = norm;
        resolutionSource = 'KEY_SENDER_PN';
        registerLidPhoneMapping(lidKey, norm);
      }
    }

    // Priority B: Alternate JID (remoteJidAlt / participantAlt)
    if (!resolvedPhone) {
      const altJid = msg.key?.remoteJidAlt || msg.key?.participantAlt || '';
      if (altJid && (altJid.endsWith('@s.whatsapp.net') || altJid.endsWith('@c.us'))) {
        const norm = normalizePhone(altJid);
        if (norm && isValidPhone(norm)) {
          resolvedPhone = norm;
          resolutionSource = 'KEY_ALT_JID';
          registerLidPhoneMapping(lidKey, norm);
        }
      }
    }

    // Priority C: Participant JID in 1-on-1 chat if participant is a phone JID
    if (!resolvedPhone && participantJid && (participantJid.endsWith('@s.whatsapp.net') || participantJid.endsWith('@c.us'))) {
      const norm = normalizePhone(participantJid);
      if (norm && isValidPhone(norm)) {
        resolvedPhone = norm;
        resolutionSource = 'PARTICIPANT_PHONE_JID';
        registerLidPhoneMapping(lidKey, norm);
      }
    }

    // Priority D: Authoritative In-Memory / Persisted LID mapping table
    if (!resolvedPhone && lidToPhoneMap.has(lidKey)) {
      const mapped = lidToPhoneMap.get(lidKey);
      const norm = normalizePhone(mapped);
      if (norm && isValidPhone(norm)) {
        resolvedPhone = norm;
        resolutionSource = 'AUTHORITATIVE_LID_MAP';
      }
    }

    // Priority E: On-demand check against school's registered parent phones via onWhatsApp USync
    if (!resolvedPhone && sock && schoolId) {
      try {
        const onDemandMatch = await tryResolveLidViaSchoolContacts(schoolId, lidKey, sock);
        if (onDemandMatch) {
          resolvedPhone = onDemandMatch;
          resolutionSource = 'ON_DEMAND_USYNC';
        }
      } catch (e) {
        console.warn(`⚠️ On-demand LID resolution warning [${correlationId}]:`, e.message);
      }
    }
  }

  // Sanitized diagnostic logging
  console.log(`🔎 [ID_RESOLVE:${correlationId}] JID: ${maskIdentifier(senderJid)} | Type: ${isLid ? 'LID' : (isPhoneJid ? 'PHONE_JID' : (isGroup ? 'GROUP' : 'OTHER'))} | Source: ${resolutionSource} | Phone: ${resolvedPhone ? maskIdentifier(resolvedPhone) : '[UNRESOLVED]'}`);

  return {
    correlationId,
    senderJid,
    isLid,
    isPhoneJid,
    isGroup,
    resolvedPhone,
    resolutionSource
  };
}

// ---------------------------------------------------------------------------
// 9. Start WhatsApp Session (With Signal Store Caching & Lifecycle Gate)
// ---------------------------------------------------------------------------
async function startWhatsAppSession(schoolId = 'NNRuCtHxQNjISc9EPgMs') {
  cancelReconnectTimer(schoolId);

  const sessionDir = path.join(__dirname, 'auth_sessions', schoolId);
  if (!fs.existsSync(sessionDir)) {
    fs.mkdirSync(sessionDir, { recursive: true });
  }

  // Check Process Lock to prevent split-brain conflicts
  if (!acquireLock(schoolId)) {
    setConnectionState(schoolId, 'STANDBY');
    return null;
  }

  // Cleanly close prior socket if already open in this process
  if (sessions.has(schoolId)) {
    try {
      const old = sessions.get(schoolId);
      old?.ev?.removeAllListeners();
      old?.ws?.close();
      old?.end?.();
    } catch (e) {}
    sessions.delete(schoolId);
  }

  setConnectionState(schoolId, 'CONNECTING');

  try {
    const { state, saveCreds } = await useMultiFileAuthState(sessionDir);
    const { version, isLatest } = await fetchLatestBaileysVersion();
    console.log(`[WA] Initializing Baileys v${version.join('.')} (isLatest: ${isLatest}) for school "${schoolId}"`);

    // Use makeCacheableSignalKeyStore to eliminate Bad MAC & pre-key corruption
    const sock = makeWASocket({
      version,
      auth: {
        creds: state.creds,
        keys: makeCacheableSignalKeyStore(state.keys, { level: 'silent', trace: () => {}, debug: () => {}, info: () => {}, warn: () => {}, error: () => {} })
      },
      printQRInTerminal: false,
      browser: Browsers.ubuntu('Chrome'),
      connectTimeoutMs: 60000,
      defaultQueryTimeoutMs: 60000,
      keepAliveIntervalMs: 20000,
      syncFullHistory: false,
      markOnlineOnConnect: true,
      generateHighQualityLinkPreview: false,
      // Critical: getMessage callback handles retry receipts and eliminates message drop
      getMessage: async (key) => {
        return messageStore.get(key.id) || proto.Message.fromObject({});
      }
    });

    sessions.set(schoolId, sock);

    // Save creds & renew lock
    sock.ev.on('creds.update', () => {
      saveCreds();
      renewLock(schoolId);
    });

    // Populate LID-to-Phone mapping from contact updates & protocol events
    sock.ev.on('contacts.upsert', (contacts) => {
      if (Array.isArray(contacts)) {
        for (const c of contacts) {
          const lid = c.lid || (c.id && c.id.endsWith('@lid') ? c.id : null);
          const phone = c.jid || (c.id && !c.id.endsWith('@lid') ? c.id : null) || c.phoneNumber;
          if (lid && phone) registerLidPhoneMapping(lid, phone);
        }
      }
    });

    sock.ev.on('contacts.update', (updates) => {
      if (Array.isArray(updates)) {
        for (const u of updates) {
          const lid = u.lid || (u.id && u.id.endsWith('@lid') ? u.id : null);
          const phone = u.jid || (u.id && !u.id.endsWith('@lid') ? u.id : null) || u.phoneNumber;
          if (lid && phone) registerLidPhoneMapping(lid, phone);
        }
      }
    });

    sock.ev.on('messaging-history.set', ({ contacts }) => {
      if (Array.isArray(contacts)) {
        for (const c of contacts) {
          const lid = c.lid || (c.id && c.id.endsWith('@lid') ? c.id : null);
          const phone = c.jid || (c.id && !c.id.endsWith('@lid') ? c.id : null) || c.phoneNumber;
          if (lid && phone) registerLidPhoneMapping(lid, phone);
        }
      }
    });

    sock.ev.on('chats.phoneNumberShare', ({ lid, jid }) => {
      if (lid && jid) {
        registerLidPhoneMapping(lid, jid);
      }
    });

    // Connection Lifecycle Handler
    sock.ev.on('connection.update', async (update) => {
      const { connection, lastDisconnect, qr } = update;

      if (qr) {
        const qrDataUrl = await qrcode.toDataURL(qr);
        qrCodes.set(schoolId, qrDataUrl);
        setConnectionState(schoolId, 'AUTHENTICATION_REQUIRED');
        console.log(`📱 [QR GENERATED] School: ${schoolId} - Fresh Multi-Device QR Ready.`);
      }

      if (connection === 'open') {
        qrCodes.delete(schoolId);
        cancelReconnectTimer(schoolId);
        setConnectionState(schoolId, 'CONNECTED', {
          lastConnected: new Date().toISOString(),
          attempts: 0
        });
        renewLock(schoolId);
        console.log(`🟢 [CONNECTED] School "${schoolId}" WhatsApp Device Linked & Active 24/7!`);

        // Warm up registered parent LIDs in the background via onWhatsApp USync
        setTimeout(() => {
          warmupSchoolParentLids(schoolId, sock).catch(() => {});
        }, 5000);
      }

      if (connection === 'close') {
        const statusCode = (lastDisconnect?.error)?.output?.statusCode;
        const errMessage = lastDisconnect?.error?.message || '';
        const isConflict = statusCode === 440 || errMessage.includes('conflict');
        const isQrTimeout = statusCode === 408 || errMessage.includes('QR refs attempts ended');
        const isLoggedOut = statusCode === DisconnectReason.loggedOut;

        console.log(`🔴 [DISCONNECTED] School: ${schoolId} | Code: ${statusCode} | Reason: ${errMessage}`);
        setConnectionState(schoolId, 'DISCONNECTED', {
          lastDisconnected: new Date().toISOString(),
          disconnectReason: `Code ${statusCode}: ${errMessage}`
        });

        // 1. If QR timed out (nobody scanned within 5 cycles) -> Stop loop! Set AUTHENTICATION_REQUIRED
        if (isQrTimeout) {
          console.log(`⏸️ [AUTH REQUIRED] QR code expired after 5 cycles. Stopping reconnect loop until user action.`);
          setConnectionState(schoolId, 'AUTHENTICATION_REQUIRED');
          sessions.delete(schoolId);
          releaseLock(schoolId);
          return;
        }

        // 2. If explicitly logged out by user on mobile app
        if (isLoggedOut) {
          console.log(`⚠️ [LOGGED OUT] Session terminated by device. Resetting session folder.`);
          setConnectionState(schoolId, 'AUTHENTICATION_REQUIRED');
          sessions.delete(schoolId);
          qrCodes.delete(schoolId);
          releaseLock(schoolId);
          try {
            if (fs.existsSync(sessionDir)) fs.rmSync(sessionDir, { recursive: true, force: true });
          } catch(e) {}
          return;
        }

        // 3. Transient Network / WebSocket drop -> Bounded exponential backoff with jitter
        const currentState = connectionStates.get(schoolId) || {};
        const attempts = (currentState.attempts || 0) + 1;
        // Exponential backoff capped at 60s + random jitter
        const baseDelay = isConflict ? 20000 : Math.min(2000 * Math.pow(1.5, attempts), 60000);
        const jitter = Math.floor(Math.random() * 2000);
        const delay = baseDelay + jitter;

        setConnectionState(schoolId, 'RECONNECTING', { attempts });
        console.log(`🔄 [RETRY] Reconnecting "${schoolId}" in ${Math.round(delay/1000)}s (Attempt #${attempts})...`);

        if (isConflict) releaseLock(schoolId);

        cancelReconnectTimer(schoolId);
        const timerId = setTimeout(async () => {
          try {
            await startWhatsAppSession(schoolId);
          } catch(reErr) {
            console.error(`Reconnect error for ${schoolId}:`, reErr.message);
          }
        }, delay);
        reconnectTimers.set(schoolId, timerId);
      }
    });

    // Incoming Messages Pipeline
    sock.ev.on('messages.upsert', async ({ messages, type }) => {
      if (type !== 'notify') return;

      for (const msg of messages) {
        if (!msg.message || msg.key.fromMe) continue;

        const msgId = msg.key.id;
        if (isMessageProcessed(msgId)) {
          console.log(`⚡ [DEDUP] Skipping duplicate message ID: ${msgId}`);
          continue;
        }

        // Save incoming message in store for retry receipts
        saveMessageToStore(msgId, msg.message);

        const senderJid = String(msg.key.remoteJid || '').trim();
        // Skip group messages, status broadcasts, and channel newsletters
        if (!senderJid || senderJid.endsWith('@g.us') || senderJid === 'status@broadcast' || senderJid.endsWith('@broadcast') || senderJid.endsWith('@newsletter')) {
          continue;
        }

        // Authoritatively resolve sender identity
        const senderIdentity = await resolveSenderIdentity(msg, schoolId, sock);

        // Unwrap interactive / button / ephemeral messages
        const msgObj = msg.message.ephemeralMessage?.message || msg.message.viewOnceMessage?.message || msg.message;
        let incomingText = '';

        if (msgObj.interactiveResponseMessage?.nativeFlowResponseMessage?.paramsJson) {
          try {
            const params = JSON.parse(msgObj.interactiveResponseMessage.nativeFlowResponseMessage.paramsJson);
            incomingText = params.id || '';
          } catch(e){}
        } else {
          incomingText = (
            msgObj.conversation ||
            msgObj.extendedTextMessage?.text ||
            msgObj.buttonsResponseMessage?.selectedButtonId ||
            msgObj.listResponseMessage?.title ||
            msgObj.listResponseMessage?.singleSelectReply?.selectedRowId ||
            msgObj.templateButtonReplyMessage?.selectedId ||
            msgObj.interactiveResponseMessage?.body?.text ||
            ''
          ).trim();
        }

        if (!incomingText) continue;

        console.log(`\n💬 [MSG RECEIVED:${senderIdentity.correlationId}] From: ${maskIdentifier(senderJid)} (Type: ${senderIdentity.isLid ? 'LID' : 'PHONE_JID'} | Phone: ${senderIdentity.resolvedPhone ? maskIdentifier(senderIdentity.resolvedPhone) : '[UNRESOLVED]'}) | Text: "${incomingText}"`);

        try {
          const aiResponse = await handleAIBotReply(schoolId, senderIdentity, incomingText, senderJid, sock);
          if (aiResponse) {
            let sentMessageInfo = null;
            if (typeof aiResponse === 'object' && aiResponse.type === 'document') {
              sentMessageInfo = await sock.sendMessage(senderJid, { 
                document: aiResponse.document, 
                mimetype: aiResponse.mimetype || 'application/pdf',
                fileName: aiResponse.fileName || 'document.pdf',
                caption: aiResponse.caption || ''
              });
            } else {
              const replyText = typeof aiResponse === 'string' ? aiResponse : (aiResponse.text || String(aiResponse));
              // WhatsApp character limit safety: split if > 4000 characters
              if (replyText.length > 4000) {
                const chunks = replyText.match(/[\s\S]{1,3800}/g) || [replyText];
                for (const chunk of chunks) {
                  sentMessageInfo = await sock.sendMessage(senderJid, { text: chunk });
                }
              } else {
                sentMessageInfo = await sock.sendMessage(senderJid, { text: replyText });
              }
            }

            if (sentMessageInfo && sentMessageInfo.key && sentMessageInfo.message) {
              saveMessageToStore(sentMessageInfo.key.id, sentMessageInfo.message);
            }
            console.log(`🤖 [AI REPLY SENT:${senderIdentity.correlationId}] To: ${maskIdentifier(senderJid)}`);
          }
        } catch (err) {
          console.error(`❌ [AI BOT ERROR:${senderIdentity.correlationId}]`, err.message);
          try {
            await sock.sendMessage(senderJid, { 
              text: 'Maafi chahta hun! System busy hai. Barah-e-karam thodi der baad dobara try karein ya "menu" likhein.' 
            });
          } catch(e2) {}
        }
      }
    });

    return sock;
  } catch (initErr) {
    console.error(`❌ Failed to start WhatsApp session for ${schoolId}:`, initErr.message);
    setConnectionState(schoolId, 'ERROR', { disconnectReason: initErr.message });
    return null;
  }
}

// ---------------------------------------------------------------------------
// 10. AI Auto-Reply Engine: Parent Verification & Smart Family Routing
// ---------------------------------------------------------------------------
const verifiedFamilies = new Map(); // cleanPhone -> { schoolId, students: [], parentName, verifiedAt }
const schoolNamesCache = new Map();
const schoolDetailsCache = new Map();

async function getSchoolDetails(schoolId) {
  if (schoolDetailsCache.has(schoolId)) return schoolDetailsCache.get(schoolId);
  const fallback = {
    name: 'Smart Angels Grammar School',
    phone: '0300-1234567',
    address: 'Main Campus, Karachi',
    logo: null
  };
  if (!db) return fallback;

  try {
    const doc = await db.collection('schools').doc(schoolId).get();
    if (doc.exists) {
      const data = doc.data();
      const details = {
        name: data.name || data.schoolName || fallback.name,
        phone: data.phone || data.contact || data.eServices?.website?.contactPhone || data.eServices?.whatsApp?.phoneNumber || fallback.phone,
        address: data.address || data.eServices?.website?.address || fallback.address,
        logo: data.logo || null
      };
      schoolDetailsCache.set(schoolId, details);
      return details;
    }
  } catch(e) {
    console.error("Error fetching school details:", e.message);
  }
  return fallback;
}

// Intent Classification Helper
function detectIntent(text = '') {
  const lower = String(text || '').toLowerCase().trim();
  
  if (['0', 'menu', 'options', 'help', 'start', 'wapas', 'main menu', 'salam', 'assalam', 'assalam-o-alaikum', 'aoa', 'hello', 'hi', 'hey'].includes(lower) ||
      lower.startsWith('menu') || lower.startsWith('wapas') || lower.startsWith('salam') || lower.startsWith('assalam')) {
    return 'MENU';
  }
  if (['1', 'one', '1️⃣'].includes(lower) || 
      /\b(fee|fees|challan|voucher|dues|balance|paise|pese|kitni fee|fee kitni|baqi|bqaya)\b/i.test(lower)) {
    return 'FEES';
  }
  if (['2', 'two', '2️⃣'].includes(lower) || 
      /\b(attendance|hazri|haziri|present|absent|chutti|aya tha|school aya)\b/i.test(lower)) {
    return 'ATTENDANCE';
  }
  if (['3', 'three', '3️⃣'].includes(lower) || 
      /\b(diary|homework|dairee|kam|aaj ka kam|syllabus)\b/i.test(lower)) {
    return 'HOMEWORK';
  }
  if (['4', 'four', '4️⃣'].includes(lower) || 
      /\b(result|results|exam|exams|marks|number|grade|report card)\b/i.test(lower)) {
    return 'RESULTS';
  }
  if (['5', 'five', '5️⃣'].includes(lower) || 
      /\b(datesheet|date sheet|holiday|holidays|chuttiyan|vacation|schedule)\b/i.test(lower)) {
    return 'DATESHEET';
  }
  if (['6', 'six', '6️⃣'].includes(lower) || 
      /\b(admission|admissions|dakhla|dakhlay|prospectus|apply)\b/i.test(lower)) {
    return 'ADMISSIONS';
  }
  if (['7', 'seven', '7️⃣'].includes(lower) || 
      /\b(contact|admin|principal|office|rabta|complaint|shikayat|helpline|phone)\b/i.test(lower)) {
    return 'CONTACT';
  }
  return 'GENERAL';
}

async function handleAIBotReply(schoolId, senderInfo, queryText, originalJid, sock) {
  let senderPhone = '';
  let isLid = false;
  let correlationId = '';

  if (senderInfo && typeof senderInfo === 'object') {
    senderPhone = senderInfo.resolvedPhone || '';
    isLid = !!senderInfo.isLid;
    correlationId = senderInfo.correlationId || '';
  } else {
    senderPhone = String(senderInfo || '').trim();
    if (senderPhone.endsWith('@lid')) {
      isLid = true;
      senderPhone = ''; // Never treat arbitrary LID digits as a phone number!
    }
  }

  const school = await getSchoolDetails(schoolId);
  const normalizedSender = senderPhone ? normalizePhone(senderPhone) : '';
  const intent = detectIntent(queryText);
  const lower = queryText.toLowerCase().trim();

  // -------------------------------------------------------------------------
  // Step A: Public Options (Accessible without registration)
  // -------------------------------------------------------------------------
  if (intent === 'ADMISSIONS') {
    return `🎓 *NEW ADMISSIONS INQUIRY*\n\n` +
           `🌟 *${school.name.toUpperCase()}* mein Admissions OPEN hain!\n\n` +
           `📋 *Admission Requirements:*\n` +
           `• Student B-Form / Birth Certificate copy\n` +
           `• 4 Passport Size Photographs\n` +
           `• Father / Guardian CNIC Copy\n` +
           `• Previous School Leaving Certificate (SLC)\n\n` +
           `🕒 *Office Test Timings:* Monday to Saturday (9:00 AM - 1:00 PM)\n` +
           `📞 *Admission Helpline:* ${school.phone}\n\n` +
           `🔙 *(Type *0* or *menu* to return)*`;
  }

  if (intent === 'CONTACT') {
    return `📞 *CONTACT SCHOOL ADMINISTRATION*\n\n` +
           `🏫 *${school.name}*\n` +
           `🕒 *Office Timings:* Monday to Saturday (8:00 AM - 2:00 PM)\n` +
           `📍 *Campus Address:* ${school.address}\n` +
           `📱 *Principal / Admin Helpline:* ${school.phone}\n\n` +
           `📝 *Complaints & Queries:* Kisi bhi maloomat ya maslay ke liye school office hours mein call karein ya is number par rabta farmayein.\n\n` +
           `🔙 *(Type *0* or *menu* to return)*`;
  }

  // -------------------------------------------------------------------------
  // Step B: Authenticate Registered Parent & Retrieve Full Family Context
  // -------------------------------------------------------------------------
  let family = normalizedSender ? verifiedFamilies.get(normalizedSender) : null;

  // Check in-memory cache validity (24 hours)
  if (normalizedSender && isValidPhone(normalizedSender)) {
    if (!family || (Date.now() - family.verifiedAt > 86400000)) {
      let matchedStudents = [];
      let parentName = '';

      if (db) {
        try {
          const studentsSnap = await db.collection('students')
            .where('schoolId', '==', schoolId)
            .get();

          studentsSnap.forEach(doc => {
            const st = { id: doc.id, ...doc.data() };

            // Tenant isolation & Active status validation
            if (st.schoolId && st.schoolId !== schoolId) return;
            const stStatus = String(st.status || 'Active').toLowerCase();
            if (['inactive', 'transferred', 'deleted', 'withdrawn', 'struck_off', 'passout', 'alumni'].includes(stStatus) || st.isActive === false) {
              return;
            }

            const contactFields = [
              st.parentPhone, st.phone, st.fatherPhone, st.motherPhone,
              st.guardianPhone, st.whatsappNumber, st.emergencyContact,
              st.contactNumber, st.mobileNumber
            ].filter(Boolean);

            // Strict exact matching: only complete normalized phone numbers
            const matches = contactFields.some(p => {
              const pNorm = normalizePhone(p);
              return pNorm && pNorm === normalizedSender;
            });

            if (matches) {
              matchedStudents.push(st);
              if (!parentName) parentName = st.fatherName || st.guardianName || st.motherName || '';
            }
          });

          // Also check if school has a linked parents collection if no direct match in student records
          if (matchedStudents.length === 0) {
            try {
              const parentsSnap = await db.collection('parents')
                .where('schoolId', '==', schoolId)
                .get();

              let matchedParentDoc = null;
              parentsSnap.forEach(pDoc => {
                const pData = pDoc.data();
                const pPhones = [pData.phone, pData.whatsapp, pData.contactNumber, pData.mobile, pData.fatherPhone, pData.motherPhone].filter(Boolean);
                if (pPhones.some(ph => normalizePhone(ph) === normalizedSender)) {
                  matchedParentDoc = pData;
                }
              });

              if (matchedParentDoc) {
                parentName = matchedParentDoc.name || matchedParentDoc.fatherName || '';
                const childIds = matchedParentDoc.studentIds || matchedParentDoc.childrenIds || [];
                for (const cId of childIds) {
                  const sDoc = await db.collection('students').doc(cId).get();
                  if (sDoc.exists) {
                    const sData = { id: sDoc.id, ...sDoc.data() };
                    const sStatus = String(sData.status || 'Active').toLowerCase();
                    if (!['inactive', 'transferred', 'deleted', 'withdrawn', 'struck_off', 'passout', 'alumni'].includes(sStatus) && sData.isActive !== false && sData.schoolId === schoolId) {
                      matchedStudents.push(sData);
                    }
                  }
                }
              }
            } catch (pe) {}
          }
        } catch (dbErr) {
          console.error('Firestore parent lookup error:', dbErr.message);
        }
      }

      if (matchedStudents.length > 0) {
        family = {
          schoolId,
          students: matchedStudents,
          parentName: parentName || 'Respected Parent',
          verifiedAt: Date.now()
        };
        verifiedFamilies.set(normalizedSender, family);
        console.log(`✅ [PARENT VERIFIED:${correlationId || 'N/A'}] Phone: ${maskIdentifier(normalizedSender)} -> ${matchedStudents.length} Children (${matchedStudents.map(c => c.name).join(', ')})`);
      } else {
        verifiedFamilies.delete(normalizedSender);
        family = null;
      }
    }
  }

  // -------------------------------------------------------------------------
  // Step C: Security Gate for Unregistered Contacts & Unresolved LIDs
  // -------------------------------------------------------------------------
  if (!family) {
    const reason = !normalizedSender ? (isLid ? 'UNRESOLVED_LID' : 'INVALID_PHONE') : 'UNREGISTERED_PHONE';
    console.log(`🛡️ [ACCESS DENIED:${correlationId || 'N/A'}] Reason: ${reason} | Sender: ${maskIdentifier(normalizedSender || originalJid)}`);

    const numberDisplay = normalizedSender ? ` (+${normalizedSender})` : '';

    return `Assalam-o-Alaikum! Aap ka WhatsApp account${numberDisplay} hamare school record mein registered nahi mila.\n\n` +
           `🛡️ *Student Privacy Protection:*\n` +
           `Bacho ki confidential information (Fees, Attendance, Results) ki hifazat ke liye TaleemiDunya AI Assistant sirf verified parent contacts ko direct access deta hai.\n\n` +
           `Barah-e-karam school administration se rabta karein aur apna registered mobile number verify karwa lein:\n` +
           `📞 *School Admin Helpline:* ${school.phone}\n` +
           `📍 *Campus:* ${school.address}\n\n` +
           `💡 *Available Public Options:*\n` +
           `6️⃣ New Admission Inquiry\n` +
           `7️⃣ Contact Administration`;
  }

  // -------------------------------------------------------------------------
  // Step D: Authorized Registered Parent Flow
  // -------------------------------------------------------------------------
  const children = family.students;
  const childrenNames = children.map(c => c.name).join(', ');

  // 1. Menu request
  if (intent === 'MENU') {
    return buildSchoolMenuText(school.name, true, childrenNames);
  }

  // 2. Fee Voucher & Dues (All Linked Children)
  if (intent === 'FEES') {
    let unpaidVouchers = [];
    if (db) {
      try {
        const vSnap = await db.collection('vouchers')
          .where('schoolId', '==', schoolId)
          .where('status', '==', 'Unpaid')
          .get();
        vSnap.forEach(d => unpaidVouchers.push({ id: d.id, ...d.data() }));
      } catch (e) {
        console.warn('Voucher fetch warning:', e.message);
      }
    }

    let combinedOutstanding = 0;
    let feeBreakdownText = `📋 *OFFICIAL FAMILY FEE REPORT* 🔒\n` +
                           `🏫 *${school.name.toUpperCase()}*\n` +
                           `📅 *Date:* ${new Date().toLocaleDateString('en-GB')}\n` +
                           `👤 *Parent / Guardian:* ${family.parentName}\n` +
                           `👨‍👧‍👦 *Authorized Children:* ${children.length}\n` +
                           `---------------------------------------------\n`;

    let matchedVoucherDoc = null;

    for (const child of children) {
      let monthlyFee = Number(child.monthlyFee || child.tuitionFee || 0);
      let arrears = 0;
      let annualFee = 0;
      let childTotal = monthlyFee;
      let vNo = 'Pending';
      let vDue = '10th of this month';

      for (const v of unpaidVouchers) {
        if (v.childrenDetails && Array.isArray(v.childrenDetails)) {
          const match = v.childrenDetails.find(d => 
            String(d.admNo) === String(child.rollNumber) || 
            String(d.admNo) === String(child.rollNo) ||
            d.id === child.id ||
            d.name?.toLowerCase() === child.name?.toLowerCase()
          );
          if (match) {
            matchedVoucherDoc = v;
            monthlyFee = Number(match.fee || monthlyFee);
            arrears = Number(match.arrears || 0);
            annualFee = Number(match.annualFee || 0);
            childTotal = monthlyFee + arrears + annualFee;
            vNo = v.voucherNo || vNo;
            vDue = v.dueDate || vDue;
            break;
          }
        }
      }

      combinedOutstanding += childTotal;

      feeBreakdownText += `\n👤 *Student:* ${child.name}\n` +
                          `🏫 *Class:* ${child.class || 'N/A'}-${child.section || 'A'} | *Roll:* ${child.rollNumber || child.rollNo || 'N/A'}\n` +
                          `💵 *Monthly Fee:* Rs. ${monthlyFee.toLocaleString()}/-\n` +
                          (arrears > 0 ? `⏳ *Previous Arrears:* Rs. ${arrears.toLocaleString()}/-\n` : '') +
                          (annualFee > 0 ? `🎒 *Annual Fund:* Rs. ${annualFee.toLocaleString()}/-\n` : '') +
                          `📌 *Payable for ${child.name}:* Rs. ${childTotal.toLocaleString()}/-\n`;
    }

    feeBreakdownText += `\n---------------------------------------------\n` +
                        `💰 *TOTAL FAMILY OUTSTANDING: Rs. ${combinedOutstanding.toLocaleString()}/-*\n` +
                        `📅 *Due Date:* ${matchedVoucherDoc?.dueDate || '10th of this month'}\n\n` +
                        `ℹ️ *Payment Instructions:* Fee school accounts office mein ya bank transfer ke zariye submit karwayein. Official PDF Challan attached hai.\n\n` +
                        `🔙 *(Type *0* or *menu* to return)*`;

    // Fetch School Logo buffer for PDF
    let logoBuffer = null;
    if (school.logo) {
      try {
        const logoRes = await fetch(school.logo);
        if (logoRes.ok) logoBuffer = Buffer.from(await logoRes.arrayBuffer());
      } catch(e) {}
    }

    try {
      const pdfBuffer = await generateFamilyVoucherPDF(children, school.name, matchedVoucherDoc, logoBuffer);
      return {
        type: 'document',
        document: pdfBuffer,
        mimetype: 'application/pdf',
        fileName: `Fee_Voucher_${family.parentName.replace(/\s+/g, '_')}.pdf`,
        caption: feeBreakdownText
      };
    } catch (pdfErr) {
      console.error('Family PDF Generation Error:', pdfErr.message);
      return feeBreakdownText;
    }
  }

  // 3. Student Attendance (All Linked Children)
  if (intent === 'ATTENDANCE') {
    let report = `📅 *REAL-TIME ATTENDANCE REPORT* 🔒\n` +
                 `🏫 *${school.name.toUpperCase()}*\n` +
                 `---------------------------------------------\n`;

    const todayStr = new Date().toISOString().split('T')[0];

    for (const child of children) {
      let totalDays = 0;
      let presentCount = 0;
      let absentCount = 0;
      let leaveCount = 0;
      let todayRecordStatus = null;

      if (db) {
        try {
          const attSnap = await db.collection('attendance')
            .where('schoolId', '==', schoolId)
            .where('studentId', '==', child.id)
            .get();

          attSnap.forEach(d => {
            const data = d.data();
            totalDays++;
            const s = (data.status || '').toLowerCase();
            if (s === 'present') presentCount++;
            else if (s === 'absent') absentCount++;
            else if (s === 'leave') leaveCount++;
            if (data.date === todayStr) {
              todayRecordStatus = data.status;
            }
          });
        } catch(e) {}
      }

      let todayDisplay = 'Record Pending ⏳';
      if (todayRecordStatus) {
        const s = todayRecordStatus.toLowerCase();
        if (s === 'present') todayDisplay = 'Present ✅';
        else if (s === 'absent') todayDisplay = 'Absent ❌';
        else if (s === 'leave') todayDisplay = 'On Leave 📝';
        else todayDisplay = `${todayRecordStatus} 📋`;
      }

      report += `\n👤 *Student:* ${child.name}\n` +
                `🏫 *Class:* ${child.class || 'N/A'}-${child.section || 'A'} | *Roll:* ${child.rollNumber || child.rollNo || 'N/A'}\n`;

      if (totalDays > 0) {
        const pct = Math.round((presentCount / totalDays) * 100);
        report += `📊 *Monthly Attendance:* ${pct}%\n` +
                  `✅ *Days Present:* ${presentCount} Days\n` +
                  `❌ *Days Absent:* ${absentCount} Days\n` +
                  (leaveCount > 0 ? `📝 *Approved Leaves:* ${leaveCount} Days\n` : '') +
                  `🕒 *Today Status:* ${todayDisplay}\n`;
      } else {
        report += `📊 *Attendance Summary:* Is mahine ka hazri record registry mein update ho raha hai.\n` +
                  `🕒 *Today Status:* ${todayDisplay}\n`;
      }
    }

    report += `\n---------------------------------------------\n` +
              `ℹ️ *Details:* Attendance biometric portal aur class teacher registry se directly verified hai.\n\n` +
              `🔙 *(Type *0* or *menu* to return)*`;
    return report;
  }

  // 4. Daily Diary & Homework (All Linked Children)
  if (intent === 'HOMEWORK') {
    let report = `📚 *DAILY DIARY & HOMEWORK* 🔒\n` +
                 `🏫 *${school.name.toUpperCase()}*\n` +
                 `📅 *Date:* ${new Date().toLocaleDateString('en-GB')}\n` +
                 `---------------------------------------------\n`;

    for (const child of children) {
      const cls = child.class || child.className || '';
      let hwItems = [];

      if (db) {
        try {
          const hwSnap = await db.collection('homework')
            .where('schoolId', '==', schoolId)
            .get();

          hwSnap.forEach(d => {
            const h = d.data();
            const hCls = h.className || h.class || '';
            const hSec = h.section || '';
            const matchClass = !hCls || hCls.toLowerCase() === cls.toLowerCase();
            const matchSection = !hSec || !child.section || hSec.toLowerCase() === (child.section || '').toLowerCase();
            if (matchClass && matchSection) {
              hwItems.push(h);
            }
          });
        } catch(e) {}
      }

      report += `\n👤 *Student:* ${child.name} (Class: ${cls}-${child.section || 'A'})\n`;
      if (hwItems.length > 0) {
        hwItems.sort((a, b) => (b.assignedDate || '').localeCompare(a.assignedDate || ''));
        hwItems.slice(0, 3).forEach(h => {
          report += `• *${h.subject || 'General'}:* ${h.task || h.description || h.title || 'Complete assigned work'}${h.assignedDate ? ` (${h.assignedDate})` : ''}\n`;
        });
      } else {
        report += `• *Status:* Aaj ka koi digital diary work portal par publish nahi hua. Barah-e-karam physical notebook check karein.\n`;
      }
    }

    report += `\n---------------------------------------------\n` +
              `🔙 *(Type *0* or *menu* to return)*`;
    return report;
  }

  // 5. Exam Results & Report Card (All Linked Children)
  if (intent === 'RESULTS') {
    let report = `📊 *OFFICIAL EXAM RESULTS & REPORT CARD* 🔒\n` +
                 `🏫 *${school.name.toUpperCase()}*\n` +
                 `---------------------------------------------\n`;

    for (const child of children) {
      let resultItems = [];
      let examTitle = 'Latest Assessment';

      if (db) {
        try {
          const resSnap = await db.collection('results')
            .where('schoolId', '==', schoolId)
            .where('studentId', '==', child.id)
            .limit(10)
            .get();

          resSnap.forEach(d => {
            const r = d.data();
            examTitle = r.examName || r.examId || r.term || examTitle;
            resultItems.push(r);
          });
        } catch(e) {}
      }

      report += `\n👤 *Student:* ${child.name} (Class: ${child.class || 'N/A'}-${child.section || 'A'})\n` +
                `🏆 *Exam:* ${examTitle}\n`;

      if (resultItems.length > 0) {
        let totalObt = 0;
        let totalMax = 0;
        resultItems.forEach(r => {
          const obt = Number(r.obtainedMarks || 0);
          const tot = Number(r.totalMarks || 100);
          totalObt += obt;
          totalMax += tot;
          const pctSub = tot > 0 ? (obt / tot) : 0;
          const defaultGrade = pctSub >= 0.8 ? 'A+' : pctSub >= 0.7 ? 'A' : pctSub >= 0.6 ? 'B' : 'C';
          report += `• ${r.subject || r.subjectName}: ${obt}/${tot} (${r.grade || defaultGrade})\n`;
        });
        const totalPct = totalMax > 0 ? Math.round((totalObt / totalMax) * 100) : 0;
        report += `⭐ *Overall Marks:* ${totalObt}/${totalMax} (${totalPct}%)\n`;
      } else {
        report += `ℹ️ *Status:* Is student ka koi published exam result system mein mojood nahi hai.\n`;
      }
    }

    report += `\n---------------------------------------------\n` +
              `🔙 *(Type *0* or *menu* to return)*`;
    return report;
  }

  // 6. Datesheet & Holidays (All Linked Children)
  if (intent === 'DATESHEET') {
    let examsList = [];
    if (db) {
      try {
        const exSnap = await db.collection('exams')
          .where('schoolId', '==', schoolId)
          .where('status', '==', 'Scheduled')
          .limit(5)
          .get();
        exSnap.forEach(d => examsList.push(d.data()));
      } catch(e) {}
    }

    let report = `🗓️ *DATESHEET & HOLIDAYS SCHEDULE* 🔒\n` +
                 `🏫 *${school.name.toUpperCase()}*\n` +
                 `---------------------------------------------\n`;

    if (examsList.length > 0) {
      examsList.forEach(ex => {
        report += `📝 *${ex.examName || ex.title}*\n` +
                  `📅 *Start Date:* ${ex.startDate || 'Upcoming'}\n` +
                  `📅 *End Date:* ${ex.endDate || 'Upcoming'}\n` +
                  `🎓 *Applicable Classes:* ${(ex.classes || []).slice(0, 5).join(', ')}\n\n`;
      });
    } else {
      report += `📝 *Upcoming Schedule:*\n` +
                `• Aglay exams ki datesheet abhi portal par announce nahi hui.\n` +
                `• Holidays: School administration ya government notification ke mutabiq chuttiyan hongi.\n\n`;
    }

    report += `🔙 *(Type *0* or *menu* to return)*`;
    return report;
  }

  // 7. Check Custom AI Rules configured in Dashboard
  const rules = schoolRules.get(schoolId) || [];
  for (const rule of rules) {
    if (!rule.active) continue;
    const kws = (rule.keywords || '').split(',').map(k => k.trim().toLowerCase()).filter(Boolean);
    if (kws.some(k => lower.includes(k))) {
      rule.triggerCount = (rule.triggerCount || 0) + 1;
      const primaryChild = children[0] || {};
      const childName = children.map(c => c.name).join(', ') || 'Student';
      const childGrade = `${primaryChild.class || ''}-${primaryChild.section || 'A'}`;
      const childFee = primaryChild.monthlyFee ? Number(primaryChild.monthlyFee).toLocaleString() : '0';

      return (rule.response || '')
        .replace(/{student_name}/g, childName)
        .replace(/{grade}/g, childGrade)
        .replace(/{fee_balance}/g, childFee)
        .replace(/{school_name}/g, school.name.toUpperCase());
    }
  }

  // 8. General AI Conversation with Google Gemini 2.5 Flash
  if (ai) {
    try {
      const prompt = `You are the polite, helpful official WhatsApp AI Assistant for "${school.name}" (Campus: "${school.address}", Phone: "${school.phone}").
Authorized parent: "${family.parentName}".
Authorized linked children: ${childrenNames}.
Parent query: "${queryText}"

Strict Rules:
- Reply politely and concisely in Roman Urdu or English matching the parent's tone.
- Answer in 2-3 sentences max.
- Ground all facts strictly in verified school data. Do NOT invent fake exam marks, fake fees, or fake policies.
- If information is missing or parent asks to change official records, guide them to call the school office at ${school.phone}.
- At the end add: "(Type *menu* to see all options)".`;

      const aiPromise = ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt
      });

      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('AI_TIMEOUT')), 8000)
      );

      const response = await Promise.race([aiPromise, timeoutPromise]);
      if (response && response.text) return response.text.trim();
    } catch(aiErr) {
      console.warn('Gemini query fallback:', aiErr.message);
    }
  }

  // Fallback greeting if AI key is unavailable or query is general
  return `Assalam-o-Alaikum ${family.parentName}!\n\n` +
         `Aap ka message hamare system ko masool ho chuka hai. Aap in options mein se kisi ka number reply kar sakte hain:\n\n` +
         `1️⃣ Fee Voucher & Dues\n` +
         `2️⃣ Student Attendance\n` +
         `3️⃣ Daily Diary & Homework\n` +
         `4️⃣ Exam Results & Marks\n` +
         `5️⃣ Datesheet & Holidays\n` +
         `7️⃣ Contact School Office\n\n` +
         `💡 *(Type *menu* or *0* anytime)*`;
}

// ---------------------------------------------------------------------------
// 11. REST API Endpoints (All Existing Endpoints Preserved)
// ---------------------------------------------------------------------------
const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 4000;

app.get('/', (req, res) => {
  res.send(`🚀 TaleemiDunya WhatsApp AI Bot Server Running! v7-PRODUCTION-STABLE - ${new Date().toISOString()}`);
});

app.get('/version', (req, res) => {
  res.send('v7-PRODUCTION-STABLE');
});

// GET /api/diagnostics - Production Reliability & Health Endpoint
app.get('/api/diagnostics', (req, res) => {
  const { schoolId = 'NNRuCtHxQNjISc9EPgMs' } = req.query;
  const status = getConnectionStatus(schoolId);
  const mem = process.memoryUsage();

  res.json({
    status: status.status,
    schoolId,
    pid: process.pid,
    uptimeSeconds: Math.floor(process.uptime()),
    connection: {
      isSocketLive: sessions.has(schoolId),
      hasQr: qrCodes.has(schoolId),
      lastConnected: status.lastConnected || null,
      lastDisconnected: status.lastDisconnected || null,
      disconnectReason: status.disconnectReason || null,
      reconnectAttempts: status.attempts || 0
    },
    performance: {
      rssMb: Math.round(mem.rss / 1024 / 1024),
      heapUsedMb: Math.round(mem.heapUsed / 1024 / 1024),
      messageStoreSize: messageStore.size,
      processedDedupCount: processedMessageIds.size,
      verifiedFamiliesCached: verifiedFamilies.size
    },
    firebase: {
      initialized: db !== null,
      transport: 'REST'
    }
  });
});

// GET /qr - Web scan page
app.get('/qr', (req, res) => {
  const { schoolId = 'NNRuCtHxQNjISc9EPgMs' } = req.query;
  const qr = qrCodes.get(schoolId);
  const credsExist = fs.existsSync(path.join(__dirname, 'auth_sessions', schoolId, 'creds.json'));
  const isConnected = credsExist && sessions.has(schoolId) && !qr;

  if (isConnected) {
    return res.send(`
      <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; text-align: center; padding: 50px; background: #e8f5e9; color: #1b5e20; min-height: 100vh;">
        <h1 style="font-size: 36px;">🚀 TaleemiDunya: WhatsApp Bot Connected!</h1>
        <p style="font-size: 18px;">School WhatsApp account is 100% active and connected 24/7.</p>
        <p style="font-size: 14px; margin-top: 20px; color: #555;">School ID: ${schoolId}</p>
      </div>
    `);
  }

  if (!qr) {
    return res.send(`
      <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; text-align: center; padding: 80px; background: #f5f5f5; min-height: 100vh;">
        <h2>⏳ Initializing WhatsApp QR Code...</h2>
        <p style="font-size: 16px; color: #666;">Please wait a few seconds while WhatsApp socket prepares authentication...</p>
        <script>setTimeout(() => location.reload(), 3000);</script>
      </div>
    `);
  }

  res.send(`
    <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 800px; margin: 0 auto; padding: 30px; text-align: center;">
      <h1 style="color: #075e54;">📱 Link School WhatsApp</h1>
      <p style="color: #666;">Scan this QR code with WhatsApp on the school mobile phone:</p>
      <div style="margin: 20px 0;">
        <img src="${qr}" style="border: 8px solid white; border-radius: 12px; box-shadow: 0 4px 15px rgba(0,0,0,0.1); width: 240px; height: 240px;" />
      </div>
      <p style="color: #2e7d32; font-size: 13px;">🔄 Auto-refreshing status every 3 seconds</p>
      <script>
        setInterval(async () => {
          try {
            const r = await fetch('/api/session/status?schoolId=${schoolId}');
            const d = await r.json();
            if (d.status === 'CONNECTED') location.reload();
          } catch(e) {}
        }, 3000);
      </script>
    </div>
  `);
});

// GET /api/session/pair - 8-digit pairing code
app.get('/api/session/pair', async (req, res) => {
  const { schoolId = 'NNRuCtHxQNjISc9EPgMs', phone } = req.query;
  const sock = sessions.get(schoolId);
  if (!sock) {
    return res.status(400).json({ error: 'Session not ready yet. Please wait 3 seconds.' });
  }

  try {
    const cleanPhone = normalizePhone(phone);
    const code = await sock.requestPairingCode(cleanPhone);
    res.json({ success: true, code: code?.match(/.{1,4}/g)?.join('-') || code });
  } catch (err) {
    res.status(500).json({ error: err.message || 'Failed to request pairing code' });
  }
});

// GET /api/session/status & /api/session-status (Dual Route Compatibility)
function handleSessionStatus(req, res) {
  const { schoolId = 'NNRuCtHxQNjISc9EPgMs' } = req.query;

  // Resolve effective school session
  let targetId = schoolId;
  const directDir = path.join(__dirname, 'auth_sessions', schoolId);
  const directCredPath = path.join(directDir, 'creds.json');
  if (!fs.existsSync(directCredPath) && !sessions.has(schoolId)) {
    const defaultCred = path.join(__dirname, 'auth_sessions', 'NNRuCtHxQNjISc9EPgMs', 'creds.json');
    if (fs.existsSync(defaultCred)) {
      targetId = 'NNRuCtHxQNjISc9EPgMs';
    }
  }

  const qr = qrCodes.get(targetId);
  const sessionDir = path.join(__dirname, 'auth_sessions', targetId);
  const credPath = path.join(sessionDir, 'creds.json');
  const credsExist = fs.existsSync(credPath);
  const isConnected = credsExist && sessions.has(targetId) && !qr;

  // Auto heal session if credentials exist but socket is missing
  if (credsExist && !sessions.has(targetId) && !qr) {
    startWhatsAppSession(targetId).catch(() => {});
  }

  let phone = null;
  if (credsExist) {
    try {
      const credsData = JSON.parse(fs.readFileSync(credPath, 'utf8'));
      if (credsData && credsData.me && credsData.me.id) {
        phone = '+' + credsData.me.id.split(':')[0].split('@')[0];
      }
    } catch(e) {}
  }

  res.json({
    schoolId,
    effectiveSchoolId: targetId,
    status: isConnected ? 'CONNECTED' : (qr ? 'QR_READY' : 'DISCONNECTED'),
    qrDataUrl: qr || null,
    phone
  });
}

app.get('/api/session/status', handleSessionStatus);
app.get('/api/session-status', handleSessionStatus);

// POST /api/session/start
app.post('/api/session/start', async (req, res) => {
  const { schoolId = 'NNRuCtHxQNjISc9EPgMs' } = req.body;
  await startWhatsAppSession(schoolId);
  res.json({ success: true, message: `Session initialization triggered for: ${schoolId}` });
});

// POST /api/session/logout
app.post('/api/session/logout', async (req, res) => {
  const { schoolId = 'NNRuCtHxQNjISc9EPgMs' } = req.body;
  const sock = sessions.get(schoolId);
  const sessionDir = path.join(__dirname, 'auth_sessions', schoolId);

  qrCodes.delete(schoolId);
  cancelReconnectTimer(schoolId);

  if (sock) {
    try {
      sock.ev?.removeAllListeners();
      await sock.logout();
    } catch(e) {
      sock.ws?.close();
    }
    sessions.delete(schoolId);
  }

  releaseLock(schoolId);

  try {
    if (fs.existsSync(sessionDir)) fs.rmSync(sessionDir, { recursive: true, force: true });
  } catch(e) {}

  setTimeout(() => {
    startWhatsAppSession(schoolId).catch(() => {});
  }, 2000);

  res.json({ success: true, message: `Logged out from school: ${schoolId}. Generating fresh QR code...` });
});

// POST /api/server/reboot
app.post('/api/server/reboot', (req, res) => {
  res.json({ success: true, message: 'Server rebooting cleanly...' });
  setTimeout(() => process.exit(0), 300);
});

// POST /api/message/send (Automatic Background WhatsApp Dispatch)
app.post('/api/message/send', async (req, res) => {
  const { schoolId = 'NNRuCtHxQNjISc9EPgMs', phone, phones, message } = req.body;
  const sock = sessions.get(schoolId) || (sessions.size > 0 ? sessions.values().next().value : null);

  if (!sock) {
    return res.status(400).json({ 
      success: false, 
      error: 'WhatsApp device is not paired. Please link WhatsApp in School Admin Dashboard first.' 
    });
  }

  if (!message) {
    return res.status(400).json({ success: false, error: 'Message content is required.' });
  }

  const targets = phones ? (Array.isArray(phones) ? phones : [phones]) : (phone ? [phone] : []);
  if (targets.length === 0) {
    return res.status(400).json({ success: false, error: 'At least one recipient phone number is required.' });
  }

  const results = [];
  for (const target of targets) {
    try {
      const cleanPhone = normalizePhone(target);
      const jid = `${cleanPhone}@s.whatsapp.net`;
      await sock.sendMessage(jid, { text: message });
      results.push({ phone: target, jid, status: 'sent' });
    } catch (err) {
      results.push({ phone: target, status: 'failed', error: err.message });
    }
  }

  res.json({ success: true, count: results.length, results });
});

// GET /api/rules (Synced with Firestore)
app.get('/api/rules', async (req, res) => {
  const { schoolId = 'NNRuCtHxQNjISc9EPgMs' } = req.query;
  let rules = schoolRules.get(schoolId);

  // If not cached in memory, fetch from Firestore
  if (!rules && db) {
    try {
      const doc = await db.collection('whatsapp_rules').doc(schoolId).get();
      if (doc.exists && Array.isArray(doc.data().rules)) {
        rules = doc.data().rules;
        schoolRules.set(schoolId, rules);
      }
    } catch(e) {}
  }

  if (!rules) {
    rules = [
      {
        id: 'menu_main',
        active: true,
        keywords: 'menu, hi, hello, salam, assalam, help, start, 0',
        response: '🏫 *WELCOME TO {school_name}* 🎓\nAssalam-o-Alaikum! Please reply with a number (1-7) to check fees, attendance, diary, or results.'
      }
    ];
  }
  res.json({ success: true, rules });
});

// POST /api/rules/update (Persisted to Firestore)
app.post('/api/rules/update', async (req, res) => {
  const { schoolId = 'NNRuCtHxQNjISc9EPgMs', rules } = req.body;
  if (Array.isArray(rules)) {
    schoolRules.set(schoolId, rules);
    if (db) {
      try {
        await db.collection('whatsapp_rules').doc(schoolId).set({
          schoolId,
          rules,
          updatedAt: new Date().toISOString()
        }, { merge: true });
      } catch(e) {
        console.warn('Failed to persist rules to Firestore:', e.message);
      }
    }
    res.json({ success: true, message: 'AI Rules updated and persisted successfully!' });
  } else {
    res.status(400).json({ success: false, error: 'Invalid rules format.' });
  }
});

// POST /api/attendance/rfid - IoT Biometric & RFID Check-in
app.post('/api/attendance/rfid', async (req, res) => {
  try {
    const { schoolId = 'NNRuCtHxQNjISc9EPgMs', rfidCardNumber, rollNumber, status = 'Present', checkInTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) } = req.body;
    if (!rfidCardNumber && !rollNumber) {
      return res.status(400).json({ success: false, error: 'Either rfidCardNumber or rollNumber is required.' });
    }

    let studentSnap = null;
    if (rollNumber) {
      studentSnap = await db.collection('students').where('schoolId', '==', schoolId).where('rollNumber', '==', rollNumber.toString()).get();
    } else if (rfidCardNumber) {
      studentSnap = await db.collection('students').where('schoolId', '==', schoolId).where('rfidCard', '==', rfidCardNumber.toString()).get();
    }

    if (!studentSnap || studentSnap.empty) {
      return res.status(404).json({ success: false, error: `Student not found for ${rollNumber ? 'Roll: ' + rollNumber : 'RFID: ' + rfidCardNumber}` });
    }

    const studentDoc = studentSnap.docs[0];
    const student = studentDoc.data();
    const studentId = studentDoc.id;
    const todayStr = new Date().toISOString().split('T')[0];

    await db.collection('attendance').add({
      schoolId,
      studentId,
      studentName: student.name || 'Student',
      rollNumber: student.rollNumber || rollNumber || 'N/A',
      class: student.class || 'N/A',
      date: todayStr,
      status,
      checkInTime,
      source: 'RFID/Biometric IoT Machine',
      createdAt: new Date().toISOString()
    });

    // Alert Parent via WhatsApp
    const parentPhone = normalizePhone(student.parentPhone || student.phone);
    let waSent = false;
    if (parentPhone) {
      const sock = sessions.get(schoolId);
      if (sock) {
        const msgText = `🏫 *SMART BIOMETRIC ATTENDANCE ALERT*\n\nAssalam-o-Alaikum! Student *${student.name}* (Class: ${student.class || 'N/A'}) has arrived at school gate and checked in today at *${checkInTime}*.\n\nStatus: *PRESENT ✅*`;
        sock.sendMessage(`${parentPhone}@s.whatsapp.net`, { text: msgText }).catch(() => {});
        waSent = true;
      }
    }

    res.json({
      success: true,
      message: `Attendance marked ${status} for ${student.name}`,
      student: { id: studentId, name: student.name, rollNumber: student.rollNumber, class: student.class },
      whatsappAlertSent: waSent
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/billing/generate-monthly-challans
app.post('/api/billing/generate-monthly-challans', async (req, res) => {
  try {
    const { schoolId = 'NNRuCtHxQNjISc9EPgMs', monthYear = new Date().toLocaleString('default', { month: 'long', year: 'numeric' }), dueDate = '10th of this month', sendWhatsappAlerts = true } = req.body;

    const studentsSnap = await db.collection('students').where('schoolId', '==', schoolId).get();
    if (studentsSnap.empty) {
      return res.status(404).json({ success: false, error: 'No active students found in database for this school.' });
    }

    const createdInvoices = [];
    const sock = sessions.get(schoolId);
    let waAlertCount = 0;

    for (const docSnap of studentsSnap.docs) {
      const st = docSnap.data();
      const baseFee = Number(st.monthlyFee || 2500);

      const invRef = await db.collection('invoices').add({
        schoolId,
        studentId: docSnap.id,
        studentName: st.name || 'Student',
        rollNumber: st.rollNumber || 'N/A',
        class: st.class || 'N/A',
        month: monthYear,
        dueDate,
        totalAmount: baseFee,
        feeBalance: baseFee,
        status: 'Unpaid',
        createdAt: new Date().toISOString()
      });
      createdInvoices.push({ invoiceId: invRef.id, studentName: st.name, amount: baseFee });

      if (sendWhatsappAlerts && sock && (st.parentPhone || st.phone)) {
        const pPhone = normalizePhone(st.parentPhone || st.phone);
        if (pPhone) {
          const challanMsg = `📢 *OFFICIAL FEE CHALLAN NOTIFICATION*\n\nAssalam-o-Alaikum! Current month (${monthYear}) tuition fee for *${st.name}* (Grade: ${st.class || 'N/A'}) has been generated.\n\n💰 *Amount:* Rs. ${baseFee.toLocaleString()}/-\n📅 *Due Date:* ${dueDate}\n\nRegards,\nSchool Accounts Office`;
          sock.sendMessage(`${pPhone}@s.whatsapp.net`, { text: challanMsg }).catch(() => {});
          waAlertCount++;
        }
      }
    }

    res.json({
      success: true,
      message: `Generated ${createdInvoices.length} fee challans!`,
      invoicesCreated: createdInvoices.length,
      whatsappAlertsSent: waAlertCount
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ---------------------------------------------------------------------------
// 12. Mobile App Authentication & Features (Preserved 100%)
// ---------------------------------------------------------------------------
const otpStore = new Map();

// POST /api/mobile/auth/request-otp
app.post('/api/mobile/auth/request-otp', async (req, res) => {
  try {
    const { cnic, email, identifier, contact } = req.body;
    const searchIdentifier = (identifier || cnic || '').trim();
    const searchContact = (contact || email || '').trim();

    const inputId = String(searchIdentifier || '').toLowerCase().trim();
    const cleanCnic = String(searchIdentifier || '').replace(/\D/g, '');
    const providedEmail = String(searchContact || '').toLowerCase().trim();

    if (!searchIdentifier || !searchContact || !searchContact.includes('@')) {
      return res.status(400).json({ success: false, error: 'Username (ID) and Gmail are required.' });
    }

    let userFound = null;
    let role = '';
    let schoolId = '';
    let displayName = '';
    let userId = '';
    let recordId = '';
    let userPhone = '';

    // Search Staff
    const staffSnap = await db.collection('staff').get();
    const staffMatch = staffSnap.docs.find(d => {
      const data = d.data();
      return (String(data.staffId || '').toLowerCase().trim() === inputId) ||
             (String(data.cnic || '').replace(/\D/g, '') === cleanCnic && cleanCnic.length === 13) ||
             (String(data.appUsername || '').toLowerCase().trim() === inputId);
    });

    if (staffMatch) {
      userFound = staffMatch.data();
      recordId = staffMatch.id;
      role = userFound.role || 'teacher';
      schoolId = userFound.schoolId;
      displayName = userFound.name || 'Staff';
      userId = `staff_${recordId}`;
      userPhone = normalizePhone(userFound.phone || userFound.whatsapp || '');
    }

    // Search Students
    if (!userFound) {
      const studentSnap = await db.collection('students').get();
      const studentMatch = studentSnap.docs.find(d => {
        const data = d.data();
        return (String(data.rollNumber || '').toLowerCase().trim() === inputId) ||
               (String(data.rollNo || '').toLowerCase().trim() === inputId) ||
               (String(data.fatherCnic || '').replace(/\D/g, '') === cleanCnic && cleanCnic.length === 13) ||
               (String(data.appUsername || '').toLowerCase().trim() === inputId);
      });

      if (studentMatch) {
        userFound = studentMatch.data();
        recordId = studentMatch.id;
        schoolId = userFound.schoolId;
        role = userFound.role || 'student';
        displayName = userFound.name || 'Student';
        userId = `student_${recordId}`;
        userPhone = normalizePhone(userFound.parentPhone || userFound.phone || '');
      }
    }

    if (!userFound) {
      return res.status(404).json({ success: false, error: 'No account found with this ID/Username.' });
    }

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = Date.now() + 5 * 60 * 1000;
    const storageKey = userPhone || providedEmail;

    otpStore.set(storageKey, {
      otp,
      expiresAt,
      attempts: 0,
      userData: { userId, role, schoolId, name: displayName, phone: userPhone, email: providedEmail, recordId }
    });

    // Send Email
    try {
      await transporter.sendMail({
        from: '"TaleemiDunya School System" <taleemiduniyapro@gmail.com>',
        to: providedEmail,
        subject: 'TaleemiDunya Verification Code',
        text: `Assalam-o-Alaikum ${displayName}!\n\nYour login code is: ${otp}\nExpires in 5 minutes.`
      });
    } catch(e) {}

    // Send WhatsApp
    if (userPhone) {
      const sock = sessions.get(schoolId) || sessions.get('NNRuCtHxQNjISc9EPgMs');
      if (sock) {
        sock.sendMessage(`${userPhone}@s.whatsapp.net`, {
          text: `🏫 *TaleemiDunya School System*\n\nAssalam-o-Alaikum ${displayName}!\nYour verification code is: *${otp}*`
        }).catch(() => {});
      }
    }

    res.json({
      success: true,
      message: 'Verification code sent to Gmail and WhatsApp.',
      maskedPhone: storageKey,
      expiresIn: 300
    });
  } catch(err) {
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// POST /api/mobile/auth/verify-otp
app.post('/api/mobile/auth/verify-otp', async (req, res) => {
  try {
    const { phone, otp } = req.body;
    if (!phone || !otp) {
      return res.status(400).json({ success: false, error: 'Verification ID and OTP are required.' });
    }

    const inputKey = phone.toLowerCase().trim();
    let stored = otpStore.get(inputKey);

    if (!stored) {
      for (const [key, value] of otpStore.entries()) {
        if (value.userData && (
          (value.userData.email && value.userData.email.toLowerCase().trim() === inputKey) ||
          (value.userData.phone && value.userData.phone.toLowerCase().trim() === inputKey) ||
          (key.toLowerCase().trim() === inputKey)
        )) {
          stored = value;
          break;
        }
      }
    }

    if (!stored || Date.now() > stored.expiresAt) {
      return res.status(400).json({ success: false, error: 'Code expired or invalid.' });
    }

    if (stored.otp !== otp) {
      stored.attempts++;
      return res.status(400).json({ success: false, error: 'Incorrect verification code.' });
    }

    const { userId, role, schoolId, name, userPhone } = stored.userData;
    const customToken = await admin.auth().createCustomToken(userId, { role, schoolId, mobile: userPhone || '' });
    otpStore.delete(inputKey);

    res.json({
      success: true,
      token: customToken,
      user: { id: userId, role, schoolId, name, phone: userPhone || '' }
    });
  } catch(err) {
    res.status(500).json({ success: false, error: 'Failed to verify OTP' });
  }
});

// GET /api/mobile/fees/voucher-pdf
app.get('/api/mobile/fees/voucher-pdf', async (req, res) => {
  try {
    const { studentId, schoolId } = req.query;
    if (!studentId || !schoolId || !db) {
      return res.status(400).json({ success: false, error: 'StudentId and SchoolId are required.' });
    }

    const studentDoc = await db.collection('students').doc(studentId).get();
    if (!studentDoc.exists) return res.status(404).json({ success: false, error: 'Student not found.' });
    const student = studentDoc.data();

    const school = await getSchoolDetails(schoolId);
    let logoBuffer = null;
    if (school.logo) {
      try {
        const logoRes = await fetch(school.logo);
        if (logoRes.ok) logoBuffer = Buffer.from(await logoRes.arrayBuffer());
      } catch(e) {}
    }

    const pdfBuffer = await generateFamilyVoucherPDF([student], school.name, null, logoBuffer);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=Voucher_${student.name || 'Student'}.pdf`);
    res.send(pdfBuffer);
  } catch(err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/mobile/teacher/attendance
app.post('/api/mobile/teacher/attendance', async (req, res) => {
  try {
    const { records, schoolId } = req.body;
    if (!records || !Array.isArray(records) || !schoolId) {
      return res.status(400).json({ success: false, error: 'Records and schoolId are required.' });
    }

    const batch = db.batch();
    records.forEach(rec => {
      const docId = `${rec.studentId}_${rec.date}`;
      const ref = db.collection('attendance').doc(docId);
      batch.set(ref, { ...rec, schoolId, updatedAt: admin.firestore.FieldValue.serverTimestamp() }, { merge: true });
    });
    await batch.commit();

    res.json({ success: true, message: `Marked attendance for ${records.length} students.` });
  } catch(err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/mobile/teacher/homework
app.post('/api/mobile/teacher/homework', async (req, res) => {
  try {
    const { subject, title, description, className, section, schoolId, teacherName, imageUrl } = req.body;
    const docRef = await db.collection('homework').add({
      subject, title, description, className, section, schoolId, teacherName, imageUrl,
      assignedDate: new Date().toISOString().split('T')[0],
      createdAt: admin.firestore.FieldValue.serverTimestamp()
    });

    // Notify parents
    const sock = sessions.get(schoolId);
    if (sock) {
      const stSnap = await db.collection('students').where('schoolId', '==', schoolId).where('class', '==', className).get();
      stSnap.forEach(doc => {
        const s = doc.data();
        if (s.section === section) {
          const pPhone = normalizePhone(s.parentPhone || s.phone);
          if (pPhone) {
            sock.sendMessage(`${pPhone}@s.whatsapp.net`, {
              text: `*NEW HOMEWORK ALERT*\n\nClass: ${className}-${section}\nSubject: ${subject}\nTitle: ${title}`
            }).catch(() => {});
          }
        }
      });
    }

    res.json({ success: true, id: docRef.id, message: 'Homework posted successfully.' });
  } catch(err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/mobile/teacher/results
app.post('/api/mobile/teacher/results', async (req, res) => {
  try {
    const { results, schoolId } = req.body;
    if (!results || !Array.isArray(results)) {
      return res.status(400).json({ success: false, error: 'Results array is required.' });
    }

    const batch = db.batch();
    results.forEach(item => {
      const id = `${item.examName}_${item.subject}_${item.studentId}`.replace(/\s+/g, '_');
      const ref = db.collection('results').doc(id);
      batch.set(ref, { ...item, updatedAt: admin.firestore.FieldValue.serverTimestamp() }, { merge: true });
    });
    await batch.commit();

    res.json({ success: true, message: `Results published for ${results.length} students.` });
  } catch(err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ---------------------------------------------------------------------------
// 13. Server Startup & Safe Watchdog
// ---------------------------------------------------------------------------
app.listen(PORT, () => {
  console.log(`\n======================================================`);
  console.log(`🚀 TaleemiDunya WhatsApp AI Bot Server Running! v7-PRODUCTION-STABLE`);
  console.log(`🌐 Local API Port: http://localhost:${PORT}`);
  console.log(`======================================================\n`);

  // Auto-start active school sessions that have creds.json
  const activeSessionSchools = new Set(['NNRuCtHxQNjISc9EPgMs']);
  try {
    const authDir = path.join(__dirname, 'auth_sessions');
    if (fs.existsSync(authDir)) {
      const items = fs.readdirSync(authDir);
      for (const item of items) {
        if (item.startsWith('.')) continue;
        const itemPath = path.join(authDir, item);
        try {
          if (fs.statSync(itemPath).isDirectory() && fs.existsSync(path.join(itemPath, 'creds.json'))) {
            activeSessionSchools.add(item);
          }
        } catch(e) {}
      }
    }
  } catch(e) {}

  for (const sId of activeSessionSchools) {
    startWhatsAppSession(sId).catch(err => console.error(`Error starting ${sId}:`, err.message));
  }

  // Safe Watchdog: checks every 5 minutes and respawns only schools with existing credentials
  setInterval(() => {
    for (const sId of activeSessionSchools) {
      const sock = sessions.get(sId);
      const qr = qrCodes.get(sId);
      const sessionDir = path.join(__dirname, 'auth_sessions', sId);
      const credsExist = fs.existsSync(path.join(sessionDir, 'creds.json'));
      const status = getConnectionStatus(sId);

      // Never respawn if user authentication is required (unscanned QR)
      if (status.status === 'AUTHENTICATION_REQUIRED') continue;

      if (!sock && credsExist && !qr) {
        console.log(`🛡️ [WATCHDOG] WhatsApp socket missing for ${sId}. Auto-reconnecting...`);
        startWhatsAppSession(sId).catch(() => {});
      }
    }
  }, 300000);
});

// Graceful termination handling to cleanly close sockets and release PID locks
function handleGracefulShutdown(signal) {
  console.log(`\n🛑 [SHUTDOWN] Received ${signal}. Closing sockets and releasing locks...`);
  for (const [sId, sock] of sessions.entries()) {
    try {
      sock.ev?.removeAllListeners();
      sock.ws?.close();
    } catch(e) {}
    releaseLock(sId);
  }
  process.exit(0);
}
process.on('SIGINT', () => handleGracefulShutdown('SIGINT'));
process.on('SIGTERM', () => handleGracefulShutdown('SIGTERM'));

function calculateFamilyFeeReport(children = [], vouchers = []) {
  let combinedTotal = 0;
  const childReports = [];

  for (const child of children) {
    let monthlyFee = Number(child.monthlyFee || child.tuitionFee || 0);
    let arrears = 0;
    let annualFund = 0;
    let totalPayable = monthlyFee;
    let voucherNo = 'N/A';
    let dueDate = '10th of this month';
    let status = 'Unpaid';

    for (const v of vouchers) {
      if (v.status !== 'Paid' && v.childrenDetails && Array.isArray(v.childrenDetails)) {
        const match = v.childrenDetails.find(d => 
          String(d.admNo) === String(child.rollNumber) || 
          String(d.admNo) === String(child.rollNo) ||
          d.id === child.id ||
          d.name?.toLowerCase() === child.name?.toLowerCase()
        );
        if (match) {
          monthlyFee = Number(match.fee || monthlyFee);
          arrears = Number(match.arrears || 0);
          annualFund = Number(match.annualFee || 0);
          totalPayable = monthlyFee + arrears + annualFund;
          voucherNo = v.voucherNo || voucherNo;
          dueDate = v.dueDate || dueDate;
          status = v.status || status;
          break;
        }
      }
    }

    combinedTotal += totalPayable;
    childReports.push({
      name: child.name,
      rollNumber: child.rollNumber || child.rollNo || 'N/A',
      className: child.class || child.className || 'N/A',
      section: child.section || 'A',
      monthlyFee,
      arrears,
      annualFund,
      totalPayable,
      voucherNo,
      dueDate,
      status
    });
  }

  return {
    children: childReports,
    combinedTotal
  };
}

export {
  normalizePhone,
  isValidPhone,
  isValidPakistaniPhone,
  detectIntent,
  resolveSenderIdentity,
  registerLidPhoneMapping,
  lidToPhoneMap,
  phoneToLidMap,
  handleAIBotReply,
  verifiedFamilies,
  maskIdentifier,
  calculateFamilyFeeReport
};


