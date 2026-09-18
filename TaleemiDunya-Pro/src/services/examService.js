/**
 * Comprehensive Exam & Results Service Layer — TaleemiDunya-Pro
 * 
 * Provides unified, multi-tenant (schoolId-scoped) operations for:
 * 1. Exams (CRUD, status transitions, live-validation, duplicate, archive, delete protection)
 * 2. Exam Subjects (schedule, marks allocation, conflict detection)
 * 3. Admit Cards data assembly
 * 4. Marks & Results (batch entry, auto-grading, status handling, master matrix)
 * 5. Grading Schemes & Rules
 * 6. Report Analytics, Marksheets data & Publishing audit
 * 
 * Fully non-destructive and backward-compatible with existing Firestore collections:
 * `exams`, `results`, `gradingRules`, `subjects`, `students`, `classes`, `staff`
 */

import { 
  collection, 
  doc, 
  getDocs, 
  getDoc, 
  addDoc, 
  setDoc, 
  updateDoc, 
  deleteDoc, 
  query, 
  where, 
  orderBy, 
  serverTimestamp,
  writeBatch 
} from 'firebase/firestore';
import { db } from './firebase';
import { getRecords, addRecord, updateRecord, deleteRecord } from './db';

// ==========================================
// 1. EXAM LIFECYCLE & MANAGEMENT
// ==========================================

export const EXAM_STATUSES = {
  DRAFT: 'Draft',
  SCHEDULED: 'Scheduled',
  LIVE: 'Live',
  COMPLETED: 'Completed',
  RESULTS_PUBLISHED: 'Results Published',
  ARCHIVED: 'Archived'
};

export const EXAM_TYPES = [
  'Monthly Test',
  'Mid Term',
  'First Term',
  'Second Term',
  'Final Term',
  'Annual Exam',
  'Pre-Board',
  'Custom Exam'
];

/**
 * Fetch all exams for a school
 */
export const getExams = async (schoolId, includeArchived = true) => {
  try {
    if (!schoolId) return [];
    const exams = await getRecords('exams', schoolId);
    let list = exams.map(e => {
      // Compatibility mapping for legacy exams
      let status = e.status || EXAM_STATUSES.DRAFT;
      if (status === 'DRAFT') status = EXAM_STATUSES.DRAFT;
      else if (status === 'PUBLISHED' || status === 'Published') status = EXAM_STATUSES.RESULTS_PUBLISHED;
      else if (status === 'Upcoming') status = EXAM_STATUSES.SCHEDULED;
      else if (status === 'LIVE' || status === 'Live') status = EXAM_STATUSES.LIVE;

      // Handle classes string or array
      let classesArr = [];
      if (Array.isArray(e.classes)) {
        classesArr = e.classes;
      } else if (typeof e.classes === 'string' && e.classes) {
        classesArr = e.classes.split(',').map(c => c.trim()).filter(Boolean);
      }

      // Handle sections string or array
      let sectionsArr = [];
      if (Array.isArray(e.sections)) {
        sectionsArr = e.sections;
      } else if (typeof e.sections === 'string' && e.sections) {
        sectionsArr = e.sections.split(',').map(s => s.trim()).filter(Boolean);
      }

      return {
        ...e,
        examName: e.examName || e.title || 'Untitled Exam',
        examType: e.examType || 'Term Exam',
        academicYear: e.academicYear || e.session || '2026-2027',
        session: e.session || e.academicYear || '2026-2027',
        startDate: e.startDate || e.date || new Date().toISOString().split('T')[0],
        endDate: e.endDate || e.date || new Date().toISOString().split('T')[0],
        classes: classesArr,
        sections: sectionsArr,
        status: status,
        subjects: e.subjects || []
      };
    });

    if (!includeArchived) {
      list = list.filter(e => e.status !== EXAM_STATUSES.ARCHIVED);
    }

    return list.sort((a, b) => new Date(b.startDate || b.createdAt) - new Date(a.startDate || a.createdAt));
  } catch (error) {
    console.error('Error fetching exams:', error);
    return [];
  }
};

