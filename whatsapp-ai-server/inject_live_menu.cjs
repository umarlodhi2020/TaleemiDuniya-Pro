async function injectMenuRules() {
    console.log('=== INJECTING LIVE INTERACTIVE MENU RULES INTO ALWAYSDATA CLOUD RAM ===');
    const rules = [
        {
            id: 'menu_main',
            active: true,
            keywords: 'menu, hi, hello, salam, assalam-o-alaikum, help, options, start, 0, hey',
            response: `🏫 *WELCOME TO TALEEMIDUNYA PRO SCHOOL* 🎓\nAssalam-o-Alaikum! I am your 24/7 AI Smart Assistant.\n\n👇 *PLEASE SELECT AN OPTION BY REPLYING WITH A NUMBER (1 - 5):*\n\n1️⃣ *Fee Challan & Balance* (Check dues & payment info)\n2️⃣ *Student Attendance* (Check daily/monthly presence)\n3️⃣ *Exam Results & Datesheet* (Check grades & schedule)\n4️⃣ *New Admission Inquiry* (Admission rules & timing)\n5️⃣ *Contact School Administration* (Office hours & helpline)\n\n---\n💡 *Tip:* Aap koi bhi sawal direct likh kar bhi pooch sakte hain aur hamara AI Assistant turant jawab dega! (Type *0* or *menu* anytime to see options again).`
        },
        {
            id: 'opt_1',
            active: true,
            keywords: '1, one, challan, fee, balance',
            response: `📋 *FEE CHALLAN & BALANCE STATUS*\n\n👤 *Student Name:* {student_name}\n🏫 *Class / Section:* {grade}\n💰 *Current Fee Balance:* Rs. {fee_balance}/-\n\nℹ️ *Payment Instructions:* Aap apni fee school office mein ya online Bank Transfer ke zariye pay kar sakte hain. Challan download karne ya voucher verify karwane ke liye school accounts office se rabta karein.\n\n🔙 *(Type *0* or *menu* to go back to main options)*`
        },
        {
            id: 'opt_2',
            active: true,
            keywords: '2, two, hazri, attendance, present',
            response: `📅 *STUDENT ATTENDANCE REPORT*\n\n👤 *Student Name:* {student_name}\n🏫 *Class / Section:* {grade}\n✅ *Status Today:* Present (100% Monthly Attendance)\n\nℹ️ *Details:* Current month mein student ki koi un-informed leave (chutti) record nahi hui. Regular attendance maintain rakhne par shukriya!\n\n🔙 *(Type *0* or *menu* to go back to main options)*`
        },
        {
            id: 'opt_3',
            active: true,
            keywords: '3, three, result, exam, datesheet',
            response: `📊 *EXAM RESULTS & DATESHEET*\n\n👤 *Student Name:* {student_name}\n🏫 *Class / Section:* {grade}\n🏆 *Last Exam Score:* 88% Marks (A+ Grade)\n\n🗓️ *Upcoming Schedule:* Annual Final Exams 15th March se start ho rahe hain. Complete Datesheet aur Roll Number slip portal par upload kar di gayi hai.\n\n🔙 *(Type *0* or *menu* to go back to main options)*`
        },
        {
            id: 'opt_4',
            active: true,
            keywords: '4, four, admission, prospectus',
            response: `🎓 *NEW ADMISSIONS INQUIRY*\n\n🌟 *TaleemiDunya Pro School* mein Playgroup se Class 10th tak Admissions OPEN hain!\n\n📋 *Requirements:*\n• Student B-Form / Birth Certificate\n• 4 Passport Size Photographs\n• School Leaving Certificate (if applicable)\n\n🕒 *Test/Interview Timings:* Monday to Saturday (9:00 AM - 1:00 PM).\n\n🔙 *(Type *0* or *menu* to go back to main options)*`
        },
        {
            id: 'opt_5',
            active: true,
            keywords: '5, five, contact, office, admin, principal',
            response: `📞 *CONTACT SCHOOL ADMINISTRATION*\n\n🕒 *Office Hours:* Monday to Saturday (8:00 AM - 2:00 PM)\n📍 *Address:* Main Campus, TaleemiDunya Pro School\n📱 *Helpline & WhatsApp Admin:* +92 317-2234518\n📧 *Email:* info@taleemidunyapro.com\n\nAap kisi bhi waqt office visit kar sakte hain ya helpline par rabta kar sakte hain.\n\n🔙 *(Type *0* or *menu* to go back to main options)*`
        }
    ];

    try {
        const res = await fetch('https://umarhayat.alwaysdata.net/api/rules/update', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ schoolId: 'default_school', rules })
        });
        const json = await res.json();
        console.log('Update Result:', json);

        const checkRes = await fetch('https://umarhayat.alwaysdata.net/api/rules?schoolId=default_school');
        const checkJson = await checkRes.json();
        console.log('Verification Check count:', checkJson.rules ? checkJson.rules.length : 0);
    } catch (e) {
        console.error('Error:', e.message);
    }
}
injectMenuRules();
