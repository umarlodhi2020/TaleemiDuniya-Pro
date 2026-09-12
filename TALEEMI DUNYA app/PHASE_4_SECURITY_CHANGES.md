# PHASE 4 — Security Changes (Student Isolation)

As part of the Student Dashboard implementation, the following security measures are proposed to ensure students only access their own data.

## 🔐 Firestore Security Rules

Current rules allow broad public read access. I recommend deploying the following changes:

### 1. Student Record Protection
A student should only be able to read their own profile.
```javascript
match /students/{studentId} {
  allow read: if isSignedIn() && (
    request.auth.token.role == 'student' && request.auth.uid == 'student_' + studentId ||
    isSuperAdmin() || isSchoolAdmin(resource.data.schoolId)
  );
}
```

### 2. Attendance Protection
```javascript
match /attendance/{docId} {
  allow read: if isSignedIn() && (
    request.auth.token.role == 'student' && resource.data.studentId == request.auth.uid.replace('student_', '') ||
    isSchoolStaff(resource.data.schoolId)
  );
}
```

### 3. Fees & Challans Protection
```javascript
match /challans/{docId} {
  allow read: if isSignedIn() && (
    request.auth.token.role == 'student' && resource.data.studentId == request.auth.uid.replace('student_', '') ||
    isSchoolAdmin(resource.data.schoolId)
  );
}
```

### 4. Homework Protection
Homework is class-based.
```javascript
match /homework/{docId} {
  allow read: if isSignedIn() && (
    request.auth.token.role == 'student' && resource.data.schoolId == request.auth.token.schoolId ||
    isSchoolStaff(resource.data.schoolId)
  );
}
```

## 🛡️ Multi-Tenant Enforcement
The Android application repositories now enforce `schoolId` filtering in all queries:
- `whereEqualTo("schoolId", schoolId)`
- The `schoolId` is retrieved from the secure `SessionManager` (which gets it from the signed Firebase Token claims).

**IMPORTANT: Do not deploy these rules until the backend Custom Token claims (`role`, `schoolId`) are fully verified in production.**
