package com.lodhidevelop.taleemiduniya_pro.presentation.navigation

import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateListOf
import androidx.compose.runtime.remember
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.navigation3.runtime.NavEntry
import androidx.navigation3.ui.NavDisplay
import com.lodhidevelop.taleemiduniya_pro.presentation.auth.*
import com.lodhidevelop.taleemiduniya_pro.presentation.common.*
import com.lodhidevelop.taleemiduniya_pro.presentation.splash.SplashScreen
import com.lodhidevelop.taleemiduniya_pro.presentation.student.*
import com.lodhidevelop.taleemiduniya_pro.presentation.parent.*
import com.lodhidevelop.taleemiduniya_pro.presentation.teacher.*
import com.lodhidevelop.taleemiduniya_pro.presentation.admin.*
import kotlinx.serialization.Serializable

@Serializable
sealed interface NavRoute {
    @Serializable data object Splash : NavRoute
    @Serializable data object RoleSelection : NavRoute
    @Serializable data object Notifications : NavRoute
    @Serializable data class Login(val role: String) : NavRoute
    @Serializable data class Otp(val phone: String, val cnic: String, val email: String, val role: String) : NavRoute
    @Serializable data object StudentDashboard : NavRoute
    @Serializable data object ParentHome : NavRoute
    @Serializable data object TeacherHome : NavRoute
    
    // Parent Detail Routes
    @Serializable data object ParentAttendance : NavRoute
    @Serializable data object ParentFees : NavRoute
    @Serializable data object ParentHomework : NavRoute
    @Serializable data object ParentResults : NavRoute
    @Serializable data object ParentProfile : NavRoute
    @Serializable data object ParentTimetable : NavRoute
    @Serializable data object ParentLeave : NavRoute
    @Serializable data object ParentTeachers : NavRoute
    
    // Student Detail Routes
    @Serializable data object StudentAttendance : NavRoute
    @Serializable data object StudentFees : NavRoute
    @Serializable data object StudentHomework : NavRoute
    @Serializable data object StudentResults : NavRoute
    @Serializable data object StudentProfile : NavRoute
    
    // Teacher Routes
    @Serializable data class TeacherAttendance(val className: String, val section: String) : NavRoute
    @Serializable data class TeacherHomework(val className: String, val section: String) : NavRoute
    @Serializable data class TeacherResults(val className: String, val section: String) : NavRoute
    @Serializable data class TeacherHistory(val className: String, val section: String) : NavRoute
    @Serializable data object TeacherProfile : NavRoute
    @Serializable data object TeacherClasses : NavRoute
    @Serializable data object TeacherLeave : NavRoute
    @Serializable data object TeacherTimetable : NavRoute
    @Serializable data class TeacherStudents(val className: String, val section: String) : NavRoute
    @Serializable data object TeacherPrincipalReport : NavRoute
    
    // Admin Routes
    @Serializable data object AdminHome : NavRoute
    @Serializable data object AdminFeeApprovals : NavRoute
    @Serializable data object AdminStaffTracking : NavRoute
    @Serializable data object AdminPostAnnouncement : NavRoute
    @Serializable data class MediaPreview(val url: String, val title: String = "Preview") : NavRoute
}

