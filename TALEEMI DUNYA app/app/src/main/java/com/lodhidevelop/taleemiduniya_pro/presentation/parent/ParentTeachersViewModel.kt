package com.lodhidevelop.taleemiduniya_pro.presentation.parent

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.lodhidevelop.taleemiduniya_pro.data.model.TeacherProfile
import com.lodhidevelop.taleemiduniya_pro.data.repository.ParentRepository
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import javax.inject.Inject

@HiltViewModel
class ParentTeachersViewModel @Inject constructor(
    private val repository: ParentRepository
) : ViewModel() {

    private val _uiState = MutableStateFlow<ParentTeachersUiState>(ParentTeachersUiState.Loading)
    val uiState: StateFlow<ParentTeachersUiState> = _uiState.asStateFlow()

    fun loadTeachers(className: String, section: String, schoolId: String) {
        viewModelScope.launch {
            _uiState.value = ParentTeachersUiState.Loading
            repository.getTeachers(className, section, schoolId).onSuccess { teachers ->
                _uiState.value = ParentTeachersUiState.Success(teachers)
            }.onFailure {
                _uiState.value = ParentTeachersUiState.Error(it.message ?: "Failed to load teachers")
            }
        }
    }
}

sealed class ParentTeachersUiState {
    object Loading : ParentTeachersUiState()
    data class Success(val teachers: List<TeacherProfile>) : ParentTeachersUiState()
    data class Error(val message: String) : ParentTeachersUiState()
}
