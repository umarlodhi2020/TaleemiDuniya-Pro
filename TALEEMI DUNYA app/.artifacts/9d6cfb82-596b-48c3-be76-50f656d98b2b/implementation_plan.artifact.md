# Phase 5 Implementation Plan — Parent App & Family Tree

This plan outlines the implementation of the Phase 5 Parent Dashboard for the Taleemi Dunya app. It focuses on using real Firebase data, supporting multiple children per parent, and ensuring strict security isolation.

## User Review Required

> [!IMPORTANT]
> The implementation relies on the existing Firestore schema. The relationship between parent and children is based on `fatherCnic` or `phone` in the `students` collection as mapped in Phase 1.
>
> [!WARNING]
> Security rules will be updated in `PHASE_5_SECURITY_CHANGES.md`. Please review them carefully before deployment.

## Proposed Changes

### Data Layer

#### [NEW] [ParentRepository.kt](file:///G:/taleem%20dithub/TALEEMI%20DUNYA%20app/app/src/main/java/com/lodhidevelop/taleemiduniya_pro/data/repository/ParentRepository.kt)
- Implement `getChildren(parentId, schoolId)` to fetch students linked to the parent.
- Implement `getFamilyFeeSummary(childrenIds, schoolId)` if supported by the authoritative ledger.

#### [MODIFY] [SessionManager.kt](file:///G:/taleem%20dithub/TALEEMI%20DUNYA%20app/app/src/main/java/com/lodhidevelop/taleemiduniya_pro/core/local/SessionManager.kt)
- Add `selectedChildId` to DataStore for persistence across app restarts.
- Add `saveSelectedChildId(childId: String)` and `selectedChildId: Flow<String?>`.

---

### Presentation Layer

#### [NEW] [ParentDashboardViewModel.kt](file:///G:/taleem%20dithub/TALEEMI%20DUNYA%20app/app/src/main/java/com/lodhidevelop/taleemiduniya_pro/presentation/parent/ParentDashboardViewModel.kt)
- Fetch children list on initialization.
- Manage `selectedChildId` and refresh data when it changes.
- Reuse `StudentRepository` methods (Attendance, Fees, Homework, etc.) for the selected child.

#### [NEW] [ParentDashboardScreen.kt](file:///G:/taleem%20dithub/TALEEMI%20DUNYA%20app/app/src/main/java/com/lodhidevelop/taleemiduniya_pro/presentation/parent/ParentDashboardScreen.kt)
- Premium UI with "My Children" child cards.
- Child selection logic (dropdown or bottom sheet).
- Selected child statistics (Attendance, Fees, Homework).
- Quick actions for all child-related features.

#### [NEW] [ChildSelector.kt](file:///G:/taleem%20dithub/TALEEMI%20DUNYA%20app/app/src/main/java/com/lodhidevelop/taleemiduniya_pro/presentation/parent/components/ChildSelector.kt)
- Reusable component to switch between children.

#### [NEW] [ParentProfileScreen.kt](file:///G:/taleem%20dithub/TALEEMI%20DUNYA%20app/app/src/main/java/com/lodhidevelop/taleemiduniya_pro/presentation/parent/ParentProfileScreen.kt)
- Parent details (Name, Mobile, School, Children count).
- App settings (Notifications, Language, Logout).

#### [MODIFY] [Navigation.kt](file:///G:/taleem%20dithub/TALEEMI%20DUNYA%20app/app/src/main/java/com/lodhidevelop/taleemiduniya_pro/presentation/navigation/Navigation.kt)
- Wire up parent routes: `ParentHome`, `ParentChildren`, `ParentAcademics`, `ParentFees`, `ParentProfile`.

---

### Security & Infrastructure

#### [NEW] [PHASE_5_SECURITY_CHANGES.md](file:///G:/taleem%20dithub/TALEEMI%20DUNYA%20app/PHASE_5_SECURITY_CHANGES.md)
- Document exact Firestore rules for parent-child data isolation.

## Verification Plan

### Automated Tests
- Build and run the app to ensure no regressions.
- Verify `ParentRepository.getChildren` returns correct students for a test parent ID.

### Manual Verification
- Login as a parent with multiple children.
- Verify all children appear on the dashboard.
- Verify child switching updates all screens (Attendance, Fees, Homework, etc.).
- Verify Attendance list matches selected child's Firestore records.
- Verify Fee balance and history for each child.
- Security Test: Attempt to access another student's data (not linked to parent) and confirm it is blocked.
