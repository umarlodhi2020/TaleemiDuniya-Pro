/**
 * Firestore Database Service — TaleemiDunya-Pro
 * 
 * Complete CRUD operations with multi-tenancy support.
 * 
 * Collections:
 *   users, schools, students, staff (teachers), classes,
 *   attendance, challans (fees), exams, results,
 *   notifications, inquiries, promotion_history, cloudinary_deletions
 * 
 * Features:
 *   - Generic CRUD with schoolId scoping
 *   - Real-time listeners (onSnapshot)
 *   - Batch operations (max 500 per batch, auto-chunked)
 *   - Paginated queries
 *   - Collection-specific helpers (attendance, exams, results, fees, notifications)
 *   - Dashboard statistics aggregator
 *   - Classes management
 *   - Offline-safe serverTimestamp usage
 */

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
  setDoc,
  increment,
  arrayUnion,
  arrayRemove,
  getCountFromServer,
} from "firebase/firestore";
import { db } from "./firebase";

// ═══════════════════════════════════════════════════════
//  GENERIC CRUD OPERATIONS
// ═══════════════════════════════════════════════════════

/**
 * Add a new document to a collection
 * @param {string} collectionName - Target collection
 * @param {Object} data - Document data
 * @param {string} schoolId - School ID for multi-tenancy
 * @returns {Promise<{success: boolean, id?: string, error?: Error}>}
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

/**
 * Add a document with a specific ID
 * @param {string} collectionName
 * @param {string} docId - Custom document ID
 * @param {Object} data
 * @param {string} schoolId
 */
