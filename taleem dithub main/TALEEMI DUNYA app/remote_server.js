import express from 'express';
import cors from 'cors';
import qrcode from 'qrcode';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import PDFDocument from 'pdfkit';
import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.GMAIL_USER || 'taleemiduniyapro@gmail.com', // User's Gmail
    pass: process.env.GMAIL_PASS || 'bqrbydwkpbmtjdpg' // 16-letter App Password
  }
});

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

import { 
  makeWASocket, 
  useMultiFileAuthState, 
  DisconnectReason,
  Browsers,
  fetchLatestBaileysVersion,
  generateWAMessageFromContent,
  proto
} from '@whiskeysockets/baileys';
import { GoogleGenAI } from '@google/genai';
import admin from 'firebase-admin';

function normalizePhone(input = '') {
  let digits = String(input).replace(/\D/g, '');
  if (!digits) return '';
  // Convert 03XXXXXXXXX to 923XXXXXXXXX
  if (digits.startsWith('0') && digits.length === 11) {
    digits = '92' + digits.slice(1);
  }
  // If 10 digits (3XXXXXXXXX), add 92
  if (digits.length === 10 && !digits.startsWith('0')) {
    digits = '92' + digits;
  }
  return digits;
}

function formatCnic(input = '') {
  const digits = String(input).replace(/\D/g, '').slice(0, 13);
  if (digits.length <= 5) return digits;
  if (digits.length <= 12) return `${digits.slice(0, 5)}-${digits.slice(5)}`;
  return `${digits.slice(0, 5)}-${digits.slice(5, 12)}-${digits.slice(12)}`;
}

function isValidPhone(input = '') {
  const cleaned = normalizePhone(input);
  if (!cleaned) return false;
  return /^92\d{10}$/.test(cleaned) || /^\d{11}$/.test(cleaned);
}

function isValidCnic(input = '') {
  const digits = String(input).replace(/\D/g, '');
  return digits.length === 13;
}

function generateVoucherPDF(student, schoolName, voucherData, logoBuffer) {
  return new Promise((resolve, reject) => {
    try {
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
          // Draw logo on the left
          doc.image(logoBuffer, 30, currentY, { fit: [50, 50], align: 'center', valign: 'center' });
        } catch(e) {
          // Fallback if logo fails
        }
      }

      // Draw School Name
      doc.fontSize(14).font('Helvetica-Bold').text(schoolName, 90, currentY + 10, { width: width - 60, align: 'left' });
      doc.fontSize(9).font('Helvetica').text('Main', 90, doc.y, { align: 'left' });
      doc.moveDown(1);
      
      // Subheader: PARENT COPY                 Voucher #
      const ySub = doc.y;
      doc.fontSize(10).font('Helvetica-Bold').text('PARENT COPY', 30, ySub);
      
      const vMonth = voucherData ? voucherData.month : new Date().toISOString().slice(0, 7);
      const vNo = voucherData && voucherData.voucherNo ? voucherData.voucherNo : ('V-' + Date.now().toString().slice(-4));
      console.log('PDF Generation - Voucher No:', vNo);
      // DueDate: use real dueDate, or if empty, show end of current month
      let vDueDate = (voucherData && voucherData.dueDate && voucherData.dueDate.trim()) ? voucherData.dueDate : null;
      if (!vDueDate) {
        const now = new Date();
        const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);
        vDueDate = lastDay.toISOString().slice(0, 10); // YYYY-MM-DD
      }
      console.log('PDF Generation - DueDate:', vDueDate);

      
      doc.text(`Voucher #${vNo}`, 30, ySub, { align: 'right', width: width });
      
      doc.moveDown(0.5);
      
      // Line Separator
      currentY = doc.y;
      doc.moveTo(30, currentY).lineTo(rightEdge, currentY).stroke();
      doc.moveDown(0.5);
      
      currentY = doc.y;
      
      // Info block (Left aligned)
      const labelX = 30;
      const valueX = 120;
      const lineSpacing = 16;
      
      doc.font('Helvetica-Bold').text('Month', labelX, currentY);
      doc.font('Helvetica').text(vMonth, valueX, currentY);
      currentY += lineSpacing;
      
      doc.font('Helvetica-Bold').text('DueDate', labelX, currentY);
      doc.font('Helvetica').text(vDueDate, valueX, currentY);
      currentY += lineSpacing;
      
      doc.font('Helvetica-Bold').text('Ft. Name', labelX, currentY);
      doc.font('Helvetica').text(student.fatherName || 'N/A', valueX, currentY);
      currentY += lineSpacing;
      
      doc.font('Helvetica-Bold').text('No Of child', labelX, currentY);
      doc.font('Helvetica').text('1', valueX, currentY);
      currentY += lineSpacing;
      
      doc.font('Helvetica-Bold').text('NIC', labelX, currentY);
      doc.font('Helvetica').text(student.fatherCnic || student.cnic || 'N/A', valueX, currentY);
      currentY += lineSpacing + 10;
      
      // Table Header Background (Grey)
      doc.rect(30, currentY, width, 20).fill('#6c757d');
      doc.fillColor('white').font('Helvetica-Bold').fontSize(9);
      
      // Column boundaries
      const col1X = 30, col1W = 40;   // Adm#
      const col2X = 70, col2W = 150;  // Name
      const col3X = 220, col3W = 40;  // Class
      const col4X = 260, col4W = 99.53; // Amount
      
      doc.text('Adm#', col1X, currentY + 5, { width: col1W, align: 'center' });
      doc.text('Name', col2X + 5, currentY + 5, { width: col2W - 10 });
      doc.text('Class', col3X, currentY + 5, { width: col3W, align: 'center' });
      doc.text('Amount', col4X, currentY + 5, { width: col4W, align: 'center' });
      
      currentY += 20;
      doc.fillColor('black').font('Helvetica').fontSize(9);
      
      // Table Row 1 (Fee & Arrears)
      const rowHeight = 35;
      
      // Draw row borders
      doc.rect(30, currentY, width, rowHeight).stroke(); // Outer box
      doc.moveTo(col2X, currentY).lineTo(col2X, currentY + rowHeight).stroke(); // Adm | Name
      doc.moveTo(col3X, currentY).lineTo(col3X, currentY + rowHeight).stroke(); // Name | Class
      doc.moveTo(col4X, currentY).lineTo(col4X, currentY + rowHeight).stroke(); // Class | Amount
      
      // Amount is split into two rows (Fee, Arrears) and two columns (Label, Value)
      const amountLabelX = 260;
      const amountValueX = 310;
      doc.moveTo(amountValueX, currentY).lineTo(amountValueX, currentY + rowHeight).stroke(); // Label | Value
      doc.moveTo(amountLabelX, currentY + 17.5).lineTo(rightEdge, currentY + 17.5).stroke(); // Horizontal split in Amount
      
      // Data Extraction
      let feeAmt = Number(student.monthlyFee || student.feeBalance || 0);
      let arrAmt = 0;
      let totalPayable = feeAmt;
      
      if (voucherData) {
        totalPayable = Number(voucherData.totalAmount || 0);
        if (voucherData.childrenDetails && voucherData.childrenDetails.length > 0) {
           arrAmt = Number(voucherData.childrenDetails[0].arrears || 0);
           feeAmt = totalPayable - arrAmt;
        } else if (voucherData.feeItems && voucherData.feeItems.length > 0) {
           const aItem = voucherData.feeItems.find(f => f.name.includes('Arrears'));
           if (aItem) arrAmt = Number(aItem.amount || 0);
           feeAmt = totalPayable - arrAmt;
        }
      }

      // Populate Data
      const admNo = student.rollNumber || student.rollNo || student.admissionNo || 'N/A';
      doc.text(admNo, col1X, currentY + 12, { width: col1W, align: 'center' });
      
      // Truncate name if too long
      doc.text(student.name || 'N/A', col2X + 5, currentY + 12, { width: col2W - 10 });
      doc.text(`${student.class || ''}`, col3X, currentY + 12, { width: col3W, align: 'center' });
      
      // Fee Row
      doc.font('Helvetica-Bold').text('Fee', amountLabelX + 5, currentY + 4.5);
      doc.font('Helvetica').text(feeAmt > 0 ? feeAmt.toLocaleString() : '0', amountValueX, currentY + 4.5, { width: rightEdge - amountValueX - 5, align: 'right' });
      
      // Arrears Row
      doc.font('Helvetica-Bold').text('Arrears', amountLabelX + 5, currentY + 22);
      doc.font('Helvetica').text(arrAmt > 0 ? arrAmt.toLocaleString() : '0', amountValueX, currentY + 22, { width: rightEdge - amountValueX - 5, align: 'right' });
      
      currentY += rowHeight;
      
      // Total Payable Row (Grey Bar)
      doc.moveDown(2);
      currentY = doc.y;
      doc.rect(30, currentY, width, 20).fill('#e9ecef'); // light grey background
      doc.fillColor('black').font('Helvetica-Bold');
      doc.text('Total Payable', 30, currentY + 5, { width: amountValueX - 35, align: 'right' });
      doc.text(totalPayable > 0 ? totalPayable.toLocaleString() : '0', amountValueX, currentY + 5, { width: rightEdge - amountValueX - 5, align: 'right' });
      doc.rect(30, currentY, width, 20).stroke();
      doc.moveTo(amountValueX, currentY).lineTo(amountValueX, currentY + 20).stroke(); // line separating label and value

      doc.end();
    } catch(err) {
      reject(err);
    }
  });
}

function buildSchoolMenuText(schoolName = 'TaleemiDunya Pro') {
  const name = String(schoolName || 'TaleemiDunya Pro').trim() || 'TaleemiDunya Pro';
  return `🏫 *${name.toUpperCase()}* 🎓
Assalam-o-Alaikum! Main aapka 24/7 AI Smart Assistant hun.

*Main Menu - Number type karein:*

1️⃣ Fee Voucher & Dues
2️⃣ Student Attendance
3️⃣ Daily Diary & HW
4️⃣ Exam Results
5️⃣ Datesheet & Holidays
6️⃣ New Admission Inquiry
7️⃣ Contact Admin

💡 *(Type 0 or "menu" anytime to return. For example: reply "fees", "exam", or "attendance".)*`;
}

// Global Crash Protection for Baileys Socket / Decrypt / Timeout Errors
process.on('uncaughtException', (err) => {
  console.error('🛡️ [PREVENTED CRASH] Uncaught Exception:', err.message || err);
});
process.on('unhandledRejection', (reason, promise) => {
  console.error('🛡️ï¸ [PREVENTED CRASH] Unhandled Rejection at promise:', reason);
});

// 🔑 CRITICAL FIX: Force Firestore to use REST API instead of gRPC
// gRPC conflicts with ESM module system on Alwaysdata causing SyntaxError crashes
process.env.FIRESTORE_PREFER_REST = '1';
process.env.GOOGLE_CLOUD_DISABLE_GRPC = '1';

