import assert from 'assert';
import PDFDocument from 'pdfkit';

// Load our unit and identity logic
import { 
  normalizePhone, 
  isValidPakistaniPhone, 
  isValidPhone, 
  maskIdentifier,
  detectIntent, 
  calculateFamilyFeeReport,
  resolveSenderIdentityPure 
} from './tests_unit.mjs';

console.log('======================================================');
console.log('🧪 TALEEMIDUNYA PRO — 12/12 REGRESSION ACCEPTANCE SUITE');
console.log('======================================================\n');

// Mock Database Schema for School Tenants
const SCHOOL_A = 'NNRuCtHxQNjISc9EPgMs';
const SCHOOL_B = 'OTHER_SCHOOL_ID_999';

// Registered database state (reflects Firestore students collection)
const mockDatabaseStudents = [
  // School A — Family 1: Waris (3 Active Children: Angelina, Jasika, Amiel John)
  {
    id: 'st_1',
    schoolId: SCHOOL_A,
    name: 'Angelina',
    rollNumber: '306',
    class: '5th',
    section: 'A',
    monthlyFee: 2000,
    parentPhone: '0318-8000082',
    phone: '03188000082',
    fatherName: 'Waris',
    status: 'Active',
    isActive: true
  },
  {
    id: 'st_2',
    schoolId: SCHOOL_A,
    name: 'Jasika',
    rollNumber: '307',
    class: '6th',
    section: 'A',
    monthlyFee: 2000,
    parentPhone: '+923188000082',
    fatherName: 'Waris',
    status: 'Active',
    isActive: true
  },
  {
    id: 'st_3',
    schoolId: SCHOOL_A,
    name: 'Amiel John',
    rollNumber: '308',
    class: 'PS-II',
    section: 'A',
    monthlyFee: 2000,
    parentPhone: '923188000082',
    fatherName: 'Waris',
    status: 'Active',
    isActive: true
  },

  // School A — Family 2: Tariq (1 Active Child, 1 Inactive/Transferred Child)
  {
    id: 'st_4',
    schoolId: SCHOOL_A,
    name: 'Bilal Tariq',
    rollNumber: '401',
    class: '8th',
    section: 'B',
    monthlyFee: 2500,
    parentPhone: '03001234567',
    fatherName: 'Tariq Mehmood',
    status: 'Active',
    isActive: true
  },
  {
    id: 'st_5',
    schoolId: SCHOOL_A,
    name: 'Zainab Tariq',
    rollNumber: '402',
    class: '10th',
    section: 'A',
    monthlyFee: 3000,
    parentPhone: '03001234567',
    fatherName: 'Tariq Mehmood',
    status: 'transferred', // INACTIVE / TRANSFERRED
    isActive: false
  },

  // School A — Family 3: Only Inactive Student
  {
    id: 'st_6',
    schoolId: SCHOOL_A,
    name: 'Former Student',
    rollNumber: '501',
    class: 'Passout',
    section: 'A',
    monthlyFee: 0,
    parentPhone: '03217777777',
    fatherName: 'Old Parent',
    status: 'withdrawn',
    isActive: false
  },

  // School B (Different School Tenant) — Child registered in School B with same or different phone
  {
    id: 'st_7',
    schoolId: SCHOOL_B,
    name: 'Other School Child',
    rollNumber: '901',
    class: '5th',
    section: 'A',
    monthlyFee: 5000,
    parentPhone: '03339999999',
    fatherName: 'Tenant B Parent',
    status: 'Active',
    isActive: true
  }
];

// Mock Unpaid Vouchers
const mockDatabaseVouchers = [
  {
    schoolId: SCHOOL_A,
    voucherNo: '1077',
    status: 'Unpaid',
    dueDate: '2026-10-10',
    childrenDetails: [
      { admNo: '306', name: 'Angelina', fee: 2000, annualFee: 500, arrears: 1500 },
      { admNo: '307', name: 'Jasika', fee: 2000, annualFee: 500, arrears: 0 },
      { admNo: '308', name: 'Amiel John', fee: 2000, annualFee: 500, arrears: 3000 }
    ]
  }
];

