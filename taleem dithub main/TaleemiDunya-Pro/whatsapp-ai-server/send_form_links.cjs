const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');
const { makeWASocket, useMultiFileAuthState, DisconnectReason } = require('@whiskeysockets/baileys');

// Initialize Firebase
const serviceAccountPath = path.join(__dirname, 'serviceAccountKey.json');
if (!fs.existsSync(serviceAccountPath)) {
  console.error("❌ serviceAccountKey.json nahi mili! Script band ho rahi hai.");
  process.exit(1);
}

const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf8'));
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});
const db = admin.firestore();

async function startSender(schoolId) {
  console.log(`\n⏳ WhatsApp se connect ho raha hai (${schoolId})...`);
  const sessionDir = path.join(__dirname, 'auth_sessions', schoolId);
  const { state, saveCreds } = await useMultiFileAuthState(sessionDir);

  const sock = makeWASocket({
    auth: state,
    printQRInTerminal: true,
  });

  sock.ev.on('creds.update', saveCreds);

  sock.ev.on('connection.update', async (update) => {
    const { connection, lastDisconnect, qr } = update;
    if (qr) {
      console.log(`\n===========================================`);
      console.log(`📱 NAYA QR CODE AAGAYA HAI!`);
      console.log(`Jaldi se WhatsApp se scan karein taake form links bheje ja sakein.`);
      console.log(`===========================================\n`);
    }

    if (connection === 'close') {
      const shouldReconnect = (lastDisconnect.error)?.output?.statusCode !== DisconnectReason.loggedOut;
      if (shouldReconnect) {
        startSender(schoolId);
      } else {
        console.log('❌ WhatsApp se Logged out ho gaye hain. Dobara script chalayen aur QR scan karein.');
      }
    } else if (connection === 'open') {
      console.log(`✅ WhatsApp successfully connect ho gaya!`);
      await sendFormLinks(schoolId, sock);
    }
  });
}

async function sendFormLinks(schoolId, sock) {
  console.log(`\n🚀 Form Links bhejna shuru kar raha hai...`);
  
  try {
    const studentsSnap = await db.collection('students').where('schoolId', '==', schoolId).get();
    if (studentsSnap.empty) {
      console.log(`❌ Koi student nahi mila school "${schoolId}" ke liye.`);
      process.exit(0);
    }

    let sentCount = 0;
    
    for (const doc of studentsSnap.docs) {
      const student = doc.data();
      const parentPhone = student.parentPhone || student.phone;
      
      if (parentPhone) {
        const cleanPhone = parentPhone.replace(/[^0-9]/g, '');
        const jid = cleanPhone.startsWith('92') ? `${cleanPhone}@s.whatsapp.net` : `92${cleanPhone.replace(/^0+/, '')}@s.whatsapp.net`;
        
        const link = `https://taleemidunya-pro-ed44e.web.app/family-update/${schoolId}/${cleanPhone}`;
        const msgText = `📢 *FAMILY DATA UPDATE FORM* 📢\n\nAssalam-o-Alaikum, neeche diye gaye secure link par click karke aap apne bache(on) ka data verify aur update kar sakte hain:\n\n🌐 *Update Link:*\n${link}\n\n⚠️ *Note:* Yeh link secure hai. Yahan par aap Student Name, Father/Mother Name, Date of Birth, CNIC aur Mobile Number update kar sakte hain. Class, Section aur Roll No sirf school admin badal sakta hai.\n\nRegards,\nSchool Administration`;
        
        try {
          await sock.sendMessage(jid, { text: msgText });
          console.log(`✅ Link sent to ${student.name || 'Student'} (${parentPhone})`);
          sentCount++;
          // Wait 2 seconds to avoid spam ban
          await new Promise(r => setTimeout(r, 2000));
        } catch (we) {
          console.error(`❌ Failed to send link to ${parentPhone}:`, we.message);
        }
      }
    }
    
    console.log(`\n🎉 KAAM MUKAMMAL! Total ${sentCount} logon ko Form Link bhej diya gaya hai!`);
    console.log(`Aap is window ko band kar sakte hain.`);
    process.exit(0);

  } catch (err) {
    console.error('Error:', err);
    process.exit(1);
  }
}

// Start for default school
startSender('default_school');