/**
 * Save (create or update) an exam
 */
export const saveExam = async (examData, schoolId, examId = null) => {
  try {
    const payload = {
      examName: examData.examName || 'Untitled Exam',
      title: examData.examName || 'Untitled Exam', // legacy sync
      examType: examData.examType || 'Term Exam',
      academicYear: examData.academicYear || examData.session || '2026-2027',
      session: examData.session || examData.academicYear || '2026-2027',
      startDate: examData.startDate || new Date().toISOString().split('T')[0],
      endDate: examData.endDate || new Date().toISOString().split('T')[0],
      classes: Array.isArray(examData.classes) ? examData.classes : (examData.classes ? [examData.classes] : []),
      sections: Array.isArray(examData.sections) ? examData.sections : (examData.sections ? [examData.sections] : []),
      instructions: examData.instructions || '',
      marksheetType: examData.marksheetType || 'Long',
      signatureOffset: Number(examData.signatureOffset ?? 0),
      failSubjectCount: Number(examData.failSubjectCount ?? 1),
      termWeightage: Number(examData.termWeightage ?? 100),
      visibilityControls: examData.visibilityControls || {
        showTotalMarks: true,
        showGrade: true,
        showTeacherComments: true,
        showPercentage: true,
        showRankPosition: true,
        showRankComments: true,
        showGraph: true,
        showAttendance: true
      },
      mergeWithOtherExams: Boolean(examData.mergeWithOtherExams),
      mergedExamIds: examData.mergedExamIds || [],
      status: examData.status || EXAM_STATUSES.DRAFT,
      gradingSchemeId: examData.gradingSchemeId || 'default',
      subjects: examData.subjects || [],
      schoolId: schoolId,
      updatedAt: new Date().toISOString()
    };

    if (examId) {
      await updateDoc(doc(db, 'exams', examId), payload);
      return { success: true, id: examId };
    } else {
      payload.createdAt = new Date().toISOString();
      const docRef = await addDoc(collection(db, 'exams'), payload);
      return { success: true, id: docRef.id };
    }
  } catch (error) {
    console.error('Error saving exam:', error);
    throw error;
  }
};

/**
 * Duplicate an existing exam as a draft
 */
export const duplicateExam = async (examId, schoolId) => {
  try {
    const examDoc = await getDoc(doc(db, 'exams', examId));
    if (!examDoc.exists()) throw new Error('Exam not found');
    
    const orig = examDoc.data();
    const newExamPayload = {
      ...orig,
      examName: `${orig.examName || orig.title} (Copy)`,
      title: `${orig.examName || orig.title} (Copy)`,
      status: EXAM_STATUSES.DRAFT,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      schoolId
    };

    delete newExamPayload.id;
    const docRef = await addDoc(collection(db, 'exams'), newExamPayload);
    return { success: true, id: docRef.id };
  } catch (error) {
    console.error('Error duplicating exam:', error);
    throw error;
  }
};

/**
 * Check if an exam can be safely deleted (fails if results exist)
 */
export const checkExamHasResults = async (examId, schoolId) => {
  try {
    const q = query(
      collection(db, 'results'),
      where('schoolId', '==', schoolId),
      where('examId', '==', examId)
    );
    const snap = await getDocs(q);
    return !snap.empty;
  } catch (error) {
    console.error('Error checking exam results:', error);
    return false;
  }
};

/**
 * Delete exam with safety protection
 */
export const deleteExamSafe = async (examId, schoolId) => {
  const hasResults = await checkExamHasResults(examId, schoolId);
  if (hasResults) {
    throw new Error('Cannot delete this exam because student marks/results have already been recorded. You can Archive it instead.');
  }
  await deleteDoc(doc(db, 'exams', examId));
  return { success: true };
};

/**
 * Validate exam readiness to MAKE LIVE
 * Returns { isReady: boolean, missingItems: string[] }
 */
