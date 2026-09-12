package com.lodhidevelop.taleemiduniya_pro.presentation.admin

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.lodhidevelop.taleemiduniya_pro.core.local.SessionManager
import com.lodhidevelop.taleemiduniya_pro.data.model.FeeRecord
import com.lodhidevelop.taleemiduniya_pro.data.model.TeacherProfile
import com.lodhidevelop.taleemiduniya_pro.data.repository.AdminRepository
import com.lodhidevelop.taleemiduniya_pro.data.repository.SchoolStats
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.*
import kotlinx.coroutines.launch
import javax.inject.Inject

@HiltViewModel
class AdminDashboardViewModel @Inject constructor(
    private val repository: AdminRepository,
    val sessionManager: SessionManager
) : ViewModel() {

    private val _uiState = MutableStateFlow<AdminDashboardUiState>(AdminDashboardUiState.Loading)
    val uiState: StateFlow<AdminDashboardUiState> = _uiState.asStateFlow()

    private val _pendingVouchers = MutableStateFlow<List<FeeRecord>>(emptyList())
    val pendingVouchers: StateFlow<List<FeeRecord>> = _pendingVouchers.asStateFlow()

    private val _staffList = MutableStateFlow<List<TeacherProfile>>(emptyList())
    val staffList: StateFlow<List<TeacherProfile>> = _staffList.asStateFlow()

    init {
        loadSchoolData()
        loadPendingApprovals()
        loadStaffData()
    }

    fun loadSchoolData() {
        viewModelScope.launch {
            _uiState.value = AdminDashboardUiState.Loading
            val schoolId = sessionManager.schoolId.first() ?: ""
            
            repository.getSchoolStats(schoolId).onSuccess { stats ->
                _uiState.value = AdminDashboardUiState.Success(stats)
            }.onFailure {
                _uiState.value = AdminDashboardUiState.Error(it.message ?: "Failed to load admin stats")
            }
        }
    }

    fun loadPendingApprovals() {
        viewModelScope.launch {
            val schoolId = sessionManager.schoolId.first() ?: ""
            repository.getPendingVouchers(schoolId).onSuccess { list ->
                _pendingVouchers.value = list
            }
        }
    }

    fun loadStaffData() {
        viewModelScope.launch {
            val schoolId = sessionManager.schoolId.first() ?: ""
            repository.getStaffList(schoolId).onSuccess { list ->
                _staffList.value = list
            }
        }
    }

    suspend fun postNotice(title: String, desc: String): Result<Unit> {
        val schoolId = sessionManager.schoolId.first() ?: ""
        return repository.postAnnouncement(title, desc, schoolId)
    }

    fun approveFee(voucherId: String) {
        viewModelScope.launch {
            repository.approveVoucher(voucherId).onSuccess {
                loadPendingApprovals() // Refresh list
                loadSchoolData() // Refresh stats
            }
        }
    }
}

sealed class AdminDashboardUiState {
    object Loading : AdminDashboardUiState()
    data class Success(val stats: SchoolStats) : AdminDashboardUiState()
    data class Error(val message: String) : AdminDashboardUiState()
}
