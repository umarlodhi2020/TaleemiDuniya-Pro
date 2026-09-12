# 🗺️ TALEEMI DUNYA — Backend & Infrastructure Mapping (Phase 1)

This document provides a comprehensive mapping of the backend ecosystem for the Taleemi Dunya project, including Firebase, Cloudinary, and the Node.js WhatsApp AI Bot.

---

## 🔐 1. Firebase Ecosystem
**Project ID:** `taleemidunya-pro-ed44e`  
**Host:** Google Firebase  

### 👤 Authentication Strategy
*   **Primary Auth:** Custom OTP-based Authentication (CNIC + Mobile Number + WhatsApp OTP).
*   **Roles (RBAC):** `super-admin`, `school-admin`, `teacher`, `student`, `parent`.
*   **Multi-Tenancy:** Each user is linked to a `schoolId` in their Firestore profile.
*   **Mobile Auth Flow:**
    1.  User enters CNIC and Phone.
    2.  Android app calls AlwaysData Backend.
    3.  Backend verifies identity in Firestore.
    4.  Backend generates OTP and sends via WhatsApp Bot.
    5.  Android app verifies OTP via Backend.
    6.  Backend returns Session Token and User Data (Role, SchoolId, etc.).

### 📦 Firestore Collections & Schema
All collections use `schoolId` for scoping and multi-tenant isolation.

| Collection Name | Key Fields / Schema Details | Relationship / Role |
| :--- | :--- | :--- |
| **`/schools`** | `schoolName`, `logo`, `plan`, `status`, `revenue` | Master record for each tenant. |
| **`/users`** | `email`, `role`, `schoolId`, `displayName` | Links Firebase Auth users to school roles. |
| **`/students`** | `name`, `rollNumber`, `class`, `section`, `fatherName`, `fatherCnic`, `phone`, `whatsappPhone`, `feeBalance`, `schoolId`, `photoUrl`, `status` | Student ERP data; linked to parents via phone/CNIC. |
| **`/staff`** | `name`, `designation`, `role` (e.g., Teacher), `salary`, `schoolId`, `phone` | HR and Payroll management. |
| **`/attendance`** | `studentId`, `date`, `status` (Present/Absent/Late/Leave), `checkInTime`, `schoolId` | Daily records; docId format: `${studentId}_${date}`. |
| **`/fees`** | `studentId`, `month`, `totalAmount`, `status` (Paid/Unpaid), `voucherNo`, `schoolId` | Financial ledger and fee tracking. |
| **`/exams` / `/results`** | `studentId`, `examId`, `subject`, `obtainedMarks`, `totalMarks`, `schoolId` | Academic performance records. |
| **`/classes`** | `name`, `section`, `classTeacher`, `subjects`, `schoolId` | School academic structure. |
| **`/homework`** | `classId`, `subject`, `title`, `description`, `attachmentUrl`, `dueDate`, `schoolId` | Daily assignments. |
| **`/notifications`** | `title`, `message`, `target` (Role/Class), `timestamp`, `schoolId` | FCM push notification logs. |

---

## 🤖 2. Node.js Backend (AlwaysData)
**URL:** `https://umarhayat.alwaysdata.net`  
**Host:** AlwaysData Node.js Environment  

### 📱 WhatsApp AI Bot
*   **Core Library:** `@whiskeysockets/baileys` (Multi-device WhatsApp gateway).
*   **AI Engine:** Google Gemini 1.5 Flash.
*   **OTP Integration:** Reuses the existing WhatsApp connection to send 6-digit OTPs to parents/teachers/students.
*   **Linking Process:** QR Code scanning via the School Panel links the physical mobile of the principal/school.

### 🛠️ Required API Endpoints for Mobile App
| Endpoint | Method | Description |
| :--- | :--- | :--- |
| `/api/auth/request-otp` | `POST` | Validates CNIC/Phone and triggers WhatsApp OTP. |
| `/api/auth/verify-otp` | `POST` | Verifies OTP and returns user session (Role, SchoolId). |
| `/api/attendance/rfid`| `POST` | Receives data from IoT RFID scanners (Existing). |
| `/api/message/send` | `POST` | Sends bulk or single WhatsApp messages (Existing). |

---

## 📁 3. Cloudinary Media Storage
**Cloud Name:** `dddqt9xkt`  
**Upload Preset:** `taleemidunya_unsigned`

*   **Usage:**
    *   **Student ID Photos:** Stored in `/students/id-cards`.
    *   **School Logos:** Used on dashboards and vouchers.
    *   **Study Material:** PDFs and assignments in `/teacher/material`.

---

## 🔗 4. Relationships & Data Flow
1.  **Student ↔ Parent:** Linked via `fatherCnic` and `whatsappPhone` in the `students` collection.
2.  **Parent ↔ Multiple Children:** Identified by matching `fatherCnic` or `phone` across multiple student records.
3.  **Teacher ↔ Class:** Linked via `classTeacher` in `classes` or `staffId` in `staff`.
4.  **Security Isolation:** Every Firestore query **MUST** include `.where('schoolId', '==', user.schoolId)`.

---

## 🛡️ 5. Security Concerns & Missing Assets
*   **Missing Asset:** `google-services.json` for the Android app (Need to copy from `G:/taleem dithub/google-services taleemidunya.parents.json` or similar).
*   **Auth Token:** The mobile app must use a secure token returned by the AlwaysData backend for subsequent Firestore access (via Custom Auth or security rules).
*   **CNIC Validation:** Must handle dashes (XXXXX-XXXXXXX-X) and plain numbers (XXXXXXXXXXXXX).
