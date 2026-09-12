package com.lodhidevelop.taleemiduniya_pro.presentation.teacher

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.lodhidevelop.taleemiduniya_pro.core.local.SessionManager
import com.lodhidevelop.taleemiduniya_pro.data.model.*
import com.lodhidevelop.taleemiduniya_pro.data.repository.TeacherRepository
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.*
import kotlinx.coroutines.launch
import java.text.SimpleDateFormat
import java.util.*
import javax.inject.Inject

@HiltViewModel
class TeacherAttendanceViewModel @Inject constructor(
    private val repository: TeacherRepository,
    private val sessionManager: SessionManager
) : ViewModel() {

    private val _uiState = MutableStateFlow<TeacherAttendanceUiState>(TeacherAttendanceUiState.Idle)
    val uiState: StateFlow<TeacherAttendanceUiState> = _uiState.asStateFlow()

    private val _students = MutableStateFlow<List<StudentAttendanceState>>(emptyList())
    val students: StateFlow<List<StudentAttendanceState>> = _students.asStateFlow()

    private val _history = MutableStateFlow<List<AttendanceRecord>>(emptyList())
    val history: StateFlow<List<AttendanceRecord>> = _history.asStateFlow()

    fun loadStudents(className: String, section: String) {
        if (className.isEmpty() || className == "-") {
            _uiState.value = TeacherAttendanceUiState.Error("No class selected. Please go back and select a class.")
            return
        }
        
        viewModelScope.launch {
            _uiState.value = TeacherAttendanceUiState.Loading
            val schoolId = sessionManager.schoolId.first() ?: ""
            
            repository.getStudentsInClass(className, section, schoolId).onSuccess { list ->
                if (list.isEmpty()) {
                    _uiState.value = TeacherAttendanceUiState.Error("No students found in Class $className-$section")
                } else {
                    _students.value = list.map { StudentAttendanceState(it, "Present") }
                    _uiState.value = TeacherAttendanceUiState.Success
                }
            }.onFailure {
                _uiState.value = TeacherAttendanceUiState.Error(it.message ?: "Failed to load students")
            }
        }
    }

    fun loadHistory(className: String, section: String) {
        viewModelScope.launch {
            _uiState.value = TeacherAttendanceUiState.Loading
            val schoolId = sessionManager.schoolId.first() ?: ""
            
            val result = repository.getClassAttendanceHistory(className, section, schoolId)
            result.onSuccess { list: List<AttendanceRecord> ->
                _history.value = list
                _uiState.value = TeacherAttendanceUiState.Success
            }.onFailure {
                _uiState.value = TeacherAttendanceUiState.Error(it.message ?: "Failed to load history")
            }
        }
    }

    fun updateAttendance(studentId: String, status: String) {
        _students.value = _students.value.map {
            if (it.student.id == studentId) it.copy(status = status) else it
        }
    }

    fun submitAttendance(schoolId: String, className: String = "", section: String = "") {
        viewModelScope.launch {
            _uiState.value = TeacherAttendanceUiState.Submitting
            
            val userId = sessionManager.userId.first() ?: ""
            val teacherId = userId.removePrefix("staff_")
            val profileResult = repository.getTeacherProfile(teacherId, schoolId)
            val teacherName = profileResult.getOrNull()?.name ?: "Teacher"

            val sdf = SimpleDateFormat("yyyy-MM-dd", Locale.getDefault())
            val date = sdf.format(Date())
            
            val records = _students.value.map {
                AttendanceRecord(
                    date = date,
                    status = it.status,
                    studentId = it.student.id,
                    schoolId = schoolId
                )
            }
            
            repository.markAttendance(
                records = records, 
                schoolId = schoolId,
                teacherId = teacherId,
                teacherName = teacherName,
                className = className,
                section = section
            ).onSuccess {
                _uiState.value = TeacherAttendanceUiState.Submitted
            }.onFailure {
                _uiState.value = TeacherAttendanceUiState.Error(it.message ?: "Failed to submit attendance")
            }
        }
    }
}

data class StudentAttendanceState(
    val student: StudentProfile,
    val status: String
)

sealed class TeacherAttendanceUiState {
    object Idle : TeacherAttendanceUiState()
    object Loading : TeacherAttendanceUiState()
    object Success : TeacherAttendanceUiState()
    object Submitting : TeacherAttendanceUiState()
    object Submitted : TeacherAttendanceUiState()
    data class Error(val message: String) : TeacherAttendanceUiState()
}