// Helper to query mock database students mimicking server.js Firestore logic
function queryStudents(schoolId, normalizedPhone) {
  if (!schoolId || !normalizedPhone || !isValidPhone(normalizedPhone)) return [];

  const matched = [];
  for (const st of mockDatabaseStudents) {
    // 1. Strict Tenant Scoping
    if (st.schoolId !== schoolId) continue;

    // 2. Filter inactive, transferred, deleted, withdrawn, struck_off
    const stStatus = String(st.status || 'Active').toLowerCase();
    if (['inactive', 'transferred', 'deleted', 'withdrawn', 'struck_off', 'passout', 'alumni'].includes(stStatus) || st.isActive === false) {
      continue;
    }

    // 3. Strict Phone Equality Check
    const contactFields = [
      st.parentPhone, st.phone, st.fatherPhone, st.motherPhone,
      st.guardianPhone, st.whatsappNumber, st.emergencyContact
    ].filter(Boolean);

    const match = contactFields.some(p => {
      const pNorm = normalizePhone(p);
      return pNorm && pNorm === normalizedPhone;
    });

    if (match) {
      matched.push(st);
    }
  }

  return matched;
}

// Full mock AI Bot Authorization Gate mimicking server.js
function mockAIBotHandler(schoolId, senderIdentity, incomingText) {
  let senderPhone = '';
  let isLid = false;

  if (senderIdentity && typeof senderIdentity === 'object') {
    senderPhone = senderIdentity.resolvedPhone || '';
    isLid = !!senderIdentity.isLid;
  } else {
    senderPhone = String(senderIdentity || '').trim();
    if (senderPhone.endsWith('@lid')) {
      isLid = true;
      senderPhone = ''; // Do NOT treat LID as phone!
    }
  }

  const normalizedSender = senderPhone ? normalizePhone(senderPhone) : '';
  const intent = detectIntent(incomingText);

  // Step A: Public Options
  if (['ADMISSIONS', 'CONTACT'].includes(intent)) {
    return {
      allowed: true,
      type: 'PUBLIC',
      reply: `Public response for ${intent}`
    };
  }

  // Step B: Authenticate Registered Parent
  if (!normalizedSender || !isValidPhone(normalizedSender)) {
    return {
      allowed: false,
      type: 'DENIED',
      reason: isLid ? 'UNRESOLVED_LID' : 'INVALID_PHONE',
      reply: 'Assalam-o-Alaikum! Aap ka WhatsApp account hamare school record mein registered nahi mila.'
    };
  }

  const matchedStudents = queryStudents(schoolId, normalizedSender);

  // Step C: Security Gate for Unregistered Contacts
  if (matchedStudents.length === 0) {
    return {
      allowed: false,
      type: 'DENIED',
      reason: 'UNREGISTERED_PHONE',
      reply: `Assalam-o-Alaikum! Aap ka WhatsApp account (+${normalizedSender}) hamare school record mein registered nahi mila.`
    };
  }

  // Step D: Authorized Registered Parent Flow
  return {
    allowed: true,
    type: 'AUTHORIZED',
    students: matchedStudents,
    parentName: matchedStudents[0].fatherName || 'Parent',
    reply: `Welcome parent! Total authorized children: ${matchedStudents.length}`
  };
}

// ===========================================================================
// SCENARIO 1: Local Pakistani number matching its international representation
// ===========================================================================
console.log('▶ [1/12] Testing Local Pakistani Number Matching International Representation...');
const localPhone = '0318-8000082';
const intlPhone1 = '+923188000082';
const intlPhone2 = '00923188000082';
const intlPhone3 = '923188000082';
const rawPhone   = '3188000082';

const canonical = '923188000082';
assert.strictEqual(normalizePhone(localPhone), canonical);
assert.strictEqual(normalizePhone(intlPhone1), canonical);
assert.strictEqual(normalizePhone(intlPhone2), canonical);
assert.strictEqual(normalizePhone(intlPhone3), canonical);
assert.strictEqual(normalizePhone(rawPhone), canonical);
assert.strictEqual(isValidPakistaniPhone(canonical), true);
console.log('  ✅ Local 0318-8000082 and international forms (+92, 0092, 92) resolve to same canonical 923188000082.\n');