export const validateExamForLive = (exam, examSubjects = []) => {
  const missing = [];

  if (!exam.examName || exam.examName.trim() === '') {
    missing.push('Exam Name is required');
  }
  if (!exam.classes || exam.classes.length === 0) {
    missing.push('At least one Class must be assigned to this exam');
  }
  if (!exam.startDate || !exam.endDate) {
    missing.push('Exam start and end dates must be configured');
  }
  if (exam.startDate && exam.endDate && new Date(exam.startDate) > new Date(exam.endDate)) {
    missing.push('Start Date cannot be later than End Date');
  }

  // Check subjects
  const subjectsToCheck = (exam.subjects && exam.subjects.length > 0) ? exam.subjects : examSubjects;
  if (!subjectsToCheck || subjectsToCheck.length === 0) {
    missing.push('No subjects have been scheduled for this exam');
  } else {
    // Check if any subject has missing total or passing marks
    const invalidMarks = subjectsToCheck.filter(s => !s.totalMarks || Number(s.totalMarks) <= 0 || s.passingMarks === undefined || s.passingMarks === null);
    if (invalidMarks.length > 0) {
      missing.push(`Total marks and passing marks must be configured for all subjects (${invalidMarks.map(s => s.subjectName || s.name).join(', ')})`);
    }

    const invalidDates = subjectsToCheck.filter(s => !s.examDate);
    if (invalidDates.length > 0) {
      missing.push(`Exam dates are missing for subjects: ${invalidDates.map(s => s.subjectName || s.name).join(', ')}`);
    }
  }

  return {
    isReady: missing.length === 0,
    missingItems: missing
  };
};

// ==========================================
// 2. EXAM SUBJECTS & CONFLICT DETECTION
// ==========================================

/**
 * Detect scheduling conflicts for exam subjects
 */
export const detectExamScheduleConflicts = (subjectsList) => {
  const conflicts = [];

  for (let i = 0; i < subjectsList.length; i++) {
    for (let j = i + 1; j < subjectsList.length; j++) {
      const s1 = subjectsList[i];
      const s2 = subjectsList[j];

      // If they are on the same date
      if (s1.examDate && s2.examDate && s1.examDate === s2.examDate) {
        const timeOverlap = checkTimeOverlap(s1.startTime, s1.endTime, s2.startTime, s2.endTime);

        if (timeOverlap) {
          // 1. Same Class conflict
          if (s1.classId === s2.classId || s1.className === s2.className) {
            conflicts.push({
              type: 'CLASS_CONFLICT',
              message: `Class "${s1.className || s1.classId}" has overlapping exams: "${s1.subjectName}" and "${s2.subjectName}" on ${s1.examDate} (${s1.startTime || 'N/A'} - ${s1.endTime || 'N/A'})`,
              subjects: [s1, s2]
            });
          }

          // 2. Teacher Conflict
          if (s1.teacherId && s2.teacherId && s1.teacherId === s2.teacherId) {
            conflicts.push({
              type: 'TEACHER_CONFLICT',
              message: `Teacher "${s1.teacherName || s1.teacherId}" is assigned to 2 exams simultaneously on ${s1.examDate}: "${s1.subjectName}" and "${s2.subjectName}"`,
              subjects: [s1, s2]
            });
          }

          // 3. Room Conflict
          if (s1.room && s2.room && s1.room.trim() !== '' && s1.room.toLowerCase() === s2.room.toLowerCase()) {
            conflicts.push({
              type: 'ROOM_CONFLICT',
              message: `Room "${s1.room}" is double-booked on ${s1.examDate} for "${s1.subjectName}" and "${s2.subjectName}"`,
              subjects: [s1, s2]
            });
          }
        }
      }
    }
  }

  return conflicts;
};

const checkTimeOverlap = (start1, end1, start2, end2) => {
  if (!start1 || !end1 || !start2 || !end2) return true; // Assume overlap if times missing on same date
  return (start1 < end2 && start2 < end1);
};

// ==========================================
// 3. MARKS ENTRY, AUDIT & AUTO-GRADING
// ==========================================

