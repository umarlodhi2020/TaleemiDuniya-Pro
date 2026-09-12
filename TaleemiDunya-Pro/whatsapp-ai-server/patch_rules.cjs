const { NodeSSH } = require('node-ssh');
const ssh = new NodeSSH();

ssh.connect({
  host: 'ssh-umarhayat.alwaysdata.net',
  username: 'umarhayat',
  password: 'umar9900'
}).then(async () => {
  const script = `const fs = require('fs');
let code = fs.readFileSync('/home/umarhayat/TaleemiDunya-Pro/whatsapp-ai-server/server.js', 'utf8');

const newDefaults = \`[
      {
        id: 'menu_main',
        active: true,
        keywords: 'menu, hi, hello, salam, assalam, assalam-o-alaikum, help, options, start, 0, hey',
        response: '🏫 *WELCOME TO TALEEMIDUNYA PRO SCHOOL* 🎓\\nAssalam-o-Alaikum! I am your 24/7 AI Smart Assistant.\\n\\n👇 *PLEASE SELECT AN OPTION BY REPLYING WITH A NUMBER (1 - 5):*\\n\\n1️⃣ *Fee Challan & Balance*\\n2️⃣ *Student Attendance*\\n3️⃣ *Exam Results & Datesheet*\\n4️⃣ *New Admission Inquiry*\\n5️⃣ *Contact Administration*\\n\\n---\\n💡 *Tip:* Aap koi bhi sawal direct likh kar bhi pooch sakte hain! (Type *0* anytime to see options again).'
      },
      {
        id: 'opt_1',
        active: true,
        keywords: '1, one, challan, fee, balance, bqaya, due, paise',
        response: '📋 *FEE CHALLAN & BALANCE STATUS*\\n\\n👤 *Student Name:* {student_name}\\n🏫 *Class / Section:* {grade}\\n💰 *Current Fee Balance:* Rs. {fee_balance}/-\\n\\nℹ️ *Payment Instructions:* Aap apni fee school office mein ya online Bank Transfer ke zariye pay kar sakte hain.\\n\\n🔙 *(Type *0* to go back)*'
      },
      {
        id: 'opt_2',
        active: true,
        keywords: '2, two, hazri, attendance, present, absent, school aya',
        response: '📅 *STUDENT ATTENDANCE REPORT*\\n\\n👤 *Student Name:* {student_name}\\n🏫 *Class / Section:* {grade}\\n✅ *Status Today:* Present (100% Monthly Attendance)\\n\\nℹ️ *Details:* Current month mein student ki koi un-informed leave (chutti) record nahi hui. Thank you!\\n\\n🔙 *(Type *0* to go back)*'
      },
      {
        id: 'opt_3',
        active: true,
        keywords: '3, three, result, exam, datesheet',
        response: '📊 *EXAM RESULTS & DATESHEET*\\n\\n👤 *Student Name:* {student_name}\\n🏫 *Class / Section:* {grade}\\n🏆 *Last Exam Score:* 88% Marks (A+ Grade)\\n\\n🗓️ *Upcoming Schedule:* Annual Final Exams 15th March se start ho rahe hain.\\n\\n🔙 *(Type *0* to go back)*'
      },
      {
        id: 'opt_4',
        active: true,
        keywords: '4, four, admission, prospectus',
        response: '🎓 *NEW ADMISSIONS INQUIRY*\\n\\n🌟 *TaleemiDunya Pro School* mein Playgroup se Class 10th tak Admissions OPEN hain!\\n\\n🕒 *Test/Interview Timings:* Monday to Saturday (9:00 AM - 1:00 PM).\\n\\n🔙 *(Type *0* to go back)*'
      },
      {
        id: 'opt_5',
        active: true,
        keywords: '5, five, contact, office, admin, principal',
        response: '📞 *CONTACT SCHOOL ADMINISTRATION*\\n\\n🕒 *Office Hours:* Monday to Saturday (8:00 AM - 2:00 PM)\\n📍 *Address:* Main Campus, TaleemiDunya Pro School\\n📱 *Helpline & WhatsApp Admin:* +92 317-2234518\\n\\n🔙 *(Type *0* to go back)*'
      }
    ]\`;

code = code.replace(/\\[\\s*\\{\\s*id:\\s*'rule_1'[\\s\\S]*?\\}\\s*\\]/, newDefaults);
fs.writeFileSync('/home/umarhayat/TaleemiDunya-Pro/whatsapp-ai-server/server.js', code);
`;

  await ssh.execCommand('node -e "' + script.replace(/"/g, '\\"') + '"');
  await ssh.execCommand('touch /home/umarhayat/TaleemiDunya-Pro/whatsapp-ai-server/tmp/restart.txt');
  console.log('Fixed default rules in server.js');
  process.exit(0);
}).catch(console.error);