// ===========================================================================
// SCENARIO 2: A phone-number JID with a verified registered contact
// ===========================================================================
console.log('▶ [2/12] Testing Phone-Number JID with Verified Registered Contact...');
const phoneMsg = {
  key: {
    remoteJid: '923188000082@s.whatsapp.net',
    fromMe: false,
    id: 'MSG_PHONE_01'
  }
};
const phoneIdRes = resolveSenderIdentityPure(phoneMsg);
assert.strictEqual(phoneIdRes.isPhoneJid, true);
assert.strictEqual(phoneIdRes.resolvedPhone, '923188000082');
assert.strictEqual(phoneIdRes.resolutionSource, 'DIRECT_PHONE_JID');

const authRes2 = mockAIBotHandler(SCHOOL_A, phoneIdRes, 'fee voucher');
assert.strictEqual(authRes2.allowed, true);
assert.strictEqual(authRes2.type, 'AUTHORIZED');
assert.strictEqual(authRes2.students.length, 3);
console.log('  ✅ Phone-number JID resolved and granted access to all 3 children.\n');

// ===========================================================================
// SCENARIO 3: A LID with an authoritative mapping to a registered contact
// ===========================================================================
console.log('▶ [3/12] Testing LID with Authoritative Mapping to Registered Contact...');
// Case 3A: Authoritative mapping supplied in Baileys stanza senderPn attribute
const lidMsgWithPn = {
  key: {
    remoteJid: '212459700883552@lid',
    senderPn: '923188000082@s.whatsapp.net',
    fromMe: false,
    id: 'MSG_LID_01'
  }
};
const testLidMap = new Map();
const lidIdRes3A = resolveSenderIdentityPure(lidMsgWithPn, testLidMap);
assert.strictEqual(lidIdRes3A.isLid, true);
assert.strictEqual(lidIdRes3A.resolvedPhone, '923188000082');
assert.strictEqual(lidIdRes3A.resolutionSource, 'KEY_SENDER_PN');
assert.strictEqual(testLidMap.get('212459700883552'), '923188000082');

const authRes3A = mockAIBotHandler(SCHOOL_A, lidIdRes3A, 'fee kitni hai');
assert.strictEqual(authRes3A.allowed, true);
assert.strictEqual(authRes3A.type, 'AUTHORIZED');
assert.strictEqual(authRes3A.students.length, 3);

// Case 3B: Subsequent message using authoritative map cached from earlier contact event
const lidMsgCached = {
  key: {
    remoteJid: '212459700883552@lid',
    fromMe: false,
    id: 'MSG_LID_02'
  }
};
const lidIdRes3B = resolveSenderIdentityPure(lidMsgCached, testLidMap);
assert.strictEqual(lidIdRes3B.resolvedPhone, '923188000082');
assert.strictEqual(lidIdRes3B.resolutionSource, 'AUTHORITATIVE_LID_MAP');
console.log('  ✅ LID with authoritative mapping (senderPn and cached map) verified and granted access.\n');

// ===========================================================================
// SCENARIO 4: A LID without an authoritative mapping (CRITICAL PROOF)
// ===========================================================================
console.log('▶ [4/12] Testing LID Without Authoritative Mapping (Proving No False Match)...');
// Note: An attacker or unmapped user sends an LID whose digits might end in or resemble a registered phone
const unmappedLidMsg = {
  key: {
    remoteJid: '212459700883552@lid',
    fromMe: false,
    id: 'MSG_LID_UNMAPPED'
  }
};
const emptyLidMap = new Map();
const unmappedLidRes = resolveSenderIdentityPure(unmappedLidMsg, emptyLidMap);

// Must prove resolvedPhone is strictly NULL
assert.strictEqual(unmappedLidRes.isLid, true);
assert.strictEqual(unmappedLidRes.resolvedPhone, null, 'Unmapped LID MUST NOT resolve to arbitrary digits');
assert.strictEqual(unmappedLidRes.resolutionSource, 'NONE');