export const MARK_STATUSES = {
  PRESENT: 'Present',
  ABSENT: 'Absent',
  LEAVE: 'Leave',
  EXEMPT: 'Exempt',
  WITHHELD: 'Withheld'
};

/**
 * Calculate grade and GPA from percentage using active grading scheme
 */
export const calculateGrade = (obtainedMarks, totalMarks, gradingRules = [], status = MARK_STATUSES.PRESENT) => {
  if (status === MARK_STATUSES.ABSENT) {
    return { grade: 'F', gpa: 0, remarks: 'Absent', percentage: 0, passed: false };
  }
  if (status === MARK_STATUSES.LEAVE) {
    return { grade: 'N/A', gpa: 0, remarks: 'On Leave', percentage: 0, passed: false };
  }
  if (status === MARK_STATUSES.EXEMPT) {
    return { grade: 'EX', gpa: 0, remarks: 'Exempted', percentage: 100, passed: true };
  }
  if (status === MARK_STATUSES.WITHHELD) {
    return { grade: 'WH', gpa: 0, remarks: 'Withheld', percentage: 0, passed: false };
  }

  const obtained = Number(obtainedMarks);
  const total = Number(totalMarks) || 100;

  if (isNaN(obtained) || obtained < 0) {
    return { grade: '-', gpa: 0, remarks: 'Incomplete', percentage: 0, passed: false };
  }

  const percentage = total > 0 ? Math.round(((obtained / total) * 100) * 100) / 100 : 0;

  if (gradingRules && gradingRules.length > 0) {
    const sorted = [...gradingRules].sort((a, b) => Number(b.maxPercent || b.maxMarks || 100) - Number(a.maxPercent || a.maxMarks || 100));
    for (const rule of sorted) {
      const min = Number(rule.minPercent ?? rule.minMarks ?? 0);
      const max = Number(rule.maxPercent ?? rule.maxMarks ?? 100);
      if (percentage >= min && percentage <= max) {
        const isFail = (rule.grade || '').toUpperCase() === 'F' || percentage < 33;
        return {
          grade: rule.grade || 'Pass',
          gpa: Number(rule.gradePoint ?? rule.gpa ?? 0),
          remarks: rule.remarks || rule.description || (isFail ? 'Failed' : 'Passed'),
          percentage,
          passed: !isFail
        };
      }
    }
  }

  // Standard Fallback Scheme
  if (percentage >= 90) return { grade: 'A+', gpa: 4.0, remarks: 'Outstanding', percentage, passed: true };
  if (percentage >= 80) return { grade: 'A', gpa: 3.7, remarks: 'Excellent', percentage, passed: true };
  if (percentage >= 70) return { grade: 'B', gpa: 3.0, remarks: 'Very Good', percentage, passed: true };
  if (percentage >= 60) return { grade: 'C', gpa: 2.0, remarks: 'Good', percentage, passed: true };
  if (percentage >= 50) return { grade: 'D', gpa: 1.0, remarks: 'Satisfactory', percentage, passed: true };
  if (percentage >= 33) return { grade: 'E', gpa: 0.5, remarks: 'Pass', percentage, passed: true };
  return { grade: 'F', gpa: 0.0, remarks: 'Failed', percentage, passed: false };
};

/**
 * Batch Save Marks with audit history
 */
