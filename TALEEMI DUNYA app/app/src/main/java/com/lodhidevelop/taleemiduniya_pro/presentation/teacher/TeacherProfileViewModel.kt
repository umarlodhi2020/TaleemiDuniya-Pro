package com.lodhidevelop.taleemiduniya_pro.presentation.teacher

import android.net.Uri
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.lodhidevelop.taleemiduniya_pro.core.local.SessionManager
import com.lodhidevelop.taleemiduniya_pro.data.model.TeacherProfile
import com.lodhidevelop.taleemiduniya_pro.data.repository.TeacherRepository
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.launch
import javax.inject.Inject

@HiltViewModel
class TeacherProfileViewModel @Inject constructor(
    private val repository: TeacherRepository,
    private val sessionManager: SessionManager
) : ViewModel() {

    private val _uiState = MutableStateFlow<TeacherProfileUiState>(TeacherProfileUiState.Idle)
    val uiState: StateFlow<TeacherProfileUiState> = _uiState.asStateFlow()

    fun updateProfile(
        name: String,
        email: String,
        phone: String,
        imageUri: Uri?
    ) {
        viewModelScope.launch {
            _uiState.value = TeacherProfileUiState.Loading
            try {
                val userId = sessionManager.userId.first() ?: ""
                val teacherId = userId.removePrefix("staff_")
                val schoolId = sessionManager.schoolId.first() ?: ""

                val updates = mutableMapOf<String, Any>(
                    "name" to name,
                    "email" to email,
                    "phone" to phone
                )

                // 1. Handle Image Upload if selected
                if (imageUri != null) {
                    val path = "staff/${schoolId}/${teacherId}_profile.jpg"
                    repository.uploadImage(imageUri, path).onSuccess { url ->
                        updates["photoUrl"] = url
                    }.onFailure {
                        _uiState.value = TeacherProfileUiState.Error("Image upload failed: ${it.message}")
                        return@launch
                    }
                }

                // 2. Update Firestore
                repository.updateTeacherProfile(teacherId, updates).onSuccess {
                    _uiState.value = TeacherProfileUiState.Success
                }.onFailure {
                    _uiState.value = TeacherProfileUiState.Error(it.message ?: "Update failed")
                }

            } catch (e: Exception) {
                _uiState.value = TeacherProfileUiState.Error(e.message ?: "Unexpected error")
            }
        }
    }

    fun resetState() {
        _uiState.value = TeacherProfileUiState.Idle
    }
}

sealed class TeacherProfileUiState {
    object Idle : TeacherProfileUiState()
    object Loading : TeacherProfileUiState()
    object Success : TeacherProfileUiState()
    data class Error(val message: String) : TeacherProfileUiState()
}
