import { 
  collection, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  doc, 
  getDocs, 
  getDoc, 
  query, 
  where, 
  orderBy,
  onSnapshot,
  limit,
  startAfter,
  writeBatch,
  serverTimestamp,
  setDoc
} from "firebase/firestore";
import { db } from "./firebase";

/**
 * Generic CRUD operations for Firestore with Multi-tenancy support
 */

export const addRecord = async (collectionName, data, schoolId) => {
  try {
    const docRef = await addDoc(collection(db, collectionName), {
      ...data,
      schoolId,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    return { success: true, id: docRef.id };
  } catch (error) {
    console.error(`Error adding to ${collectionName}:`, error);
    return { success: false, error };
  }
};

export const updateRecord = async (collectionName, id, data) => {
  try {
    const docRef = doc(db, collectionName, id);
    await updateDoc(docRef, {
      ...data,
      updatedAt: serverTimestamp(),
    });
    return { success: true };
  } catch (error) {
    console.error(`Error updating ${collectionName}:`, error);
    return { success: false, error };
  }
};

export const deleteRecord = async (collectionName, id) => {
  try {
    await deleteDoc(doc(db, collectionName, id));
    return { success: true };
  } catch (error) {
    console.error(`Error deleting from ${collectionName}:`, error);
    return { success: false, error };
  }
};

export const getRecords = async (collectionName, schoolId, filters = []) => {
  try {
    // Build query with only where clauses (no orderBy to avoid composite index requirement)
    const constraints = [where("schoolId", "==", schoolId)];
    
    // Apply additional filters
    filters.forEach(f => {
      constraints.push(where(f.field, f.operator, f.value));
    });

    const q = query(collection(db, collectionName), ...constraints);
    const querySnapshot = await getDocs(q);
    const results = querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    
    // Client-side sort by createdAt descending
    results.sort((a, b) => {
      const aTime = a.createdAt?.toMillis ? a.createdAt.toMillis() : (a.createdAt ? new Date(a.createdAt).getTime() : 0);
      const bTime = b.createdAt?.toMillis ? b.createdAt.toMillis() : (b.createdAt ? new Date(b.createdAt).getTime() : 0);
      return bTime - aTime;
    });
    
    return results;
  } catch (error) {
    console.error(`Error fetching from ${collectionName}:`, error);
    return [];
  }
};

export const getSingleRecord = async (collectionName, id) => {
  try {
    const docSnap = await getDoc(doc(db, collectionName, id));
    if (docSnap.exists()) {
      return { id: docSnap.id, ...docSnap.data() };
    }
    return null;
  } catch (error) {
    console.error(`Error fetching single record from ${collectionName}:`, error);
    return null;
  }
};

// ===== REAL-TIME LISTENERS =====

/**
 * Subscribe to real-time updates for a collection
 * @param {string} collectionName - Firestore collection name
 * @param {string} schoolId - School ID for multi-tenancy
 * @param {Function} callback - Function called with updated data array
 * @param {Array} filters - Optional extra filters [{field, operator, value}]
 * @returns {Function} Unsubscribe function
 */
export const subscribeToCollection = (collectionName, schoolId, callback, filters = []) => {
  const constraints = [where("schoolId", "==", schoolId)];
  
  filters.forEach(f => {
    constraints.push(where(f.field, f.operator, f.value));
  });

  const q = query(collection(db, collectionName), ...constraints);
  
  return onSnapshot(q, (snapshot) => {
    const results = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    
    // Client-side sort by createdAt descending
    results.sort((a, b) => {
      const aTime = a.createdAt?.toMillis ? a.createdAt.toMillis() : 0;
      const bTime = b.createdAt?.toMillis ? b.createdAt.toMillis() : 0;
      return bTime - aTime;
    });
    
    callback(results);
  }, (error) => {
    console.error(`Real-time listener error for ${collectionName}:`, error);
    callback([]);
  });
};

/**
 * Subscribe to a single document's real-time updates
 * @param {string} collectionName - Firestore collection name
 * @param {string} docId - Document ID
 * @param {Function} callback - Function called with document data
 * @returns {Function} Unsubscribe function
 */
export const subscribeToDocument = (collectionName, docId, callback) => {
  return onSnapshot(doc(db, collectionName, docId), (docSnap) => {
    if (docSnap.exists()) {
      callback({ id: docSnap.id, ...docSnap.data() });
    } else {
      callback(null);
    }
  }, (error) => {
    console.error(`Document listener error for ${collectionName}/${docId}:`, error);
    callback(null);
  });
};

// ===== BATCH OPERATIONS =====

/**
 * Batch write multiple records at once (max 500 per batch)
 * @param {string} collectionName - Collection to write to
 * @param {Array} records - Array of {id?, ...data} objects
 * @param {string} schoolId - School ID
 * @returns {Promise<{success: boolean, count: number}>}
 */
export const batchWrite = async (collectionName, records, schoolId) => {
  try {
    const batch = writeBatch(db);
    let count = 0;

    records.forEach((record) => {
      const docRef = record.id 
        ? doc(db, collectionName, record.id)
        : doc(collection(db, collectionName));

      const { id, ...data } = record;
      batch.set(docRef, {
        ...data,
        schoolId,
        updatedAt: serverTimestamp(),
        ...(record.id ? {} : { createdAt: serverTimestamp() }),
      }, { merge: true });
      count++;
    });

    await batch.commit();
    return { success: true, count };
  } catch (error) {
    console.error(`Batch write error for ${collectionName}:`, error);
    return { success: false, error };
  }
};

/**
 * Batch delete multiple records
 * @param {string} collectionName - Collection name
 * @param {Array<string>} ids - Array of document IDs to delete
 * @returns {Promise<{success: boolean, count: number}>}
 */
export const batchDelete = async (collectionName, ids) => {
  try {
    const batch = writeBatch(db);
    ids.forEach(id => {
      batch.delete(doc(db, collectionName, id));
    });
    await batch.commit();
    return { success: true, count: ids.length };
  } catch (error) {
    console.error(`Batch delete error for ${collectionName}:`, error);
    return { success: false, error };
  }
};

// ===== PAGINATED QUERIES =====

/**
 * Fetch paginated records from a collection
 * @param {string} collectionName - Collection name
 * @param {string} schoolId - School ID
 * @param {number} pageSize - Number of records per page
 * @param {*} lastDoc - Last document snapshot from previous page (null for first page)
 * @returns {Promise<{records: Array, lastDoc: *, hasMore: boolean}>}
 */
export const getPaginatedRecords = async (collectionName, schoolId, pageSize = 20, lastDoc = null) => {
  try {
    const constraints = [where("schoolId", "==", schoolId)];

    if (lastDoc) {
      constraints.push(startAfter(lastDoc));
    }
    constraints.push(limit(pageSize + 1)); // Fetch one extra to check if more exist

    const q = query(collection(db, collectionName), ...constraints);
    const snapshot = await getDocs(q);
    
    const docs = snapshot.docs;
    const hasMore = docs.length > pageSize;
    const records = docs.slice(0, pageSize).map(d => ({
      id: d.id,
      ...d.data()
    }));

    return {
      records,
      lastDoc: docs.length > 0 ? docs[Math.min(docs.length - 1, pageSize - 1)] : null,
      hasMore,
    };
  } catch (error) {
    console.error(`Pagination error for ${collectionName}:`, error);
    return { records: [], lastDoc: null, hasMore: false };
  }
};

// ===== COLLECTION-SPECIFIC HELPERS =====

/**
 * Save attendance records for a class on a specific date
 * Uses deterministic doc IDs: `{studentId}_{date}` to prevent duplicates
 */
export const saveAttendanceBatch = async (attendanceRecords, schoolId) => {
  try {
    const batch = writeBatch(db);
    
    attendanceRecords.forEach(record => {
      const docId = `${record.studentId}_${record.date}`;
      const docRef = doc(db, 'attendance', docId);
      batch.set(docRef, {
        ...record,
        schoolId,
        updatedAt: serverTimestamp(),
        createdAt: serverTimestamp(),
      }, { merge: true });
    });

    await batch.commit();
    return { success: true, count: attendanceRecords.length };
  } catch (error) {
    console.error('Error saving attendance batch:', error);
    return { success: false, error };
  }
};

/**
 * Get attendance records for a specific date and class
 */
export const getAttendanceByDateClass = async (schoolId, date, className) => {
  try {
    const constraints = [
      where("schoolId", "==", schoolId),
      where("date", "==", date),
    ];
    if (className) {
      constraints.push(where("class", "==", className));
    }

    const q = query(collection(db, 'attendance'), ...constraints);
    const snapshot = await getDocs(q);
    return snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
  } catch (error) {
    console.error('Error fetching attendance:', error);
    return [];
  }
};

/**
 * Get student's attendance history for a date range
 */
export const getStudentAttendanceHistory = async (schoolId, studentId) => {
  try {
    const q = query(
      collection(db, 'attendance'),
      where("schoolId", "==", schoolId),
      where("studentId", "==", studentId)
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
  } catch (error) {
    console.error('Error fetching student attendance history:', error);
    return [];
  }
};

/**
 * Add a notification record
 */
export const addNotification = async (schoolId, notification) => {
  return addRecord('notifications', {
    ...notification,
    read: false,
    type: notification.type || 'info', // 'info', 'warning', 'success', 'error'
  }, schoolId);
};

/**
 * Mark notification as read
 */
export const markNotificationRead = async (notificationId) => {
  return updateRecord('notifications', notificationId, { read: true });
};

/**
 * Get unread notification count
 */
export const getUnreadNotificationCount = async (schoolId) => {
  try {
    const q = query(
      collection(db, 'notifications'),
      where("schoolId", "==", schoolId),
      where("read", "==", false)
    );
    const snapshot = await getDocs(q);
    return snapshot.size;
  } catch (error) {
    return 0;
  }
};

/**
 * Save or update exam results for a student
 * Uses deterministic doc ID to prevent duplicates
 */
export const saveExamResult = async (schoolId, result) => {
  try {
    const docId = `${result.studentId}_${result.examId}_${result.subject}`;
    const docRef = doc(db, 'results', docId);
    await setDoc(docRef, {
      ...result,
      schoolId,
      updatedAt: serverTimestamp(),
      createdAt: serverTimestamp(),
    }, { merge: true });
    return { success: true, id: docId };
  } catch (error) {
    console.error('Error saving exam result:', error);
    return { success: false, error };
  }
};

/**
 * Get all results for a specific exam
 */
export const getExamResults = async (schoolId, examId) => {
  return getRecords('results', schoolId, [
    { field: 'examId', operator: '==', value: examId }
  ]);
};

/**
 * Get all results for a specific student
 */
export const getStudentResults = async (schoolId, studentId) => {
  return getRecords('results', schoolId, [
    { field: 'studentId', operator: '==', value: studentId }
  ]);
};

/**
 * Dashboard statistics helper — fetches all major counts in parallel
 */
export const getDashboardStats = async (schoolId) => {
  try {
    const [students, staff, inquiries, challans] = await Promise.all([
      getRecords('students', schoolId),
      getRecords('staff', schoolId),
      getRecords('inquiries', schoolId),
      getRecords('challans', schoolId),
    ]);

    const paidChallans = challans.filter(c => c.status === 'Paid');
    const pendingChallans = challans.filter(c => c.status !== 'Paid');

    return {
      totalStudents: students.length,
      totalStaff: staff.length,
      totalInquiries: inquiries.length,
      totalRevenue: challans.reduce((s, c) => s + (Number(c.totalAmount) || 0), 0),
      feeCollected: paidChallans.reduce((s, c) => s + (Number(c.totalAmount) || 0), 0),
      feePending: pendingChallans.reduce((s, c) => s + (Number(c.totalAmount) || 0), 0),
      recentStudents: students.slice(0, 5),
    };
  } catch (error) {
    console.error('Error fetching dashboard stats:', error);
    return null;
  }
};
