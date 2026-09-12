package com.lodhidevelop.taleemiduniya_pro.presentation.teacher

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.lodhidevelop.taleemiduniya_pro.core.local.SessionManager
import com.lodhidevelop.taleemiduniya_pro.data.model.*
import com.lodhidevelop.taleemiduniya_pro.data.repository.TeacherRepository
import com.lodhidevelop.taleemiduniya_pro.data.repository.StudentRepository
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.*
import kotlinx.coroutines.*
import javax.inject.Inject
import kotlin.time.Duration.Companion.seconds

@HiltViewModel
class TeacherDashboardViewModel @Inject constructor(
    private val teacherRepository: TeacherRepository,
    private val studentRepository: StudentRepository,
    val sessionManager: SessionManager
) : ViewModel() {

    private val _uiState = MutableStateFlow<TeacherDashboardUiState>(TeacherDashboardUiState.Loading)
    val uiState: StateFlow<TeacherDashboardUiState> = _uiState.asStateFlow()

    init {
        loadTeacherData()
    }

    fun loadTeacherData() {
        viewModelScope.launch {
            try {
                _uiState.value = TeacherDashboardUiState.Loading
                
                // Get session data with safety timeout
                val userId = withTimeoutOrNull(5.seconds) { sessionManager.userId.first() } ?: ""
                val schoolId = withTimeoutOrNull(5.seconds) { sessionManager.schoolId.first() }?.trim() ?: ""
                
                if (userId.isEmpty()) {
                    _uiState.value = TeacherDashboardUiState.Error("Session expired. Please login again.")
                    return@launch
                }
                
                val teacherId = userId.removePrefix("staff_")
                android.util.Log.d("Dashboard", "Loading for Teacher: $teacherId, School: $schoolId")
                
                // Fetch profile
                val profileResult = teacherRepository.getTeacherProfile(teacherId, schoolId)
                
                profileResult.onSuccess { profile ->
                    android.util.Log.d("Dashboard", "Profile Loaded: ${profile.name}")
                    // Fetch dependent data in parallel using SupervisorJob to prevent one failure from cancelling others
                    try {
                        supervisorScope {
                            val classesResult = runCatching { teacherRepository.getAssignedClasses(schoolId, teacherId, profile.name) }
                            val classes = classesResult.getOrNull()?.getOrDefault(emptyList()) ?: emptyList()
                            
                            val announcementsDeferred = async { studentRepository.getAnnouncements(schoolId) }
                            val timetableDeferred = async { teacherRepository.getTeacherTimetable(teacherId, schoolId) }
                            val attendanceSummaryDeferred = async { teacherRepository.getTodayAttendanceSummary(schoolId, classes.map { it.name }) }
                            val attendanceTrendsDeferred = async { teacherRepository.getWeeklyAttendanceTrends(schoolId) }
                            
                            val announcements = runCatching { announcementsDeferred.await() }.getOrNull()?.getOrDefault(emptyList()) ?: emptyList()
                            val timetable = runCatching { timetableDeferred.await() }.getOrNull()?.getOrDefault(emptyList()) ?: emptyList()
                            val attendanceSummary = runCatching { attendanceSummaryDeferred.await() }.getOrNull()?.getOrNull()
                            val attendanceTrends = runCatching { attendanceTrendsDeferred.await() }.getOrNull()?.getOrDefault(emptyList()) ?: emptyList()

                            android.util.Log.d("Dashboard", "Data results - Classes: ${classes.size}, Announcements: ${announcements.size}")
                            
                            val errorMessage = if (classes.isEmpty() && profile.schoolId.isNotEmpty()) {
                                classesResult.getOrNull()?.exceptionOrNull()?.message ?: "No classes found for school. Check database schoolId."
                            } else null

                            _uiState.value = TeacherDashboardUiState.Success(
                                profile = profile,
                                assignedClasses = classes,
                                announcements = announcements,
                                timetable = timetable,
                                todayAttendance = attendanceSummary,
                                attendanceTrends = attendanceTrends,
                                debugMessage = errorMessage
                            )
                        }
                    } catch (e: Exception) {
                        android.util.Log.e("TeacherDashboard", "Error loading dependent data", e)
                        // Fallback to just profile if others fail
                        _uiState.value = TeacherDashboardUiState.Success(
                            profile = profile,
                            assignedClasses = emptyList(),
                            announcements = emptyList(),
                            timetable = emptyList()
                        )
                    }
                }.onFailure { error ->
                    android.util.Log.e("Dashboard", "Profile Load Failed", error)
                    _uiState.value = TeacherDashboardUiState.Error(error.message ?: "Failed to load teacher profile")
                }
            } catch (e: Exception) {
                android.util.Log.e("Dashboard", "Critical Error", e)
                _uiState.value = TeacherDashboardUiState.Error("Critical error: ${e.message}")
            }
        }
    }

    fun sendReportToPrincipal(
        reportType: String,
        subject: String,
        content: String,
        className: String,
        section: String,
        onResult: (Boolean, String?) -> Unit
    ) {
        viewModelScope.launch {
            val userId = sessionManager.userId.first() ?: ""
            val schoolId = sessionManager.schoolId.first() ?: ""
            val teacherId = userId.removePrefix("staff_")
            
            val successState = _uiState.value as? TeacherDashboardUiState.Success
            val teacherName = successState?.profile?.name ?: "Teacher"
            
            teacherRepository.sendReportToPrincipal(
                teacherId = teacherId,
                teacherName = teacherName,
                schoolId = schoolId,
                reportType = reportType,
                subject = subject,
                content = content,
                className = className,
                section = section
            ).onSuccess {
                onResult(true, null)
            }.onFailure {
                onResult(false, it.message ?: "Failed to send report")
            }
        }
    }
}

sealed class TeacherDashboardUiState {
    object Loading : TeacherDashboardUiState()
    data class Success(
        val profile: TeacherProfile,
        val assignedClasses: List<ClassInfo>,
        val announcements: List<Announcement>,
        val timetable: List<TimetableRecord>,
        val todayAttendance: Pair<Int, Int>? = null,
        val attendanceTrends: List<Pair<String, Float>> = emptyList(),
        val debugMessage: String? = null
    ) : TeacherDashboardUiState()
    data class Error(val message: String) : TeacherDashboardUiState()
}
