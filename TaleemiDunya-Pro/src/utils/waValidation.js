export function normalizePhone(input = '') {
  const digits = String(input).replace(/\D/g, '');
  if (!digits) return '';

  if (digits.startsWith('92') && digits.length === 12) return digits;
  if (digits.startsWith('0') && digits.length === 11) return digits;
  if (digits.length === 11) return digits;
  if (digits.length === 10) return `92${digits}`;
  return digits;
}

export function formatCnic(input = '') {
  const digits = String(input).replace(/\D/g, '').slice(0, 13);
  if (digits.length <= 5) return digits;
  if (digits.length <= 12) return `${digits.slice(0, 5)}-${digits.slice(5)}`;
  return `${digits.slice(0, 5)}-${digits.slice(5, 12)}-${digits.slice(12)}`;
}

export function isValidPhone(input = '') {
  const cleaned = normalizePhone(input);
  if (!cleaned) return false;
  return /^92\d{10}$/.test(cleaned) || /^\d{11}$/.test(cleaned);
}

export function isValidCnic(input = '') {
  const digits = String(input).replace(/\D/g, '');
  return digits.length === 13;
}

export function buildSchoolMenuText(schoolName = 'TaleemiDunya Pro') {
  const name = String(schoolName || 'TaleemiDunya Pro').trim() || 'TaleemiDunya Pro';
  return `🏫 *${name.toUpperCase()}* 🎓\nAssalam-o-Alaikum! Main aapka 24/7 AI Smart Assistant hun.\n\n*Main Menu - Number type karein:*\n\n1️⃣ Fee Voucher & Dues\n2️⃣ Student Attendance\n3️⃣ Daily Diary & HW\n4️⃣ Exam Results\n5️⃣ Datesheet & Holidays\n6️⃣ New Admission Inquiry\n7️⃣ Contact Admin\n\n💡 *(Type 0 or "menu" anytime to return. For example: reply "fees", "exam", or "attendance".)*`;
}
