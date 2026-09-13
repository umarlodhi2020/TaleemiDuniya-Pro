package com.lodhidevelop.taleemiduniya_pro.data.model

import com.squareup.moshi.JsonClass

@JsonClass(generateAdapter = true)
data class LoginRequest(
    val identifier: String, // Explicitly sending 'identifier' instead of 'cnic' since backend might be looking for 'identifier'
    val phone: String,
    val email: String,
    val role: String = ""
)

@JsonClass(generateAdapter = true)
data class OtpRequest(
    val phone: String,
    val otp: String
)

@JsonClass(generateAdapter = true)
data class AuthResponse(
    val success: Boolean,
    val message: String? = null,
    val token: String? = null,
    val user: UserData? = null
)

@JsonClass(generateAdapter = true)
data class UserData(
    val id: String,
    val role: String,
    val schoolId: String,
    val name: String,
    val phone: String
)
