package com.lodhidevelop.taleemiduniya_pro.presentation.auth

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.lodhidevelop.taleemiduniya_pro.core.local.SessionManager
import com.lodhidevelop.taleemiduniya_pro.data.repository.AuthRepository
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.launch
import kotlinx.coroutines.withTimeout
import javax.inject.Inject

@HiltViewModel
class AuthViewModel @Inject constructor(
    private val repository: AuthRepository,
    private val sessionManager: SessionManager
) : ViewModel() {

    private val _authState = MutableStateFlow<AuthState>(AuthState.Idle)
    val authState: StateFlow<AuthState> = _authState.asStateFlow()

    fun requestOtp(cnic: String, phone: String, email: String, role: String) {
        viewModelScope.launch {
            _authState.value = AuthState.Loading
            try {
                // Local timeout of 30 seconds as a safety net
                val result = withTimeout(30000) {
                    repository.requestOtp(cnic, phone, email, role)
                }
                result.onSuccess { response ->
                    if (response.success) {
                        _authState.value = AuthState.OtpRequested(phone, cnic, email)
                    } else {
                        _authState.value = AuthState.Error(response.message ?: "Failed to request OTP")
                    }
                }.onFailure {
                    _authState.value = AuthState.Error(it.message ?: "Server error. Please try again.")
                }
            } catch (e: Exception) {
                _authState.value = AuthState.Error("Request timed out. Please check your internet.")
            }
        }
    }

    fun verifyOtp(phone: String, otp: String) {
        viewModelScope.launch {
            _authState.value = AuthState.Loading
            val result = repository.verifyOtp(phone, otp)
            result.onSuccess { response ->
                if (response.success && response.user != null) {
                    // Save to DataStore for quick role/UI access
                    sessionManager.saveSession(
                        role = response.user.role,
                        schoolId = response.user.schoolId,
                        token = response.token ?: "",
                        userId = response.user.id
                    )
                    _authState.value = AuthState.Authenticated(response.user.role)
                } else {
                    _authState.value = AuthState.Error(response.message ?: "Verification failed")
                }
            }.onFailure {
                _authState.value = AuthState.Error(it.message ?: "Invalid OTP or session error")
            }
        }
    }

    fun logout() {
        viewModelScope.launch {
            repository.logout()
            sessionManager.clearSession()
            _authState.value = AuthState.LoggedOut
        }
    }

    fun resetState() {
        _authState.value = AuthState.Idle
    }

    fun checkLoginState(onResult: (String?) -> Unit) {
        viewModelScope.launch {
            if (repository.isUserLoggedIn()) {
                val role = sessionManager.role.first()
                onResult(role)
            } else {
                onResult(null)
            }
        }
    }
}

sealed class AuthState {
    object Idle : AuthState()
    object Loading : AuthState()
    data class OtpRequested(val phone: String, val cnic: String, val email: String) : AuthState()
    data class Authenticated(val role: String) : AuthState()
    data class Error(val message: String) : AuthState()
    object LoggedOut : AuthState()
}
