package com.lodhidevelop.taleemiduniya_pro.presentation.student

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.lodhidevelop.taleemiduniya_pro.core.local.SessionManager
import com.lodhidevelop.taleemiduniya_pro.core.notifications.NotificationHelper
import com.lodhidevelop.taleemiduniya_pro.data.model.*
import com.lodhidevelop.taleemiduniya_pro.data.repository.StudentRepository
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.*
import kotlinx.coroutines.*
import javax.inject.Inject

@HiltViewModel
class StudentDashboardViewModel @Inject constructor(
    private val repository: StudentRepository,
    private val sessionManager: SessionManager,
    private val notificationHelper: NotificationHelper
) : ViewModel() {

    private val _uiState = MutableStateFlow<StudentDashboardUiState>(StudentDashboardUiState.Loading)
    val uiState: StateFlow<StudentDashboardUiState> = _uiState.asStateFlow()

    init {
        loadDashboardData()
    }

    fun loadDashboardData() {
        viewModelScope.launch {
            _uiState.value = StudentDashboardUiState.Loading
            
            val role = sessionManager.role.first() ?: ""
            val userId = sessionManager.userId.first() ?: ""
            val schoolId = (sessionManager.schoolId.first() ?: "").trim()
            
            val studentId = if (role.lowercase() == "parent") {
                sessionManager.selectedChildId.first() ?: ""
            } else if (userId.startsWith("student_")) {
                userId.removePrefix("student_")
            } else {
                userId
            }
            
            if (studentId.isEmpty()) {
                _uiState.value = StudentDashboardUiState.Error("Session error. Please login again.")
                return@launch
            }

            // Step 1: Always load profile first
            val profileResult = repository.getStudentProfile(studentId)
            
            profileResult.onSuccess { profile ->
                // Subscribe to class topic for homework alerts
                val topic = "class_${profile.className}_${profile.section}_${schoolId}"
                notificationHelper.subscribeToTopic(topic)
                
                // Step 2: Set basic success state with profile immediately so UI shows name
                _uiState.value = StudentDashboardUiState.Success(
                    profile = profile,
                    attendance = emptyList(),
                    homework = emptyList(),
                    fees = emptyList(),
                    timetable = emptyList(),
                    announcements = emptyList(),
                    results = emptyList()
                )

                // Step 3: Load other details in background without strict timeout
                val attendance = repository.getAttendance(studentId, schoolId).getOrDefault(emptyList())
                val homework = repository.getHomework(profile.className, profile.section, schoolId).getOrDefault(emptyList())
                val fees = repository.getFees(studentId, profile.rollNumber, schoolId).getOrDefault(emptyList())
                val timetable = repository.getTimetable(profile.className, profile.section, schoolId).getOrDefault(emptyList())
                val announcements = repository.getAnnouncements(schoolId).getOrDefault(emptyList())
                val results = repository.getResults(studentId, schoolId).getOrDefault(emptyList())

                // Update UI with full data
                _uiState.value = StudentDashboardUiState.Success(
                    profile = profile,
                    attendance = attendance,
                    homework = homework,
                    fees = fees,
                    timetable = timetable,
                    announcements = announcements,
                    results = results
                )
            }.onFailure {
                _uiState.value = StudentDashboardUiState.Error("Profile not found: ${it.message}")
            }
        }
    }
}

sealed class StudentDashboardUiState {
    object Loading : StudentDashboardUiState()
    data class Success(
        val profile: StudentProfile,
        val attendance: List<AttendanceRecord>,
        val homework: List<HomeworkRecord>,
        val fees: List<FeeRecord>,
        val timetable: List<TimetableRecord>,
        val announcements: List<Announcement>,
        val results: List<ResultRecord>
    ) : StudentDashboardUiState()
    data class Error(val message: String) : StudentDashboardUiState()
}
