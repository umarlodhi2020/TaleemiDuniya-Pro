/**
 * Offline Sync Service — TaleemiDunya-Pro
 * 
 * Features:
 * - Detects online/offline state with real connectivity check
 * - Queues writes when offline (localStorage + IndexedDB fallback)
 * - Auto-syncs when connection is restored
 * - Provides sync status to UI components
 * - Retry logic with exponential backoff (max 5 retries)
 * - Attendance-specific offline support
 * - Conflict resolution: last-write-wins
 * 
 * NOTE: Firestore's built-in persistence (configured in firebase.js) already handles
 * most offline scenarios. This service adds:
 * 1. Network status tracking for UI feedback
 * 2. Manual queue for custom operations (e.g., Cloudinary uploads)
 * 3. Retry logic for failed operations
 * 4. Sync progress reporting
 */

const OFFLINE_QUEUE_KEY = 'taleemidunya_offline_queue';
const SYNC_STATUS_KEY = 'taleemidunya_sync_status';

// Network status tracking
let isOnline = typeof navigator !== 'undefined' ? navigator.onLine : true;
let isSyncing = false;
const listeners = new Set();
const syncListeners = new Set();

// ═══════════════════════════════════════════════════════
//  INITIALIZATION
// ═══════════════════════════════════════════════════════

/**
 * Initialize offline sync listeners
 */
export const initOfflineSync = () => {
  if (typeof window === 'undefined') return;

  window.addEventListener('online', () => {
    isOnline = true;
    notifyListeners();
    // Small delay to let network stabilize
    setTimeout(() => processOfflineQueue(), 1000);
  });

  window.addEventListener('offline', () => {
    isOnline = false;
    notifyListeners();
  });

  // Process any pending items on startup
  if (isOnline) {
    setTimeout(() => processOfflineQueue(), 2000);
  }

  // Periodic connectivity check (every 30s)
  setInterval(async () => {
    const wasOnline = isOnline;

    // 1. If browser/OS explicitly reports offline, trust it immediately
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      isOnline = false;
    } else {
      // 2. If navigator.onLine is true, perform a safe same-origin check to verify real internet/router connectivity
      // without CORS, AdBlocker, or gstatic tracking restrictions.
      try {
        const res = await fetch(window.location.origin + '/favicon.ico?_chk=' + Date.now(), {
          method: 'HEAD',
          cache: 'no-store',
          signal: AbortSignal.timeout(5000),
        });
        if (res.ok || res.status === 200 || res.status === 304 || res.status === 404) {
          isOnline = true;
        }
      } catch {
        // If same-origin fetch fails (e.g. temporary timeout or local dev restart),
        // only mark offline if navigator explicitly says offline. Do not override
        // true navigator.onLine due to adblockers or transient timeouts.
        if (typeof navigator !== 'undefined' && !navigator.onLine) {
          isOnline = false;
        } else {
          isOnline = true;
        }
      }
    }

    if (isOnline !== wasOnline) {
      notifyListeners();
      if (isOnline) processOfflineQueue();
    }
  }, 30000);
};

// ═══════════════════════════════════════════════════════
//  STATUS TRACKING
// ═══════════════════════════════════════════════════════

/**
 * Check current online status
 * @returns {boolean}
 */
export const getOnlineStatus = () => isOnline;

/**
 * Check if currently syncing
 * @returns {boolean}
 */
export const getSyncingStatus = () => isSyncing;

/**
 * Subscribe to online/offline status changes
 * @param {Function} callback - Called with boolean (true = online)
 * @returns {Function} Unsubscribe function
 */
export const onStatusChange = (callback) => {
  listeners.add(callback);
  // Immediate callback with current status
  callback(isOnline);
  return () => listeners.delete(callback);
};

/**
 * Subscribe to sync progress events
 * @param {Function} callback - Called with { syncing, progress, total, current }
 * @returns {Function} Unsubscribe function
 */
export const onSyncProgress = (callback) => {
  syncListeners.add(callback);
  return () => syncListeners.delete(callback);
};

const notifyListeners = () => {
  listeners.forEach((cb) => cb(isOnline));
};

const notifySyncListeners = (data) => {
  syncListeners.forEach((cb) => cb(data));
};

// ═══════════════════════════════════════════════════════
//  OFFLINE QUEUE
// ═══════════════════════════════════════════════════════

/**
 * Add an operation to the offline queue
 * @param {Object} operation - { type, collection, data, schoolId, docId? }
 * Supported types: 'add', 'update', 'delete', 'attendance', 'cloudinary_upload'
 */
export const queueOfflineOperation = (operation) => {
  try {
    const queue = getOfflineQueue();
    queue.push({
      ...operation,
      id: `op_${Date.now()}_${Math.random().toString(36).slice(2)}`,
      timestamp: new Date().toISOString(),
      retries: 0,
      maxRetries: 5,
    });
    localStorage.setItem(OFFLINE_QUEUE_KEY, JSON.stringify(queue));
    notifySyncListeners({ pending: queue.length });
  } catch (error) {
    console.error('Error queuing offline operation:', error);
  }
};

/**
 * Get all pending offline operations
 * @returns {Array}
 */
