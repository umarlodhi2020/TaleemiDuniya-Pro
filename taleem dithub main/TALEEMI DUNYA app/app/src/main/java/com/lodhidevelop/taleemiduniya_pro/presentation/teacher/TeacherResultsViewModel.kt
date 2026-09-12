package com.lodhidevelop.taleemiduniya_pro.presentation.teacher

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.lodhidevelop.taleemiduniya_pro.core.local.SessionManager
import com.lodhidevelop.taleemiduniya_pro.data.model.*
import com.lodhidevelop.taleemiduniya_pro.data.repository.TeacherRepository
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.*
import kotlinx.coroutines.launch
import javax.inject.Inject

@HiltViewModel
class TeacherResultsViewModel @Inject constructor(
    private val repository: TeacherRepository,
    private val sessionManager: SessionManager
) : ViewModel() {

    private val _uiState = MutableStateFlow<TeacherResultsUiState>(TeacherResultsUiState.Idle)
    val uiState: StateFlow<TeacherResultsUiState> = _uiState.asStateFlow()

    private val _students = MutableStateFlow<List<StudentResultState>>(emptyList())
    val students: StateFlow<List<StudentResultState>> = _students.asStateFlow()

    fun loadStudents(className: String, section: String) {
        viewModelScope.launch {
            _uiState.value = TeacherResultsUiState.Loading
            val schoolId = sessionManager.schoolId.first() ?: ""
            
            repository.getStudentsInClass(className, section, schoolId).onSuccess { list ->
                _students.value = list.map { StudentResultState(it, 0, 100) }
                _uiState.value = TeacherResultsUiState.Success
            }.onFailure {
                _uiState.value = TeacherResultsUiState.Error(it.message ?: "Failed to load students")
            }
        }
    }

    fun updateMarks(studentId: String, marks: Int, totalMarks: Int = 100) {
        _students.value = _students.value.map {
            if (it.student.id == studentId) it.copy(obtainedMarks = marks, totalMarks = totalMarks) else it
        }
    }

    fun submitResults(examName: String, subject: String) {
        viewModelScope.launch {
            _uiState.value = TeacherResultsUiState.Submitting
            val userId = sessionManager.userId.first() ?: ""
            val schoolId = sessionManager.schoolId.first() ?: ""
            val teacherId = userId.removePrefix("staff_")

            val profileResult = repository.getTeacherProfile(teacherId, schoolId)
            val teacherName = profileResult.getOrNull()?.name ?: "Teacher"

            val results = _students.value.map {
                ResultRecord(
                    examName = examName,
                    subject = subject,
                    obtainedMarks = it.obtainedMarks,
                    totalMarks = it.totalMarks,
                    studentId = it.student.id,
                    schoolId = schoolId,
                    grade = calculateGrade(it.obtainedMarks, it.totalMarks)
                )
            }

            repository.submitResults(
                results = results, 
                schoolId = schoolId,
                teacherId = teacherId,
                teacherName = teacherName,
                examName = examName,
                subject = subject
            ).onSuccess {
                _uiState.value = TeacherResultsUiState.Submitted
            }.onFailure {
                _uiState.value = TeacherResultsUiState.Error(it.message ?: "Failed to submit results")
            }
        }
    }

    private fun calculateGrade(obtained: Int, total: Int): String {
        val percentage = (obtained * 100) / total
        return when {
            percentage >= 80 -> "A+"
            percentage >= 70 -> "A"
            percentage >= 60 -> "B"
            percentage >= 50 -> "C"
            percentage >= 40 -> "D"
            else -> "F"
        }
    }
}

data class StudentResultState(
    val student: StudentProfile,
    val obtainedMarks: Int,
    val totalMarks: Int
)

sealed class TeacherResultsUiState {
    object Idle : TeacherResultsUiState()
    object Loading : TeacherResultsUiState()
    object Success : TeacherResultsUiState()
    object Submitting : TeacherResultsUiState()
    object Submitted : TeacherResultsUiState()
    data class Error(val message: String) : TeacherResultsUiState()
}
