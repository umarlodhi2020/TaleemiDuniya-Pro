const { NodeSSH } = require('node-ssh');
const fs = require('fs');
const path = require('path');

const ssh = new NodeSSH();

async function run() {
  await ssh.connect({
    host: 'ssh-umarhayat.alwaysdata.net',
    username: 'umarhayat',
    password: 'umar9900'
  });
  console.log('SSH Connected.');

  // Upload our diagnostic analysis script
  const remotePath = '/home/umarhayat/TaleemiDunya-Pro/whatsapp-ai-server/remote_diag.cjs';
  const localAnalysisCode = `
process.env.FIRESTORE_PREFER_REST = '1';
process.env.GOOGLE_CLOUD_DISABLE_GRPC = '1';

const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');

const serviceAccount = JSON.parse(fs.readFileSync(path.join(__dirname, 'serviceAccountKey.json'), 'utf8'));

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
}

const db = admin.firestore();

async function analyze() {
  console.log('=== STARTING FIRESTORE FAMILY & FEE ANALYSIS ===\\n');

  // Find school
  const schoolSnap = await db.collection('schools').get();
  console.log('Schools count:', schoolSnap.size);
  const schools = [];
  schoolSnap.forEach(d => {
    schools.push({ id: d.id, name: d.data().name || d.data().schoolName });
    console.log('School:', d.id, '|', d.data().name || d.data().schoolName);
  });

  const studentsSnap = await db.collection('students').get();
  console.log('\\nTotal Students in Database:', studentsSnap.size);

  const students = [];
  studentsSnap.forEach(d => students.push({ id: d.id, ...d.data() }));

  const schoolId = 'NNRuCtHxQNjISc9EPgMs';
  const schoolStudents = students.filter(s => s.schoolId === schoolId || !s.schoolId);
  console.log(\`Students for target school (\${schoolId}): \${schoolStudents.length}\`);

  // 1. Explicit familyId Mismatches
  const familyIdMap = {};
  schoolStudents.forEach(st => {
    const fId = st.familyId ? String(st.familyId).trim() : null;
    if (fId && fId !== '-' && fId !== '') {
      if (!familyIdMap[fId]) familyIdMap[fId] = [];
      familyIdMap[fId].push(st);
    }
  });

  console.log(\`\\n[1] Students sharing explicit familyId: \${Object.keys(familyIdMap).length} distinct familyIds.\`);
  const familyIdMismatches = [];
  for (const [fId, members] of Object.entries(familyIdMap)) {
    if (members.length > 1) {
      const fatherNames = new Set(members.map(m => (m.fatherName || '').trim().toLowerCase()).filter(Boolean));
      const cnics = new Set(members.map(m => (m.fatherCnic || '').replace(/[^0-9]/g, '')).filter(Boolean));

      if (fatherNames.size > 1 || (cnics.size > 1 && cnics.size > 0)) {
        familyIdMismatches.push({
          familyId: fId,
          fatherNames: Array.from(fatherNames),
          cnics: Array.from(cnics),
          members: members.map(m => ({
            name: m.name,
            class: m.class,
            rollNo: m.rollNumber || m.rollNo,
            fatherName: m.fatherName,
            fatherCnic: m.fatherCnic,
            phone: m.parentPhone || m.fatherPhone || m.phone
          }))
        });
      }
    }
  }

  if (familyIdMismatches.length > 0) {
    console.log(\`🚨 FOUND \${familyIdMismatches.length} FAMILIES WITH DIFFERENT FATHERS SHARING THE SAME familyId:\`);
    familyIdMismatches.forEach(m => {
      console.log(\`\\nFamily ID: "\${m.familyId}" (Fathers: \${JSON.stringify(m.fatherNames)})\`);
      m.members.forEach(mem => {
        console.log(\`  - \${mem.name} (\${mem.class}, Roll: \${mem.rollNo}) | Father: "\${mem.fatherName}" | CNIC: "\${mem.fatherCnic}" | Phone: "\${mem.phone}"\`);
      });
    });
  } else {
    console.log('✅ No explicit familyId clashes found.');
  }

  // 2. Shared Phone Numbers with DIFFERENT Fathers
  const phoneMap = {};
  schoolStudents.forEach(st => {
    const raw = st.parentPhone || st.fatherPhone || st.phone || '';
    const clean = String(raw).replace(/[^0-9]/g, '');
    if (clean && clean.length >= 7 && clean !== '00000000000' && clean !== '1234567890' && clean !== '03000000000') {
      if (!phoneMap[clean]) phoneMap[clean] = [];
      phoneMap[clean].push(st);
    }
  });

  const phoneMismatches = [];
  for (const [phone, members] of Object.entries(phoneMap)) {
    if (members.length > 1) {
      const fatherNames = new Set(members.map(m => (m.fatherName || '').trim().toLowerCase()).filter(Boolean));
      if (fatherNames.size > 1) {
        phoneMismatches.push({
          phone,
          fatherNames: Array.from(fatherNames),
          members: members.map(m => ({
            name: m.name,
            class: m.class,
            rollNo: m.rollNumber || m.rollNo,
            fatherName: m.fatherName,
            familyId: m.familyId
          }))
        });
      }
    }
  }

  console.log(\`\\n[2] Shared Phone Numbers with DIFFERENT Fathers: \${phoneMismatches.length} cases.\`);
  phoneMismatches.forEach(p => {
    console.log(\`\\nPhone: \${p.phone} (Different Fathers: \${JSON.stringify(p.fatherNames)})\`);
    p.members.forEach(m => {
      console.log(\`  - \${m.name} (\${m.class}, Roll: \${m.rollNo}) | Father: "\${m.fatherName}" | FamilyId: \${m.familyId || 'NONE'}\`);
    });
  });

  // 3. Vouchers Inspection
  console.log(\`\\n[3] Checking Vouchers for School \${schoolId}...\`);
  const vSnap = await db.collection('vouchers').where('schoolId', '==', schoolId).get();
  console.log(\`Total vouchers found: \${vSnap.size}\`);
  const vouchers = [];
  vSnap.forEach(d => vouchers.push({ id: d.id, ...d.data() }));

  const wrongVouchers = [];
  vouchers.forEach(v => {
    if (v.childrenDetails && v.childrenDetails.length > 1) {
      const matched = [];
      v.childrenDetails.forEach(cd => {
        const st = schoolStudents.find(s => 
          (s.rollNumber && String(s.rollNumber).trim() === String(cd.admNo).trim()) ||
          (s.rollNo && String(s.rollNo).trim() === String(cd.admNo).trim()) ||
          (s.name && cd.studentName && s.name.trim().toLowerCase() === cd.studentName.trim().toLowerCase()) ||
          s.id === cd.studentId
        );
        if (st) {
          matched.push({ ...st, vName: cd.studentName, vAdm: cd.admNo });
        } else {
          matched.push({ name: cd.studentName, fatherName: 'UNKNOWN_IN_DB', class: cd.class, rollNo: cd.admNo });
        }
      });

      const fathers = new Set(matched.map(s => (s.fatherName || '').trim().toLowerCase()).filter(Boolean));
      if (fathers.size > 1) {
        wrongVouchers.push({
          voucherId: v.id,
          voucherNo: v.voucherNo || v.challanNo,
          month: v.month || v.feeMonth,
          fatherOnVoucher: v.fatherName,
          status: v.status,
          totalAmount: v.totalAmount,
          fathers: Array.from(fathers),
          children: matched.map(m => ({
            name: m.name,
            class: m.class,
            rollNo: m.rollNumber || m.rollNo,
            realFather: m.fatherName,
            familyId: m.familyId
          }))
        });
      }
    }
  });

  console.log(\`\\n[4] Corrupted Vouchers (Multiple different fathers merged into 1 voucher): \${wrongVouchers.length}\`);
  wrongVouchers.forEach(wv => {
    console.log(\`\\n🚨 VOUCHER #\${wv.voucherNo || wv.voucherId} | Month: \${wv.month} | Total: Rs. \${wv.totalAmount} | Status: \${wv.status}\`);
    console.log(\`   Father written on Voucher: "\${wv.fatherOnVoucher}"\`);
    console.log(\`   Fathers merged: \${JSON.stringify(wv.fathers)}\`);
    console.log(\`   Children in this voucher:\`);
    wv.children.forEach(c => {
      console.log(\`     * \${c.name} (\${c.class}, Roll: \${c.rollNo}) -> Real Father: "\${c.realFather}" (FamilyId: \${c.familyId || 'NONE'})\`);
    });
  });

  // 4. Duplicate Roll numbers
  const rollMap = {};
  schoolStudents.forEach(s => {
    const r = s.rollNumber || s.rollNo;
    if (r !== undefined && r !== null && String(r).trim() !== '') {
      const cr = String(r).trim();
      if (!rollMap[cr]) rollMap[cr] = [];
      rollMap[cr].push(s);
    }
  });

  const dupRolls = Object.entries(rollMap).filter(([k, v]) => v.length > 1);
  console.log(\`\\n[5] Roll Numbers shared across different students: \${dupRolls.length}\`);
  dupRolls.slice(0, 15).forEach(([r, arr]) => {
    console.log(\`  - Roll #\${r}: \${arr.map(s => \`"\${s.name}" (\${s.class}, Father: "\${s.fatherName}")\`).join(' AND ')}\`);
  });

  console.log('\\n=== DIAGNOSTIC FINISHED ===');
  process.exit(0);
}

analyze().catch(e => {
  console.error('ANALYSIS FAILED:', e);
  process.exit(1);
});
`;

  await ssh.execCommand(`cat << 'EOF' > ${remotePath}\n${localAnalysisCode}\nEOF`);
  console.log('Uploaded remote_diag.cjs to AlwaysData.');

  const res = await ssh.execCommand('node remote_diag.cjs', {
    cwd: '/home/umarhayat/TaleemiDunya-Pro/whatsapp-ai-server'
  });

  console.log('\n--- REMOTE OUTPUT ---');
  console.log(res.stdout);
  if (res.stderr) console.error('--- REMOTE STDERR ---\n', res.stderr);

  process.exit(0);
}

run().catch(e => {
  console.error('Runner error:', e);
  process.exit(1);
});

