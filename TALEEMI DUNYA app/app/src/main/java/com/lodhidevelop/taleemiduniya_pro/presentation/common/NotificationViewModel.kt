package com.lodhidevelop.taleemiduniya_pro.presentation.common

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.lodhidevelop.taleemiduniya_pro.core.local.SessionManager
import com.lodhidevelop.taleemiduniya_pro.data.model.NotificationRecord
import com.lodhidevelop.taleemiduniya_pro.data.repository.StudentRepository
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.*
import kotlinx.coroutines.launch
import javax.inject.Inject

@HiltViewModel
class NotificationViewModel @Inject constructor(
    private val repository: StudentRepository,
    private val sessionManager: SessionManager
) : ViewModel() {

    private val _notifications = MutableStateFlow<List<NotificationRecord>>(emptyList())
    val notifications: StateFlow<List<NotificationRecord>> = _notifications.asStateFlow()

    private val _isLoading = MutableStateFlow(false)
    val isLoading: StateFlow<Boolean> = _isLoading.asStateFlow()

    init {
        loadNotifications()
    }

    fun loadNotifications() {
        viewModelScope.launch {
            _isLoading.value = true
            val userId = sessionManager.userId.first() ?: ""
            val schoolId = sessionManager.schoolId.first() ?: ""
            
            repository.getNotifications(userId, schoolId).onSuccess { list ->
                _notifications.value = list
            }
            _isLoading.value = false
        }
    }
}