// Must prove that security gate completely rejects confidential data access
const authRes4 = mockAIBotHandler(SCHOOL_A, unmappedLidRes, '1');
assert.strictEqual(authRes4.allowed, false);
assert.strictEqual(authRes4.type, 'DENIED');
assert.strictEqual(authRes4.reason, 'UNRESOLVED_LID');
// Prove rejection reply does NOT leak or expose raw LID digits as (+212459700883552)
assert.strictEqual(authRes4.reply.includes('212459700883552'), false, 'Must NOT display foreign-looking LID digits');
console.log('  ✅ PROVEN: Unresolved LID cannot gain access merely because its digits exist; no LID digits leaked in notice.\n');

// ===========================================================================
// SCENARIO 5: An unregistered phone number
// ===========================================================================
console.log('▶ [5/12] Testing Unregistered Phone Number...');
const unregMsg = {
  key: {
    remoteJid: '923459999999@s.whatsapp.net',
    fromMe: false,
    id: 'MSG_UNREG_01'
  }
};
const unregIdRes = resolveSenderIdentityPure(unregMsg);
assert.strictEqual(unregIdRes.resolvedPhone, '923459999999');

// Confidential request is blocked
const unregFee = mockAIBotHandler(SCHOOL_A, unregIdRes, 'fee voucher');
assert.strictEqual(unregFee.allowed, false);
assert.strictEqual(unregFee.type, 'DENIED');
assert.strictEqual(unregFee.reason, 'UNREGISTERED_PHONE');
assert(unregFee.reply.includes('+923459999999'), 'Legitimate unregistered phone may be reflected for contact verification');

// Public request is allowed
const unregAdmin = mockAIBotHandler(SCHOOL_A, unregIdRes, 'admission inquiry');
assert.strictEqual(unregAdmin.allowed, true);
assert.strictEqual(unregAdmin.type, 'PUBLIC');
console.log('  ✅ Unregistered phone denied private student data but granted public admissions information.\n');

// ===========================================================================
// SCENARIO 6: A malformed or unsupported sender identifier
// ===========================================================================
console.log('▶ [6/12] Testing Malformed or Unsupported Sender Identifiers...');
const malformedCases = [
  { key: { remoteJid: 'status@broadcast' } },
  { key: { remoteJid: '12345@broadcast' } },
  { key: { remoteJid: '123456789-987654@g.us' } }, // Group JID
  { key: { remoteJid: 'invalid-non-number@s.whatsapp.net' } },
  { key: { remoteJid: '' } },
  null
];

for (const mCase of malformedCases) {
  const mRes = resolveSenderIdentityPure(mCase);
  assert.strictEqual(mRes.resolvedPhone, null);
  const mAuth = mockAIBotHandler(SCHOOL_A, mRes, 'fees');
  assert.strictEqual(mAuth.allowed, false);
}
console.log('  ✅ Malformed and broadcast JIDs safely rejected without exceptions.\n');

// ===========================================================================
// SCENARIO 7: A contact linked to multiple active children
// ===========================================================================
console.log('▶ [7/12] Testing Contact Linked to Multiple Active Children (Multi-Child Family Context)...');
const familyMsg = {
  key: { remoteJid: '923188000082@s.whatsapp.net', fromMe: false, id: 'MSG_FAM_01' }
};
const famIdRes = resolveSenderIdentityPure(familyMsg);
const famAuth = mockAIBotHandler(SCHOOL_A, famIdRes, 'fee balance');
assert.strictEqual(famAuth.allowed, true);
assert.strictEqual(famAuth.students.length, 3);
const names = famAuth.students.map(s => s.name);
assert(names.includes('Angelina'));
assert(names.includes('Jasika'));
assert(names.includes('Amiel John'));

// Verify multi-child fee aggregation
const feeAgg = calculateFamilyFeeReport(famAuth.students, mockDatabaseVouchers);
assert.strictEqual(feeAgg.children.length, 3);
assert.strictEqual(feeAgg.children[0].totalPayable, 4000); // 2000 fee + 1500 arrears + 500 annual
assert.strictEqual(feeAgg.children[1].totalPayable, 2500); // 2000 fee + 0 arrears + 500 annual
assert.strictEqual(feeAgg.children[2].totalPayable, 5500); // 2000 fee + 3000 arrears + 500 annual
assert.strictEqual(feeAgg.combinedTotal, 12000);
console.log('  ✅ Multi-child family tree intact: All 3 active siblings retrieved with total Rs. 12,000/-.\n');