export const saveMarksBatch = async ({
  examId,
  classId,
  section,
  subject,
  totalMarks,
  passingMarks,
  theoryMarks = null,
  practicalMarks = null,
  studentsMarks = [],
  schoolId,
  gradingRules = [],
  locked = false,
  enteredBy = 'Admin'
}) => {
  try {
    const batch = writeBatch(db);
    const timestamp = new Date().toISOString();

    for (const student of studentsMarks) {
      const resultDocId = `${student.studentId}_${examId}_${subject.replace(/[^a-zA-Z0-9]/g, '_')}`;
      const docRef = doc(db, 'results', resultDocId);

      const status = student.status || MARK_STATUSES.PRESENT;
      let obt = student.obtainedMarks;
      if (status === MARK_STATUSES.ABSENT) obt = 'ABS';
      else if (obt === '' || obt === null || obt === undefined) obt = 0;
      else obt = Number(obt);

      const gradeObj = calculateGrade(
        status === MARK_STATUSES.ABSENT ? 'ABS' : obt,
        totalMarks,
        gradingRules,
        status
      );

      const resultPayload = {
        studentId: student.studentId,
        studentName: student.studentName || 'Student',
        rollNumber: student.rollNumber || student.rollNo || '',
        class: classId,
        section: section || student.section || '',
        examId: examId,
        subject: subject,
        totalMarks: Number(totalMarks),
        passingMarks: Number(passingMarks || (Number(totalMarks) * 0.33)),
        theoryMarks: theoryMarks !== null ? Number(theoryMarks) : null,
        practicalMarks: practicalMarks !== null ? Number(practicalMarks) : null,
        obtainedTheory: student.obtainedTheory !== undefined ? Number(student.obtainedTheory) : null,
        obtainedPractical: student.obtainedPractical !== undefined ? Number(student.obtainedPractical) : null,
        obtainedMarks: obt,
        status: status,
        percentage: gradeObj.percentage,
        grade: gradeObj.grade,
        gpa: gradeObj.gpa,
        remarks: student.remarks || gradeObj.remarks,
        passed: gradeObj.passed,
        isLocked: locked,
        schoolId: schoolId,
        enteredBy: enteredBy,
        updatedAt: timestamp
      };

      batch.set(docRef, resultPayload, { merge: true });
    }

    await batch.commit();
    return { success: true, count: studentsMarks.length };
  } catch (error) {
    console.error('Error saving marks batch:', error);
    throw error;
  }
};

// ==========================================
// 4. GRADING SCHEMES MANAGEMENT
// ==========================================

export const DEFAULT_GRADING_RULES = [
  { grade: 'A+', minPercent: 90, maxPercent: 100, gradePoint: 4.0, remarks: 'Outstanding' },
  { grade: 'A',  minPercent: 80, maxPercent: 89.99, gradePoint: 3.7, remarks: 'Excellent' },
  { grade: 'B',  minPercent: 70, maxPercent: 79.99, gradePoint: 3.0, remarks: 'Very Good' },
  { grade: 'C',  minPercent: 60, maxPercent: 69.99, gradePoint: 2.0, remarks: 'Good' },
  { grade: 'D',  minPercent: 50, maxPercent: 59.99, gradePoint: 1.0, remarks: 'Satisfactory' },
  { grade: 'E',  minPercent: 33, maxPercent: 49.99, gradePoint: 0.5, remarks: 'Pass' },
  { grade: 'F',  minPercent: 0,  maxPercent: 32.99, gradePoint: 0.0, remarks: 'Fail' }
];

export const getGradingRules = async (schoolId) => {
  try {
    const rules = await getRecords('gradingRules', schoolId);
    if (!rules || rules.length === 0) {
      return DEFAULT_GRADING_RULES;
    }
    return rules.sort((a, b) => Number(b.maxPercent || b.maxMarks || 100) - Number(a.maxPercent || a.maxMarks || 100));
  } catch (error) {
    console.error('Error fetching grading rules:', error);
    return DEFAULT_GRADING_RULES;
  }
};

// ==========================================
// 5. REPORT SUMMARY & RESULT PUBLISHING AUDIT
// ==========================================

/**
 * Comprehensive Audit before Publishing Results
 */