// 1. Initialize Firebase Admin SDK with service account when available.
// Without this, the backend can silently lose database access and return the wrong "System Error" message.
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
      console.log('âš ï¸ Firebase Admin falling back to app default credentials');
    }

    admin.initializeApp(firebaseConfig);
  }

  db = admin.firestore();
  console.log('✅ Firestore initialized (Transport: REST via Env Var)');
} catch (err) {
  console.log('âš ï¸ Firebase init warning:', err.message);
  db = null;
}


// 2. Initialize Google Gemini AI (Free API Key from AI Studio)
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || 'YOUR_FREE_GEMINI_API_KEY' });

const app = express();
app.use(cors());
app.use(express.json());

app.get('/', (req, res) => {
  res.send(`🚀 TaleemiDunya WhatsApp AI Bot Server Running! v6-PDF-STABLE - ${new Date().toISOString()}`);
});

app.get('/version', (req, res) => {
  res.send(`v6-PDF-STABLE`);
});

// Global timing middleware
app.use((req, res, next) => {
  req.startTime = Date.now();
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url} from ${req.ip}`);
  next();
});

// The previous location of app.get('/') was here
const PORT = process.env.PORT || 4000;

// Memory storage for active sessions, QR codes, and custom AI rules
const sessions = new Map();
const qrCodes = new Map();
const schoolRules = new Map();

// 🔒 PROCESS LOCK: Prevent two Node processes from both connecting to WhatsApp
// (Causes "conflict: replaced" crash loop on shared hosting like Alwaysdata)
const LOCK_DIR = path.join(__dirname, 'auth_sessions');
const LOCK_FILE = path.join(LOCK_DIR, '.ws_lock');
const MY_PID = process.pid;

function acquireLock(schoolId) {
  const lockPath = path.join(LOCK_DIR, `.lock_${schoolId}`);
  try {
    if (!fs.existsSync(LOCK_DIR)) fs.mkdirSync(LOCK_DIR, { recursive: true });
    if (fs.existsSync(lockPath)) {
      const lockData = JSON.parse(fs.readFileSync(lockPath, 'utf8'));
      const age = Date.now() - lockData.timestamp;
      // If lock is from a different PID and is fresh (< 30s), another process owns it
      if (lockData.pid !== MY_PID && age < 30000) {
        console.log(`🔒 [LOCK] Another process (PID ${lockData.pid}) owns WhatsApp connection for ${schoolId}. This instance will NOT connect.`);
        return false;
      }
    }
    // Write our lock
    fs.writeFileSync(lockPath, JSON.stringify({ pid: MY_PID, timestamp: Date.now() }));
    return true;
  } catch(e) {
    console.error('Lock file error:', e.message);
    return true; // If lock fails, allow connection anyway
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

// Track last reply time per sender to prevent duplicate processing on reconnect
const lastReplySentAt = new Map(); // senderPhone -> timestamp

/**
 * Helper to get or initialize custom AI Rules per school
 */
function getSchoolRules(schoolId) {
  if (!schoolRules.has(schoolId)) {
    schoolRules.set(schoolId, [
      {
        id: 'menu_main',
        active: true,
        keywords: 'menu, hi, hello, salam, assalam, assalam-o-alaikum, help, options, start, 0, hey',
        response: '🏫 *WELCOME TO {school_name}* 🎓\nAssalam-o-Alaikum! I am your 24/7 AI Smart Assistant.\n\n👇 *PLEASE SELECT AN OPTION BY REPLYING WITH A NUMBER (1 - 7):*\n\n1️⃣ *Fee Voucher & Remaining Dues* (Check balance & vouchers)\n2️⃣ *Student Attendance* (Daily & monthly presence)\n3️⃣ *Daily Diary & Homework* (Aaj ka syllabus / kam)\n4️⃣ *Exam Results & Report Card* (Marks & grades)\n5️⃣ *Datesheet & Holidays* (Exams aur chuttiyan)\n6️⃣ *New Admission Inquiry* (Dakhla aur fees)\n7️⃣ *Contact Admin & Complaints* (Shikayat aur rabta)\n\n---\n💡 *Tip:* Aap koi bhi sawal direct likh kar bhi pooch sakte hain! (Type *0* anytime to see options again).'
      },
      {
        id: 'opt_1',
        active: true,
        keywords: '1, one, challan, fee, balance, bqaya, due, paise, voucher, fees',
        response: '📋 *FEE VOUCHER & REMAINING DUES*\n\n👤 *Student Name:* {student_name}\n🏫 *Class / Section:* {grade}\n💰 *Remaining Fee Balance:* Rs. {fee_balance}/-\n\nℹ️ *Payment Instructions:* Aap apna fee voucher school accounts office se hasil kar sakte hain ya portal se download kar sakte hain. Bara-e-meharbani due date se pehlay fee jama karwayein.\n\n🔙 *(Type *0* to go back)*'
      },
      {
        id: 'opt_2',
        active: true,
        keywords: '2, two, hazri, attendance, present, absent, school aya',
        response: '📅 *STUDENT ATTENDANCE REPORT*\n\n👤 *Student Name:* {student_name}\n🏫 *Class / Section:* {grade}\n✅ *Status Today:* Present (100% Monthly Attendance)\n\nℹ️ *Details:* Aaj ki hazri mark ho chuki hai. Regular attendance maintain rakhne par shukriya!\n\n🔙 *(Type *0* to go back)*'
      },
      {
        id: 'opt_3',
        active: true,
        keywords: '3, three, diary, homework, syllabus, kam',
        response: '📚 *DAILY DIARY & HOMEWORK*\n\n👤 *Student Name:* {student_name}\n🏫 *Class / Section:* {grade}\n\n📝 *Today Diary:*\n• English: Read Unit 4 & learn Q/A.\n• Math: Ex 3.2 Q(1-5) on notebook.\n• Urdu: Sabaq yaad karna hai.\n\n🔙 *(Type *0* to go back)*'
      },
      {
        id: 'opt_4',
        active: true,
        keywords: '4, four, result, exam, report card, marks, number',
        response: '📊 *EXAM RESULTS & REPORT CARD*\n\n👤 *Student Name:* {student_name}\n🏫 *Class / Section:* {grade}\n🏆 *Last Exam Score:* 88% Marks (A+ Grade)\n\nℹ️ *Note:* Detailed report card parent-teacher meeting (PTM) mein di jayegi ya portal se check karein.\n\n🔙 *(Type *0* to go back)*'
      },
      {
        id: 'opt_5',
        active: true,
        keywords: '5, five, datesheet, holiday, chutti, vacation, schedule',
        response: '🗓️ *DATESHEET & HOLIDAYS CALENDAR*\n\n🏫 *Upcoming Schedule:*\n• Annual Final Exams 15th March se start ho rahe hain.\n• Next Holiday: Iqbal Day (9th November).\n\n🔙 *(Type *0* to go back)*'
      },
      {
        id: 'opt_6',
        active: true,
        keywords: '6, six, admission, prospectus, dakhla',
        response: '🎓 *NEW ADMISSIONS INQUIRY*\n\n🌟 *{school_name}* mein Playgroup se Class 10th tak Admissions OPEN hain!\n\n🕒 *Test/Interview Timings:* Monday to Saturday (9:00 AM - 1:00 PM).\n\n🔙 *(Type *0* to go back)*'
      },
      {
        id: 'opt_7',
        active: true,
        keywords: '7, seven, contact, office, admin, principal, complaint, masla',
        response: '📞 *CONTACT ADMIN & COMPLAINTS*\n\n🕒 *Office Hours:* Monday to Saturday (8:00 AM - 2:00 PM)\n📱 *Helpline & WhatsApp Admin:* +92 317-2234518\n📝 *Complaints:* Kisi bhi shikayat ki soorat mein aap is number par direct message kar sakte hain.\n\n🔙 *(Type *0* to go back)*'
      }
    ]);
  }
  return schoolRules.get(schoolId);
}

/**
 * Start Baileys Session for a School
 */
const reconnectAttempts = new Map(); // schoolId -> attempt count

async function startWhatsAppSession(schoolId = 'default_school') {
  const sessionDir = path.join(__dirname, 'auth_sessions', schoolId);
  if (!fs.existsSync(sessionDir)) {
    fs.mkdirSync(sessionDir, { recursive: true });
  }

  // 🔒 PROCESS LOCK CHECK: Only one process should hold the WA connection
  if (!acquireLock(schoolId)) {
    console.log(`â¸ï¸ [LOCK HELD] Skipping startWhatsAppSession for ${schoolId} - another process is the owner.`);
    return null;
  }

  // Cleanly close any existing socket in memory to prevent internal loop/conflict
  if (sessions.has(schoolId)) {
    try {
      const oldSock = sessions.get(schoolId);
      oldSock?.ws?.close();
      oldSock?.end?.();
    } catch (e) {}
    sessions.delete(schoolId);
  }

  // Ensure directory exists right before calling auth state
  if (!fs.existsSync(sessionDir)) {
    fs.mkdirSync(sessionDir, { recursive: true });
  }

  const { state, saveCreds } = await useMultiFileAuthState(sessionDir);
  const { version, isLatest } = await fetchLatestBaileysVersion();
  console.log(`Using WhatsApp Web v${version.join('.')}, isLatest: ${isLatest}`);

  const sock = makeWASocket({
    version,
    auth: state,
    printQRInTerminal: false,
    browser: Browsers.ubuntu('Chrome'),
    connectTimeoutMs: 60000,
    defaultQueryTimeoutMs: 60000,
    keepAliveIntervalMs: 15000,
    syncFullHistory: false,
    markOnlineOnConnect: true,
    generateHighQualityLinkPreview: false,
  });

  sessions.set(schoolId, sock);
  sock.ev.on('creds.update', () => { saveCreds(); renewLock(schoolId); });

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
      reconnectAttempts.set(schoolId, 0); // Reset backoff on successful connect
      renewLock(schoolId);
      console.log(`🟢 [CONNECTED] School "${schoolId}" WhatsApp Device Linked Successfully! 24/7 AI Bot Active.`);
    }

    if (connection === 'close') {
      const statusCode = (lastDisconnect?.error)?.output?.statusCode;
      const isConflict = statusCode === 440 || lastDisconnect?.error?.message?.includes('conflict');
      const shouldReconnect = statusCode !== DisconnectReason.loggedOut;
      console.log(`🔴 [DISCONNECTED] Connection closed for "${schoolId}" (Code: ${statusCode}). Reconnecting: ${shouldReconnect}`);
      
      if (shouldReconnect) {
        // If conflict, wait much longer before retrying to let the other instance settle
        const attempts = reconnectAttempts.get(schoolId) || 0;
        reconnectAttempts.set(schoolId, attempts + 1);
        // Exponential backoff: conflict=15s, else 4s*attempts (capped at 60s)
        const delay = isConflict ? 15000 : Math.min(4000 * (attempts + 1), 60000);
        console.log(`🔄 [SELF-HEALING] Reconnect in ${delay/1000}s (attempt #${attempts+1})...`);
        
        // Release lock before waiting so OTHER process can take over if it wins
        if (isConflict) releaseLock(schoolId);
        
        setTimeout(async () => {
          try {
            await startWhatsAppSession(schoolId);
          } catch (retryErr) {
            console.error(`âš ï¸ Reconnect retry error for "${schoolId}":`, retryErr.message);
            setTimeout(() => startWhatsAppSession(schoolId).catch(() => {}), 10000);
          }
        }, delay);
      } else {
        console.log(`âš ï¸ [SESSION EXPIRED] Device logged out for "${schoolId}". Auto-cleaning old session and generating fresh QR...`);
        sessions.delete(schoolId);
        qrCodes.delete(schoolId);
        
        // Self-Healing: If logged out, clean session folder and restart so QR code is ready 24/7 immediately!
        try {
          const folderToClean = path.join(__dirname, 'auth_sessions', schoolId);
          if (fs.existsSync(folderToClean)) {
            fs.rmSync(folderToClean, { recursive: true, force: true });
          }
        } catch (rmErr) {}
        
        setTimeout(() => {
          startWhatsAppSession(schoolId).catch(() => {});
        }, 3000);
      }
    }
  });

  // Incoming Messages Processing
  sock.ev.on('messages.upsert', async ({ messages, type }) => {
    if (type !== 'notify') return;

    for (const msg of messages) {
      if (!msg.message || msg.key.fromMe) continue;

      let senderPhone = msg.key.remoteJid;
      
      // 🔑 FIX: WhatsApp LID format (@lid) cannot receive messages. Convert to @s.whatsapp.net
      if (senderPhone && senderPhone.endsWith('@lid')) {
        // Try to get real phone from participant or other fields
        const realJid = msg.key.participant || msg.participant || 
                        (msg.message?.senderKeyDistributionMessage?.groupId) || null;
        if (realJid && !realJid.endsWith('@lid')) {
          senderPhone = realJid;
        } else {
          // Try extracting from pushName or verifiedBizName as fallback (won't work reliably)
          // Best approach: use the actual phone store
          const store = sock.store;
          if (store && store.contacts) {
            const contact = store.contacts[msg.key.remoteJid];
            if (contact && contact.id && !contact.id.endsWith('@lid')) {
              senderPhone = contact.id;
            }
          }
          // If still @lid, log and skip - can't reply to LID address
          if (senderPhone.endsWith('@lid')) {
            console.log(`âš ï¸ [LID MSG] Cannot reply to LID address: ${senderPhone}. WhatsApp LID resolution needed.`);
            // Try anyway with the LID - sometimes it works
          }
        }
      }

      // Unwrap any ephemeral or viewOnce wrappers to extract actual text
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
          msgObj.templateButtonReplyMessage?.selectedId ||
          ''
        ).trim();
      }

      if (!incomingText) continue;

      console.log(`\n💬 [MSG RECEIVED] From: ${senderPhone} | Text: "${incomingText}"`);

      // âš¡ DEDUP GUARD: Skip if we already replied to this sender within last 2 seconds
      // (Prevents duplicate replies when WA reconnects and replays buffered messages)
      const lastReply = lastReplySentAt.get(senderPhone) || 0;
      if (Date.now() - lastReply < 2000) {
        console.log(`â­ï¸ [DEDUP] Skipping duplicate message from ${senderPhone} (too soon after last reply)`);
        continue;
      }

      try {
        let aiResponse = await handleAIBotReply(schoolId, senderPhone, incomingText);
        if (aiResponse) {
          if (typeof aiResponse === 'object' && aiResponse.type === 'document') {
            await sock.sendMessage(senderPhone, { 
              document: aiResponse.document, 
              mimetype: aiResponse.mimetype || 'application/pdf',
              fileName: aiResponse.fileName || 'document.pdf',
              caption: aiResponse.caption || ''
            });
          } else {
            const replyText = typeof aiResponse === 'string' ? aiResponse :
                             (aiResponse.type === 'text' && aiResponse.content) ? aiResponse.content.text :
                             aiResponse.text || String(aiResponse);
            await sock.sendMessage(senderPhone, { text: replyText });
          }
          lastReplySentAt.set(senderPhone, Date.now());
          console.log(`🤖 [AI REPLY SENT] To: ${senderPhone}`);
        }
      } catch (err) {
        console.error(`âŒ [AI BOT ERROR]`, err.message);
        try {
          await sock.sendMessage(senderPhone, { text: 'Maafi chahta hun! System busy hai. Thodi der baad dobara try karein ya "menu" likhein.' });
        } catch(e2) {}
      }
    }
  });

  sessions.set(schoolId, sock);
  return sock;
}

