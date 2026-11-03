/**
 * Time Formatting & Normalization Utilities
 * Supports 24-hr (HH:mm), 12-hr with AM/PM, and duty duration calculations
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