export const auditExamForPublishing = async (examId, schoolId, classId = null) => {
  try {
    const examDoc = await getDoc(doc(db, 'exams', examId));
    if (!examDoc.exists()) throw new Error('Exam not found');
    const exam = examDoc.data();

    // Fetch students
    let studentsQuery = [where('schoolId', '==', schoolId)];
    if (classId) {
      studentsQuery.push(where('class', '==', classId));
    }
    const allStudents = await getRecords('students', schoolId, classId ? [{ field: 'class', operator: '==', value: classId }] : []);

    // Fetch results
    const results = await getRecords('results', schoolId, [
      { field: 'examId', operator: '==', value: examId }
    ]);

    const examSubjects = exam.subjects || [];
    const missingMarksList = [];
    const absentStudentsList = [];
    const incompleteStudentsList = [];

    // Group results by studentId
    const resultsByStudent = {};
    results.forEach(r => {
      if (!resultsByStudent[r.studentId]) resultsByStudent[r.studentId] = [];
      resultsByStudent[r.studentId].push(r);
    });

    const targetClasses = classId ? [classId] : (exam.classes || []);
    const relevantStudents = allStudents.filter(s => targetClasses.includes(s.class));

    relevantStudents.forEach(student => {
      const studentResults = resultsByStudent[student.id] || [];
      
      // Determine expected subjects for this student's class
      const classSubjects = examSubjects.filter(sub => !sub.classId || sub.classId === student.class);
      const expectedSubjectNames = classSubjects.map(s => s.subjectName || s.name);

      if (studentResults.length === 0) {
        missingMarksList.push({
          studentId: student.id,
          studentName: student.name,
          rollNumber: student.rollNumber || student.rollNo,
          class: student.class,
          reason: 'No marks entered for any subject'
        });
      } else {
        // Check for missing specific subjects
        const recordedSubjects = studentResults.map(r => r.subject);
        const missingSubjs = expectedSubjectNames.filter(name => !recordedSubjects.includes(name));

        if (missingSubjs.length > 0) {
          incompleteStudentsList.push({
            studentId: student.id,
            studentName: student.name,
            rollNumber: student.rollNumber || student.rollNo,
            class: student.class,
            missingSubjects: missingSubjs
          });
        }

        // Check if absent in any
        const absentIn = studentResults.filter(r => r.status === MARK_STATUSES.ABSENT || r.obtainedMarks === 'ABS');
        if (absentIn.length > 0) {
          absentStudentsList.push({
            studentId: student.id,
            studentName: student.name,
            rollNumber: student.rollNumber || student.rollNo,
            class: student.class,
            absentSubjects: absentIn.map(r => r.subject)
          });
        }
      }
    });

    return {
      totalStudents: relevantStudents.length,
      totalResultsRecorded: results.length,
      missingMarksCount: missingMarksList.length,
      missingMarksList,
      incompleteCount: incompleteStudentsList.length,
      incompleteStudentsList,
      absentCount: absentStudentsList.length,
      absentStudentsList,
      isClean: missingMarksList.length === 0 && incompleteStudentsList.length === 0
    };
  } catch (error) {
    console.error('Error auditing exam:', error);
    throw error;
  }
};

/**
 * Publish results for an exam
 */
export const publishExamResults = async (examId, schoolId) => {
  try {
    await updateDoc(doc(db, 'exams', examId), {
      status: EXAM_STATUSES.RESULTS_PUBLISHED,
      publishedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });
    return { success: true };
  } catch (error) {
    console.error('Error publishing results:', error);
    throw error;
  }
};

// ==========================================
// 6. EXTENDED WORKFLOW HELPERS (6-STAGE ENGINE)
// ==========================================

export const VERIFICATION_STATUSES = {
  DRAFT: 'DRAFT',
  SUBMITTED: 'SUBMITTED',
  VERIFIED: 'VERIFIED',
  LOCKED: 'LOCKED'
};

export const APPROVAL_STATES = {
  DRAFT: 'DRAFT',
  TEACHER_SUBMITTED: 'TEACHER_SUBMITTED',
  CONTROLLER_VERIFIED: 'CONTROLLER_VERIFIED',
  PRINCIPAL_APPROVED: 'PRINCIPAL_APPROVED',
  PUBLISHED: 'PUBLISHED'
};

/**
 * Check if a student has cleared their fee balance (Read-only query to fees/vouchers)
 */
