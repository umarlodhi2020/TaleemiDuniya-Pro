package com.lodhidevelop.taleemiduniya_pro.data.repository

import com.google.firebase.firestore.FirebaseFirestore
import com.lodhidevelop.taleemiduniya_pro.data.model.*
import kotlinx.coroutines.tasks.await
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class AdminRepository @Inject constructor() {
    private val db = FirebaseFirestore.getInstance()

    suspend fun getSchoolStats(schoolId: String): Result<SchoolStats> {
        return try {
            val studentsSnap = db.collection("students").whereEqualTo("schoolId", schoolId).get().await()
            val staffSnap = db.collection("staff").whereEqualTo("schoolId", schoolId).get().await()
            
            // Simplified fee collection logic
            val vouchersSnap = db.collection("vouchers").whereEqualTo("schoolId", schoolId).get().await()
            val totalRevenue = vouchersSnap.documents.sumOf { (it.data?.get("totalAmount") as? Long) ?: 0L }
            
            // Active notices count from announcements collection
            val announcementsSnap = db.collection("announcements").whereEqualTo("schoolId", schoolId).get().await()
            
            Result.success(SchoolStats(
                totalStudents = studentsSnap.size(),
                totalStaff = staffSnap.size(),
                totalRevenue = totalRevenue.toInt(),
                activeNoticeCount = announcementsSnap.size()
            ))
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    suspend fun getStaffAttendance(schoolId: String, date: String): Result<List<AttendanceRecord>> {
        return try {
            val snap = db.collection("staff_attendance")
                .whereEqualTo("schoolId", schoolId)
                .whereEqualTo("date", date)
                .get().await()
            val list = snap.documents.map { doc ->
                val d = doc.data ?: emptyMap<String, Any>()
                AttendanceRecord(
                    date = d["date"] as? String ?: "",
                    status = d["status"] as? String ?: "",
                    studentId = d["staffId"] as? String ?: "", // Reusing studentId field for staffId
                    schoolId = schoolId
                )
            }
            Result.success(list)
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    suspend fun getPendingVouchers(schoolId: String): Result<List<FeeRecord>> {
        return try {
            val snap = db.collection("vouchers")
                .whereEqualTo("schoolId", schoolId)
                .whereEqualTo("status", "Unpaid")
                .get().await()
            val list = snap.documents.map { doc ->
                val d = doc.data ?: emptyMap<String, Any>()
                FeeRecord(
                    id = doc.id,
                    month = d["month"] as? String ?: "",
                    totalAmount = (d["totalAmount"] as? Long)?.toInt() ?: 0,
                    status = "Unpaid",
                    voucherNo = d["voucherNo"] as? String ?: "",
                    schoolId = schoolId
                )
            }
            Result.success(list)
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    suspend fun approveVoucher(voucherId: String): Result<Unit> {
        return try {
            db.collection("vouchers").document(voucherId).update("status", "Paid").await()
            Result.success(Unit)
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    suspend fun postAnnouncement(title: String, desc: String, schoolId: String): Result<Unit> {
        return try {
            val announcement = mapOf(
                "title" to title,
                "desc" to desc,
                "schoolId" to schoolId,
                "createdAt" to com.google.firebase.Timestamp.now(),
                "type" to "general"
            )
            db.collection("announcements").add(announcement).await()
            Result.success(Unit)
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    suspend fun getLeaveRequests(schoolId: String): Result<List<LeaveRequest>> {
        return try {
            val snap = db.collection("leave_requests")
                .whereEqualTo("schoolId", schoolId)
                .get().await()
            val list = snap.documents.map { doc ->
                val d = doc.data ?: emptyMap<String, Any>()
                LeaveRequest(
                    id = doc.id,
                    staffId = d["staffId"] as? String ?: "",
                    staffName = d["staffName"] as? String ?: "",
                    reason = d["reason"] as? String ?: "",
                    startDate = d["startDate"] as? String ?: "",
                    endDate = d["endDate"] as? String ?: "",
                    status = d["status"] as? String ?: "Pending",
                    schoolId = schoolId
                )
            }
            Result.success(list)
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    suspend fun updateLeaveStatus(leaveId: String, status: String): Result<Unit> {
        return try {
            db.collection("leave_requests").document(leaveId).update("status", status).await()
            Result.success(Unit)
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    suspend fun getStaffList(schoolId: String): Result<List<TeacherProfile>> {
        return try {
            val snap = db.collection("staff").whereEqualTo("schoolId", schoolId).get().await()
            val list = snap.documents.map { doc ->
                val d = doc.data ?: emptyMap<String, Any>()
                TeacherProfile(
                    id = doc.id,
                    name = d["name"] as? String ?: "",
                    designation = d["designation"] as? String ?: "",
                    photoUrl = d["photoUrl"] as? String ?: ""
                )
            }
            Result.success(list)
        } catch (e: Exception) {
            Result.failure(e)
        }
    }
}

data class SchoolStats(
    val totalStudents: Int,
    val totalStaff: Int,
    val totalRevenue: Int,
    val activeNoticeCount: Int
)
