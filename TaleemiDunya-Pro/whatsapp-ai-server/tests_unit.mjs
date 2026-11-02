import assert from 'assert';

// ---------------------------------------------------------------------------
// 1. Phone Normalizer & Validator (Canonical Pakistani & International)
// ---------------------------------------------------------------------------
export function normalizePhone(input = '') {
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

export function isValidPakistaniPhone(input = '') {
  const cleaned = normalizePhone(input);
  return /^923\d{9}$/.test(cleaned);
}

export function isValidPhone(input = '') {
  const cleaned = normalizePhone(input);
  if (!cleaned) return false;
  return /^923\d{9}$/.test(cleaned) || /^[1-9]\d{10,14}$/.test(cleaned);
}

export function maskIdentifier(id = '') {
  if (!id) return '[EMPTY]';
  const str = String(id).trim();
  if (str.length <= 6) return '***';
  return str.slice(0, 3) + '****' + str.slice(-3);
}

// ---------------------------------------------------------------------------
// 2. Intent Classifier
// ---------------------------------------------------------------------------
export function detectIntent(text = '') {
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

// ---------------------------------------------------------------------------
// 3. Multi-Child Fee Calculation & Aggregation
// ---------------------------------------------------------------------------
export function calculateFamilyFeeReport(children = [], vouchers = []) {
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

    // Check if an unpaid voucher in database matches this child
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

// ---------------------------------------------------------------------------
// 4. Authoritative Identity Resolution Model (Mirrors server.js)
// ---------------------------------------------------------------------------
export function resolveSenderIdentityPure(msg, lidMap = new Map()) {
  const correlationId = 'test_' + Math.random().toString(36).substring(2, 7);
  const senderJid = String(msg?.key?.remoteJid || '').trim();
  const participantJid = String(msg?.key?.participant || '').trim();
  const isLid = senderJid.endsWith('@lid');
  const isPhoneJid = senderJid.endsWith('@s.whatsapp.net') || senderJid.endsWith('@c.us');
  const isGroup = senderJid.endsWith('@g.us');

  let resolvedPhone = null;
  let resolutionSource = 'NONE';

  // 1. Direct phone-number JID
  if (isPhoneJid) {
    const rawDigits = senderJid.split('@')[0].split(':')[0];
    const norm = normalizePhone(rawDigits);
    if (norm && isValidPhone(norm)) {
      resolvedPhone = norm;
      resolutionSource = 'DIRECT_PHONE_JID';
    }
  }

  // 2. LID JID: must resolve ONLY via authoritative sources
  if (isLid) {
    const lidKey = senderJid.replace('@lid', '').split('@')[0].split(':')[0].trim();

    // Priority A: Baileys 6.7.23 stanza attribute senderPn (sender_pn)
    const senderPn = msg?.key?.senderPn || '';
    if (senderPn && !String(senderPn).endsWith('@lid')) {
      const norm = normalizePhone(senderPn);
      if (norm && isValidPhone(norm)) {
        resolvedPhone = norm;
        resolutionSource = 'KEY_SENDER_PN';
        lidMap.set(lidKey, norm);
      }
    }

    // Priority B: Alternate JID
    if (!resolvedPhone) {
      const altJid = msg?.key?.remoteJidAlt || msg?.key?.participantAlt || '';
      if (altJid && (altJid.endsWith('@s.whatsapp.net') || altJid.endsWith('@c.us'))) {
        const norm = normalizePhone(altJid);
        if (norm && isValidPhone(norm)) {
          resolvedPhone = norm;
          resolutionSource = 'KEY_ALT_JID';
          lidMap.set(lidKey, norm);
        }
      }
    }

    // Priority C: Participant JID in 1-on-1 chat
    if (!resolvedPhone && participantJid && (participantJid.endsWith('@s.whatsapp.net') || participantJid.endsWith('@c.us'))) {
      const norm = normalizePhone(participantJid);
      if (norm && isValidPhone(norm)) {
        resolvedPhone = norm;
        resolutionSource = 'PARTICIPANT_PHONE_JID';
        lidMap.set(lidKey, norm);
      }
    }

    // Priority D: Authoritative In-Memory / Persisted LID mapping table
    if (!resolvedPhone && lidMap.has(lidKey)) {
      const mapped = lidMap.get(lidKey);
      const norm = normalizePhone(mapped);
      if (norm && isValidPhone(norm)) {
        resolvedPhone = norm;
        resolutionSource = 'AUTHORITATIVE_LID_MAP';
      }
    }
  }

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
// 5. Unit Tests Execution
// ---------------------------------------------------------------------------
console.log('=== RUNNING UNIT TESTS ===');

// Phone tests: Pakistani Canonical Form (923XXXXXXXXX)
assert.strictEqual(normalizePhone('03001234567'), '923001234567');
assert.strictEqual(normalizePhone('+92-300-1234567'), '923001234567');
assert.strictEqual(normalizePhone('00923001234567'), '923001234567');
assert.strictEqual(normalizePhone('3001234567'), '923001234567');
assert.strictEqual(normalizePhone('923001234567@s.whatsapp.net'), '923001234567');
assert.strictEqual(isValidPakistaniPhone('923001234567'), true);
assert.strictEqual(isValidPakistaniPhone('922001234567'), false);
assert.strictEqual(isValidPakistaniPhone('12345'), false);
// Ensure raw LID digits are rejected as Pakistani phone numbers
assert.strictEqual(isValidPakistaniPhone('212459700883552'), false);
console.log('✅ Phone normalization tests passed');

// Intent tests
assert.strictEqual(detectIntent('hi'), 'MENU');
assert.strictEqual(detectIntent('salam'), 'MENU');
assert.strictEqual(detectIntent('assalam-o-alaikum'), 'MENU');
assert.strictEqual(detectIntent('menu'), 'MENU');
assert.strictEqual(detectIntent('0'), 'MENU');
assert.strictEqual(detectIntent('meri fee kitni baqi hai?'), 'FEES');
assert.strictEqual(detectIntent('challan voucher'), 'FEES');
assert.strictEqual(detectIntent('1'), 'FEES');
assert.strictEqual(detectIntent('1️⃣'), 'FEES');
assert.strictEqual(detectIntent('attendance report'), 'ATTENDANCE');
assert.strictEqual(detectIntent('aaj hazri lagi?'), 'ATTENDANCE');
assert.strictEqual(detectIntent('homework dikhao'), 'HOMEWORK');
assert.strictEqual(detectIntent('result batao'), 'RESULTS');
assert.strictEqual(detectIntent('datesheet schedule'), 'DATESHEET');
assert.strictEqual(detectIntent('admission inquiry'), 'ADMISSIONS');
assert.strictEqual(detectIntent('principal office rabta'), 'CONTACT');
assert.strictEqual(detectIntent('random casual conversation'), 'GENERAL');
console.log('✅ Intent detection tests passed');

// Multi-Child Fee Calculation Test
const mockChildren = [
  { id: 'c1', name: 'Ali', rollNumber: '101', class: '5th', monthlyFee: 2500 },
  { id: 'c2', name: 'Sara', rollNumber: '102', class: '3rd', monthlyFee: 2200 }
];
const mockVouchers = [
  {
    voucherNo: 'V-101',
    status: 'Unpaid',
    dueDate: '2026-10-10',
    childrenDetails: [
      { admNo: '101', name: 'Ali', fee: 2500, arrears: 500, annualFee: 300 },
      { admNo: '102', name: 'Sara', fee: 2200, arrears: 0, annualFee: 300 }
    ]
  }
];
const feeReport = calculateFamilyFeeReport(mockChildren, mockVouchers);
assert.strictEqual(feeReport.children.length, 2);
assert.strictEqual(feeReport.children[0].totalPayable, 3300); // 2500 + 500 + 300
assert.strictEqual(feeReport.children[1].totalPayable, 2500); // 2200 + 0 + 300
assert.strictEqual(feeReport.combinedTotal, 5800); // 3300 + 2500
console.log('✅ Multi-child fee aggregation tests passed');

console.log('🎉 ALL UNIT TESTS PASSED SUCCESSFULLY!');