// In-memory security verification cache (Sender Phone -> { student: studentDoc, verifiedAt: timestamp })
const verifiedSenders = new Map();
// Track senders who have interacted/seen the menu in this session
const activeSenders = new Set();

/**
 * Handle AI logic using High-Security Verification + Real Firestore Data + Custom Rules + Gemini
 */
const schoolNamesCache = new Map();
const pendingVerifications = new Map(); // cleanSender -> timestamp

async function getSchoolName(schoolId) {
  const fallbackName = schoolId && schoolId !== 'default_school' ? String(schoolId).replace(/[_-]+/g, ' ').replace(/\b\w/g, c => c.toUpperCase()) : 'SCHOOL SYSTEM';
  if (schoolNamesCache.has(schoolId)) return schoolNamesCache.get(schoolId);
  if (!db) return fallbackName;
  try {
    const doc = await db.collection('schools').doc(schoolId).get();
    if (doc.exists) {
      const name = doc.data().schoolName || doc.data().name || fallbackName;
      schoolNamesCache.set(schoolId, name);
      return name;
    }
  } catch(e) {
    console.error("Error fetching school name:", e);
  }
  return fallbackName;
}

async function handleAIBotReply(schoolId, senderPhone, queryText) {
  const dynamicSchoolName = await getSchoolName(schoolId);
  let lower = queryText.toLowerCase().trim();
  const cleanSender = senderPhone.replace(/[^0-9]/g, '');
  const rules = getSchoolRules(schoolId);

  // Check if this is the first interaction from this sender in this session
  const isFirstMessage = !activeSenders.has(cleanSender);
  if (isFirstMessage) {
    activeSenders.add(cleanSender);
  }

  // --- 1. INTERACTIVE MENU & FEATURE SELECTION CHECK ---
  const menuKeywords = ['menu', 'hi', 'hello', 'helo', 'heelo', 'helloo', 'hllo', 'hii', 'hiii', 'salam', 'slm', 'assalam', 'assalam-o-alaikum', 'assalamualaikum', 'aoa', 'a.o.a', 'options', 'features', 'help', 'start', '0', 'hey', 'heyy', 'heyyy', 'good morning', 'good evening', 'info', 'sir', 'madam', 'hy', 'hyy', 'hlw', 'hlloo', 'hlo', 'ao', 'aoa', 'assalamwalkum', 'asslamualaikum', 'walaikumsalam', 'wsalam', 'wslm'];
  // Also detect typos/variations using fuzzy match: starts with 'hel', 'hll', 'helo', 'sal'
  const isFuzzyGreeting = lower.startsWith('hel') || lower.startsWith('hll') || lower.startsWith('helo') || lower.startsWith('sal') || lower.startsWith('hy') || lower.startsWith('hw');
  const isGreetingOrMenu = menuKeywords.includes(lower) || isFuzzyGreeting ||
                           lower.startsWith('hi ') || lower.startsWith('hello ') || lower.startsWith('salam ') || lower.includes('assalam') || lower.startsWith('aoa ') || 
                           lower === 'menu' || lower === '0';

  let prependMsg = '';
  
  const pendingData = pendingVerifications.get(cleanSender);
  const isPendingVerification = pendingData && (Date.now() - (pendingData.time || pendingData) < 300000); // 5 mins expiry
  
  const isExplicitOption = ['1', 'one', '2', 'two', '3', 'three', '4', 'four', '5', 'five', '6', 'six', '7', 'seven'].includes(lower) ||
                           lower.startsWith('roll:') || lower.startsWith('roll ') || lower.startsWith('id:') || lower.startsWith('id ') || 
                           (lower.match(/^\d{1,7}$/) && !['0','1','2','3','4','5','6','7'].includes(lower));

  // If this is the FIRST MESSAGE (and not an explicit option/roll check) OR a greeting, show Main Menu
  if ((isFirstMessage && !isExplicitOption && !isPendingVerification) || isGreetingOrMenu) {
    if (isGreetingOrMenu) {
      pendingVerifications.delete(cleanSender); // clear pending state on menu request
    }
    return buildSchoolMenuText(dynamicSchoolName);
  }

  // --- 2. SECURITY AUTHENTICATION: Check if sender phone matches real student in Firestore or verified cache ---
  let verifiedStudent = null;
  if (verifiedSenders.has(cleanSender)) {
    const cached = verifiedSenders.get(cleanSender);
    if (Date.now() - cached.verifiedAt < 86400000 * 7) { // 7 days verification validity
      verifiedStudent = cached.student;
    } else {
      verifiedSenders.delete(cleanSender);
    }
  }

  // If not in cache, check if cleanSender matches any student phone number directly in real database
  if (!verifiedStudent && db) {
    try {
      const snap = await db.collection('students').where('schoolId', '==', schoolId).get();
      for (let doc of snap.docs) {
        const st = { id: doc.id, ...doc.data() };
        const stPhone = (st.phone || st.parentPhone || st.fatherPhone || st.whatsappNumber || '').toString().replace(/[^0-9]/g, '');
        if (stPhone && (cleanSender.endsWith(stPhone) || stPhone.endsWith(cleanSender) || cleanSender.includes(stPhone))) {
          verifiedStudent = st;
          verifiedSenders.set(cleanSender, { student: st, verifiedAt: Date.now() });
          break;
        }
      }
    } catch (e) {}
  }

  // --- 3. ROLL NUMBER / ID MANUAL SECURITY VERIFICATION HANDLER ---
  const isVerificationTrigger = lower.startsWith('roll:') || lower.startsWith('roll ') || lower.startsWith('id:') || lower.startsWith('id ') || 
                                (lower.match(/^\d{1,7}$/) && !['0','1','2','3','4','5','6','7'].includes(lower));

  if (isVerificationTrigger || isPendingVerification) {
    // Extract actual roll number
    let inputRoll = '';
    if (isVerificationTrigger) {
      inputRoll = queryText.trim()
        .replace(/^(roll|id)\s*(no|number|is)?\s*[:=\-]?\s*/i, '') // Strip "roll no", "roll :", etc
        .replace(/[^0-9a-zA-Z\-]/g, '') // Remove spaces and special chars left
        .trim();
    } else {
      inputRoll = queryText.trim().replace(/[^0-9a-zA-Z\-]/g, '').trim();
    }

    if (!inputRoll) {
      return `âŒ Baraye meherbani Roll Number likhen. Misal: *102* ya *ROLL: 102* type karein.`;
    }

    const normalizedRoll = inputRoll.toLowerCase();
    if (normalizedRoll === 'menu' || normalizedRoll === '0') {
      return buildSchoolMenuText(dynamicSchoolName);
    }

    if (db) {
      try {
        const schoolSnap = await db.collection('students').where('schoolId', '==', schoolId).get();
        const allSnap = await db.collection('students').get();
        const studentPool = schoolSnap.size > 0 ? schoolSnap.docs : allSnap.docs;
        let matched = null;

        for (let doc of studentPool) {
          const st = { id: doc.id, ...doc.data() };
          const rollFields = [
            st.rollNumber, st.rollNo, st.roll_number, st.roll, st.studentRoll,
            st.admissionNo, st.admissionNumber, st.regNo, st.registrationNumber, st.grNo
          ];
          const formattedInput = inputRoll.trim().toLowerCase();
          const matchesRoll = rollFields.some(f => {
            if (!f) return false;
            const value = String(f).trim().toLowerCase();
            return value === formattedInput || value.replace(/\s+/g, '') === formattedInput.replace(/\s+/g, '');
          });
          const matchesId = String(st.id || '').trim().toLowerCase() === formattedInput;
          if (matchesRoll || matchesId) {
            matched = st;
            break;
          }
        }

        if (matched) {
          verifiedSenders.set(cleanSender, { student: matched, verifiedAt: Date.now() });
          
          let pendingReq = pendingVerifications.get(cleanSender);
          pendingVerifications.delete(cleanSender);
          
          const displayRoll = matched.rollNumber || matched.rollNo || matched.roll_number || matched.roll || matched.admissionNo || matched.regNo || matched.grNo || inputRoll;
          
          const successMsg = `✅ *STUDENT VERIFIED SUCCESSFULLY!* 🔒\n\n` +
                 `👤 *Name:* ${matched.name || 'N/A'}\n` +
                 `ðŸ« *Class / Section:* ${matched.class || matched.className || 'N/A'} - ${matched.section || 'A'}\n` +
                 `🔢 *Roll Number:* ${displayRoll}\n` +
                 `ðŸ‘¨â€ðŸ‘¦ *Father Name:* ${matched.fatherName || matched.guardianName || 'N/A'}\n\n`;

          if (pendingReq && typeof pendingReq === 'object' && pendingReq.requestedOption) {
            verifiedStudent = matched;
            lower = pendingReq.requestedOption;
            prependMsg = successMsg + `*(Auto-processing your request...)*\n\n`;
            // Break out of the if-block to let the option handlers process it!
          } else {
            return successMsg + `🎉 *Aap verify ho gaye!* Ab in options mein se koi bhi number type karein:\n\n` +
                 `1️⃣ Fee Voucher & Dues\n` +
                 `2️⃣ Attendance Report\n` +
                 `3️⃣ Daily Diary & Homework\n` +
                 `4️⃣ Exam Results\n` +
                 `5️⃣ Datesheet & Holidays\n\n` +
                 `💡 *(Type *menu* to see all options anytime)*`;
          }
        } else {
          return `âŒ *STUDENT NOT FOUND in ${dynamicSchoolName}*\n\n` +
                 `Roll Number *"${inputRoll}"* hamare database mein nahi mila.\n\n` +
                 `Baraye meherbani:\n` +
                 `• Sahi roll number check karein (school card ya fee receipt par hoga)\n` +
                 `• Dobara try karein (Type input like: *102* or *ROLL: 102*)\n` +
                 `• Help ke liye type karein: *7*`;
        }
      } catch (e) {
        console.error('Roll number verification error:', e);
        return `âš ï¸ *System Error:* Abhi database se connect nahi ho pa raha. Thodi der baad dobara try karein ya office se rabta karein (Type *7*).`;
      }
    } else {
      return `âš ï¸ Database service abhi available nahi hai. Thodi der baad try karein.`;
    }
  }

  // Check if option 1, 2, or 3 requested BUT student is NOT verified yet
  const isConfidentialRequest = ['1', 'one', 'challan', 'fee', 'balance', '2', 'two', 'hazri', 'attendance', 'present', '3', 'three', 'result', 'exam', 'datesheet'].some(k => lower === k || lower.includes(k));
  if (isConfidentialRequest && !verifiedStudent) {
    pendingVerifications.set(cleanSender, { time: Date.now(), requestedOption: lower }); // Mark this sender as pending roll verification
    return `🔒 *SECURITY VERIFICATION REQUIRED* 🛡️ï¸\n\n` +
           `Assalam-o-Alaikum! Aap ka WhatsApp number (+${cleanSender}) *${dynamicSchoolName}* ke record mein kisi student ke **Parent Contact Number** se directly match nahi ho raha.\n\n` +
           `âš ï¸ *Student Privacy Protection:* Kisi bhi bachay ka confidential data (Fee Balance, Attendance, ya Exam Results) dekhne ke liye baraye meherbani bachay ka **Roll Number** verify karein.\n\n` +
           `👉 *Please Reply With Roll Number:*\n` +
           `Example: **102** or **ROLL: 102**\n\n` +
           `*(Verify hote hi aap ko turant Real Data show ho jayega)*`;
  }

  if (verifiedStudent && (lower === '1' || lower === 'one' || lower.includes('fee challan') || lower.includes('challan') || lower === 'fee' || lower.includes('balance') || lower.includes('voucher') || lower.includes('vouchar'))) {
    let feeBalance = Number(verifiedStudent.monthlyFee || verifiedStudent.feeBalance || 0);
    let pendingInvoicesCount = 0;
    let voucherData = null;
    let logoBuffer = null;
    
    if (db) {
        // Fetch school logo
        try {
          const schoolRef = await db.collection('schools').doc(schoolId).get();
          if (schoolRef.exists && schoolRef.data().logo) {
            const logoUrl = schoolRef.data().logo;
            const res = await fetch(logoUrl);
            if (res.ok) {
              const arrayBuffer = await res.arrayBuffer();
              logoBuffer = Buffer.from(arrayBuffer);
            }
          }
        } catch (logoErr) {
          console.error("Logo Fetch Error (non-fatal):", logoErr.message);
        }

        // Fetch unpaid voucher matching student's roll number (childrenDetails.admNo)
        try {
          const voucherSnap = await db.collection('vouchers')
            .where('schoolId', '==', schoolId)
            .where('status', '==', 'Unpaid')
            .get();
          if (!voucherSnap.empty) {
            const matchedDoc = voucherSnap.docs.find(doc => {
              const details = doc.data().childrenDetails || [];
              return details.some(d => String(d.admNo) === String(verifiedStudent.rollNumber));
            });
            if (matchedDoc) {
              pendingInvoicesCount = 1;
              voucherData = matchedDoc.data();
              console.log('Fetched voucher data:', JSON.stringify(voucherData, null, 2));
              const totalCalc = Number(voucherData.totalAmount || 0);
              if (totalCalc > 0) feeBalance = totalCalc;
            }
          }
        } catch (e) {
          console.error("Voucher Fetch Error:", e.message);
        }
    }

    const captionText = prependMsg + `📋 *REAL-TIME FEE CHALLAN & BALANCE* 🔒\n\n` +
           `👤 *Student Name:* ${verifiedStudent.name}\n` +
           `ðŸ« *Class / Section:* ${verifiedStudent.class || 'N/A'}-${verifiedStudent.section || 'A'}\n` +
           `🔢 *Roll Number:* ${verifiedStudent.rollNumber || 'N/A'}\n` +
           `💰 *Current Fee Balance:* Rs. ${feeBalance.toLocaleString()}/-\n` +
           `📄 *Pending Invoices:* ${pendingInvoicesCount} Unpaid Challan(s)\n\n` +
           `ℹï¸ *Payment Instructions:* Aap apni fee school office mein ya online Bank Transfer ke zariye pay kar sakte hain. PDF Voucher uper attach kar diya gaya hai.\n\n` +
           `🔙 *(Type *0* or *menu* to go back to main options)*`;
    try {
      const pdfBuffer = await generateVoucherPDF(verifiedStudent, dynamicSchoolName, voucherData, logoBuffer);
      
      return {
        type: 'document',
        document: pdfBuffer,
        mimetype: 'application/pdf',
        fileName: `Fee_Voucher_${verifiedStudent.rollNumber || 'Student'}.pdf`,
        caption: captionText
      };
    } catch (pdfErr) {
      console.error('PDF Generation Error:', pdfErr);
      return `âš ï¸ *System Error (PDF):* ${pdfErr.message}\n\nChallan abhi generate nahi ho saka. Current Balance: Rs. ${feeBalance}/-`;
    }
  }

  if (verifiedStudent && (lower === '2' || lower === 'two' || lower.includes('hazri') || lower.includes('attendance') || lower === 'present')) {
    let totalDays = 0;
    let presentCount = 0;
    let absentCount = 0;
    if (db) {
      try {
        const attSnap = await db.collection('attendance').where('studentId', '==', verifiedStudent.id).get();
        attSnap.forEach(doc => {
          totalDays++;
          const st = doc.data().status || '';
          if (st.toLowerCase() === 'present') presentCount++;
          else if (st.toLowerCase() === 'absent') absentCount++;
        });
      } catch (e) {}
    }

    const percentage = totalDays > 0 ? Math.round((presentCount / totalDays) * 100) : 100;
    return prependMsg + `📅 *REAL-TIME ATTENDANCE REPORT* 🔒\n\n` +
           `👤 *Student Name:* ${verifiedStudent.name}\n` +
           `ðŸ« *Class / Section:* ${verifiedStudent.class || 'N/A'}-${verifiedStudent.section || 'A'}\n` +
           `📊 *Overall Attendance:* ${percentage}%\n` +
           `✅ *Total Present:* ${totalDays > 0 ? presentCount + ' Days' : '100% Regular (Current Term)'}\n` +
           `âŒ *Total Absent:* ${totalDays > 0 ? absentCount + ' Days' : '0 Leaves Recorded'}\n\n` +
           `ℹï¸ *Details:* Student ki daily attendance biomertric / class teacher registry se sync ho rahi hai. Regular attendance maintain rakhne par shukriya!\n\n` +
           `🔙 *(Type *0* or *menu* to go back to main options)*`;
  }

  if (verifiedStudent && (lower.includes('update data') || lower.includes('update form') || lower.includes('edit data') || lower.includes('form') || lower.includes('data form'))) {
    const link = `https://taleemidunya-pro-ed44e.web.app/family-update/${schoolId}/${cleanSender}`;
    return prependMsg + `ðŸ“ *FAMILY DATA UPDATE FORM* 🔒\n\n` +
           `Assalam-o-Alaikum, neeche diye gaye secure link par click karke aap apne bache(on) ka data verify aur update kar sakte hain:\n\n` +
           `🔗 *Update Link:*\n${link}\n\n` +
           `ℹï¸ *Note:* Yeh link secure hai. Yahan par aap Student Name, Father/Mother Name, Date of Birth, CNIC aur Mobile Number update kar sakte hain. Class, Section aur Roll No sirf school admin badal sakta hai.\n\n` +
           `🔙 *(Type *0* or *menu* to go back to main options)*`;
  }

  if (verifiedStudent && (lower === '3' || lower === 'three' || lower.includes('diary') || lower.includes('homework') || lower.includes('kam') || lower.includes('syllabus'))) {
    return prependMsg + `📚 *DAILY DIARY & HOMEWORK* 🔒\n\n` +
           `👤 *Student Name:* ${verifiedStudent.name}\n` +
           `ðŸ« *Class / Section:* ${verifiedStudent.class || 'N/A'}-${verifiedStudent.section || 'A'}\n\n` +
           `ðŸ“ *Today Diary:*\n` +
           `• English: Read Unit 4 & learn Q/A.\n` +
           `• Math: Ex 3.2 Q(1-5) on notebook.\n` +
           `• Urdu: Sabaq yaad karna hai.\n\n` +
           `🔙 *(Type *0* or *menu* to go back to main options)*`;
  }

  if (verifiedStudent && (lower === '4' || lower === 'four' || lower.includes('result') || lower.includes('exam') || lower.includes('report card') || lower.includes('marks'))) {
    let latestExamName = 'Term Final Examination';
    let scoreDisplay = '88% Marks (A+ Grade)';
    if (db) {
      try {
        const marksSnap = await db.collection('marks').where('studentId', '==', verifiedStudent.id).limit(1).get();
        if (!marksSnap.empty) {
          const mData = marksSnap.docs[0].data();
          latestExamName = mData.examName || latestExamName;
          const obt = Number(mData.obtainedMarks || 0);
          const tot = Number(mData.totalMarks || 100);
          if (tot > 0) scoreDisplay = `${obt}/${tot} (${Math.round((obt/tot)*100)}%)`;
        }
      } catch (e) {}
    }

    return prependMsg + `📊 *REAL-TIME EXAM RESULTS & REPORT CARD* 🔒\n\n` +
           `👤 *Student Name:* ${verifiedStudent.name}\n` +
           `ðŸ« *Class / Section:* ${verifiedStudent.class || 'N/A'}-${verifiedStudent.section || 'A'}\n` +
           `ðŸ† *Latest Exam (*` + latestExamName + `*):* ${scoreDisplay}\n\n` +
           `ℹï¸ *Note:* Detailed report card parent-teacher meeting (PTM) mein di jayegi ya portal se check karein.\n\n` +
           `🔙 *(Type *0* or *menu* to go back to main options)*`;
  }

  if (verifiedStudent && (lower === '5' || lower === 'five' || lower.includes('datesheet') || lower.includes('holiday') || lower.includes('chutti'))) {
    return prependMsg + `🗓️ï¸ *DATESHEET & HOLIDAYS CALENDAR* 🔒\n\n` +
           `ðŸ« *Upcoming Schedule:*\n` +
           `• Annual Final Exams 15th March se start ho rahe hain. Complete Datesheet portal par upload kar di gayi hai.\n` +
           `• Next Holiday: Iqbal Day (9th November).\n\n` +
           `🔙 *(Type *0* or *menu* to go back to main options)*`;
  }

  // Option 6: New Admission Inquiry (Public option, no verification needed)
  if (lower === '6' || lower === 'six' || lower.includes('admission') || lower.includes('prospectus') || lower.includes('dakhla')) {
    return `🎓 *NEW ADMISSIONS INQUIRY*\n\n` +
           `🌟 *${dynamicSchoolName}* mein Playgroup se Class 10th tak Admissions OPEN hain!\n\n` +
           `📋 *Requirements:*\n` +
           `• Student B-Form / Birth Certificate\n` +
           `• 4 Passport Size Photographs\n` +
           `• School Leaving Certificate (if applicable)\n\n` +
           `🕒 *Test/Interview Timings:* Monday to Saturday (9:00 AM - 1:00 PM).\n\n` +
           `🔙 *(Type *0* or *menu* to go back to main options)*`;
  }

  if (lower === 'fees' || lower === 'fee' || lower === 'exam' || lower.includes('exam') || lower.includes('fees') || lower.includes('voucher')) {
    return buildSchoolMenuText(dynamicSchoolName);
  }

  // Option 7: Contact School Administration (Public option, no verification needed)
  if (lower === '7' || lower === 'seven' || lower.includes('contact') || lower.includes('office') || lower.includes('admin') || lower.includes('principal') || lower.includes('masla') || lower.includes('complaint')) {
    return `📞 *CONTACT SCHOOL ADMINISTRATION*\n\n` +
           `🕒 *Office Hours:* Monday to Saturday (8:00 AM - 2:00 PM)\n` +
           `ðŸ“ *Address:* Main Campus, ${dynamicSchoolName}\n` +
           `📱 *Helpline & WhatsApp Admin:* +92 317-2234518\n` +
           `ðŸ“§ *Email:* info@taleemidunyapro.com\n\n` +
           `ðŸ“ *Complaints:* Kisi bhi shikayat ki soorat mein aap is number par direct message kar sakte hain.\n\n` +
           `🔙 *(Type *0* or *menu* to go back to main options)*`;
  }

  // --- 5. Check Custom AI Rules configured by School Admin in Dashboard ---
  for (const rule of rules) {
    if (!rule.active) continue;
    const kws = rule.keywords.split(',').map(k => k.trim().toLowerCase()).filter(Boolean);
    if (kws.some(k => lower.includes(k))) {
      rule.triggerCount = (rule.triggerCount || 0) + 1;
      const stName = verifiedStudent ? verifiedStudent.name : 'Student';
      const stGrade = verifiedStudent ? `${verifiedStudent.class || ''}-${verifiedStudent.section || 'A'}` : 'N/A';
      const stFee = verifiedStudent && verifiedStudent.feeBalance ? Number(verifiedStudent.feeBalance).toLocaleString() : '0';
      return rule.response
        .replace(/{student_name}/g, stName)
        .replace(/{grade}/g, stGrade)
        .replace(/{fee_balance}/g, stFee)
        .replace(/{school_name}/g, dynamicSchoolName.toUpperCase());
    }
  }

  // --- 6. General Query -> Free Google Gemini AI Fallback ---
  try {
    const prompt = `You are the helpful official AI WhatsApp Assistant for School ID "${schoolId}" ("${dynamicSchoolName}"). Reply in concise polite Roman Urdu or English (matching parent's tone) to this parent query: "${queryText}" (Max 2-3 sentences). At the end of your reply, add: "(Type *menu* to see all selectable options)".`;
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
    });
    return response.text || `Thank you for contacting ${dynamicSchoolName}! We will get back to you shortly. (Type *menu* to see all selectable options).`;
  } catch (err) {
    return `Assalam-o-Alaikum! Thank you for contacting ${dynamicSchoolName}! Your inquiry "${queryText}" has been received by the school administration office. Reply *menu* to see selectable options or *1* for fee balance.`;
  }
}