@Composable
fun AppNavigation() {
    val backStack = remember { mutableStateListOf<NavRoute>(NavRoute.Splash) }
    val authViewModel: AuthViewModel = hiltViewModel()

    NavDisplay(
        backStack = backStack,
        onBack = { if (backStack.size > 1) backStack.removeAt(backStack.size - 1) },
        entryProvider = { key ->
            when (key) {
                is NavRoute.Splash -> NavEntry(key) {
                    SplashScreen(
                        viewModel = authViewModel,
                        onNavigate = { role ->
                            backStack.clear()
                            if (role == null) {
                                backStack.add(NavRoute.RoleSelection)
                            } else {
                                val nextRoute = when (role.lowercase()) {
                                    "parent" -> NavRoute.ParentHome
                                    "teacher" -> NavRoute.TeacherHome
                                    "student" -> NavRoute.StudentDashboard
                                    "school-admin", "super-admin" -> NavRoute.AdminHome
                                    else -> NavRoute.RoleSelection
                                }
                                backStack.add(nextRoute)
                            }
                        }
                    )
                }
                is NavRoute.RoleSelection -> NavEntry(key) {
                    RoleSelectionScreen(
                        onRoleSelected = { role ->
                            backStack.add(NavRoute.Login(role))
                        }
                    )
                }
                is NavRoute.Notifications -> NavEntry(key) {
                    NotificationScreen(onBack = { backStack.removeAt(backStack.size - 1) })
                }
                is NavRoute.Login -> NavEntry(key) {
                    LoginScreen(
                        viewModel = authViewModel,
                        role = key.role,
                        onOtpRequested = { phone, cnic, email ->
                            backStack.add(NavRoute.Otp(phone, cnic, email, key.role))
                        }
                    )
                }
                is NavRoute.Otp -> NavEntry(key) {
                    OtpScreen(
                        phone = key.phone,
                        cnic = key.cnic,
                        email = key.email,
                        role = key.role,
                        viewModel = authViewModel,
                        onAuthenticated = { role ->
                            val nextRoute = when (role.lowercase()) {
                                "parent" -> NavRoute.ParentHome
                                "teacher" -> NavRoute.TeacherHome
                                "student" -> NavRoute.StudentDashboard
                                "school-admin", "super-admin" -> NavRoute.AdminHome
                                else -> NavRoute.ParentHome
                            }
                            backStack.clear()
                            backStack.add(nextRoute)
                        }
                    )
                }
                is NavRoute.StudentDashboard -> NavEntry(key) {
                    StudentDashboardScreen(
                        onNavigateToNotifications = { backStack.add(NavRoute.Notifications) },
                        onNavigateToAttendance = { backStack.add(NavRoute.StudentAttendance) },
                        onNavigateToFees = { backStack.add(NavRoute.StudentFees) },
                        onNavigateToHomework = { backStack.add(NavRoute.StudentHomework) },
                        onNavigateToResults = { backStack.add(NavRoute.StudentResults) },
                        onNavigateToProfile = { backStack.add(NavRoute.StudentProfile) },
                        onNavigateToMedia = { url, title -> backStack.add(NavRoute.MediaPreview(url, title)) }
                    )
                }
                is NavRoute.StudentAttendance -> NavEntry(key) {
                    StudentAttendanceScreen(onBack = { backStack.removeAt(backStack.size - 1) })
                }
                is NavRoute.StudentFees -> NavEntry(key) {
                    StudentFeesScreen(onBack = { backStack.removeAt(backStack.size - 1) })
                }
                is NavRoute.StudentHomework -> NavEntry(key) {
                    StudentHomeworkScreen(onBack = { backStack.removeAt(backStack.size - 1) })
                }
                is NavRoute.StudentResults -> NavEntry(key) {
                    StudentResultsScreen(onBack = { backStack.removeAt(backStack.size - 1) })
                }
                is NavRoute.StudentProfile -> NavEntry(key) {
                    StudentProfileScreen(
                        onBack = { backStack.removeAt(backStack.size - 1) },
                        onLogout = {
                            authViewModel.logout()
                            backStack.clear()
                            backStack.add(NavRoute.RoleSelection)
                        }
                    )
                }
                
                is NavRoute.ParentHome -> NavEntry(key) {
                    ParentDashboardScreen(
                        onNavigateToNotifications = { backStack.add(NavRoute.Notifications) },
                        onNavigateToAttendance = { backStack.add(NavRoute.ParentAttendance) },
                        onNavigateToFees = { backStack.add(NavRoute.ParentFees) },
                        onNavigateToHomework = { backStack.add(NavRoute.ParentHomework) },
                        onNavigateToResults = { backStack.add(NavRoute.ParentResults) },
                        onNavigateToProfile = { backStack.add(NavRoute.ParentProfile) },
                        onNavigateToTimetable = { backStack.add(NavRoute.ParentTimetable) },
                        onNavigateToLeave = { backStack.add(NavRoute.ParentLeave) },
                        onNavigateToTeachers = { backStack.add(NavRoute.ParentTeachers) },
                        onNavigateToMedia = { url, title -> backStack.add(NavRoute.MediaPreview(url, title)) }
                    )
                }
                is NavRoute.ParentAttendance -> NavEntry(key) {
                    StudentAttendanceScreen(onBack = { backStack.removeAt(backStack.size - 1) })
                }
                is NavRoute.ParentFees -> NavEntry(key) {
                    StudentFeesScreen(onBack = { backStack.removeAt(backStack.size - 1) })
                }
                is NavRoute.ParentHomework -> NavEntry(key) {
                    StudentHomeworkScreen(onBack = { backStack.removeAt(backStack.size - 1) })
                }
                is NavRoute.ParentResults -> NavEntry(key) {
                    StudentResultsScreen(onBack = { backStack.removeAt(backStack.size - 1) })
                }
                is NavRoute.ParentTimetable -> NavEntry(key) {
                    StudentTimetableScreen(onBack = { backStack.removeAt(backStack.size - 1) })
                }
                is NavRoute.ParentLeave -> NavEntry(key) {
                    val viewModel: ParentDashboardViewModel = hiltViewModel()
                    val selectedChild by viewModel.selectedChild.collectAsState()
                    val schoolId by viewModel.sessionManager.schoolId.collectAsState(initial = "")

                    ParentLeaveScreen(
                        studentId = selectedChild?.id ?: "",
                        studentName = selectedChild?.name ?: "",
                        className = selectedChild?.className ?: "",
                        section = selectedChild?.section ?: "",
                        schoolId = schoolId ?: "",
                        onBack = { backStack.removeAt(backStack.size - 1) }
                    )
                }
                is NavRoute.ParentTeachers -> NavEntry(key) {
                    val viewModel: ParentDashboardViewModel = hiltViewModel()
                    val selectedChild by viewModel.selectedChild.collectAsState()

                    ParentTeachersScreen(
                        className = selectedChild?.className ?: "",
                        section = selectedChild?.section ?: "",
                        schoolId = selectedChild?.schoolId ?: "",
                        onBack = { backStack.removeAt(backStack.size - 1) }
                    )
                }
                is NavRoute.ParentProfile -> NavEntry(key) {
                    ParentProfileScreen(
                        onBack = { backStack.removeAt(backStack.size - 1) },
                        onLogout = {
                            authViewModel.logout()
                            backStack.clear()
                            backStack.add(NavRoute.RoleSelection)
                        }
                    )
                }
                
                is NavRoute.TeacherHome -> NavEntry(key) {
                    val viewModel: TeacherDashboardViewModel = hiltViewModel()
                    val uiState by viewModel.uiState.collectAsState()
                    val successState = uiState as? TeacherDashboardUiState.Success
                    val profile = successState?.profile
                    
                    TeacherDashboardScreen(
                        viewModel = viewModel,
                        onNavigateToNotifications = { backStack.add(NavRoute.Notifications) },
                        onNavigateToAttendance = {
                            if (profile != null && profile.className.isNotEmpty()) {
                                backStack.add(NavRoute.TeacherAttendance(profile.className, profile.section))
                            } else {
                                backStack.add(NavRoute.TeacherClasses)
                            }
                        },
                        onNavigateToHomework = {
                            if (profile != null && profile.className.isNotEmpty()) {
                                backStack.add(NavRoute.TeacherHomework(profile.className, profile.section))
                            } else {
                                backStack.add(NavRoute.TeacherClasses)
                            }
                        },
                        onNavigateToResults = {
                            if (profile != null && profile.className.isNotEmpty()) {
                                backStack.add(NavRoute.TeacherResults(profile.className, profile.section))
                            } else {
                                backStack.add(NavRoute.TeacherClasses)
                            }
                        },
                        onNavigateToProfile = { backStack.add(NavRoute.TeacherProfile) },
                        onNavigateToClasses = { backStack.add(NavRoute.TeacherClasses) },
                        onNavigateToLeave = { backStack.add(NavRoute.TeacherLeave) },
                        onNavigateToTimetable = { backStack.add(NavRoute.TeacherTimetable) },
                        onNavigateToHistory = {
                            profile?.let { backStack.add(NavRoute.TeacherHistory(it.className, it.section)) }
                        },
                        onNavigateToStudents = {
                            profile?.let { backStack.add(NavRoute.TeacherStudents(it.className, it.section)) }
                        },
                        onNavigateToReport = {
                            backStack.add(NavRoute.TeacherPrincipalReport)
                        }
                    )
                }
                is NavRoute.TeacherAttendance -> NavEntry(key) {
                    val viewModel: TeacherDashboardViewModel = hiltViewModel()
                    val sessionSchoolId by viewModel.sessionManager.schoolId.collectAsState(initial = "")

                    TeacherAttendanceScreen(
                        className = key.className,
                        section = key.section,
                        schoolId = sessionSchoolId ?: "",
                        onBack = { if (backStack.isNotEmpty()) backStack.removeAt(backStack.size - 1) }
                    )
                }
                is NavRoute.TeacherHomework -> NavEntry(key) {
                    val viewModel: TeacherDashboardViewModel = hiltViewModel()
                    val sessionSchoolId by viewModel.sessionManager.schoolId.collectAsState(initial = "")
                    val uiState by viewModel.uiState.collectAsState()
                    val teacherName = (uiState as? TeacherDashboardUiState.Success)?.profile?.name ?: "Teacher"

                    TeacherHomeworkScreen(
                        className = key.className,
                        section = key.section,
                        schoolId = sessionSchoolId ?: "",
                        teacherName = teacherName,
                        onBack = { if (backStack.isNotEmpty()) backStack.removeAt(backStack.size - 1) }
                    )
                }
                is NavRoute.TeacherResults -> NavEntry(key) {
                    TeacherResultsScreen(
                        className = key.className,
                        section = key.section,
                        onBack = { backStack.removeAt(backStack.size - 1) }
                    )
                }
                is NavRoute.TeacherProfile -> NavEntry(key) {
                    TeacherProfileScreen(
                        onBack = { backStack.removeAt(backStack.size - 1) },
                        onLogout = {
                            authViewModel.logout()
                            backStack.clear()
                            backStack.add(NavRoute.RoleSelection)
                        }
                    )
                }
                is NavRoute.TeacherClasses -> NavEntry(key) {
                    TeacherClassesScreen(
                        onClassClick = { classInfo ->
                            backStack.add(NavRoute.TeacherAttendance(classInfo.name, classInfo.section))
                        },
                        onBack = { backStack.removeAt(backStack.size - 1) }
                    )
                }
                is NavRoute.TeacherHistory -> NavEntry(key) {
                    val viewModel: TeacherDashboardViewModel = hiltViewModel()
                    val sessionSchoolId by viewModel.sessionManager.schoolId.collectAsState(initial = "")
                    
                    TeacherAttendanceHistoryScreen(
                        className = key.className,
                        section = key.section,
                        schoolId = sessionSchoolId ?: "",
                        onBack = { backStack.removeAt(backStack.size - 1) }
                    )
                }
                is NavRoute.TeacherTimetable -> NavEntry(key) {
                    TeacherTimetableScreen(
                        onBack = { backStack.removeAt(backStack.size - 1) }
                    )
                }
                is NavRoute.TeacherLeave -> NavEntry(key) {
                    val viewModel: TeacherDashboardViewModel = hiltViewModel()
                    val uiState by viewModel.uiState.collectAsState()
                    val profile = (uiState as? TeacherDashboardUiState.Success)?.profile
                    val schoolId by viewModel.sessionManager.schoolId.collectAsState(initial = "")

                    TeacherLeaveScreen(
                        teacherId = profile?.id ?: "",
                        teacherName = profile?.name ?: "",
                        schoolId = schoolId ?: "",
                        onBack = { backStack.removeAt(backStack.size - 1) }
                    )
                }
                is NavRoute.TeacherStudents -> NavEntry(key) {
                    TeacherStudentListScreen(
                        className = key.className,
                        section = key.section,
                        onBack = { backStack.removeAt(backStack.size - 1) }
                    )
                }
                is NavRoute.TeacherPrincipalReport -> NavEntry(key) {
                    val viewModel: TeacherDashboardViewModel = hiltViewModel()
                    val uiState by viewModel.uiState.collectAsState()
                    val profile = (uiState as? TeacherDashboardUiState.Success)?.profile
                    val schoolId by viewModel.sessionManager.schoolId.collectAsState(initial = "")

                    TeacherReportToPrincipalScreen(
                        teacherId = profile?.id ?: "",
                        teacherName = profile?.name ?: "",
                        schoolId = schoolId ?: "",
                        viewModel = viewModel,
                        onBack = { backStack.removeAt(backStack.size - 1) }
                    )
                }
                is NavRoute.AdminHome -> NavEntry(key) {
                    AdminDashboardScreen(
                        onNavigateToNotifications = { backStack.add(NavRoute.Notifications) },
                        onNavigateToFeeApprovals = { backStack.add(NavRoute.AdminFeeApprovals) },
                        onNavigateToStaffTracking = { backStack.add(NavRoute.AdminStaffTracking) },
                        onPostAnnouncementClick = { backStack.add(NavRoute.AdminPostAnnouncement) },
                        onLogout = {
                            authViewModel.logout()
                            backStack.clear()
                            backStack.add(NavRoute.RoleSelection)
                        }
                    )
                }
                is NavRoute.AdminFeeApprovals -> NavEntry(key) {
                    AdminFeeApprovalsScreen(onBack = { backStack.removeAt(backStack.size - 1) })
                }
                is NavRoute.AdminStaffTracking -> NavEntry(key) {
                    AdminStaffAttendanceScreen(onBack = { backStack.removeAt(backStack.size - 1) })
                }
                is NavRoute.AdminPostAnnouncement -> NavEntry(key) {
                    val viewModel: AdminDashboardViewModel = hiltViewModel()
                    val schoolId by viewModel.sessionManager.schoolId.collectAsState(initial = "")

                    AdminPostAnnouncementScreen(
                        schoolId = schoolId ?: "",
                        onBack = { backStack.removeAt(backStack.size - 1) }
                    )
                }
                is NavRoute.MediaPreview -> NavEntry(key) {
                    MediaPreviewScreen(
                        imageUrl = key.url,
                        title = key.title,
                        onBack = { backStack.removeAt(backStack.size - 1) }
                    )
                }
            }
        }
    )
}

@Composable
fun DummyScreen(title: String) {
    Surface(
        modifier = Modifier.fillMaxSize(),
        color = MaterialTheme.colorScheme.background
    ) {
        Box(
            contentAlignment = Alignment.Center
        ) {
            Text(
                text = title,
                style = MaterialTheme.typography.headlineMedium
            )
        }
    }
}
