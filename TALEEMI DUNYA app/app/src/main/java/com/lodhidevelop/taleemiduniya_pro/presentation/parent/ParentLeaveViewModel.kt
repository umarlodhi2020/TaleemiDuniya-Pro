package com.lodhidevelop.taleemiduniya_pro.presentation.parent

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.lodhidevelop.taleemiduniya_pro.data.model.StudentLeaveRequest
import com.lodhidevelop.taleemiduniya_pro.data.repository.ParentRepository
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import javax.inject.Inject

@HiltViewModel
class ParentLeaveViewModel @Inject constructor(
    private val repository: ParentRepository
) : ViewModel() {

    private val _uiState = MutableStateFlow<ParentLeaveUiState>(ParentLeaveUiState.Idle)
    val uiState: StateFlow<ParentLeaveUiState> = _uiState.asStateFlow()

    fun submitLeave(
        studentId: String,
        studentName: String,
        className: String,
        section: String,
        schoolId: String,
        reason: String,
        startDate: String,
        endDate: String
    ) {
        viewModelScope.launch {
            _uiState.value = ParentLeaveUiState.Loading
            
            val request = StudentLeaveRequest(
                studentId = studentId,
                studentName = studentName,
                className = className,
                section = section,
                reason = reason,
                startDate = startDate,
                endDate = endDate,
                schoolId = schoolId,
                status = "Pending"
            )
            
            repository.submitStudentLeaveRequest(request).onSuccess {
                _uiState.value = ParentLeaveUiState.Success
            }.onFailure {
                _uiState.value = ParentLeaveUiState.Error(it.message ?: "Failed to submit request")
            }
        }
    }

    fun resetState() {
        _uiState.value = ParentLeaveUiState.Idle
    }
}

sealed class ParentLeaveUiState {
    object Idle : ParentLeaveUiState()
    object Loading : ParentLeaveUiState()
    object Success : ParentLeaveUiState()
    data class Error(val message: String) : ParentLeaveUiState()
}