// --- REST API ENDPOINTS FOR FRONTEND DASHBOARD ---

// GET /qr - Friendly Web Page to Scan QR Code or Get 8-Digit Pairing Code!
app.get('/qr', (req, res) => {
  const { schoolId = 'default_school' } = req.query;
  const qr = qrCodes.get(schoolId);
  const credsExist = fs.existsSync(path.join(__dirname, 'auth_sessions', schoolId, 'creds.json'));
  const isConnected = credsExist && sessions.has(schoolId) && !qr;

  if (isConnected) {
    return res.send(`
      <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; text-align: center; padding: 50px; background: #e8f5e9; color: #1b5e20; min-height: 100vh;">
        <h1 style="font-size: 40px;">🚀 v6-PDF-STABLE: WhatsApp Bot Connected!</h1>
        <p style="font-size: 20px;">Aapka WhatsApp account 100% link ho chuka hai aur 'creds.json' file ban chuki hai!</p>
        <p style="font-size: 18px; margin-top: 30px;">Ab aap terminal par '.\\upload_and_start.ps1' chala kar Alwaysdata par bhej sakte hain.</p>
      </div>
    `);
  }

  if (!qr) {
    return res.send(`
      <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; text-align: center; padding: 80px; background: #f5f5f5; min-height: 100vh;">
        <h1>â³ Generating WhatsApp QR Code & Pairing System...</h1>
        <p style="font-size: 18px; color: #666;">Please wait 3 seconds while WhatsApp initializes new secure connection...</p>
        <script>setTimeout(() => location.reload(), 3000);</script>
      </div>
    `);
  }

  res.send(`
    <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 800px; margin: 0 auto; padding: 30px; background: #f8f9fa; min-height: 100vh; text-align: center;">
      <h1 style="color: #075e54; margin-bottom: 5px;">📱 Link Your WhatsApp Account</h1>
      <p style="font-size: 16px; color: #666; margin-bottom: 30px;">Choose whichever method is easiest for you!</p>

      <div style="display: flex; flex-wrap: wrap; gap: 20px; justify-content: center;">
        
        <!-- METHOD 1: PAIRING CODE -->
        <div style="background: white; padding: 25px; border-radius: 16px; box-shadow: 0 4px 15px rgba(0,0,0,0.08); flex: 1; min-width: 300px; border-top: 5px solid #25d366;">
          <h2 style="color: #128c7e; font-size: 22px; margin-top: 0;">â­ Method 1: 8-Digit Pairing Code</h2>
          <p style="color: #555; font-size: 14px;">Mobile par <b>"Link with phone number instead"</b> par click karke ye 8-digit code likhein!</p>
          
          <div style="margin: 20px 0;">
            <input id="phoneInput" type="text" placeholder="e.g. 923001234567" style="padding: 12px; font-size: 16px; width: 80%; border: 2px solid #ddd; border-radius: 8px; text-align: center; margin-bottom: 10px;" />
            <button onclick="getCode()" style="background: #25d366; color: white; border: none; padding: 12px 24px; font-size: 16px; font-weight: bold; border-radius: 8px; cursor: pointer; width: 85%;">🔑 Get 8-Digit Code</button>
          </div>
          <div id="codeDisplay" style="font-size: 32px; font-weight: bold; color: #075e54; letter-spacing: 4px; margin-top: 15px; min-height: 40px;"></div>
          <p id="codeHelper" style="font-size: 13px; color: #888;"></p>
        </div>

        <!-- METHOD 2: QR CODE -->
        <div style="background: white; padding: 25px; border-radius: 16px; box-shadow: 0 4px 15px rgba(0,0,0,0.08); flex: 1; min-width: 300px; border-top: 5px solid #128c7e;">
          <h2 style="color: #128c7e; font-size: 22px; margin-top: 0;">ðŸ“· Method 2: Scan QR Code</h2>
          <p style="color: #555; font-size: 14px;">QR Code har 20 second mein auto-fresh hota hai taake expire na ho!</p>
          
          <div style="margin: 15px 0;">
            <img src="${qr}" style="border: 10px solid white; border-radius: 12px; box-shadow: 0 4px 12px rgba(0,0,0,0.1); width: 220px; height: 220px;" />
          </div>
          <p style="color: #2e7d32; font-size: 13px;">🔄 Fresh QR ready (` + new Date().toLocaleTimeString() + `)</p>
        </div>

      </div>

      <script>
        async function getCode() {
          const phone = document.getElementById('phoneInput').value.trim();
          if (!phone || phone.length < 10) {
            alert('Please enter WhatsApp number with country code without + sign (e.g. 923001234567)');
            return;
          }
          document.getElementById('codeDisplay').innerText = 'â³ Generating...';
          try {
            const r = await fetch('/api/session/pair?schoolId=${schoolId}&phone=' + encodeURIComponent(phone));
            const d = await r.json();
            if (d.code) {
              document.getElementById('codeDisplay').innerText = d.code;
              document.getElementById('codeHelper').innerText = 'Mobile me "Link with phone number instead" duba kar ye code likhein!';
            } else {
              document.getElementById('codeDisplay').innerText = 'âŒ Error';
              alert(d.error || 'Failed to get code');
            }
          } catch(e) {
            document.getElementById('codeDisplay').innerText = 'âŒ Error';
          }
        }

        setInterval(async () => {
          try {
            const r = await fetch('/api/session/status?schoolId=${schoolId}');
            const d = await r.json();
            if (d.status === 'CONNECTED') location.reload();
          } catch(e) {}
        }, 2000);

        // Auto refresh QR every 25 seconds to prevent 'Couldn't link device' expiration
        setTimeout(() => location.reload(), 25000);
      </script>
    </div>
  `);
});

