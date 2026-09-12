package com.lodhidevelop.taleemiduniya_pro.data.repository

import com.google.firebase.auth.FirebaseAuth
import com.lodhidevelop.taleemiduniya_pro.data.model.AuthResponse
import com.lodhidevelop.taleemiduniya_pro.data.model.LoginRequest
import com.lodhidevelop.taleemiduniya_pro.data.model.OtpRequest
import com.lodhidevelop.taleemiduniya_pro.data.remote.AuthApiService
import kotlinx.coroutines.tasks.await
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class AuthRepository @Inject constructor(
    private val authApiService: AuthApiService
) {
    private val firebaseAuth = FirebaseAuth.getInstance()
    
    suspend fun requestOtp(cnic: String, phone: String, email: String, role: String): Result<AuthResponse> {
        return try {
            val response = authApiService.requestOtp(LoginRequest(cnic, phone, email, role))
            if (response.isSuccessful && response.body() != null) {
                Result.success(response.body()!!)
            } else {
                val errorJson = response.errorBody()?.string() ?: ""
                val errorMessage = try {
                    val jsonObject = org.json.JSONObject(errorJson)
                    jsonObject.optString("error", "Request failed (${response.code()})")
                } catch (e: Exception) {
                    "Request failed (${response.code()})"
                }
                Result.failure(Exception(errorMessage))
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    suspend fun verifyOtp(phone: String, otp: String): Result<AuthResponse> {
        return try {
            val response = authApiService.verifyOtp(OtpRequest(phone, otp))
            val authResponse = response.body()
            if (response.isSuccessful && authResponse != null) {
                if (authResponse.success && authResponse.token != null) {
                    // Sign in to Firebase using the Custom Token from our backend
                    firebaseAuth.signInWithCustomToken(authResponse.token).await()
                    Result.success(authResponse)
                } else {
                    Result.failure(Exception(authResponse.message ?: "Verification failed"))
                }
            } else {
                val errorJson = response.errorBody()?.string() ?: ""
                val errorMessage = try {
                    val jsonObject = org.json.JSONObject(errorJson)
                    jsonObject.optString("error", response.message())
                } catch (e: Exception) {
                    response.message()
                }
                Result.failure(Exception(errorMessage))
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    fun logout() {
        firebaseAuth.signOut()
    }

    fun isUserLoggedIn(): Boolean {
        return firebaseAuth.currentUser != null
    }

    fun getCurrentUser() = firebaseAuth.currentUser
}
