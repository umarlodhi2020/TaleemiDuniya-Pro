import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../services/firebase';

const WA_SERVER = 'https://umarhayat.alwaysdata.net';

/**
 * Clean and format Pakistani phone number to international format (923XXXXXXXXX)
 */
export const formatPhoneNumber = (rawPhone) => {
  if (!rawPhone) return '';
  const clean = String(rawPhone).replace(/[^0-9]/g, '');
  if (clean.startsWith('0')) {
    return '92' + clean.slice(1);
  } else if (clean.startsWith('92')) {
    return clean;
  } else if (clean.length === 10 && clean.startsWith('3')) {
    return '92' + clean;
  }
  return clean;
};

/**
 * Dispatch WhatsApp Alert via Baileys Server or Background Queue
 */
export const sendWhatsAppApiMessage = async (schoolId, phone, message) => {
  const cleanPhone = formatPhoneNumber(phone);
  if (!cleanPhone || cleanPhone.length < 10) {
    return { success: false, error: 'Invalid phone number' };
  }

  try {
    const res = await fetch(`${WA_SERVER}/api/message/send`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        schoolId: schoolId || 'default_school',
        phone: cleanPhone,
        message: message
      })
    });

    if (res.ok) {
      const data = await res.json();
      return { success: true, data };
    }
  } catch (err) {
    console.warn('Baileys server direct send notice (will queue):', err.message);
  }

  // Fallback: Save to Firestore notifications collection for background worker / record keeping
  try {
    if (db && schoolId) {
      await addDoc(collection(db, 'whatsapp_queue'), {
        schoolId,
        phone: cleanPhone,
        message,
        status: 'pending',
        createdAt: serverTimestamp()
      });
    }
  } catch (dbErr) {
    // Non-fatal
  }

  return { success: true, queued: true };
};

/**
 * Automated Attendance Alert Engine for Students & Staff
 */
export const dispatchAttendanceAlert = async ({
  schoolId,
  schoolName = 'School Name',
  type = 'student', // 'student' | 'staff'
  member,
  action = 'ENTRY', // 'ENTRY' | 'EXIT' | 'LATE' | 'ABSENT'
  timeStr = '',
  dateStr = '',
  minutesLate = 0
}) => {
  if (!member) return null;

  const school = schoolName || 'TaleemiDunya School';
  const name = member.name || (type === 'staff' ? 'Staff Member' : 'Student');
  const nowTime = timeStr || new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true });
  const nowDate = dateStr || new Date().toLocaleDateString('en-GB');

  let phone = '';
  let msg = '';

  if (type === 'staff') {
    // Staff Notification
    phone = member.phone || member.contactNumber || member.whatsappNo || '';
    if (!phone) return null;

    if (action === 'ENTRY') {
      msg = `*محترم ${name} صاحب!* (${member.designation || member.role || 'Staff'})\n\n` +
        `آج بتاریخ *${nowDate}* آپ کی حاضری کامیابی سے درج ہو چکی ہے۔\n` +
        `⏰ وقت آمد: *${nowTime}*\n` +
        `کیفیت: *حاضر (Present)*\n\n` +
        `_پرنسپل آفس: ${school}_`;
    } else if (action === 'LATE') {
      msg = `*محترم ${name} صاحب!*\n\n` +
        `آج بتاریخ *${nowDate}* آپ کی حاضری وقت کے بعد درج ہوئی ہے۔\n` +
        `⏰ وقت آمد: *${nowTime}*\n` +
        `⚠️ تاخیر: *${minutesLate || 15} منٹ*\n\n` +
        `براہ کرم اسکول کے مقررہ وقت کی پابندی کو یقینی بنائیں۔\n\n` +
        `_انتظامیہ: ${school}_`;
    } else if (action === 'EXIT') {
      msg = `*محترم ${name} صاحب!*\n\n` +
        `آج بتاریخ *${nowDate}* آپ کی رخصت (Check Out) کامیابی سے درج ہو چکی ہے۔\n` +
        `🚪 وقت رخصت: *${nowTime}*\n\n` +
        `جزاک اللہ خیراً۔ فی امان اللہ!\n\n` +
        `_پرنسپل آفس: ${school}_`;
    } else if (action === 'ABSENT') {
      msg = `*محترم ${name} صاحب!*\n\n` +
        `آج بتاریخ *${nowDate}* آپ کو اسکول سے *غیر حاضر (ABSENT)* مارک کیا گیا ہے۔\n\n` +
        `اگر کوئی عذر یا بیماری ہے تو برائے مہربانی پرنسپل آفس کو فوری مطلع فرمائیں۔\n\n` +
        `_انتظامیہ: ${school}_`;
    }
  } else {
    // Student Notification to Guardian / Parents
    phone = member.fatherPhone || member.phone || member.emergencyPhone || member.guardianPhone || '';
    if (!phone) return null;

    const roll = member.rollNumber || member.rollNo || member.id || '';
    const studentClass = member.class || member.className || '';

    if (action === 'ENTRY') {
      msg = `*محترم والدین!*\n\n` +
        `آپ کا بچہ *${name}* (کلاس: ${studentClass}${roll ? `, رول نمبر: ${roll}` : ''}) بخیریت اسکول تشریف لے آیا ہے۔\n\n` +
        `⏰ وقت آمد: *${nowTime}*\n` +
        `بتاریخ: *${nowDate}*\n` +
        `کیفیت: *حاضر (Present)*\n\n` +
        `_ادارہ: ${school}_`;
    } else if (action === 'LATE') {
      msg = `*محترم والدین!*\n\n` +
        `آپ کا بچہ *${name}* (کلاس: ${studentClass}) آج اسکول کے وقت کے بعد تشریف لایا ہے۔\n\n` +
        `⏰ وقت آمد: *${nowTime}*\n` +
        `⚠️ تاخیر: *${minutesLate || 15} منٹ*\n\n` +
        `براہِ کرم بچے کی صبح کے وقت کی پابندی کو یقینی بنائیں تاکہ پڑھائی کا حرج نہ ہو۔\n\n` +
        `_پرنسپل آفس: ${school}_`;
    } else if (action === 'EXIT') {
      msg = `*محترم والدین!*\n\n` +
        `آپ کا بچہ *${name}* (کلاس: ${studentClass}) اسکول کے اختتام پر رخصت ہو چکا ہے۔\n\n` +
        `🚪 وقت رخصت: *${nowTime}*\n` +
        `بتاریخ: *${nowDate}*\n\n` +
        `_ادارہ: ${school}_`;
    } else if (action === 'ABSENT') {
      msg = `*محترم والدین!*\n\n` +
        `آپ کا بچہ *${name}* (کلاس: ${studentClass}) آج بتاریخ *${nowDate}* اسکول سے *غیر حاضر (Absent)* ہے۔\n\n` +
        `اگر کوئی بیماری یا ناگزیر عذر ہے تو فوری اسکول ایڈمن کو مطلع فرمائیں۔\n\n` +
        `_پرنسپل آفس: ${school}_`;
    }
  }

  if (phone && msg) {
    // Non-blocking asynchronous dispatch
    sendWhatsAppApiMessage(schoolId, phone, msg).catch(() => {});
    return {
      phone: formatPhoneNumber(phone),
      message: msg
    };
  }

  return null;
};