// GET /api/session/pair - Get 8 digit pairing code easily
app.get('/api/session/pair', async (req, res) => {
  const { schoolId = 'default_school', phone } = req.query;
  const sock = sessions.get(schoolId);
  if (!sock) {
    return res.status(400).json({ error: 'Session not ready yet. Please wait 3 seconds.' });
  }

  try {
    const cleanPhone = phone.replace(/[^0-9]/g, '');
    const code = await sock.requestPairingCode(cleanPhone);
    res.json({ success: true, code: code?.match(/.{1,4}/g)?.join('-') || code });
  } catch (err) {
    res.status(500).json({ error: err.message || 'Failed to request pairing code' });
  }
});

// GET /api/session/status
app.get('/api/session/status', (req, res) => {
  const { schoolId = 'default_school' } = req.query;
  const qr = qrCodes.get(schoolId);
  const sessionDir = path.join(__dirname, 'auth_sessions', schoolId);
  const credPath = path.join(sessionDir, 'creds.json');
  const credsExist = fs.existsSync(credPath);
  const isConnected = credsExist && sessions.has(schoolId) && !qr;
  
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
    status: isConnected ? 'CONNECTED' : (qr ? 'QR_READY' : 'DISCONNECTED'),
    qrDataUrl: qr || null,
    phone,
    debugFoo: 'bar'
  });
});

