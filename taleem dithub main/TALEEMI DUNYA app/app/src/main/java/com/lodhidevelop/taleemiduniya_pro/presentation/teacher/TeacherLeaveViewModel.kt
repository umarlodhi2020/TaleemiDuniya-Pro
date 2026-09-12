package com.lodhidevelop.taleemiduniya_pro.presentation.teacher

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.lodhidevelop.taleemiduniya_pro.data.model.LeaveRequest
import com.lodhidevelop.taleemiduniya_pro.data.repository.TeacherRepository
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import javax.inject.Inject

@HiltViewModel
class TeacherLeaveViewModel @Inject constructor(
    private val repository: TeacherRepository
) : ViewModel() {

    private val _uiState = MutableStateFlow<TeacherLeaveUiState>(TeacherLeaveUiState.Idle)
    val uiState: StateFlow<TeacherLeaveUiState> = _uiState.asStateFlow()

    fun submitLeave(
        staffId: String,
        staffName: String,
        schoolId: String,
        reason: String,
        startDate: String,
        endDate: String
    ) {
        viewModelScope.launch {
            _uiState.value = TeacherLeaveUiState.Loading
            
            val request = LeaveRequest(
                staffId = staffId,
                staffName = staffName,
                reason = reason,
                startDate = startDate,
                endDate = endDate,
                schoolId = schoolId,
                status = "Pending"
            )
            
            repository.submitLeaveRequest(request).onSuccess {
                _uiState.value = TeacherLeaveUiState.Success
            }.onFailure {
                _uiState.value = TeacherLeaveUiState.Error(it.message ?: "Failed to submit request")
            }
        }
    }

    fun resetState() {
        _uiState.value = TeacherLeaveUiState.Idle
    }
}

sealed class TeacherLeaveUiState {
    object Idle : TeacherLeaveUiState()
    object Loading : TeacherLeaveUiState()
    object Success : TeacherLeaveUiState()
    data class Error(val message: String) : TeacherLeaveUiState()
}
