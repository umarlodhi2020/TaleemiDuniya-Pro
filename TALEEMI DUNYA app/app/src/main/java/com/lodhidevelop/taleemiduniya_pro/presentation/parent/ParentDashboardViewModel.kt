package com.lodhidevelop.taleemiduniya_pro.presentation.parent

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.lodhidevelop.taleemiduniya_pro.core.local.SessionManager
import com.lodhidevelop.taleemiduniya_pro.core.notifications.NotificationHelper
import com.lodhidevelop.taleemiduniya_pro.data.model.*
import com.lodhidevelop.taleemiduniya_pro.data.repository.ParentRepository
import com.lodhidevelop.taleemiduniya_pro.data.repository.StudentRepository
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.*
import kotlinx.coroutines.*
import javax.inject.Inject

@HiltViewModel
class ParentDashboardViewModel @Inject constructor(
    private val parentRepository: ParentRepository,
    private val studentRepository: StudentRepository,
    val sessionManager: SessionManager,
    private val notificationHelper: NotificationHelper
) : ViewModel() {

    private val _uiState = MutableStateFlow<ParentDashboardUiState>(ParentDashboardUiState.Loading)
    val uiState: StateFlow<ParentDashboardUiState> = _uiState.asStateFlow()

    private val _children = MutableStateFlow<List<StudentProfile>>(emptyList())
    val children: StateFlow<List<StudentProfile>> = _children.asStateFlow()

    private val _selectedChild = MutableStateFlow<StudentProfile?>(null)
    val selectedChild: StateFlow<StudentProfile?> = _selectedChild.asStateFlow()

    init {
        loadFamilyData()
    }

    fun loadFamilyData() {
        viewModelScope.launch {
            _uiState.value = ParentDashboardUiState.Loading
            val rawUserId = sessionManager.userId.first() ?: ""
            val schoolId = sessionManager.schoolId.first() ?: ""

            if (rawUserId.isEmpty()) {
                _uiState.value = ParentDashboardUiState.Error("Session expired")
                return@launch
            }

            // Strip "parent_" prefix to get the actual CNIC for the query
            val parentCnic = rawUserId.removePrefix("parent_")

            parentRepository.getChildren(parentCnic, schoolId).onSuccess { childrenList ->
                _children.value = childrenList
                if (childrenList.isNotEmpty()) {
                    val savedChildId = sessionManager.selectedChildId.first()
                    val initialChild = childrenList.find { it.id == savedChildId } ?: childrenList.first()
                    selectChild(initialChild)
                } else {
                    _uiState.value = ParentDashboardUiState.Error("No children found linked to this account")
                }
            }.onFailure {
                _uiState.value = ParentDashboardUiState.Error(it.message ?: "Failed to load children")
            }
        }
    }

    fun selectChild(child: StudentProfile) {
        viewModelScope.launch {
            // Unsubscribe from previous if any (simplified)
            _selectedChild.value?.let { prev -> 
                notificationHelper.unsubscribeFromTopic("parent_${prev.id}")
            }
            
            _selectedChild.value = child
            sessionManager.saveSelectedChildId(child.id)
            
            // Subscribe to new child alerts
            notificationHelper.subscribeToTopic("parent_${child.id}")
            
            fetchChildData(child)
        }
    }

    private suspend fun fetchChildData(child: StudentProfile) {
        val schoolId = (sessionManager.schoolId.first() ?: "").trim()
        
        // Show basic profile data immediately
        _uiState.value = ParentDashboardUiState.Success(
            selectedChild = child,
            attendance = emptyList(),
            fees = emptyList(),
            homework = emptyList(),
            results = emptyList(),
            announcements = emptyList(),
            timetable = emptyList()
        )

        // Load details in background
        val attendance = studentRepository.getAttendance(child.id, schoolId).getOrDefault(emptyList())
        val fees = studentRepository.getFees(child.id, child.rollNumber, schoolId).getOrDefault(emptyList())
        val homework = studentRepository.getHomework(child.className, child.section, schoolId).getOrDefault(emptyList())
        val results = studentRepository.getResults(child.id, schoolId).getOrDefault(emptyList())
        val announcements = studentRepository.getAnnouncements(schoolId).getOrDefault(emptyList())
        val timetable = studentRepository.getTimetable(child.className, child.section, schoolId).getOrDefault(emptyList())

        _uiState.value = ParentDashboardUiState.Success(
            selectedChild = child,
            attendance = attendance,
            fees = fees,
            homework = homework,
            results = results,
            announcements = announcements,
            timetable = timetable
        )
    }
}

sealed class ParentDashboardUiState {
    object Loading : ParentDashboardUiState()
    data class Success(
        val selectedChild: StudentProfile,
        val attendance: List<AttendanceRecord>,
        val fees: List<FeeRecord>,
        val homework: List<HomeworkRecord>,
        val results: List<ResultRecord>,
        val announcements: List<Announcement>,
        val timetable: List<TimetableRecord>
    ) : ParentDashboardUiState()
    data class Error(val message: String) : ParentDashboardUiState()
}