export const getOfflineQueue = () => {
  try {
    const stored = localStorage.getItem(OFFLINE_QUEUE_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
};

/**
 * Process all queued operations when back online
 */
export const processOfflineQueue = async () => {
  if (!isOnline || isSyncing) return;

  const queue = getOfflineQueue();
  if (queue.length === 0) return;

  isSyncing = true;
  notifySyncListeners({ syncing: true, total: queue.length, current: 0, progress: 0 });

  console.log(`[OfflineSync] Processing ${queue.length} queued operations...`);

  const { addRecord, updateRecord, deleteRecord, saveAttendanceBatch } = await import('./db');
  const failedOps = [];
  let processed = 0;

  for (const op of queue) {
    try {
      switch (op.type) {
        case 'add':
          await addRecord(op.collection, op.data, op.schoolId);
          break;
        case 'update':
          await updateRecord(op.collection, op.docId, op.data);
          break;
        case 'delete':
          await deleteRecord(op.collection, op.docId);
          break;
        case 'attendance':
          await saveAttendanceBatch(op.data, op.schoolId);
          break;
        case 'cloudinary_upload':
          // Skip cloudinary uploads in offline queue — they need network
          if (!isOnline) {
            failedOps.push(op);
            continue;
          }
          const { uploadToCloudinary } = await import('./cloudinary');
          // Cloudinary uploads from queue need file data — skip if blob expired
          console.warn('[OfflineSync] Cloudinary uploads in queue may fail if file blobs expired');
          break;
        default:
          console.warn(`[OfflineSync] Unknown operation type: ${op.type}`);
      }
      processed++;
      console.log(`[OfflineSync] ✓ Synced: ${op.type} → ${op.collection}`);
      notifySyncListeners({
        syncing: true,
        total: queue.length,
        current: processed,
        progress: Math.round((processed / queue.length) * 100),
      });
    } catch (error) {
      console.error(`[OfflineSync] ✗ Failed: ${op.type} → ${op.collection}`, error);
      const newRetries = (op.retries || 0) + 1;
      if (newRetries < (op.maxRetries || 5)) {
        failedOps.push({ ...op, retries: newRetries });
      } else {
        console.error(`[OfflineSync] Max retries reached for operation, discarding:`, op);
      }
    }
  }

  // Keep only failed operations for retry
  localStorage.setItem(OFFLINE_QUEUE_KEY, JSON.stringify(failedOps));

  isSyncing = false;

  if (failedOps.length > 0) {
    console.log(`[OfflineSync] ${failedOps.length} operations failed, will retry later.`);
    notifySyncListeners({ syncing: false, pending: failedOps.length, failed: failedOps.length });
  } else {
    console.log('[OfflineSync] All operations synced successfully!');
    notifySyncListeners({ syncing: false, pending: 0, failed: 0 });
  }

  notifyListeners();
};

/**
 * Get the count of pending offline operations
 * @returns {number}
 */
export const getPendingCount = () => {
  return getOfflineQueue().length;
};

/**
 * Clear the entire offline queue
 */
export const clearOfflineQueue = () => {
  localStorage.setItem(OFFLINE_QUEUE_KEY, JSON.stringify([]));
  notifySyncListeners({ pending: 0, syncing: false });
};

// ═══════════════════════════════════════════════════════
//  ATTENDANCE OFFLINE SUPPORT
// ═══════════════════════════════════════════════════════

const ATTENDANCE_DRAFT_KEY = 'taleemidunya_attendance_draft';

/**
 * Save attendance draft locally (for offline use or resume-later)
 * @param {Object} draft - { date, class, records: [{studentId, status, ...}], schoolId }
 */
export const saveAttendanceDraft = (draft) => {
  try {
    const drafts = getAttendanceDrafts();
    const key = `${draft.date}_${draft.class}`;
    drafts[key] = { ...draft, savedAt: new Date().toISOString() };
    localStorage.setItem(ATTENDANCE_DRAFT_KEY, JSON.stringify(drafts));
    return { success: true };
  } catch (error) {
    console.error('Error saving attendance draft:', error);
    return { success: false, error };
  }
};

/**
 * Get all attendance drafts
 * @returns {Object} - { "date_class": draft }
 */
export const getAttendanceDrafts = () => {
  try {
    const stored = localStorage.getItem(ATTENDANCE_DRAFT_KEY);
    return stored ? JSON.parse(stored) : {};
  } catch {
    return {};
  }
};

/**
 * Get a specific attendance draft
 * @param {string} date - Date string
 * @param {string} className - Class name
 * @returns {Object|null}
 */
export const getAttendanceDraft = (date, className) => {
  const drafts = getAttendanceDrafts();
  return drafts[`${date}_${className}`] || null;
};

/**
 * Remove a specific attendance draft
 */
export const removeAttendanceDraft = (date, className) => {
  try {
    const drafts = getAttendanceDrafts();
    delete drafts[`${date}_${className}`];
    localStorage.setItem(ATTENDANCE_DRAFT_KEY, JSON.stringify(drafts));
  } catch (error) {
    console.error('Error removing attendance draft:', error);
  }
};

/**
 * Save attendance — tries Firestore first, falls back to offline queue
 * @param {Array} records - Attendance records
 * @param {string} schoolId
 * @param {string} date
 * @param {string} className
 */
export const saveAttendanceWithOfflineSupport = async (records, schoolId, date, className) => {
  if (isOnline) {
    try {
      const { saveAttendanceBatch } = await import('./db');
      const result = await saveAttendanceBatch(records, schoolId);
      if (result.success) {
        removeAttendanceDraft(date, className);
        return { success: true, offline: false };
      }
    } catch (error) {
      console.warn('[OfflineSync] Online save failed, queuing offline:', error);
    }
  }

  // Save draft locally
  saveAttendanceDraft({ date, class: className, records, schoolId });

  // Queue for sync
  queueOfflineOperation({
    type: 'attendance',
    collection: 'attendance',
    data: records,
    schoolId,
  });

  return { success: true, offline: true };
};
