/**
 * Time Formatting, Holiday & Day-Wise Timings Utilities
 * Supports 24-hr (HH:mm), 12-hr with AM/PM, duty duration calculations,
 * Day-wise shifts (e.g. Saturday custom start time / Saturday off), and School/Govt holidays.
 */

export const normalizeTo24h = (timeStr) => {
  if (!timeStr || typeof timeStr !== 'string') return '';
  const trimmed = timeStr.trim();
  if (/^([01]\d|2[0-3]):([0-5]\d)$/.test(trimmed)) {
    return trimmed;
  }
  if (/^([01]\d|2[0-3]):([0-5]\d):([0-5]\d)$/.test(trimmed)) {
    return trimmed.slice(0, 5);
  }
  const match = trimmed.match(/^(\d{1,2}):(\d{2})(?::\d{2})?\s*([APap][Mm])?$/);
  if (match) {
    let hours = parseInt(match[1], 10);
    const minutes = match[2];
    const modifier = match[3] ? match[3].toUpperCase() : null;
    if (modifier === 'PM' && hours < 12) hours += 12;
    if (modifier === 'AM' && hours === 12) hours = 0;
    return `${String(hours).padStart(2, '0')}:${minutes}`;
  }
  return '';
};

export const formatTo12h = (timeStr) => {
  if (!timeStr || typeof timeStr !== 'string') return '-';
  const trimmed = timeStr.trim();
  if (/[APap][Mm]/.test(trimmed)) return trimmed;
  const match = trimmed.match(/^(\d{1,2}):(\d{2})/);
  if (!match) return trimmed;
  let hours = parseInt(match[1], 10);
  const minutes = match[2];
  const ampm = hours >= 12 ? 'PM' : 'AM';
  hours = hours % 12;
  hours = hours ? hours : 12;
  return `${String(hours).padStart(2, '0')}:${minutes} ${ampm}`;
};

export const calculateDutyHours = (timeIn, timeOut) => {
  const normIn = normalizeTo24h(timeIn);
  const normOut = normalizeTo24h(timeOut);
  if (!normIn || !normOut) return null;
  const [inH, inM] = normIn.split(':').map(Number);
  const [outH, outM] = normOut.split(':').map(Number);
  let diffMinutes = (outH * 60 + outM) - (inH * 60 + inM);
  if (diffMinutes < 0) diffMinutes += 24 * 60; // overnight shift
  const hrs = Math.floor(diffMinutes / 60);
  const mins = diffMinutes % 60;
  return { 
    hrs, 
    mins, 
    totalMinutes: diffMinutes, 
    formatted: `${hrs}h ${mins > 0 ? `${mins}m` : '0m'}`.trim() 
  };
};

export const DAY_KEYS = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];

export const DAY_LABELS = {
  monday: { en: 'Monday', ur: 'پیر' },
  tuesday: { en: 'Tuesday', ur: 'منگل' },
  wednesday: { en: 'Wednesday', ur: 'بدھ' },
  thursday: { en: 'Thursday', ur: 'جمعرات' },
  friday: { en: 'Friday', ur: 'جمعہ' },
  saturday: { en: 'Saturday', ur: 'ہفتہ' },
  sunday: { en: 'Sunday', ur: 'اتوار' }
};

export const defaultDayTimings = {
  monday: { isOff: false, startTime: '07:55', endTime: '14:00' },
  tuesday: { isOff: false, startTime: '07:55', endTime: '14:00' },
  wednesday: { isOff: false, startTime: '07:55', endTime: '14:00' },
  thursday: { isOff: false, startTime: '07:55', endTime: '14:00' },
  friday: { isOff: false, startTime: '07:55', endTime: '12:30' },
  saturday: { isOff: false, startTime: '07:55', endTime: '13:00' },
  sunday: { isOff: true, startTime: '08:00', endTime: '14:00' }
};

export const getDayKey = (dateInput) => {
  if (!dateInput) return 'monday';
  const d = typeof dateInput === 'string' ? new Date(dateInput.replace(/-/g, '/')) : new Date(dateInput);
  if (isNaN(d.getTime())) return 'monday';
  return DAY_KEYS[d.getDay()];
};

export const formatDateKey = (dateInput) => {
  if (!dateInput) return '';
  if (typeof dateInput === 'string') return dateInput.split('T')[0];
  const d = new Date(dateInput);
  if (isNaN(d.getTime())) return '';
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};

/**
 * Get shift timing for a given date, supporting day-specific overrides (e.g. Saturday custom late cutoff or day off)
 */
export const getShiftTimingForDate = (dateInput, staffTimings = {}) => {
  const dayKey = getDayKey(dateInput);
  const defaultIn = normalizeTo24h(staffTimings?.shiftStartTime) || '07:55';
  const defaultOut = normalizeTo24h(staffTimings?.shiftEndTime) || '14:00';

  const dayConfig = staffTimings?.dayTimings?.[dayKey];
  
  // Sunday is off by default
  const isDefaultSundayOff = (dayKey === 'sunday');
  const isOff = dayConfig ? Boolean(dayConfig.isOff) : isDefaultSundayOff;

  const shiftIn = normalizeTo24h(dayConfig?.startTime) || defaultIn;
  const shiftOut = normalizeTo24h(dayConfig?.endTime) || defaultOut;

  return {
    dayKey,
    dayLabel: DAY_LABELS[dayKey] || { en: dayKey, ur: dayKey },
    isOff,
    shiftIn,
    shiftOut,
    shiftInFormatted: formatTo12h(shiftIn),
    shiftOutFormatted: formatTo12h(shiftOut),
    hasCustomTiming: Boolean(dayConfig?.startTime || dayConfig?.endTime || dayConfig?.isOff !== undefined)
  };
};

/**
 * Check if a date is a school holiday, government holiday, or day off
 */
export const checkDateHoliday = (dateInput, holidaysList = [], staffTimings = {}) => {
  if (!dateInput) return { isHoliday: false };
  const dateStr = formatDateKey(dateInput);

  // 1. Check declared holidays list (Govt, National, School, Weather holidays)
  if (dateStr && Array.isArray(holidaysList) && holidaysList.length > 0) {
    const matched = holidaysList.find(h => {
      if (!h || !h.start) return false;
      const s = String(h.start).split('T')[0];
      const e = String(h.end || h.start).split('T')[0];
      return dateStr >= s && dateStr <= e;
    });

    if (matched) {
      return {
        isHoliday: true,
        type: matched.type || 'Government',
        title: matched.title || 'Official Holiday',
        isWeeklyOff: false,
        holiday: matched
      };
    }
  }

  // 2. Check weekly day off in staff timings (e.g. Sunday or Saturday off)
  const timing = getShiftTimingForDate(dateInput, staffTimings);
  if (timing.isOff) {
    const dayNameEn = timing.dayKey.charAt(0).toUpperCase() + timing.dayKey.slice(1);
    const dayNameUr = timing.dayLabel?.ur || dayNameEn;
    return {
      isHoliday: true,
      type: timing.dayKey === 'sunday' ? 'Sunday' : 'Weekly Off',
      title: timing.dayKey === 'sunday' ? 'Sunday (School Holiday / اتوار کی چھٹی)' : `${dayNameEn} (${dayNameUr} - ہفتہ وار چھٹی)`,
      isWeeklyOff: true
    };
  }

  return { isHoliday: false };
};