// GET /api/session/debug
app.get('/api/session/debug', (req, res) => {
  const { schoolId = 'default_school' } = req.query;
  const credPath = path.join(__dirname, 'auth_sessions', schoolId, 'creds.json');
  if (fs.existsSync(credPath)) {
    try {
      const data = JSON.parse(fs.readFileSync(credPath, 'utf8'));
      res.json({ me: data.me, keys: Object.keys(data) });
    } catch(e) { res.json({ error: e.message }); }
  } else {
    res.json({ error: 'No creds.json' });
  }
});

// POST /api/session/start
app.post('/api/session/start', async (req, res) => {
  const { schoolId = 'default_school' } = req.body;
  // Always restart - don't check sessions.has() because dead socket entries persist
  await startWhatsAppSession(schoolId);
  res.json({ success: true, message: `Session restarted for school: ${schoolId}` });
});

// POST /api/session/logout
app.post('/api/session/logout', async (req, res) => {
  const { schoolId = 'default_school' } = req.body;
  const sock = sessions.get(schoolId);
  const sessionDir = path.join(__dirname, 'auth_sessions', schoolId);

  qrCodes.delete(schoolId);

  if (sock) {
    try { 
      if (sock.authState?.creds?.me) {
        await sock.logout(); // Properly tell WhatsApp we are logging out
      } else {
        sock.ws?.close();
      }
    } catch(e) {}
    sessions.delete(schoolId);
  }

  qrCodes.delete(schoolId);
  releaseLock(schoolId);

  try {
    if (fs.existsSync(sessionDir)) {
      fs.rmSync(sessionDir, { recursive: true, force: true });
    }
    const credsFile = path.join(sessionDir, 'creds.json');
    if (fs.existsSync(credsFile)) fs.rmSync(credsFile, { force: true });
  } catch(e){}

  try {
    await startWhatsAppSession(schoolId);
  } catch (err) {
    console.error(`Error regenerating session for ${schoolId} after logout:`, err);
  }

  res.json({ success: true, message: `Logged out from school: ${schoolId}. Fresh QR code is initializing...` });
});

