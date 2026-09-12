const fs = require('fs');
let code = fs.readFileSync('server.js', 'utf8');

// The chunk we want to replace
const target = `      type: 'interactive',
      content: {
        viewOnceMessage: {
          message: {
            interactiveMessage: proto.Message.InteractiveMessage.create({
              body: proto.Message.InteractiveMessage.Body.create({ text: "🏫 *WELCOME TO TALEEMIDUNYA PRO SCHOOL* 🎓\\nAssalam-o-Alaikum! I am your 24/7 AI Smart Assistant." }),
              footer: proto.Message.InteractiveMessage.Footer.create({ text: "💡 Tip: Aap koi bhi sawal direct likh kar bhi pooch sakte hain!" }),
              header: proto.Message.InteractiveMessage.Header.create({ title: "TaleemiDunya Pro AI", hasMediaAttachment: false }),
              nativeFlowMessage: proto.Message.InteractiveMessage.NativeFlowMessage.create({
                buttons: [{
                  name: "single_select",
                  buttonParamsJson: JSON.stringify({
                    title: "Select an Option 📋",
                    sections: [{
                      title: "Main Menu",
                      rows: [
                        { id: "1", title: "Fee Voucher & Dues", description: "Check balance & vouchers" },
                        { id: "2", title: "Student Attendance", description: "Daily & monthly presence" },
                        { id: "3", title: "Daily Diary & HW", description: "Aaj ka syllabus / kam" },
                        { id: "4", title: "Exam Results", description: "Marks & grades" },
                        { id: "5", title: "Datesheet & Holidays", description: "Exams aur chuttiyan" },
                        { id: "6", title: "Admission Inquiry", description: "Dakhla aur fees" },
                        { id: "7", title: "Contact Admin", description: "Shikayat aur rabta" }
                      ]
                    }]
                  })
                }]
              })
            })
          }
        }
      }`;

const replacement = `      type: 'text',
      content: { text: "🏫 *WELCOME TO TALEEMIDUNYA PRO SCHOOL* 🎓\\nAssalam-o-Alaikum! I am your 24/7 AI Smart Assistant.\\n\\n*Main Menu:*\\n1️⃣ Fee Voucher & Dues\\n2️⃣ Student Attendance\\n3️⃣ Daily Diary & HW\\n4️⃣ Exam Results\\n5️⃣ Datesheet & Holidays\\n6️⃣ Admission Inquiry\\n7️⃣ Contact Admin\\n\\n💡 Tip: Reply with a number (e.g., 1) or type your question directly!" }`;

if (code.includes(target)) {
    code = code.replace(target, replacement);
    fs.writeFileSync('server.js', code);
    console.log("PATCH_SUCCESS");
} else {
    console.log("TARGET_NOT_FOUND");
}
