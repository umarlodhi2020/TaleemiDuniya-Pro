# Firestore Security Rules — TaleemiDunya Pro

## Firebase Console pe yeh rules set karo:
## Firebase Console → Firestore Database → Rules tab

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {

    // ─────────────────────────────────────────────
    // Helper Functions
    // ─────────────────────────────────────────────

    function getUserData() {
      return get(/databases/$(database)/documents/users/$(request.auth.uid)).data;
    }

    function isSuperAdmin() {
      return request.auth != null && getUserData().role == 'super-admin';
    }

    function isSchoolAdmin(schoolId) {
      return request.auth != null 
        && getUserData().role == 'school-admin'
        && getUserData().schoolId == schoolId;
    }

    function isTeacher(schoolId) {
      return request.auth != null 
        && getUserData().role == 'teacher'
        && getUserData().schoolId == schoolId;
    }

    function belongsToSchool(schoolId) {
      return request.auth != null && getUserData().schoolId == schoolId;
    }

    // ─────────────────────────────────────────────
    // System Config (setup marker)
    // ─────────────────────────────────────────────
    match /system/{doc} {
      allow read: if true;          // Anyone can check if setup is done
      allow write: if true;         // Allow first-time setup
    }

    // ─────────────────────────────────────────────
    // Users Collection
    // ─────────────────────────────────────────────
    match /users/{userId} {
      // User can read their own profile; super admin can read all
      allow read: if request.auth != null && (request.auth.uid == userId || isSuperAdmin());
      // User can update their own profile; super admin can write all
      allow write: if request.auth != null && (request.auth.uid == userId || isSuperAdmin());
      // Allow creation by any authenticated user (for creating school users)
      allow create: if request.auth != null;
    }

    // ─────────────────────────────────────────────
    // Schools Collection (Super Admin only)
    // ─────────────────────────────────────────────
    match /schools/{schoolId} {
      allow read: if isSuperAdmin();
      allow write: if isSuperAdmin();
    }

    // ─────────────────────────────────────────────
    // School Data: Students, Staff, Fees, Attendance, etc.
    // ─────────────────────────────────────────────
    match /students/{docId} {
      allow read: if isSuperAdmin() || belongsToSchool(resource.data.schoolId);
      allow write: if isSuperAdmin() || isSchoolAdmin(request.resource.data.schoolId);
      allow create: if isSuperAdmin() || isSchoolAdmin(request.resource.data.schoolId);
    }

    match /staff/{docId} {
      allow read: if isSuperAdmin() || belongsToSchool(resource.data.schoolId);
      allow write: if isSuperAdmin() || isSchoolAdmin(request.resource.data.schoolId);
      allow create: if isSuperAdmin() || isSchoolAdmin(request.resource.data.schoolId);
    }

    match /fees/{docId} {
      allow read: if isSuperAdmin() || belongsToSchool(resource.data.schoolId);
      allow write: if isSuperAdmin() || isSchoolAdmin(request.resource.data.schoolId);
      allow create: if isSuperAdmin() || isSchoolAdmin(request.resource.data.schoolId);
    }

    match /attendance/{docId} {
      allow read: if isSuperAdmin() || belongsToSchool(resource.data.schoolId);
      allow write: if isSuperAdmin() || isSchoolAdmin(request.resource.data.schoolId) || isTeacher(request.resource.data.schoolId);
      allow create: if isSuperAdmin() || isSchoolAdmin(request.resource.data.schoolId) || isTeacher(request.resource.data.schoolId);
    }

    match /exams/{docId} {
      allow read: if isSuperAdmin() || belongsToSchool(resource.data.schoolId);
      allow write: if isSuperAdmin() || isSchoolAdmin(request.resource.data.schoolId);
      allow create: if isSuperAdmin() || isSchoolAdmin(request.resource.data.schoolId);
    }

    match /results/{docId} {
      allow read: if isSuperAdmin() || belongsToSchool(resource.data.schoolId);
      allow write: if isSuperAdmin() || isSchoolAdmin(request.resource.data.schoolId) || isTeacher(request.resource.data.schoolId);
      allow create: if isSuperAdmin() || isSchoolAdmin(request.resource.data.schoolId) || isTeacher(request.resource.data.schoolId);
    }

    match /inquiries/{docId} {
      allow read: if isSuperAdmin() || belongsToSchool(resource.data.schoolId);
      allow write: if isSuperAdmin() || isSchoolAdmin(request.resource.data.schoolId);
      allow create: if isSuperAdmin() || isSchoolAdmin(request.resource.data.schoolId);
    }

    match /inventory/{docId} {
      allow read: if isSuperAdmin() || belongsToSchool(resource.data.schoolId);
      allow write: if isSuperAdmin() || isSchoolAdmin(request.resource.data.schoolId);
      allow create: if isSuperAdmin() || isSchoolAdmin(request.resource.data.schoolId);
    }

    match /accounts/{docId} {
      allow read: if isSuperAdmin() || belongsToSchool(resource.data.schoolId);
      allow write: if isSuperAdmin() || isSchoolAdmin(request.resource.data.schoolId);
      allow create: if isSuperAdmin() || isSchoolAdmin(request.resource.data.schoolId);
    }

    match /sms/{docId} {
      allow read: if isSuperAdmin() || belongsToSchool(resource.data.schoolId);
      allow write: if isSuperAdmin() || isSchoolAdmin(request.resource.data.schoolId);
      allow create: if isSuperAdmin() || isSchoolAdmin(request.resource.data.schoolId);
    }
  }
}
```

---

## STEP-BY-STEP: Firebase Console Pe Kaise Set Karein

1. **Firebase Console** kholein: https://console.firebase.google.com
2. Project `taleemidunya-pro-ed44e` select karein
3. Left sidebar mein **Firestore Database** click karein
4. Upar **Rules** tab click karein
5. Existing rules ko delete karein aur upar wali rules paste karein
6. **Publish** button click karein

---

## ⚠️ Pehle Setup Ke Waqt (Before First Login)

Setup page (`/setup`) chalane se pehle temporarily yeh rules use karein:

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /{document=**} {
      allow read, write: if true;
    }
  }
}
```

Setup complete hone ke baad **immediately** proper rules lagao!

---

## School Admin Ka schoolId

Jab Super Admin kisi school ko onboard kare, toh us school ka Firestore document ID hi `schoolId` hoga.
School Admin ka account banate waqt `schoolId` field mein woh ID daalni hogi.