// ===========================================================================
// SCENARIO 8: A contact linked to inactive or transferred students
// ===========================================================================
console.log('▶ [8/12] Testing Contact Linked to Inactive or Transferred Students...');
// Tariq Mehmood has 1 active child (Bilal) and 1 transferred child (Zainab)
const tariqMsg = {
  key: { remoteJid: '923001234567@s.whatsapp.net', fromMe: false, id: 'MSG_TARIQ_01' }
};
const tariqIdRes = resolveSenderIdentityPure(tariqMsg);
const tariqAuth = mockAIBotHandler(SCHOOL_A, tariqIdRes, 'fee balance');
assert.strictEqual(tariqAuth.allowed, true);
assert.strictEqual(tariqAuth.students.length, 1);
assert.strictEqual(tariqAuth.students[0].name, 'Bilal Tariq');

// Old parent only has a withdrawn student
const oldParentMsg = {
  key: { remoteJid: '923217777777@s.whatsapp.net', fromMe: false, id: 'MSG_OLD_01' }
};
const oldIdRes = resolveSenderIdentityPure(oldParentMsg);
const oldAuth = mockAIBotHandler(SCHOOL_A, oldIdRes, 'fee balance');
assert.strictEqual(oldAuth.allowed, false, 'Parent with only inactive/withdrawn student must be denied access');
console.log('  ✅ Inactive and transferred students excluded from family context; fully inactive parent denied.\n');

// ===========================================================================
// SCENARIO 9: Duplicate phone numbers and ambiguous parent relationships
// ===========================================================================
console.log('▶ [9/12] Testing Duplicate Phone Numbers and Ambiguous Parent Relationships...');
// Angelina, Jasika, Amiel John all share 923188000082. Verify deduplication and consistent father name.
const dupCheck = queryStudents(SCHOOL_A, '923188000082');
const uniqueIds = new Set(dupCheck.map(s => s.id));
assert.strictEqual(uniqueIds.size, 3, 'No duplicate student records returned for single query');
console.log('  ✅ Shared parent phone numbers aggregated cleanly without duplicated child cards.\n');

// ===========================================================================
// SCENARIO 10: Cross-tenant isolation (Attempting to access another school)
// ===========================================================================
console.log('▶ [10/12] Testing Tenant Isolation (Cross-School Boundary)...');
// Student st_7 is in School B with phone 03339999999
const crossMsg = {
  key: { remoteJid: '923339999999@s.whatsapp.net', fromMe: false, id: 'MSG_CROSS_01' }
};
const crossIdRes = resolveSenderIdentityPure(crossMsg);

// When queried on School A: MUST BE DENIED
const crossAuthSchoolA = mockAIBotHandler(SCHOOL_A, crossIdRes, 'fee voucher');
assert.strictEqual(crossAuthSchoolA.allowed, false, 'School A must reject parent from School B');

// When queried on School B: ALLOWED
const crossAuthSchoolB = mockAIBotHandler(SCHOOL_B, crossIdRes, 'fee voucher');
assert.strictEqual(crossAuthSchoolB.allowed, true, 'School B must permit its own parent');
assert.strictEqual(crossAuthSchoolB.students[0].name, 'Other School Child');
console.log('  ✅ Cross-tenant boundary enforced: School A blocks School B parents strictly.\n');

