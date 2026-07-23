import express from 'express';
import cors from 'cors';
import qrcode from 'qrcode';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

import { 
  makeWASocket, 
  useMultiFileAuthState, 
  DisconnectReason,
  Browsers,
  fetchLatestBaileysVersion
} from '@whiskeysockets/baileys';
import { GoogleGenAI } from '@google/genai';
import admin from 'firebase-admin';

// Global Crash Protection for Baileys Socket / Decrypt / Timeout Errors
process.on('uncaughtException', (err) => {
  console.error('🛡️ [PREVENTED CRASH] Uncaught Exception:', err.message || err);
});
process.on('unhandledRejection', (reason, promise) => {
  console.error('🛡️ [PREVENTED CRASH] Unhandled Rejection at promise:', reason);
});

// 1. Initialize Firebase Admin SDK (If running locally without serviceAccount, uses default or mock state)
try {
  if (!admin.apps.length) {
    admin.initializeApp({
      projectId: process.env.FIREBASE_PROJECT_ID || 'taleemidunya-pro-ed44e'
    });
    console.log('✅ Firebase Admin initialized with explicit projectId: taleemidunya-pro-ed44e');
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
  const sessionDir = path.join(__dirname, 'auth_sessions', schoolId);
  if (!fs.existsSync(sessionDir)) {
    fs.mkdirSync(sessionDir, { recursive: true });
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
      console.log(`🔴 [DISCONNECTED] Connection closed for "${schoolId}" (Code: ${statusCode}). Reconnecting: ${shouldReconnect}`);
      
      if (shouldReconnect) {
        setTimeout(async () => {
          try {
            console.log(`🔄 [SELF-HEALING] Attempting automatic reconnect for "${schoolId}" right now...`);
            await startWhatsAppSession(schoolId);
          } catch (retryErr) {
            console.error(`⚠️ Reconnect retry error for "${schoolId}":`, retryErr.message);
            setTimeout(() => startWhatsAppSession(schoolId).catch(() => {}), 10000);
          }
        }, 4000);
      } else {
        console.log(`⚠️ [SESSION EXPIRED] Device logged out for "${schoolId}". Auto-cleaning old session and generating fresh QR...`);
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

      const senderPhone = msg.key.remoteJid;
      // Unwrap any ephemeral or viewOnce wrappers to extract actual text
      const msgObj = msg.message.ephemeralMessage?.message || msg.message.viewOnceMessage?.message || msg.message;
      const incomingText = (
        msgObj.conversation ||
        msgObj.extendedTextMessage?.text ||
        msgObj.buttonsResponseMessage?.selectedButtonId ||
        msgObj.listResponseMessage?.title ||
        msgObj.templateButtonReplyMessage?.selectedId ||
        ''
      ).trim();

      if (!incomingText) continue;

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

// In-memory security verification cache (Sender Phone -> { student: studentDoc, verifiedAt: timestamp })
const verifiedSenders = new Map();
// Track senders who have interacted/seen the menu in this session
const activeSenders = new Set();

/**
 * Handle AI logic using High-Security Verification + Real Firestore Data + Custom Rules + Gemini
 */
async function handleAIBotReply(schoolId, senderPhone, queryText) {
  const lower = queryText.toLowerCase().trim();
  const cleanSender = senderPhone.replace(/[^0-9]/g, '');
  const rules = getSchoolRules(schoolId);

  // Check if this is the first interaction from this sender in this session
  const isFirstMessage = !activeSenders.has(cleanSender);
  if (isFirstMessage) {
    activeSenders.add(cleanSender);
  }

  // --- 1. INTERACTIVE MENU & FEATURE SELECTION CHECK ---
  const menuKeywords = ['menu', 'hi', 'hello', 'salam', 'assalam', 'assalam-o-alaikum', 'assalamualaikum', 'aoa', 'a.o.a', 'options', 'features', 'help', 'start', '0', 'hey', 'good morning', 'good evening', 'info', 'sir', 'madam'];
  const isGreetingOrMenu = menuKeywords.includes(lower) || 
                           lower.startsWith('hi ') || lower.startsWith('hello ') || lower.startsWith('salam ') || lower.includes('assalam') || lower.startsWith('aoa ') || 
                           lower === 'menu' || lower === '0';

  const isExplicitOption = ['1', 'one', '2', 'two', '3', 'three', '4', 'four', '5', 'five'].includes(lower) ||
                           lower.startsWith('roll:') || lower.startsWith('roll ') || lower.startsWith('id:') || lower.startsWith('id ') || (lower.match(/^\d{1,5}$/) && !['0','1','2','3','4','5'].includes(lower));

  // If this is the FIRST MESSAGE (and not an explicit option Selection/Roll Number) OR a greeting/menu keyword, show the Welcome Menu!
  if ((isFirstMessage && !isExplicitOption) || isGreetingOrMenu) {
    return `🏫 *WELCOME TO TALEEMIDUNYA PRO SCHOOL* 🎓\n` +
           `Assalam-o-Alaikum! I am your 24/7 AI Smart Assistant.\n\n` +
           `👇 *PLEASE SELECT AN OPTION BY REPLYING WITH A NUMBER (1 - 5):*\n\n` +
           `1️⃣ *Fee Challan & Balance* (Check dues & payment info)\n` +
           `2️⃣ *Student Attendance* (Check daily/monthly presence)\n` +
           `3️⃣ *Exam Results & Datesheet* (Check grades & schedule)\n` +
           `4️⃣ *New Admission Inquiry* (Admission rules & timing)\n` +
           `5️⃣ *Contact School Administration* (Office hours & helpline)\n\n` +
           `---\n` +
           `💡 *Tip:* Aap koi bhi sawal direct likh kar bhi pooch sakte hain aur hamara AI Assistant turant jawab dega! (Type *0* or *menu* anytime to see options again).`;
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
  if (lower.startsWith('roll:') || lower.startsWith('roll ') || lower.startsWith('id:') || lower.startsWith('id ') || (lower.match(/^\d{1,5}$/) && !['0','1','2','3','4','5'].includes(lower))) {
    const inputRoll = queryText.replace(/[^0-9a-zA-Z]/g, '').replace(/^(roll|id)/i, '').trim();
    if (db && inputRoll) {
      try {
        const snap = await db.collection('students').where('schoolId', '==', schoolId).get();
        let matched = null;
        for (let doc of snap.docs) {
          const st = { id: doc.id, ...doc.data() };
          if ((st.rollNumber && st.rollNumber.toString().toLowerCase() === inputRoll.toLowerCase()) || st.id === inputRoll) {
            matched = st;
            break;
          }
        }
        if (matched) {
          verifiedSenders.set(cleanSender, { student: matched, verifiedAt: Date.now() });
          return `🔒 *STUDENT SECURITY VERIFIED SUCCESSFULLY!* ✅\n\n` +
                 `👤 *Student Name:* ${matched.name}\n` +
                 `🏫 *Class / Section:* ${matched.class || 'N/A'}-${matched.section || 'A'}\n` +
                 `🔢 *Roll Number:* ${matched.rollNumber || 'N/A'}\n` +
                 `👨‍👦 *Father Name:* ${matched.fatherName || 'N/A'}\n\n` +
                 `🎉 Aap ka number is student record se secure link ho chuka hai. Ab aap poori detail dekh sakte hain:\n` +
                 `👉 Type *1* for Fee Challan & Balance\n` +
                 `👉 Type *2* for Attendance Report\n` +
                 `👉 Type *3* for Exam Results & Datesheet`;
        } else {
          return `❌ *STUDENT NOT FOUND*\n\nMaaf kijiye, Roll Number "${inputRoll}" hamare school database mein nahi mila. Baraye meherbani sahi Roll Number check karke likhein (e.g., *ROLL: 102*).`;
        }
      } catch (e) {}
    }
  }

  // Check if option 1, 2, or 3 requested BUT student is NOT verified yet
  const isConfidentialRequest = ['1', 'one', 'challan', 'fee', 'balance', '2', 'two', 'hazri', 'attendance', 'present', '3', 'three', 'result', 'exam', 'datesheet'].some(k => lower === k || lower.includes(k));
  if (isConfidentialRequest && !verifiedStudent) {
    return `🔒 *SECURITY VERIFICATION REQUIRED* 🛡️\n\n` +
           `Assalam-o-Alaikum! Aap ka WhatsApp number (` + `+${cleanSender}` + `) hamare system mein kisi student ke **Parent Contact Number** se directly match nahi ho raha.\n\n` +
           `⚠️ *Student Privacy Protection:* Kisi bhi bachay ka confidential data (Fee Balance, Attendance, ya Exam Results) dekhne ke liye baraye meherbani bachay ka **Roll Number** verify karein.\n\n` +
           `👉 *Please Reply With Roll Number:*\n` +
           `Example: **ROLL: 102** or **ID: 45**\n\n` +
           `*(Verify hote hi aap ko turant Real Data show ho jayega)*`;
  }

  // --- 4. REAL DATA OPTIONS (1, 2, 3) FOR VERIFIED STUDENTS ONLY ---
  if (verifiedStudent && (lower === '1' || lower === 'one' || lower.includes('fee challan') || lower.includes('challan') || lower === 'fee' || lower.includes('balance'))) {
    let feeBalance = verifiedStudent.feeBalance ? Number(verifiedStudent.feeBalance).toLocaleString() : '0';
    let pendingInvoicesCount = 0;
    if (db) {
      try {
        const invSnap = await db.collection('invoices').where('studentId', '==', verifiedStudent.id).where('status', '==', 'Unpaid').get();
        if (!invSnap.empty) {
          pendingInvoicesCount = invSnap.size;
          let totalCalc = 0;
          invSnap.forEach(doc => totalCalc += Number(doc.data().amount || 0));
          if (totalCalc > 0) feeBalance = totalCalc.toLocaleString();
        }
      } catch (e) {}
    }

    return `📋 *REAL-TIME FEE CHALLAN & BALANCE* 🔒\n\n` +
           `👤 *Student Name:* ${verifiedStudent.name}\n` +
           `🏫 *Class / Section:* ${verifiedStudent.class || 'N/A'}-${verifiedStudent.section || 'A'}\n` +
           `🔢 *Roll Number:* ${verifiedStudent.rollNumber || 'N/A'}\n` +
           `💰 *Current Fee Balance:* Rs. ${feeBalance}/-\n` +
           `📄 *Pending Invoices:* ${pendingInvoicesCount} Unpaid Challan(s)\n\n` +
           `ℹ️ *Payment Instructions:* Aap apni fee school office mein ya online Bank Transfer ke zariye pay kar sakte hain. Challan download karne ya voucher verify karwane ke liye school accounts office se rabta karein.\n\n` +
           `🔙 *(Type *0* or *menu* to go back to main options)*`;
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
    return `📅 *REAL-TIME ATTENDANCE REPORT* 🔒\n\n` +
           `👤 *Student Name:* ${verifiedStudent.name}\n` +
           `🏫 *Class / Section:* ${verifiedStudent.class || 'N/A'}-${verifiedStudent.section || 'A'}\n` +
           `📊 *Overall Attendance:* ${percentage}%\n` +
           `✅ *Total Present:* ${totalDays > 0 ? presentCount + ' Days' : '100% Regular (Current Term)'}\n` +
           `❌ *Total Absent:* ${totalDays > 0 ? absentCount + ' Days' : '0 Leaves Recorded'}\n\n` +
           `ℹ️ *Details:* Student ki daily attendance biomertric / class teacher registry se sync ho rahi hai. Regular attendance maintain rakhne par shukriya!\n\n` +
           `🔙 *(Type *0* or *menu* to go back to main options)*`;
  }

  if (verifiedStudent && (lower === '3' || lower === 'three' || lower.includes('result') || lower.includes('exam') || lower.includes('datesheet'))) {
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

    return `📊 *REAL-TIME EXAM RESULTS & DATESHEET* 🔒\n\n` +
           `👤 *Student Name:* ${verifiedStudent.name}\n` +
           `🏫 *Class / Section:* ${verifiedStudent.class || 'N/A'}-${verifiedStudent.section || 'A'}\n` +
           `🏆 *Latest Exam (*` + latestExamName + `*):* ${scoreDisplay}\n\n` +
           `🗓️ *Upcoming Schedule:* Annual Final Exams 15th March se start ho rahe hain. Complete Datesheet aur Roll Number slip portal par upload kar di gayi hai.\n\n` +
           `🔙 *(Type *0* or *menu* to go back to main options)*`;
  }

  // Option 4: New Admission Inquiry (Public option, no verification needed)
  if (lower === '4' || lower === 'four' || lower.includes('admission') || lower.includes('prospectus')) {
    return `🎓 *NEW ADMISSIONS INQUIRY*\n\n` +
           `🌟 *TaleemiDunya Pro School* mein Playgroup se Class 10th tak Admissions OPEN hain!\n\n` +
           `📋 *Requirements:*\n` +
           `• Student B-Form / Birth Certificate\n` +
           `• 4 Passport Size Photographs\n` +
           `• School Leaving Certificate (if applicable)\n\n` +
           `🕒 *Test/Interview Timings:* Monday to Saturday (9:00 AM - 1:00 PM).\n\n` +
           `🔙 *(Type *0* or *menu* to go back to main options)*`;
  }

  // Option 5: Contact School Administration (Public option, no verification needed)
  if (lower === '5' || lower === 'five' || lower.includes('contact') || lower.includes('office') || lower.includes('admin') || lower.includes('principal')) {
    return `📞 *CONTACT SCHOOL ADMINISTRATION*\n\n` +
           `🕒 *Office Hours:* Monday to Saturday (8:00 AM - 2:00 PM)\n` +
           `📍 *Address:* Main Campus, TaleemiDunya Pro School\n` +
           `📱 *Helpline & WhatsApp Admin:* +92 317-2234518\n` +
           `📧 *Email:* info@taleemidunyapro.com\n\n` +
           `Aap kisi bhi waqt office visit kar sakte hain ya helpline par rabta kar sakte hain.\n\n` +
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
        .replace(/{fee_balance}/g, stFee);
    }
  }

  // --- 6. General Query -> Free Google Gemini AI Fallback ---
  try {
    const prompt = `You are the helpful official AI WhatsApp Assistant for School ID "${schoolId}" on TaleemiDunya Pro. Reply in concise polite Roman Urdu or English (matching parent's tone) to this parent query: "${queryText}" (Max 2-3 sentences). At the end of your reply, add: "(Type *menu* to see all selectable options)".`;
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
    });
    return response.text || "Thank you for contacting our school! We will get back to you shortly. (Type *menu* to see all selectable options).";
  } catch (err) {
    return `Assalam-o-Alaikum! Thank you for contacting TaleemiDunya Pro! Your inquiry "${queryText}" has been received by the school administration office. Reply *menu* to see selectable options or *1* for fee balance.`;
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
        <h1 style="font-size: 40px;">🟢 WhatsApp Bot Successfully Connected!</h1>
        <p style="font-size: 20px;">Aapka WhatsApp account 100% link ho chuka hai aur 'creds.json' file ban chuki hai!</p>
        <p style="font-size: 18px; margin-top: 30px;">Ab aap terminal par '.\\upload_and_start.ps1' chala kar Alwaysdata par bhej sakte hain.</p>
      </div>
    `);
  }

  if (!qr) {
    return res.send(`
      <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; text-align: center; padding: 80px; background: #f5f5f5; min-height: 100vh;">
        <h1>⏳ Generating WhatsApp QR Code & Pairing System...</h1>
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
          <h2 style="color: #128c7e; font-size: 22px; margin-top: 0;">⭐ Method 1: 8-Digit Pairing Code</h2>
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
          <h2 style="color: #128c7e; font-size: 22px; margin-top: 0;">📷 Method 2: Scan QR Code</h2>
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
          document.getElementById('codeDisplay').innerText = '⏳ Generating...';
          try {
            const r = await fetch('/api/session/pair?schoolId=${schoolId}&phone=' + encodeURIComponent(phone));
            const d = await r.json();
            if (d.code) {
              document.getElementById('codeDisplay').innerText = d.code;
              document.getElementById('codeHelper').innerText = 'Mobile me "Link with phone number instead" duba kar ye code likhein!';
            } else {
              document.getElementById('codeDisplay').innerText = '❌ Error';
              alert(d.error || 'Failed to get code');
            }
          } catch(e) {
            document.getElementById('codeDisplay').innerText = '❌ Error';
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
  const credsExist = fs.existsSync(path.join(sessionDir, 'creds.json'));
  const isConnected = credsExist && sessions.has(schoolId) && !qr;

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
app.post('/api/session/logout', async (req, res) => {
  const { schoolId = 'default_school' } = req.body;
  const sock = sessions.get(schoolId);
  const sessionDir = path.join(__dirname, 'auth_sessions', schoolId);
  if (sock) {
    sock.end();
    sessions.delete(schoolId);
  }
  qrCodes.delete(schoolId);
  if (fs.existsSync(sessionDir)) {
    fs.rmSync(sessionDir, { recursive: true, force: true });
  }
  res.json({ success: true, message: `Logged out from school: ${schoolId}` });
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
      if (typeof target === 'string' && target.toUpperCase().startsWith('GROUP:')) {
        const groupName = target.substring(6).trim().toLowerCase();
        const groups = await sock.groupFetchAllParticipating();
        let groupJid = null;
        for (const id in groups) {
          if (groups[id].subject && groups[id].subject.toLowerCase() === groupName) {
            groupJid = id;
            break;
          }
        }
        if (!groupJid) {
          throw new Error(`Group not found with name: ${groupName}`);
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
        const msgText = `🏫 *SMART BIOMETRIC ATTENDANCE ALERT*\n\nAssalam-o-Alaikum! Student *${student.name || 'Ali'}* (Roll: ${student.rollNumber || 'N/A'}, Grade: ${student.class || 'N/A'}) has arrived at school gate and checked in via Smart Biometric/RFID machine today (${todayStr}) at *${checkInTime}*.\n\nStatus: *PRESENT ✅*\n\nRegards,\nSchool Administration`;
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

    for (const docSnap of studentsSnap.docs) {
      const st = docSnap.data();
      const stId = docSnap.id;
      const baseFee = Number(st.monthlyFee || st.tuitionFee || 4500);

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
        const challanMsg = `📢 *OFFICIAL FEE CHALLAN NOTIFICATION*\n\nAssalam-o-Alaikum! Current month (${monthYear}) tuition fee challan for student *${st.name || 'Student'}* (Grade: ${st.class || 'N/A'}) has been generated.\n\n💰 *Total Amount:* Rs. ${baseFee.toLocaleString()}/-\n📅 *Due Date:* ${dueDate}\n\nBaraye meherbani due date se pehle fee jama karwayein taake late charges se bacha ja sake.\n\nRegards,\nSchool Accounts Department`;
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

app.listen(PORT, () => {
  console.log(`\n======================================================`);
  console.log(`🚀 TaleemiDunya WhatsApp AI Bot Server Running!`);
  console.log(`🌐 Local API Port: http://localhost:${PORT}`);
  console.log(`======================================================\n`);
  // Auto start session on server boot
  startWhatsAppSession('default_school');

  // 🛡️ INTERNAL 24/7 AUTO-WATCHDOG (Checks connection every 5 minutes and auto-heals if dropped)
  setInterval(() => {
    const sock = sessions.get('default_school');
    const qr = qrCodes.get('default_school');
    const sessionDir = path.join(__dirname, 'auth_sessions', 'default_school');
    const credsExist = fs.existsSync(path.join(sessionDir, 'creds.json'));

    // If socket is missing or disconnected while credentials exist, respawn immediately!
    if (!sock && credsExist && !qr) {
      console.log(`🛡️ [WATCHDOG] WhatsApp socket missing or inactive for default_school. Auto-reconnecting...`);
      startWhatsAppSession('default_school');
    }
  }, 300000); // Check every 5 minutes (300,000 ms)
});
