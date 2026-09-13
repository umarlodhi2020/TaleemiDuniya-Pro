const { NodeSSH } = require('node-ssh');
const ssh = new NodeSSH();

const newDefaults = [
  {
    id: 'menu_main',
    active: true,
    keywords: 'menu, hi, hello, salam, assalam, assalam-o-alaikum, help, options, start, 0, hey',
    response: '🏫 *WELCOME TO TALEEMIDUNYA PRO SCHOOL* 🎓\\nAssalam-o-Alaikum! I am your 24/7 AI Smart Assistant.\\n\\n👇 *PLEASE SELECT AN OPTION BY REPLYING WITH A NUMBER (1 - 7):*\\n\\n1️⃣ *Fee Voucher & Remaining Dues*\\n2️⃣ *Student Attendance*\\n3️⃣ *Daily Diary & Homework*\\n4️⃣ *Exam Results & Report Card*\\n5️⃣ *Datesheet & Holidays*\\n6️⃣ *New Admission Inquiry*\\n7️⃣ *Contact Administration*\\n\\n---\\n💡 *Tip:* Aap koi bhi sawal direct likh kar bhi pooch sakte hain! (Type *0* anytime to see options again).'
  },
  {
    id: 'opt_1',
    active: true,
    keywords: '1, one, challan, fee, balance, bqaya, due, paise, voucher, fees',
    response: '📋 *FEE VOUCHER & REMAINING DUES*\\n\\n👤 *Student Name:* {student_name}\\n🏫 *Class / Section:* {grade}\\n💰 *Remaining Fee Balance:* Rs. {fee_balance}/-\\n\\nℹ️ *Payment Instructions:* Aap apna fee voucher school accounts office se hasil kar sakte hain ya portal se download kar sakte hain. Bara-e-meharbani due date se pehlay fee jama karwayein.\\n\\n🔙 *(Type *0* to go back)*'
  },
  {
    id: 'opt_2',
    active: true,
    keywords: '2, two, hazri, attendance, present, absent, school aya',
    response: '📅 *STUDENT ATTENDANCE REPORT*\\n\\n👤 *Student Name:* {student_name}\\n🏫 *Class / Section:* {grade}\\n✅ *Status Today:* Present (100% Monthly Attendance)\\n\\nℹ️ *Details:* Aaj ki hazri mark ho chuki hai. Regular attendance maintain rakhne par shukriya!\\n\\n🔙 *(Type *0* to go back)*'
  },
  {
    id: 'opt_3',
    active: true,
    keywords: '3, three, diary, homework, syllabus, kam',
    response: '📚 *DAILY DIARY & HOMEWORK*\\n\\n👤 *Student Name:* {student_name}\\n🏫 *Class / Section:* {grade}\\n\\n📝 *Today Diary:*\\n• English: Read Unit 4 & learn Q/A.\\n• Math: Ex 3.2 Q(1-5) on notebook.\\n• Urdu: Sabaq yaad karna hai.\\n\\n🔙 *(Type *0* to go back)*'
  },
  {
    id: 'opt_4',
    active: true,
    keywords: '4, four, result, exam, report card, marks, number',
    response: '📊 *EXAM RESULTS & REPORT CARD*\\n\\n👤 *Student Name:* {student_name}\\n🏫 *Class / Section:* {grade}\\n🏆 *Last Exam Score:* 88% Marks (A+ Grade)\\n\\nℹ️ *Note:* Detailed report card parent-teacher meeting (PTM) mein di jayegi ya portal se check karein.\\n\\n🔙 *(Type *0* to go back)*'
  },
  {
    id: 'opt_5',
    active: true,
    keywords: '5, five, datesheet, holiday, chutti, vacation, schedule',
    response: '🗓️ *DATESHEET & HOLIDAYS CALENDAR*\\n\\n🏫 *Upcoming Schedule:*\\n• Annual Final Exams 15th March se start ho rahe hain.\\n• Next Holiday: Iqbal Day (9th November).\\n\\n🔙 *(Type *0* to go back)*'
  },
  {
    id: 'opt_6',
    active: true,
    keywords: '6, six, admission, prospectus, dakhla',
    response: '🎓 *NEW ADMISSIONS INQUIRY*\\n\\n🌟 *TaleemiDunya Pro School* mein Playgroup se Class 10th tak Admissions OPEN hain!\\n\\n🕒 *Test/Interview Timings:* Monday to Saturday (9:00 AM - 1:00 PM).\\n\\n🔙 *(Type *0* to go back)*'
  },
  {
    id: 'opt_7',
    active: true,
    keywords: '7, seven, contact, office, admin, principal, complaint, masla',
    response: '📞 *CONTACT ADMIN & COMPLAINTS*\\n\\n🕒 *Office Hours:* Monday to Saturday (8:00 AM - 2:00 PM)\\n📱 *Helpline & WhatsApp Admin:* +92 317-2234518\\n📝 *Complaints:* Kisi bhi shikayat ki soorat mein aap is number par direct message kar sakte hain.\\n\\n🔙 *(Type *0* to go back)*'
  }
];

const stringified = JSON.stringify(newDefaults, null, 2);

ssh.connect({
  host: 'ssh-umarhayat.alwaysdata.net',
  username: 'umarhayat',
  password: 'umar9900'
}).then(async () => {
  const script = `const fs = require('fs');
let code = fs.readFileSync('/home/umarhayat/TaleemiDunya-Pro/whatsapp-ai-server/server.js', 'utf8');
const rulesJson = ${JSON.stringify(stringified)};
code = code.replace(/\\[\\s*\\{\\s*id:\\s*'menu_main'[\\s\\S]*?\\}\\s*\\]/, rulesJson);
fs.writeFileSync('/home/umarhayat/TaleemiDunya-Pro/whatsapp-ai-server/server.js', code);
`;

  await ssh.execCommand('node -e "' + script.replace(/"/g, '\\"') + '"');
  await ssh.execCommand('touch /home/umarhayat/TaleemiDunya-Pro/whatsapp-ai-server/tmp/restart.txt');
  console.log('Fixed default rules in server.js with 7 options!');
  process.exit(0);
}).catch(console.error);
