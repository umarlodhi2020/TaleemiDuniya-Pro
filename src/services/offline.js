/**
 * Offline Sync Service for TaleemiDunya-Pro
 * 
 * Features:
 * - Detects online/offline state
 * - Queues writes when offline (IndexedDB)
 * - Auto-syncs when connection is restored
 * - Provides sync status to UI components
 * 
 * NOTE: Firestore's built-in persistence (configured in firebase.js) already handles
 * most offline scenarios. This service adds:
 * 1. Network status tracking for UI feedback
 * 2. Manual queue for custom operations (e.g., Cloudinary uploads)
 * 3. Retry logic for failed operations
 */

const OFFLINE_QUEUE_KEY = 'taleemidunya_offline_queue';

// Network status tracking
let isOnline = typeof navigator !== 'undefined' ? navigator.onLine : true;
const listeners = new Set();

/**
 * Initialize offline sync listeners
 */
export const initOfflineSync = () => {
  if (typeof window === 'undefined') return;

  window.addEventListener('online', () => {
    isOnline = true;
    notifyListeners();
    processOfflineQueue();
  });

  window.addEventListener('offline', () => {
    isOnline = false;
    notifyListeners();
  });

  // Process any pending items on startup
  if (isOnline) {
    processOfflineQueue();
  }
};

/**
 * Check current online status
 * @returns {boolean}
 */
export const getOnlineStatus = () => isOnline;

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

const notifyListeners = () => {
  listeners.forEach(cb => cb(isOnline));
};

// ===== OFFLINE QUEUE =====

/**
 * Add an operation to the offline queue
 * @param {Object} operation - { type, collection, data, schoolId, timestamp }
 */
export const queueOfflineOperation = (operation) => {
  try {
    const queue = getOfflineQueue();
    queue.push({
      ...operation,
      id: `op_${Date.now()}_${Math.random().toString(36).slice(2)}`,
      timestamp: new Date().toISOString(),
      retries: 0,
    });
    localStorage.setItem(OFFLINE_QUEUE_KEY, JSON.stringify(queue));
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
  if (!isOnline) return;

  const queue = getOfflineQueue();
  if (queue.length === 0) return;

  console.log(`[OfflineSync] Processing ${queue.length} queued operations...`);

  const { addRecord, updateRecord, deleteRecord } = await import('./db');
  const failedOps = [];

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
          const { saveAttendanceBatch } = await import('./db');
          await saveAttendanceBatch(op.data, op.schoolId);
          break;
        default:
          console.warn(`[OfflineSync] Unknown operation type: ${op.type}`);
      }
      console.log(`[OfflineSync] ✓ Synced: ${op.type} → ${op.collection}`);
    } catch (error) {
      console.error(`[OfflineSync] ✗ Failed: ${op.type} → ${op.collection}`, error);
      if (op.retries < 3) {
        failedOps.push({ ...op, retries: op.retries + 1 });
      }
    }
  }

  // Keep only failed operations for retry
  localStorage.setItem(OFFLINE_QUEUE_KEY, JSON.stringify(failedOps));

  if (failedOps.length > 0) {
    console.log(`[OfflineSync] ${failedOps.length} operations failed, will retry later.`);
  } else {
    console.log('[OfflineSync] All operations synced successfully!');
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
};
