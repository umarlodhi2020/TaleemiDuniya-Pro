package com.lodhidevelop.taleemiduniya_pro.presentation.teacher

import android.net.Uri
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.lodhidevelop.taleemiduniya_pro.data.model.HomeworkRecord
import com.lodhidevelop.taleemiduniya_pro.data.repository.TeacherRepository
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import java.text.SimpleDateFormat
import java.util.*
import javax.inject.Inject

@HiltViewModel
class TeacherHomeworkViewModel @Inject constructor(
    private val repository: TeacherRepository
) : ViewModel() {

    private val _uiState = MutableStateFlow<TeacherHomeworkUiState>(TeacherHomeworkUiState.Idle)
    val uiState: StateFlow<TeacherHomeworkUiState> = _uiState.asStateFlow()

    fun publishHomework(
        subject: String,
        title: String,
        description: String,
        dueDate: String,
        imageUri: Uri?,
        className: String,
        section: String,
        schoolId: String,
        teacherName: String
    ) {
        viewModelScope.launch {
            _uiState.value = TeacherHomeworkUiState.Loading
            
            try {
                var imageUrl: String? = null
                
                // 1. Upload image if exists
                if (imageUri != null) {
                    val path = "homework/${schoolId}/${className}_${System.currentTimeMillis()}.jpg"
                    repository.uploadImage(imageUri, path).onSuccess {
                        imageUrl = it
                    }.onFailure {
                        _uiState.value = TeacherHomeworkUiState.Error("Image upload failed: ${it.message}")
                        return@launch
                    }
                }
                
                // 2. Create Homework Record
                val sdf = SimpleDateFormat("yyyy-MM-dd", Locale.getDefault())
                val assignedDate = sdf.format(Date())
                
                val homework = HomeworkRecord(
                    subject = subject,
                    title = title,
                    description = description,
                    className = className,
                    section = section,
                    attachmentUrl = imageUrl,
                    dueDate = dueDate,
                    assignedDate = assignedDate,
                    teacherName = teacherName,
                    schoolId = schoolId,
                    status = "Pending"
                )
                
                // 3. Save to Firestore
                repository.postHomework(homework).onSuccess {
                    _uiState.value = TeacherHomeworkUiState.Success
                }.onFailure {
                    _uiState.value = TeacherHomeworkUiState.Error(it.message ?: "Failed to post homework")
                }
                
            } catch (e: Exception) {
                _uiState.value = TeacherHomeworkUiState.Error(e.message ?: "Unexpected error")
            }
        }
    }

    fun resetState() {
        _uiState.value = TeacherHomeworkUiState.Idle
    }
}

sealed class TeacherHomeworkUiState {
    object Idle : TeacherHomeworkUiState()
    object Loading : TeacherHomeworkUiState()
    object Success : TeacherHomeworkUiState()
    data class Error(val message: String) : TeacherHomeworkUiState()
}
