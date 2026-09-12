# Firebase Firestore Rules Review — Phase 3

During the security audit in Phase 3, I reviewed the existing Firestore security rules against the new mobile authentication requirements.

## ⚠️ Security Vulnerabilities Identified

### 1. Public Student Data Access
**Current Rule:**
```javascript
match /students/{docId} {
  allow read: if true; 
  ...
}
```
**Problem:** 
Any user (even unauthenticated) can read the entire `students` collection. This exposes sensitive information like `fatherCnic`, `phone`, `feeBalance`, and `photoUrl`.

**Proposed Change:**
Restrict read access to authenticated users who belong to the same school or are the owners of the data.
```javascript
match /students/{docId} {
  allow read: if isSignedIn() && (
    isSuperAdmin() || 
    isSchoolAdmin(resource.data.schoolId) || 
    isTeacher(resource.data.schoolId) ||
    request.auth.token.role == 'student' && request.auth.uid == docId ||
    request.auth.token.role == 'parent' && request.auth.token.cnic == resource.data.fatherCnic
  );
}
```
*Note: Custom claims `role` and `cnic` should be added to the Firebase Custom Token during backend verification.*

---

### 2. Broad Read Access for Protected Data
**Current Rules:**
```javascript
match /results/{docId} { allow read: if true; }
match /homework/{docId} { allow read: if true; }
match /announcements/{docId} { allow read: if true; }
```
**Problem:** 
Academic results and homework are publicly readable.

**Proposed Change:**
Enforce `schoolId` isolation using token claims.
```javascript
match /results/{docId} {
  allow read: if isSignedIn() && (resource.data.schoolId == request.auth.token.schoolId);
}
```

---

### 3. Missing Role Enforcement for Teachers
**Current Rule Helper:**
```javascript
function isSchoolStaff(schoolId) {
  return isSignedIn() && getUser().schoolId == schoolId;
}
```
**Problem:** 
`isSchoolStaff` doesn't check if the user actually has the `teacher` role, only if they have a `schoolId`.

**Proposed Change:**
Use the role claim from the token (derived from the trusted backend).
```javascript
function isTeacher(schoolId) {
  return isSignedIn() && request.auth.token.role == 'teacher' && request.auth.token.schoolId == schoolId;
}
```

## 🚀 Recommended Action
1.  **Update Backend**: Ensure the `createCustomToken` call includes `role`, `schoolId`, and `cnic` in the claims.
2.  **Deploy New Rules**: Once Phase 3 testing is approved, we should deploy these tightened rules to protect production data.

**Do NOT deploy these changes automatically. Wait for manual verification of the Custom Token claims first.**