/**
 * Dispatch Automated WhatsApp Alert for School Plan Expiry & Feature Lock
 */
export const dispatchSuspensionWhatsAppAlert = async ({
  schoolId,
  schoolName = 'School Admin',
  phone = '',
  blockedCount = 0,
  expiryDateStr = '',
  graceDays = 1,
  type = 'LOCK' // 'WARNING' | 'LOCK' | 'IMMEDIATE'
}) => {
  const cleanPhone = formatPhoneNumber(phone);
  if (!cleanPhone) return null;

  let msg = '';
  if (type === 'IMMEDIATE') {
    msg = `*🛑 ALERT: TALEEMIDUNYA PRO - FEATURES SUSPENDED*\n` +
      `----------------------------------------\n` +
      `محترم ایڈمنسٹریٹر! *${schoolName}*\n\n` +
      `سافٹ ویئر کے سروس واجبات ادا نہ ہونے کی وجہ سے آپ کے اسکول کے *${blockedCount} ماڈیولز* فوری طور پر معطل (Lock) کر دیے گئے ہیں۔\n\n` +
      `⚠️ *حالت:* سروس معطل (Features Blocked)\n` +
      `💳 سروس فوری بحال کروانے کے لیے اپنے ایڈمن پینل سے آن لائن ادائیگی کریں یا مینیجر سے رابطہ فرمائیں۔\n\n` +
      `🌐 *پورٹل لنک:* https://taleemidunya-pro-ed44e.web.app/#/school-admin/subscription\n` +
      `📞 ہیلپ لائن: TaleemiDunya SaaS Head Office\n` +
      `----------------------------------------`;
  } else if (type === 'WARNING') {
    msg = `*⚠️ REMINDER: TALEEMIDUNYA PRO SUBSCRIPTION EXPIRING*\n` +
      `----------------------------------------\n` +
      `محترم ایڈمنسٹریٹر! *${schoolName}*\n\n` +
      `آپ کے اسکول کا سبسکرپشن پلان جلد ختم ہونے والا ہے۔\n` +
      `📅 *آخری تاریخ:* ${expiryDateStr || 'جلد'}\n` +
      `⏰ *گریس پیریڈ:* ${graceDays} دن\n\n` +
      `سافٹ ویئر میں کسی بھی تعطل اور فیچرز بلاک ہونے سے بچنے کے لیے وقت پر فیس ادا فرمائیں۔\n\n` +
      `🌐 *آن لائن رینیول:* https://taleemidunya-pro-ed44e.web.app/#/school-admin/subscription\n` +
      `----------------------------------------`;
  } else {
    msg = `*🛑 NOTICE: SUBSCRIPTION EXPIRED & AUTO-LOCK ACTIVE*\n` +
      `----------------------------------------\n` +
      `محترم ایڈمنسٹریٹر! *${schoolName}*\n\n` +
      `آپ کے اسکول کی سبسکرپشن مدت ختم ہوئے ${graceDays} دن ہو چکے ہیں۔ طے شدہ پالیسی کے تحت *${blockedCount} آپریشنل فیچرز* معطل کر دیے گئے ہیں۔\n\n` +
      `برائے مہربانی فوری رینیول فیس ادا کر کے سروس بغیر کسی تعطل کے بحال کروائیں۔\n\n` +
      `🌐 *رینیول لنک:* https://taleemidunya-pro-ed44e.web.app/#/school-admin/subscription\n` +
      `----------------------------------------`;
  }

  try {
    await sendWhatsAppApiMessage(schoolId, cleanPhone, msg);
    return { success: true, phone: cleanPhone, message: msg };
  } catch (err) {
    console.warn('Suspension WhatsApp send error:', err);
    return { success: false, error: err.message };
  }
};