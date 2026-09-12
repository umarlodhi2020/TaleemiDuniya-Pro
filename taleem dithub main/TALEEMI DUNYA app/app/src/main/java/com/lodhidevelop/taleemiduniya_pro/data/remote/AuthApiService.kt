package com.lodhidevelop.taleemiduniya_pro.data.remote

import com.lodhidevelop.taleemiduniya_pro.data.model.AuthResponse
import com.lodhidevelop.taleemiduniya_pro.data.model.LoginRequest
import com.lodhidevelop.taleemiduniya_pro.data.model.OtpRequest
import retrofit2.Response
import retrofit2.http.Body
import retrofit2.http.POST

interface AuthApiService {
    @POST("/api/mobile/auth/request-otp")
    suspend fun requestOtp(@Body request: LoginRequest): Response<AuthResponse>

    @POST("/api/mobile/auth/verify-otp")
    suspend fun verifyOtp(@Body request: OtpRequest): Response<AuthResponse>

    @POST("/api/mobile/auth/logout")
    suspend fun logout(): Response<AuthResponse>

    @POST("/api/mobile/teacher/attendance")
    suspend fun postAttendance(@Body request: Map<String, Any>): Response<AuthResponse>

    @POST("/api/mobile/teacher/homework")
    suspend fun postHomework(@Body request: Map<String, Any>): Response<AuthResponse>

    @POST("/api/mobile/teacher/results")
    suspend fun postResults(@Body request: Map<String, Any>): Response<AuthResponse>
}