export const addRecordWithId = async (collectionName, docId, data, schoolId) => {
  try {
    const docRef = doc(db, collectionName, docId);
    await setDoc(docRef, {
      ...data,
      schoolId,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    return { success: true, id: docId };
  } catch (error) {
    console.error(`Error adding ${collectionName}/${docId}:`, error);
    return { success: false, error };
  }
};

/**
 * Update an existing document
 * @param {string} collectionName
 * @param {string} id - Document ID
 * @param {Object} data - Fields to update (merge)
 */
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

/**
 * Delete a document
 * @param {string} collectionName
 * @param {string} id - Document ID
 */
export const deleteRecord = async (collectionName, id) => {
  try {
    await deleteDoc(doc(db, collectionName, id));
    return { success: true };
  } catch (error) {
    console.error(`Error deleting from ${collectionName}:`, error);
    return { success: false, error };
  }
};

/**
 * Fetch all records for a school with optional extra filters
 * @param {string} collectionName
 * @param {string} schoolId
 * @param {Array<{field: string, operator: string, value: *}>} filters - Extra where clauses
 * @returns {Promise<Array>}
 */
export const getRecords = async (collectionName, schoolId, filters = []) => {
  try {
    const constraints = [where("schoolId", "==", schoolId)];

    filters.forEach((f) => {
      constraints.push(where(f.field, f.operator, f.value));
    });

    const q = query(collection(db, collectionName), ...constraints);
    const querySnapshot = await getDocs(q);
    const results = querySnapshot.docs.map((d) => ({
      id: d.id,
      ...d.data(),
    }));

    // Client-side sort by createdAt descending (avoids composite index requirement)
    results.sort((a, b) => {
      const aTime = a.createdAt?.toMillis ? a.createdAt.toMillis() : a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const bTime = b.createdAt?.toMillis ? b.createdAt.toMillis() : b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return bTime - aTime;
    });

    return results;
  } catch (error) {
    console.error(`Error fetching from ${collectionName}:`, error);
    return [];
  }
};

/**
 * Fetch a single document by ID
 * @param {string} collectionName
 * @param {string} id
 * @returns {Promise<Object|null>}
 */
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

/**
 * Get document count efficiently (without downloading documents)
 * @param {string} collectionName
 * @param {string} schoolId
 * @returns {Promise<number>}
 */
export const getRecordCount = async (collectionName, schoolId) => {
  try {
    const q = query(collection(db, collectionName), where("schoolId", "==", schoolId));
    const snapshot = await getCountFromServer(q);
    return snapshot.data().count;
  } catch (error) {
    console.error(`Error counting ${collectionName}:`, error);
    return 0;
  }
};

// ═══════════════════════════════════════════════════════
//  REAL-TIME LISTENERS
// ═══════════════════════════════════════════════════════

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

  filters.forEach((f) => {
    constraints.push(where(f.field, f.operator, f.value));
  });

  const q = query(collection(db, collectionName), ...constraints);

  return onSnapshot(
    q,
    (snapshot) => {
      const results = snapshot.docs.map((d) => ({
        id: d.id,
        ...d.data(),
      }));

      results.sort((a, b) => {
        const aTime = a.createdAt?.toMillis ? a.createdAt.toMillis() : 0;
        const bTime = b.createdAt?.toMillis ? b.createdAt.toMillis() : 0;
        return bTime - aTime;
      });

      callback(results);
    },
    (error) => {
      console.error(`Real-time listener error for ${collectionName}:`, error);
      callback([]);
    }
  );
};

/**
 * Subscribe to a single document's real-time updates
 * @param {string} collectionName - Firestore collection name
 * @param {string} docId - Document ID
 * @param {Function} callback - Function called with document data
 * @returns {Function} Unsubscribe function
 */
export const subscribeToDocument = (collectionName, docId, callback) => {
  return onSnapshot(
    doc(db, collectionName, docId),
    (docSnap) => {
      if (docSnap.exists()) {
        callback({ id: docSnap.id, ...docSnap.data() });
      } else {
        callback(null);
      }
    },
    (error) => {
      console.error(`Document listener error for ${collectionName}/${docId}:`, error);
      callback(null);
    }
  );
};

// ═══════════════════════════════════════════════════════
//  BATCH OPERATIONS
// ═══════════════════════════════════════════════════════

/**
 * Batch write multiple records at once (auto-chunks into 500-doc batches)
 * @param {string} collectionName - Collection to write to
 * @param {Array} records - Array of {id?, ...data} objects
 * @param {string} schoolId - School ID
 * @returns {Promise<{success: boolean, count: number}>}
 */
export const batchWrite = async (collectionName, records, schoolId) => {
  try {
    const BATCH_LIMIT = 500;
    let totalCount = 0;

    // Chunk into groups of 500
    for (let i = 0; i < records.length; i += BATCH_LIMIT) {
      const chunk = records.slice(i, i + BATCH_LIMIT);
      const batch = writeBatch(db);

      chunk.forEach((record) => {
        const docRef = record.id
          ? doc(db, collectionName, record.id)
          : doc(collection(db, collectionName));

        const { id, ...data } = record;
        batch.set(
          docRef,
          {
            ...data,
            schoolId,
            updatedAt: serverTimestamp(),
            ...(record.id ? {} : { createdAt: serverTimestamp() }),
          },
          { merge: true }
        );
        totalCount++;
      });

      await batch.commit();
    }

    return { success: true, count: totalCount };
  } catch (error) {
    console.error(`Batch write error for ${collectionName}:`, error);
    return { success: false, error };
  }
};

/**
 * Batch delete multiple records (auto-chunks)
 * @param {string} collectionName - Collection name
 * @param {Array<string>} ids - Array of document IDs to delete
 * @returns {Promise<{success: boolean, count: number}>}
 */
export const batchDelete = async (collectionName, ids) => {
  try {
    const BATCH_LIMIT = 500;
    for (let i = 0; i < ids.length; i += BATCH_LIMIT) {
      const chunk = ids.slice(i, i + BATCH_LIMIT);
      const batch = writeBatch(db);
      chunk.forEach((id) => {
        batch.delete(doc(db, collectionName, id));
      });
      await batch.commit();
    }
    return { success: true, count: ids.length };
  } catch (error) {
    console.error(`Batch delete error for ${collectionName}:`, error);
    return { success: false, error };
  }
};

// ═══════════════════════════════════════════════════════
//  PAGINATED QUERIES
// ═══════════════════════════════════════════════════════

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
    const records = docs.slice(0, pageSize).map((d) => ({
      id: d.id,
      ...d.data(),
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

// ═══════════════════════════════════════════════════════
//  CLASSES MANAGEMENT
// ═══════════════════════════════════════════════════════

/**
 * Add a class to the school
 * @param {string} schoolId
 * @param {Object} classData - { name, section, classTeacher, subjects, maxStudents }
 */
export const addClass = async (schoolId, classData) => {
  return addRecord("classes", {
    name: classData.name,
    section: classData.section || "A",
    classTeacher: classData.classTeacher || "",
    subjects: classData.subjects || [],
    maxStudents: classData.maxStudents || 40,
    currentStudents: 0,
    status: "active",
  }, schoolId);
};

/**
 * Get all classes for a school
 * @param {string} schoolId
 */
export const getClasses = async (schoolId) => {
  return getRecords("classes", schoolId);
};

/**
 * Update a class
 * @param {string} classId
 * @param {Object} data
 */
export const updateClass = async (classId, data) => {
  return updateRecord("classes", classId, data);
};

/**
 * Delete a class
 * @param {string} classId
 */
export const deleteClass = async (classId) => {
  return deleteRecord("classes", classId);
};

// ═══════════════════════════════════════════════════════
//  ATTENDANCE HELPERS
// ═══════════════════════════════════════════════════════

/**
 * Save attendance records for a class on a specific date
 * Uses deterministic doc IDs: `{studentId}_{date}` to prevent duplicates
 */
export const saveAttendanceBatch = async (attendanceRecords, schoolId) => {
  try {
    const batch = writeBatch(db);

    attendanceRecords.forEach((record) => {
      const docId = `${record.studentId}_${record.date}`;
      const docRef = doc(db, "attendance", docId);
      batch.set(
        docRef,
        {
          ...record,
          schoolId,
          updatedAt: serverTimestamp(),
          createdAt: serverTimestamp(),
        },
        { merge: true }
      );
    });

    await batch.commit();
    return { success: true, count: attendanceRecords.length };
  } catch (error) {
    console.error("Error saving attendance batch:", error);
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

    const q = query(collection(db, "attendance"), ...constraints);
    const snapshot = await getDocs(q);
    return snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
  } catch (error) {
    console.error("Error fetching attendance:", error);
    return [];
  }
};

/**
 * Get student's attendance history
 */
export const getStudentAttendanceHistory = async (schoolId, studentId) => {
  try {
    const q = query(
      collection(db, "attendance"),
      where("schoolId", "==", schoolId),
      where("studentId", "==", studentId)
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
  } catch (error) {
    console.error("Error fetching student attendance history:", error);
    return [];
  }
};

/**
 * Get attendance summary for a date (counts)
 */
export const getAttendanceSummary = async (schoolId, date) => {
  try {
    const records = await getAttendanceByDateClass(schoolId, date);
    return {
      total: records.length,
      present: records.filter((r) => r.status === "present").length,
      absent: records.filter((r) => r.status === "absent").length,
      late: records.filter((r) => r.status === "late").length,
      leave: records.filter((r) => r.status === "leave").length,
    };
  } catch (error) {
    return { total: 0, present: 0, absent: 0, late: 0, leave: 0 };
  }
};

// ═══════════════════════════════════════════════════════
//  FEES / CHALLANS HELPERS
// ═══════════════════════════════════════════════════════

/**
 * Get fee summary for a school
 */
export const getFeeSummary = async (schoolId) => {
  try {
    const challans = await getRecords("challans", schoolId);
    const paidChallans = challans.filter((c) => c.status === "Paid");
    const pendingChallans = challans.filter((c) => c.status !== "Paid");

    return {
      totalChallans: challans.length,
      totalRevenue: challans.reduce((s, c) => s + (Number(c.totalAmount) || 0), 0),
      collected: paidChallans.reduce((s, c) => s + (Number(c.totalAmount) || 0), 0),
      pending: pendingChallans.reduce((s, c) => s + (Number(c.totalAmount) || 0), 0),
      paidCount: paidChallans.length,
      pendingCount: pendingChallans.length,
    };
  } catch (error) {
    console.error("Error fetching fee summary:", error);
    return { totalChallans: 0, totalRevenue: 0, collected: 0, pending: 0, paidCount: 0, pendingCount: 0 };
  }
};

/**
 * Mark a challan as paid
 */
export const markChallanPaid = async (challanId) => {
  return updateRecord("challans", challanId, {
    status: "Paid",
    paidAt: new Date().toISOString(),
  });
};

/**
 * Get all challans for a student
 */
export const getStudentChallans = async (schoolId, studentId) => {
  return getRecords("challans", schoolId, [
    { field: "studentId", operator: "==", value: studentId },
  ]);
};

// ═══════════════════════════════════════════════════════
//  EXAMS & RESULTS HELPERS
// ═══════════════════════════════════════════════════════

/**
 * Save or update exam results for a student
 * Uses deterministic doc ID to prevent duplicates
 */
export const saveExamResult = async (schoolId, result) => {
  try {
    const docId = `${result.studentId}_${result.examId}_${result.subject}`;
    const docRef = doc(db, "results", docId);
    await setDoc(
      docRef,
      {
        ...result,
        schoolId,
        updatedAt: serverTimestamp(),
        createdAt: serverTimestamp(),
      },
      { merge: true }
    );
    return { success: true, id: docId };
  } catch (error) {
    console.error("Error saving exam result:", error);
    return { success: false, error };
  }
};

/**
 * Batch save exam results for multiple students
 */
export const saveExamResultsBatch = async (schoolId, results) => {
  try {
    const batch = writeBatch(db);
    results.forEach((result) => {
      const docId = `${result.studentId}_${result.examId}_${result.subject}`;
      const docRef = doc(db, "results", docId);
      batch.set(
        docRef,
        {
          ...result,
          schoolId,
          updatedAt: serverTimestamp(),
          createdAt: serverTimestamp(),
        },
        { merge: true }
      );
    });
    await batch.commit();
    return { success: true, count: results.length };
  } catch (error) {
    console.error("Error batch saving exam results:", error);
    return { success: false, error };
  }
};

/**
 * Get all results for a specific exam
 */
export const getExamResults = async (schoolId, examId) => {
  return getRecords("results", schoolId, [
    { field: "examId", operator: "==", value: examId },
  ]);
};

/**
 * Get all results for a specific student
 */
export const getStudentResults = async (schoolId, studentId) => {
  return getRecords("results", schoolId, [
    { field: "studentId", operator: "==", value: studentId },
  ]);
};

// ═══════════════════════════════════════════════════════
//  NOTIFICATIONS
// ═══════════════════════════════════════════════════════

/**
 * Add a notification record
 */
export const addNotification = async (schoolId, notification) => {
  return addRecord("notifications", {
    ...notification,
    read: false,
    type: notification.type || "info", // 'info', 'warning', 'success', 'error'
  }, schoolId);
};

/**
 * Mark notification as read
 */
export const markNotificationRead = async (notificationId) => {
  return updateRecord("notifications", notificationId, { read: true });
};

/**
 * Mark all notifications as read for a school
 */
export const markAllNotificationsRead = async (schoolId) => {
  try {
    const unread = await getRecords("notifications", schoolId, [
      { field: "read", operator: "==", value: false },
    ]);
    if (unread.length === 0) return { success: true, count: 0 };

    const batch = writeBatch(db);
    unread.forEach((n) => {
      batch.update(doc(db, "notifications", n.id), { read: true, updatedAt: serverTimestamp() });
    });
    await batch.commit();
    return { success: true, count: unread.length };
  } catch (error) {
    console.error("Error marking all read:", error);
    return { success: false, error };
  }
};

/**
 * Get unread notification count
 */
export const getUnreadNotificationCount = async (schoolId) => {
  try {
    const q = query(
      collection(db, "notifications"),
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
 * Subscribe to real-time notifications
 */
export const subscribeToNotifications = (schoolId, callback) => {
  return subscribeToCollection("notifications", schoolId, callback);
};

// ═══════════════════════════════════════════════════════
//  STUDENT-SPECIFIC HELPERS
// ═══════════════════════════════════════════════════════

/**
 * Get students by class
 */
export const getStudentsByClass = async (schoolId, className) => {
  return getRecords("students", schoolId, [
    { field: "class", operator: "==", value: className },
  ]);
};

/**
 * Search students by name (client-side filter)
 */
export const searchStudents = async (schoolId, searchTerm) => {
  const students = await getRecords("students", schoolId);
  const lower = searchTerm.toLowerCase();
  return students.filter(
    (s) =>
      s.name?.toLowerCase().includes(lower) ||
      s.rollNumber?.toLowerCase().includes(lower) ||
      s.fatherName?.toLowerCase().includes(lower)
  );
};

// ═══════════════════════════════════════════════════════
//  TEACHER / STAFF HELPERS
// ═══════════════════════════════════════════════════════

/**
 * Get teachers only (from staff collection)
 */
export const getTeachers = async (schoolId) => {
  return getRecords("staff", schoolId, [
    { field: "role", operator: "==", value: "Teacher" },
  ]);
};

/**
 * Get staff by department
 */
export const getStaffByDepartment = async (schoolId, department) => {
  return getRecords("staff", schoolId, [
    { field: "department", operator: "==", value: department },
  ]);
};

// ═══════════════════════════════════════════════════════
//  DASHBOARD STATISTICS
// ═══════════════════════════════════════════════════════

/**
 * Dashboard statistics helper — fetches all major counts in parallel
 */
export const getDashboardStats = async (schoolId) => {
  try {
    const [students, staff, inquiries, challans] = await Promise.all([
      getRecords("students", schoolId),
      getRecords("staff", schoolId),
      getRecords("inquiries", schoolId),
      getRecords("challans", schoolId),
    ]);

    const paidChallans = challans.filter((c) => c.status === "Paid");
    const pendingChallans = challans.filter((c) => c.status !== "Paid");

    // Today's attendance
    const today = new Date().toISOString().split("T")[0];
    const todayAttendance = await getAttendanceByDateClass(schoolId, today);
    const presentToday = todayAttendance.filter((a) => a.status === "present").length;
    const attendanceRate = todayAttendance.length > 0
      ? Math.round((presentToday / todayAttendance.length) * 100)
      : 0;

    return {
      totalStudents: students.length,
      totalStaff: staff.length,
      totalInquiries: inquiries.length,
      totalRevenue: challans.reduce((s, c) => s + (Number(c.totalAmount) || 0), 0),
      feeCollected: paidChallans.reduce((s, c) => s + (Number(c.totalAmount) || 0), 0),
      feePending: pendingChallans.reduce((s, c) => s + (Number(c.totalAmount) || 0), 0),
      attendanceToday: `${attendanceRate}%`,
      attendanceTodayCount: todayAttendance.length,
      recentStudents: students.slice(0, 5),
      classCounts: students.reduce((acc, s) => {
        acc[s.class] = (acc[s.class] || 0) + 1;
        return acc;
      }, {}),
    };
  } catch (error) {
    console.error("Error fetching dashboard stats:", error);
    return null;
  }
};