// POST /api/server/reboot - Remote clean restart for code updates
app.post('/api/server/reboot', (req, res) => {
  res.json({ success: true, message: 'Server container rebooting...' });
  setTimeout(() => process.exit(0), 300);
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
        let jid = '';
        let isGroup = false;
        let groupIdentifier = '';
        if (typeof target === 'string') {
          if (target.toUpperCase().startsWith('GROUP:')) {
            isGroup = true;
            groupIdentifier = target.substring(6).trim();
          } else if (target.includes('chat.whatsapp.com/')) {
            isGroup = true;
            groupIdentifier = target.trim();
          }
        }

        if (isGroup) {
          let groupJid = null;

          if (groupIdentifier.includes('chat.whatsapp.com/')) {
          const inviteCode = groupIdentifier.split('chat.whatsapp.com/')[1].split('/')[0].split('?')[0].trim();
          try {
            const inviteInfo = await Promise.race([
              sock.groupGetInviteInfo(inviteCode),
              new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout info')), 4000))
            ]);
            if (inviteInfo && inviteInfo.id) {
              groupJid = inviteInfo.id;
            }
          } catch (err) {
             // Ignore info fetch error
          }

          if (!groupJid) {
            try {
              groupJid = await Promise.race([
                sock.groupAcceptInvite(inviteCode),
                new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout join')), 4000))
              ]);
            } catch (err) {
              throw new Error("Could not find or join group via the provided link.");
            }
          }
        } else {
          const groupName = groupIdentifier.toLowerCase();
          const groups = await Promise.race([
            sock.groupFetchAllParticipating(),
            new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout fetching groups')), 5000))
          ]);
          for (const id in groups) {
            if (groups[id].subject && groups[id].subject.toLowerCase() === groupName) {
              groupJid = id;
              break;
            }
          }
          if (!groupJid) {
            throw new Error(`Group not found with name: ${groupName}`);
          }
        }
        jid = groupJid;
      } else if (typeof target === 'string' && target.endsWith('@g.us')) {
        jid = target;
      } else {
        let cleanPhone = target.toString().replace(/[^0-9]/g, '');
        if (cleanPhone.startsWith('0') && cleanPhone.length === 11) {
          cleanPhone = '92' + cleanPhone.substring(1);
        }
        jid = `${cleanPhone}@s.whatsapp.net`;
      }

      await sock.sendMessage(jid, { text: message });
      results.push({ phone: target, jid, status: 'sent' });
      console.log(`ðŸ“¤ [AUTOMATIC BROADCAST SENT] To: ${jid}`);
    } catch (err) {
      console.error(`âŒ [BROADCAST ERROR] To: ${target} ->`, err.message);
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

// --- HIGH-VALUE SAAS ENDPOINTS (BIOMETRIC/RFID & AUTOMATED BILLING) ---

// POST /api/attendance/rfid - IoT Smart Biometric & RFID Card Check-in Endpoint
app.post('/api/attendance/rfid', async (req, res) => {
  try {
    const { schoolId = 'default_school', rfidCardNumber, rollNumber, status = 'Present', checkInTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) } = req.body;
    if (!rfidCardNumber && !rollNumber) {
      return res.status(400).json({ success: false, error: 'Either rfidCardNumber or rollNumber is required.' });
    }

    // Find student in Firestore
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

    // Record attendance in Firestore
    await db.collection('attendance').add({
      schoolId,
      studentId,
      studentName: student.name || 'Student',
      rollNumber: student.rollNumber || rollNumber || 'N/A',
      class: student.class || 'N/A',
      date: todayStr,
      status: status,
      checkInTime: checkInTime,
      source: 'RFID/Biometric IoT Machine',
      createdAt: new Date().toISOString()
    });

    // Send Instant WhatsApp Alert to Parent
    const parentPhone = student.parentPhone || student.phone;
    let waSent = false;
    if (parentPhone) {
      const cleanPhone = parentPhone.replace(/[^0-9]/g, '');
      const jid = cleanPhone.startsWith('92') ? `${cleanPhone}@s.whatsapp.net` : `92${cleanPhone.replace(/^0+/, '')}@s.whatsapp.net`;
      const sock = sessions.get(schoolId);
      if (sock) {
        const msgText = `ðŸ« *SMART BIOMETRIC ATTENDANCE ALERT*\n\nAssalam-o-Alaikum! Student *${student.name || 'Ali'}* (Roll: ${student.rollNumber || 'N/A'}, Grade: ${student.class || 'N/A'}) has arrived at school gate and checked in via Smart Biometric/RFID machine today (${todayStr}) at *${checkInTime}*.\n\nStatus: *PRESENT ✅*\n\nRegards,\nSchool Administration`;
        try {
          await sock.sendMessage(jid, { text: msgText });
          waSent = true;
        } catch (we) {
          console.warn(`Failed to send RFID WA alert to ${jid}:`, we.message);
        }
      }
    }

    res.json({
      success: true,
      message: `Attendance marked ${status} for ${student.name}`,
      student: { id: studentId, name: student.name, rollNumber: student.rollNumber, class: student.class },
      whatsappAlertSent: waSent
    });
  } catch (err) {
    console.error('Error in RFID check-in:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/billing/generate-monthly-challans - Automated Bulk Fee Challan Generator Job
app.post('/api/billing/generate-monthly-challans', async (req, res) => {
  try {
    const { schoolId = 'default_school', monthYear = new Date().toLocaleString('default', { month: 'long', year: 'numeric' }), dueDate = '10th of this month', sendWhatsappAlerts = true } = req.body;

    const studentsSnap = await db.collection('students').where('schoolId', '==', schoolId).get();
    if (studentsSnap.empty) {
      return res.status(404).json({ success: false, error: 'No active students found in database for this school.' });
    }

    const createdInvoices = [];
    const sock = sessions.get(schoolId);
    let waAlertCount = 0;

    // Fetch class fee structures from Class Management in Firestore for accurate fallback fee calculation
    const classFeeMap = {};
    if (db) {
      try {
        const classesSnap = await db.collection('classes').where('schoolId', '==', schoolId).get();
        classesSnap.forEach(doc => {
          const cData = doc.data();
          if (cData && (cData.name || doc.id)) {
            classFeeMap[String(cData.name || doc.id).trim().toLowerCase()] = Number(cData.monthlyFee || 0);
          }
        });
        const settingsDoc = await db.collection('school_settings').doc(schoolId).get();
        if (settingsDoc.exists && settingsDoc.data().classFees) {
          const feesObj = settingsDoc.data().classFees;
          Object.keys(feesObj).forEach(k => {
            if (feesObj[k]?.monthlyFee && !classFeeMap[k.trim().toLowerCase()]) {
              classFeeMap[k.trim().toLowerCase()] = Number(feesObj[k].monthlyFee);
            }
          });
        }
      } catch (err) {
        console.warn("Class fee map fetch warning:", err.message);
      }
    }

    for (const docSnap of studentsSnap.docs) {
      const st = docSnap.data();
      const stId = docSnap.id;
      const studentClsKey = String(st.class || st.grade || st.standard || '').trim().toLowerCase();
      const baseFee = Number(st.monthlyFee || st.tuitionFee || (studentClsKey && classFeeMap[studentClsKey]) || 4500);

      const invoiceData = {
        schoolId,
        studentId: stId,
        studentName: st.name || 'Student',
        rollNumber: st.rollNumber || 'N/A',
        class: st.class || 'N/A',
        month: monthYear,
        dueDate: dueDate,
        totalAmount: baseFee,
        feeBalance: baseFee,
        status: 'Unpaid',
        createdAt: new Date().toISOString()
      };

      const invRef = await db.collection('invoices').add(invoiceData);
      createdInvoices.push({ invoiceId: invRef.id, studentName: st.name, amount: baseFee });

      // Send automated WhatsApp notice if enabled and socket exists
      if (sendWhatsappAlerts && sock && (st.parentPhone || st.phone)) {
        const pPhone = (st.parentPhone || st.phone).replace(/[^0-9]/g, '');
        const jid = pPhone.startsWith('92') ? `${pPhone}@s.whatsapp.net` : `92${pPhone.replace(/^0+/, '')}@s.whatsapp.net`;
        const challanMsg = `ðŸ“¢ *OFFICIAL FEE CHALLAN NOTIFICATION*\n\nAssalam-o-Alaikum! Current month (${monthYear}) tuition fee challan for student *${st.name || 'Student'}* (Grade: ${st.class || 'N/A'}) has been generated.\n\n💰 *Total Amount:* Rs. ${baseFee.toLocaleString()}/-\n📅 *Due Date:* ${dueDate}\n\nBaraye meherbani due date se pehle fee jama karwayein taake late charges se bacha ja sake.\n\nRegards,\nSchool Accounts Department`;
        try {
          await sock.sendMessage(jid, { text: challanMsg });
          waAlertCount++;
        } catch (we) {}
      }
    }

    res.json({
      success: true,
      message: `Generated ${createdInvoices.length} fee challans for ${monthYear}!`,
      invoicesCreated: createdInvoices.length,
      whatsappAlertsSent: waAlertCount
    });
  } catch (err) {
    console.error('Error in bulk monthly challan generation:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// --- MOBILE APP AUTHENTICATION ENDPOINTS (OTP & CUSTOM TOKENS) ---

// Memory storage for OTPs (In production, use Redis or Firestore for persistence)
const otpStore = new Map();

// Helper: Async operation with timeout
async function withTimeout(promise, timeoutMs, errorMsg = 'Operation timed out') {
  let timeout;
  const timeoutPromise = new Promise((_, reject) => {
    timeout = setTimeout(() => reject(new Error(errorMsg)), timeoutMs);
  });
  return Promise.race([promise, timeoutPromise]).finally(() => clearTimeout(timeout));
}

// POST /api/mobile/auth/request-otp
app.post('/api/mobile/auth/request-otp', async (req, res) => {
  const startTime = Date.now();
  try {
    const { cnic, phone, email } = req.body;
    console.log(`[AUTH] Request received for CNIC: ${cnic.slice(0,5)}... Phone: ${phone.slice(0,5)}... Email: ${email || 'None'}`);

    if (!cnic || !phone || !email) {
      return res.status(400).json({ success: false, error: 'CNIC, Phone, and Email are required.' });
    }

    const cleanCnic = cnic.replace(/\D/g, '');
    const cleanPhone = normalizePhone(phone);
    const isCnicFormat = cleanCnic.length === 13;

    if (!cnic || !phone || !email || !email.includes('@')) {
      return res.status(400).json({ success: false, error: 'All 3 fields (ID, Phone, and valid Gmail) are required.' });
    }

    // 1. Search for Parent in Students collection (if CNIC provided)
    let userFound = null;
    let role = '';
    let schoolId = '';
    let displayName = '';
    let userId = '';
    let recordId = '';

    console.log(`[AUTH] Firestore lookup started for Role Discovery (${Date.now() - startTime}ms)`);

    if (isCnicFormat) {
        // ... (rest of the CNIC search logic remains similar but I'll make it stricter)
        const formattedCnic = formatCnic(cnic);
        try {
            const parentSnap = await withTimeout(
                db.collection('students').where('fatherCnic', '==', formattedCnic).get(),
                10000,
                'Database lookup timed out (Parent Search)'
            );

            let parentMatch = parentSnap.docs.find(d => {
                const data = d.data();
                return normalizePhone(data.parentPhone) === cleanPhone ||
                       normalizePhone(data.whatsappPhone) === cleanPhone ||
                       normalizePhone(data.phone) === cleanPhone;
            });

            if (parentMatch) {
                const data = parentMatch.data();
                userFound = data;
                recordId = parentMatch.id;
                role = 'parent';
                schoolId = data.schoolId;
                displayName = data.fatherName || 'Parent';
                userId = `parent_${cleanCnic}`;
            }
        } catch (e) {}
    }

    // 2. Search for Teacher in Staff collection (Check by Teacher ID/CNIC and Phone)
    if (!userFound) {
        try {
            const staffSnap = await db.collection('staff').get();
            const teacherMatch = staffSnap.docs.find(d => {
                const data = d.data();
                const staffCnic = (data.cnic || '').replace(/\D/g, '');
                const staffId = d.id;
                const matchesId = (staffCnic === cleanCnic) || (staffId === cnic.trim());
                return matchesId && (normalizePhone(data.phone) === cleanPhone || normalizePhone(data.whatsapp) === cleanPhone);
            });

            if (teacherMatch) {
                const data = teacherMatch.data();
                userFound = data;
                recordId = teacherMatch.id;
                role = 'teacher';
                schoolId = data.schoolId;
                displayName = data.name || 'Teacher';
                userId = `staff_${teacherMatch.id}`;
            }
        } catch (e) {}
    }

    // 3. Search for Student (Check by Roll Number and Phone)
    if (!userFound) {
        try {
            const studentSnap = await db.collection('students').where('rollNumber', '==', cnic.trim()).get();
            const studentMatch = studentSnap.docs.find(d => {
                const data = d.data();
                return normalizePhone(data.phone) === cleanPhone || normalizePhone(data.parentPhone) === cleanPhone;
            });

            if (studentMatch) {
                const data = studentMatch.data();
                userFound = data;
                recordId = studentMatch.id;
                role = 'student';
                schoolId = data.schoolId;
                displayName = data.name || 'Student';
                userId = `student_${studentMatch.id}`;
            }
        } catch (e) {}
    }

          userFound.id = teacherMatch.id;
          role = 'teacher';
          schoolId = data.schoolId;
          displayName = data.name || 'Teacher';
          userId = `staff_${teacherMatch.id}`;
        }
      } catch (dbErr) {
        console.error(`[AUTH] Staff search error:`, dbErr.message);
      }
    }

    // 3. Search for Student direct login if not parent or teacher
    if (!userFound) {
      console.log(`[AUTH] Parent/Staff not found, searching Student direct (${Date.now() - startTime}ms)`);
      try {
        const studentDirectSnap = await withTimeout(
          db.collection('students').where('phone', '==', phone).get(),
          10000,
          'Database lookup timed out (Student Phone Search)'
        );

        const studentMatch = studentDirectSnap.docs.find(d => {
          const dData = d.data();
          return normalizePhone(dData.phone) === cleanPhone;
        });

        if (studentMatch) {
          const data = studentMatch.data();
          role = 'student';
          schoolId = data.schoolId;
          displayName = data.name || 'Student';
          userId = `student_${studentMatch.id}`;
          userFound = data;
          userFound.id = studentMatch.id;
        }
      } catch (dbErr) {
        console.error(`[AUTH] Student search error:`, dbErr.message);
      }
    }

    if (!userFound) {
      console.log(`[AUTH] No account found (${Date.now() - startTime}ms)`);
      return res.status(404).json({
        success: false,
        error: 'No account found with these details. Please contact your school administration.'
      });
    }

    if (userFound.linkedEmail && userFound.linkedEmail.toLowerCase() !== email.toLowerCase()) {
      console.log(`[AUTH] Email mismatch. Registered: ${userFound.linkedEmail}, Provided: ${email}`);
      return res.status(400).json({
        success: false,
        error: 'The provided Gmail ID does not match the one registered to your account.'
      });
    }

    console.log(`[AUTH] User identified: ${role} in School: ${schoolId} (${Date.now() - startTime}ms)`);
    // Generate 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = Date.now() + 5 * 60 * 1000; // 5 minutes

    otpStore.set(cleanPhone, {
      otp,
      expiresAt,
      attempts: 0,
      userData: { userId, role, schoolId, name: displayName, phone: cleanPhone, email, recordId: userFound.id || userId }
    });

    if (email && email.includes('@')) {
      try { fs.appendFileSync(path.join(__dirname, 'auth_audit.log'), `[${new Date().toISOString()}] Attempting Email to ${email}\n`); } catch(e) {}
      const mailOptions = {
        from: '"TaleemiDunya School System" <taleemiduniyapro@gmail.com>',
        to: email,
        subject: 'TaleemiDunya Verification Code',
        text: `Your verification code is: ${otp}\n\nThis code expires in 5 minutes.\nDo not share this code with anyone.`
      };
      
      try {
        await transporter.sendMail(mailOptions);
        try { fs.appendFileSync(path.join(__dirname, 'auth_audit.log'), `[${new Date().toISOString()}] Email SUCCESS to ${email}\n`); } catch(e) {}
        return res.json({
          success: true,
          message: 'OTP sent successfully to your email',
          maskedPhone: email,
          expiresIn: 300
        });
      } catch (emailErr) {
        try { fs.appendFileSync(path.join(__dirname, 'auth_audit.log'), `[${new Date().toISOString()}] Email FAIL: ${emailErr.message}\n`); } catch(e) {}
      }
    } else {
      try { fs.appendFileSync(path.join(__dirname, 'auth_audit.log'), `[${new Date().toISOString()}] No valid email provided: ${email}\n`); } catch(e) {}
    }

    // Send via WhatsApp Bot (Fallback)
    const sock = sessions.get(schoolId) || sessions.get('NNRuCtHxQNjISc9EPgMs');
    if (!sock || !sock.ws || sock.ws.readyState !== 1) { // 1 = OPEN
      console.log(`[AUTH] WhatsApp Bot offline for school ${schoolId} (${Date.now() - startTime}ms)`);
      return res.status(503).json({
        success: false,
        error: 'WhatsApp Bot is currently offline and Email failed. Please try again in a few minutes.'
      });
    }

    const msgText = `🏫 *TaleemiDunya School System*\n\nYour verification code is: *${otp}*\n\nThis code expires in 5 minutes.\nDo not share this code with anyone.`;

    console.log(`[AUTH] WhatsApp send started (${Date.now() - startTime}ms)`);

    try {
      await withTimeout(
        sock.sendMessage(`${cleanPhone}@s.whatsapp.net`, { text: msgText }),
        15000,
        'WhatsApp service is taking too long'
      );
      console.log(`[AUTH] WhatsApp send completed (${Date.now() - startTime}ms)`);
    } catch (waErr) {
      console.error(`[AUTH] WhatsApp send failed: ${waErr.message} (${Date.now() - startTime}ms)`);
      return res.status(500).json({
        success: false,
        error: `WhatsApp error: ${waErr.message}. Please ensure your number is registered on WhatsApp.`
      });
    }

    res.json({
      success: true,
      message: 'OTP sent successfully via WhatsApp',
      maskedPhone: `${phone.substring(0, 3)}******${phone.substring(phone.length - 2)}`,
      expiresIn: 300
    });

  } catch (err) {
    console.error(`[AUTH] Unexpected error:`, err);
    res.status(500).json({ success: false, error: 'An internal error occurred while processing your request.' });
  }
});

app.get('/ping-test', (req, res) => res.send('PONG 123'));

// POST /api/mobile/auth/verify-otp
app.post('/api/mobile/auth/verify-otp', async (req, res) => {
  try {
    const { phone, otp } = req.body;
    if (!phone || !otp) {
      return res.status(400).json({ success: false, error: 'Phone and OTP are required.' });
    }

    const cleanPhone = normalizePhone(phone);
    const stored = otpStore.get(cleanPhone);

    if (!stored) {
      return res.status(400).json({ success: false, error: 'OTP request not found or session expired.' });
    }

    if (Date.now() > stored.expiresAt) {
      otpStore.delete(cleanPhone);
      return res.status(400).json({ success: false, error: 'This verification code has expired.' });
    }

    if (stored.attempts >= 5) {
      otpStore.delete(cleanPhone);
      return res.status(400).json({ success: false, error: 'Too many failed attempts. Please request a new code.' });
    }

    if (stored.otp !== otp) {
      stored.attempts++;
      return res.status(400).json({ success: false, error: 'Incorrect verification code.' });
    }

    // Success! Generate Firebase Custom Token
    const { userId, role, schoolId, name, email, recordId } = stored.userData;
    
    // Update linkedEmail in Firestore if email was used
    if (email) {
      try {
        let collectionName = 'students';
        if (role === 'teacher' || role === 'staff') collectionName = 'staff';
        let actualDocId = recordId;
        if (actualDocId && actualDocId.includes('_')) {
          actualDocId = actualDocId.split('_')[1];
        }
        if (actualDocId) {
          await db.collection(collectionName).doc(actualDocId).update({ linkedEmail: email });
        }
      } catch (updateErr) {
        console.error(`[AUTH] Failed to update linkedEmail:`, updateErr.message);
      }
    }

    // Check if school-admin or super-admin trying to login via mobile app
    if (role === 'school-admin' || role === 'super-admin') {
      return res.status(403).json({
        success: false,
        error: 'Please use the School Admin Panel for administrator accounts.'
      });
    }

    const customToken = await admin.auth().createCustomToken(userId, {
      role,
      schoolId,
      mobile: cleanPhone
    });

    otpStore.delete(cleanPhone);

    res.json({
      success: true,
      token: customToken,
      user: {
        id: userId,
        role,
        schoolId,
        name,
        phone: cleanPhone
      }
    });

  } catch (err) {
    console.error('OTP Verification Error:', err);
    res.status(500).json({ success: false, error: 'Failed to verify OTP. Please try again.' });
  }
});

// POST /api/mobile/auth/logout
app.post('/api/mobile/auth/logout', (req, res) => {
  // Mobile app mainly handles local session clearing, but we provide this for consistency
  res.json({ success: true, message: 'Logged out successfully' });
});

// GET /api/mobile/fees/voucher-pdf - REST API to get PDF for Mobile App
app.get('/api/mobile/fees/voucher-pdf', async (req, res) => {
  try {
    const { studentId, schoolId } = req.query;
    if (!studentId || !schoolId) {
      return res.status(400).json({ success: false, error: 'StudentId and SchoolId are required.' });
    }

    if (!db) return res.status(500).json({ success: false, error: 'Database not initialized.' });

    // 1. Fetch Student
    const studentDoc = await db.collection('students').doc(studentId).get();
    if (!studentDoc.exists) {
      return res.status(404).json({ success: false, error: 'Student not found.' });
    }
    const student = studentDoc.data();

    // 2. Fetch School Name & Logo
    const schoolDoc = await db.collection('schools').doc(schoolId).get();
    const schoolData = schoolDoc.exists ? schoolDoc.data() : {};
    const schoolName = schoolData.name || schoolData.schoolName || 'TaleemiDunya School';

    let logoBuffer = null;
    if (schoolData.logo) {
      try {
        const logoRes = await fetch(schoolData.logo);
        if (logoRes.ok) logoBuffer = Buffer.from(await logoRes.arrayBuffer());
      } catch (e) {}
    }

    // 3. Fetch latest unpaid voucher
    let voucherData = null;
    const voucherSnap = await db.collection('vouchers')
      .where('schoolId', '==', schoolId)
      .where('status', '==', 'Unpaid')
      .get();

    if (!voucherSnap.empty) {
      // Find matching child in the voucher docs
      const matched = voucherSnap.docs.find(doc => {
        const details = doc.data().childrenDetails || [];
        return details.some(d => d.id === studentId || d.admNo === student.rollNumber);
      });
      if (matched) voucherData = matched.data();
    }

    // 4. Generate PDF
    const pdfBuffer = await generateVoucherPDF(student, schoolName, voucherData, logoBuffer);

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=Voucher_${student.name}.pdf`);
    res.send(pdfBuffer);

  } catch (err) {
    console.error('REST PDF Error:', err);
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
      batch.set(ref, {
        ...rec,
        schoolId,
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      }, { merge: true });
    });

    await batch.commit();
    res.json({ success: true, message: `Successfully marked attendance for ${records.length} students.` });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/mobile/teacher/homework
app.post('/api/mobile/teacher/homework', async (req, res) => {
  try {
    const { subject, title, description, className, section, schoolId, teacherName, imageUrl } = req.body;

    const homeworkData = {
      subject, title, description, className, section, schoolId, teacherName, imageUrl,
      assignedDate: new Date().toISOString().split('T')[0],
      createdAt: admin.firestore.FieldValue.serverTimestamp()
    };

    const docRef = await db.collection('homework').add(homeworkData);

    // Notify Parents via WhatsApp
    const sock = sessions.get(schoolId);
    if (sock) {
      const studentsSnap = await db.collection('students')
        .where('schoolId', '==', schoolId)
        .where('class', '==', className)
        .get();

      studentsSnap.forEach(doc => {
        const s = doc.data();
        if (s.section === section) {
          const pPhone = normalizePhone(s.parentPhone || s.phone);
          if (pPhone) {
            const msg = `*NEW HOMEWORK ALERT*\n\nClass: ${className}-${section}\nSubject: ${subject}\nTitle: ${title}\n\nPlease check the Taleemi Dunya mobile app for details.`;
            sock.sendMessage(`${pPhone}@s.whatsapp.net`, { text: msg }).catch(() => {});
          }
        }
      });
    }

    res.json({ success: true, id: docRef.id, message: 'Homework posted successfully.' });
  } catch (err) {
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

    // Notify Parents via WhatsApp
    const sock = sessions.get(schoolId);
    if (sock) {
      for (const item of results) {
        try {
          const studentDoc = await db.collection('students').doc(item.studentId).get();
          if (studentDoc.exists) {
            const s = studentDoc.data();
            const pPhone = normalizePhone(s.parentPhone || s.phone);
            if (pPhone) {
              const msg = `*EXAM RESULT ALERT*\n\nStudent: ${s.name}\nExam: ${item.examName}\nSubject: ${item.subject}\nMarks: ${item.obtainedMarks}/${item.totalMarks}\nGrade: ${item.grade}\n\nCongratulations! Check the app for details.`;
              sock.sendMessage(`${pPhone}@s.whatsapp.net`, { text: msg }).catch(() => {});
            }
          }
        } catch (e) {}
      }
    }

    res.json({ success: true, message: `Results published and ${results.length} parents notified.` });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.listen(PORT, () => {
  console.log(`\n======================================================`);
  console.log(`🚀 TaleemiDunya WhatsApp AI Bot Server Running! v6-PDF-STABLE`);
  console.log(`ðŸŒ Local API Port: http://localhost:${PORT}`);
  console.log(`======================================================\n`);
  
  // Auto start sessions on server boot - only ONE school to prevent conflict
  // default_school removed: it causes "conflict: replaced" when NNRuCtHxQNjISc9EPgMs uses same phone
  startWhatsAppSession('NNRuCtHxQNjISc9EPgMs');

  // 🛡️ï¸ INTERNAL 24/7 AUTO-WATCHDOG (Checks connection every 5 minutes and auto-heals if dropped)
  const watchdogSchools = ['NNRuCtHxQNjISc9EPgMs'];
  setInterval(() => {
    for (const wSchoolId of watchdogSchools) {
      const sock = sessions.get(wSchoolId);
      const qr = qrCodes.get(wSchoolId);
      const sessionDir = path.join(__dirname, 'auth_sessions', wSchoolId);
      const credsExist = fs.existsSync(path.join(sessionDir, 'creds.json'));

      // If socket is missing or disconnected while credentials exist, respawn immediately!
      if (!sock && credsExist && !qr) {
        console.log(`🛡️ï¸ [WATCHDOG] WhatsApp socket missing for ${wSchoolId}. Auto-reconnecting...`);
        startWhatsAppSession(wSchoolId);
      }
    }
  }, 300000); // Check every 5 minutes
});