export const checkStudentFeeClearance = async (studentId, schoolId) => {
  try {
    if (!studentId || !schoolId) return { cleared: true, balance: 0 };
    const vouchers = await getRecords('vouchers', schoolId, [
      { field: 'studentId', operator: '==', value: studentId }
    ]);

    if (!vouchers || vouchers.length === 0) {
      return { cleared: true, balance: 0, pendingVouchers: 0 };
    }

    let totalBalance = 0;
    let pendingCount = 0;

    vouchers.forEach(v => {
      const status = (v.status || '').toUpperCase();
      if (status === 'UNPAID' || status === 'PARTIAL' || status === 'PENDING') {
        const bal = Number(v.balance || v.remainingAmount || (Number(v.totalAmount || 0) - Number(v.paidAmount || 0)));
        if (bal > 0) {
          totalBalance += bal;
          pendingCount++;
        }
      }
    });

    return {
      cleared: totalBalance <= 0,
      balance: totalBalance,
      pendingVouchers: pendingCount
    };
  } catch (err) {
    console.error('Error checking student fee clearance:', err);
    return { cleared: true, balance: 0, error: err.message };
  }
};

/**
 * Detailed calculations for a list of student marks in an exam term
 */
export const computeExamResultSummary = (studentMarks = [], failSubjectCountThreshold = 1, gradingRules = DEFAULT_GRADING_RULES) => {
  let totalMax = 0;
  let totalObtained = 0;
  let failedSubjectsCount = 0;
  let isAbsentAny = false;

  const subjectBreakdown = studentMarks.map(m => {
    const max = Number(m.totalMarks || m.maxMarks || 0);
    const isAbs = m.status === MARK_STATUSES.ABSENT || m.obtainedMarks === 'ABS' || m.isAbsent;
    const obt = isAbs ? 0 : Number(m.obtainedMarks || 0);
    const passMarks = Number(m.passingMarks || Math.round(max * 0.33));
    const isFail = isAbs || obt < passMarks;

    totalMax += max;
    totalObtained += obt;
    if (isFail) failedSubjectsCount++;
    if (isAbs) isAbsentAny = true;

    const gradeInfo = calculateGrade(isAbs ? 'ABS' : obt, max, gradingRules, m.status);

    return {
      subjectName: m.subjectName || m.subject,
      maxMarks: max,
      obtainedMarks: isAbs ? 'ABS' : obt,
      passingMarks: passMarks,
      passed: !isFail,
      grade: gradeInfo.grade,
      percentage: gradeInfo.percentage
    };
  });

  const overallPercentage = totalMax > 0 ? Math.round(((totalObtained / totalMax) * 100) * 100) / 100 : 0;
  const overallGrade = calculateGrade(totalObtained, totalMax, gradingRules).grade;
  const isOverallPass = failedSubjectsCount < Number(failSubjectCountThreshold || 1);

  return {
    totalMaxMarks: totalMax,
    totalObtainedMarks: totalObtained,
    percentage: overallPercentage,
    grade: overallGrade,
    failedSubjectsCount,
    passed: isOverallPass,
    status: isOverallPass ? 'PASS' : 'FAIL',
    subjectBreakdown
  };
};

/**
 * Assign class ranks/positions based on total obtained marks
 */
export const assignClassRanks = (studentsResultList = []) => {
  const sorted = [...studentsResultList].sort((a, b) => {
    // 1. Passed students first
    if (a.passed && !b.passed) return -1;
    if (!a.passed && b.passed) return 1;
    // 2. Highest total obtained marks
    return Number(b.totalObtainedMarks || 0) - Number(a.totalObtainedMarks || 0);
  });

  let currentRank = 1;
  return sorted.map((item, idx) => {
    if (idx > 0) {
      const prev = sorted[idx - 1];
      if (prev.passed === item.passed && prev.totalObtainedMarks === item.totalObtainedMarks) {
        // Tie position
        return { ...item, rankPosition: prev.rankPosition };
      }
    }
    const rank = currentRank;
    currentRank++;
    return { ...item, rankPosition: rank };
  });
};

