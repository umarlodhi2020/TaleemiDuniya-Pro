# Project Plan

TALEEMIDUNYA School System mobile application. A production-ready Android School Management app for Parents, Teachers, and Students. It must integrate with an existing School Panel, Firebase Firestore, Cloudinary, and a Node.js backend on AlwaysData with a WhatsApp chatbot. Features include Attendance, Fees, Homework, Results, Timetable, Exams, and Notifications. Uses MVVM, Clean Architecture, Hilt, Jetpack Compose, and Material 3. Authentication via CNIC + Mobile Number + WhatsApp OTP.

## Project Brief

# Project Brief: TALEEMI DUNYA School System

This project brief outlines the Minimum Viable Product (MVP) for the **TALEEMI DUNYA** mobile application, a modern school management solution designed for parents, teachers, and students.

## Features
1.  **Secure Multi-Role Authentication**: A robust login system utilizing CNIC and mobile numbers, secured via WhatsApp OTP verification to ensure verified access for parents and staff.
2.  **Academic Dashboard**: Real-time visibility into student attendance, daily homework assignments, exam results, and digital timetables.
3.  **Fee & Notification Center**: Centralized hub for tracking fee payment status and receiving critical school-wide announcements or individual alerts.
4.  **Integrated Communication**: Seamless integration with a WhatsApp chatbot for automated notifications and easy access to school support.

## High-Level Technical Stack
*   **Language**: Kotlin
*   **UI Framework**: Jetpack Compose with Material 3
*   **Navigation**: **Jetpack Navigation 3** (State-driven)
*   **Adaptive Strategy**: **Compose Material Adaptive** library for optimized layouts across phones and tablets.
*   **Architecture**: Clean Architecture with MVVM (Model-View-ViewModel) pattern.
*   **Dependency Injection**: Hilt
*   **Concurrency**: Kotlin Coroutines & Flow
*   **Data & Backend**:
    *   **Firebase Firestore**: For real-time data synchronization.
    *   **Node.js**: Backend services hosted on AlwaysData.
    *   **Cloudinary**: For hosting and managing media assets (homework images, receipts).
    *   **WhatsApp Business API**: For OTP delivery and chatbot communication.

## Implementation Steps
**Total Duration:** 6m 4s

### Task_1_Inspection_Backend_Mapping: Analyze existing Firebase, AlwaysData, and Cloudinary backend structures. Create a comprehensive BACKEND_MAPPING.md file documenting API endpoints, Firestore schemas, and WhatsApp OTP integration flow.
- **Status:** COMPLETED
- **Updates:** Phase 1 completed. BACKEND_MAPPING.md created and approved by user. Identified Firestore collections, AlwaysData backend endpoints, and WhatsApp bot integration.
- **Acceptance Criteria:**
  - BACKEND_MAPPING.md is created and populated
  - Existing data structures are identified without modifications
- **Duration:** 6m 4s

### Task_2_Infrastructure_and_Auth: Set up project infrastructure including Hilt, Retrofit, DataStore, and Firebase. Implement the multi-step Authentication flow (CNIC + Mobile Number + WhatsApp OTP) using the AlwaysData node.js backend.
- **Status:** IN_PROGRESS
- **Acceptance Criteria:**
  - Hilt dependency injection is configured
  - Firebase and AlwaysData integrations are initialized
  - Auth flow successfully authenticates and manages user sessions
- **StartTime:** 2026-08-12 02:21:37 PKT

### Task_3_UI_and_Features: Develop role-based dashboards for Parents, Teachers, and Students. Implement core features including Attendance, Fees, Homework, and Results using Jetpack Compose and MVVM architecture.
- **Status:** PENDING
- **Acceptance Criteria:**
  - Role-based navigation is functional
  - Attendance, Fees, and Results screens are populated with backend data
  - Cloudinary integration for document handling is active

### Task_4_Run_and_Verify: Perform final integration, stability checks, and verification of the TALEEMIDUNYA application against requirements.
- **Status:** PENDING
- **Acceptance Criteria:**
  - Project builds successfully
  - App does not crash
  - All existing tests pass
  - Critic_agent verifies application stability and UI alignment