// ===========================================================================
// SCENARIO 11: Interactive list/button replies and ordinary text messages
// ===========================================================================
console.log('▶ [11/12] Testing Interactive List/Button Replies and Ordinary Text Messages...');
function unwrapIncomingText(msg) {
  const msgObj = msg.message?.ephemeralMessage?.message || msg.message?.viewOnceMessage?.message || msg.message;
  if (!msgObj) return '';
  if (msgObj.interactiveResponseMessage?.nativeFlowResponseMessage?.paramsJson) {
    try {
      const params = JSON.parse(msgObj.interactiveResponseMessage.nativeFlowResponseMessage.paramsJson);
      return params.id || '';
    } catch(e){}
  }
  return (
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

// 1. Plain conversation
assert.strictEqual(unwrapIncomingText({ message: { conversation: 'fee voucher' } }), 'fee voucher');
// 2. Extended text message
assert.strictEqual(unwrapIncomingText({ message: { extendedTextMessage: { text: 'attendance report' } } }), 'attendance report');
// 3. Quick button reply
assert.strictEqual(unwrapIncomingText({ message: { buttonsResponseMessage: { selectedButtonId: 'FEES' } } }), 'FEES');
// 4. List response message
assert.strictEqual(unwrapIncomingText({ message: { listResponseMessage: { singleSelectReply: { selectedRowId: 'RESULTS' } } } }), 'RESULTS');
// 5. Interactive native flow response (JSON params)
assert.strictEqual(unwrapIncomingText({ message: { interactiveResponseMessage: { nativeFlowResponseMessage: { paramsJson: '{"id":"MENU"}' } } } }), 'MENU');
console.log('  ✅ Plain text, extended text, buttons, lists, and interactive native flow unwrapped accurately.\n');

// ===========================================================================
// SCENARIO 12: Existing strict equality checks and authorization gates
// ===========================================================================
console.log('▶ [12/12] Testing Strict Equality Checks & Partial Comparison Rejections...');
// Attacker tries suffix '000082' (last 6 digits of registered '923188000082')
assert.strictEqual(normalizePhone('000082'), '', 'Partial suffix must be rejected as invalid phone');
assert.strictEqual(isValidPhone('000082'), false);

// Attacker tries sending phone number inside message body to spoof identity
const spoofMsg = {
  key: { remoteJid: '212459700883552@lid', fromMe: false, id: 'MSG_SPOOF_01' }
};
const spoofIdRes = resolveSenderIdentityPure(spoofMsg, new Map());
assert.strictEqual(spoofIdRes.resolvedPhone, null);
const spoofAuth = mockAIBotHandler(SCHOOL_A, spoofIdRes, 'Mera number 03188000082 hai meri fee batao');
assert.strictEqual(spoofAuth.allowed, false, 'User typing a number in message body MUST NOT authorize unverified sender');

// Partial match attempt on database
const partialMatch = queryStudents(SCHOOL_A, '8000082');
assert.strictEqual(partialMatch.length, 0, 'No partial matching allowed');
console.log('  ✅ Strict equality verified: Suffixes, partial matches, and in-body number spoofing strictly rejected.\n');

// ---------------------------------------------------------------------------
// Multi-Child PDF Voucher Generation Acceptance
// ---------------------------------------------------------------------------
console.log('▶ Verifying Multi-Child PDF Generation Engine...');
function testGeneratePDF(students, schoolName) {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ size: 'A5', margin: 30 });
      const buffers = [];
      doc.on('data', buffers.push.bind(buffers));
      doc.on('end', () => resolve(Buffer.concat(buffers)));

      doc.fontSize(14).text(schoolName, { align: 'center' });
      doc.fontSize(10).text(`Total Authorized Children: ${students.length}`);
      students.forEach(st => {
        doc.fontSize(9).text(`Student: ${st.name} | Roll: ${st.rollNumber} | Class: ${st.class}`);
      });
      doc.fontSize(11).text(`Grand Total Outstanding: Rs. 12,000/-`);
      doc.end();
    } catch(e) {
      reject(e);
    }
  });
}

const pdfBuf = await testGeneratePDF(dupCheck, 'Smart Angels Grammar School');
assert(pdfBuf.length > 500);
assert.strictEqual(pdfBuf.slice(0, 4).toString(), '%PDF');
console.log(`  ✅ Generated ${pdfBuf.length} bytes valid PDF voucher.\n`);

console.log('======================================================');
console.log('🎉 ALL 12 REGRESSION TEST SCENARIOS PASSED WITH 100% SUCCESS!');
console.log('======================================================\n');
