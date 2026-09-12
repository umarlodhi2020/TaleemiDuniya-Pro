# PHASE 5 — Security Changes (Parent-Child Isolation)

This document outlines the security rules required to ensure parents only access their own children's data.

## 🔐 Firestore Security Rules

### 1. Student Profile Protection (Parent Access)
Allow parents to read a student record if the `fatherCnic` or `phone` matches their authenticated claims.
```javascript
match /students/{studentId} {
  allow read: if isSignedIn() && (
    request.auth.token.role == 'parent' && (
      resource.data.fatherCnic == request.auth.token.cnic ||
      resource.data.phone == request.auth.token.phone
    ) ||
    request.auth.token.role == 'student' && request.auth.uid == 'student_' + studentId ||
    isSuperAdmin() || isSchoolAdmin(resource.data.schoolId)
  );
}
```

### 2. Attendance, Fees, Results (Parent Access)
Allow parents to read these records if the `studentId` in the record belongs to one of their linked children.
```javascript
match /attendance/{docId} {
  allow read: if isSignedIn() && (
    request.auth.token.role == 'parent' && isParentOf(resource.data.studentId) ||
    request.auth.token.role == 'student' && resource.data.studentId == request.auth.uid.replace('student_', '')
  );
}

// Helper function
function isParentOf(studentId) {
  let student = get(/databases/$(database)/documents/students/$(studentId)).data;
  return student.fatherCnic == request.auth.token.cnic || student.phone == request.auth.token.phone;
}
```

### 3. Homework & Announcements (School Isolation)
Parents read class-based data scoped to their school.
```javascript
match /homework/{docId} {
  allow read: if isSignedIn() && (
    resource.data.schoolId == request.auth.token.schoolId
  );
}
```

## 🛡️ Identity Verification
- The `ParentRepository.getChildren` query uses `whereEqualTo("fatherCnic", parentCnic)`.
- The `parentCnic` is retrieved from the secure session (Custom Token claim).
- All subsequent child-specific screens use the `selectedChildId` which is validated against the family tree.

**IMPORTANT: Security rules MUST be deployed to enforce these restrictions at the database level, as client-side filtering is not sufficient for production.**
