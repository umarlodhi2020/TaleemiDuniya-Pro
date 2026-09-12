package com.lodhidevelop.taleemiduniya_pro.data.repository

import com.google.firebase.firestore.FirebaseFirestore
import com.lodhidevelop.taleemiduniya_pro.data.model.*
import kotlinx.coroutines.tasks.await
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class StudentRepository @Inject constructor() {
    private val db = FirebaseFirestore.getInstance()

    suspend fun getStudentProfile(studentId: String): Result<StudentProfile> {
        return try {
            val doc = db.collection("students").document(studentId).get().await()
            if (doc.exists()) {
                val data = doc.data ?: return Result.failure(Exception("No data"))
                
                val feeValue = data["monthlyFee"]
                val feeInt = when (feeValue) {
                    is Long -> feeValue.toInt()
                    is String -> feeValue.toIntOrNull() ?: 0
                    else -> 0
                }

                Result.success(StudentProfile(
                    id = doc.id,
                    name = data["name"] as? String ?: "",
                    fatherName = data["fatherName"] as? String ?: "",
                    fatherCnic = data["fatherCnic"] as? String ?: "",
                    rollNumber = data["rollNumber"] as? String ?: "",
                    className = data["class"] as? String ?: "",
                    section = data["section"] as? String ?: "",
                    phone = data["phone"] as? String ?: "",
                    photoUrl = data["photoUrl"] as? String ?: "",
                    status = data["status"] as? String ?: "",
                    schoolId = data["schoolId"] as? String ?: "",
                    monthlyFee = feeInt
                ))
            } else {
                Result.failure(Exception("Student not found"))
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    suspend fun getAttendance(studentId: String, schoolId: String): Result<List<AttendanceRecord>> {
        return try {
            val snap = db.collection("attendance")
                .whereEqualTo("schoolId", schoolId)
                .get().await()
            val list = snap.documents.mapNotNull { doc ->
                val d = doc.data ?: return@mapNotNull null
                val recordStudentId = d["studentId"]?.toString() ?: ""
                
                // Match by studentId OR document ID
                if (recordStudentId != studentId && doc.id != studentId) return@mapNotNull null

                AttendanceRecord(
                    date = d["date"] as? String ?: "",
                    status = d["status"] as? String ?: "",
                    checkInTime = d["checkInTime"] as? String,
                    studentId = recordStudentId,
                    schoolId = d["schoolId"] as? String ?: ""
                )
            }.sortedByDescending { it.date }
            Result.success(list)
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    suspend fun getFees(studentId: String, rollNumber: String, schoolId: String): Result<List<FeeRecord>> {
        return try {
            val voucherSnap = db.collection("vouchers")
                .whereEqualTo("schoolId", schoolId)
                .get().await()
            
            val vouchers = voucherSnap.documents.mapNotNull { doc ->
                val data = doc.data ?: return@mapNotNull null
                val childrenDetails = data["childrenDetails"] as? List<Map<String, Any>> ?: emptyList()
                
                val isMatch = childrenDetails.any { child ->
                    val admNo = child["admNo"]?.toString()?.trim() ?: ""
                    val childId = child["id"]?.toString()?.trim() ?: ""
                    admNo == rollNumber.trim() || childId == studentId.trim() || admNo == studentId.trim()
                }
                
                if (!isMatch) return@mapNotNull null
                
                val totalAmount = when (val total = data["totalAmount"]) {
                    is Long -> total.toInt()
                    is String -> total.toIntOrNull() ?: 0
                    is Double -> total.toInt()
                    else -> 0
                }

                FeeRecord(
                    id = doc.id,
                    month = data["month"] as? String ?: "Current Month",
                    totalAmount = totalAmount,
                    paidAmount = if (data["status"]?.toString()?.lowercase() == "paid") totalAmount else 0,
                    status = data["status"] as? String ?: "Unpaid",
                    voucherNo = data["voucherNo"] as? String ?: "N/A",
                    dueDate = data["dueDate"] as? String ?: "",
                    studentId = studentId,
                    schoolId = data["schoolId"]?.toString() ?: ""
                )
            }
            Result.success(vouchers.sortedByDescending { it.month })
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    suspend fun getHomework(className: String, section: String, schoolId: String): Result<List<HomeworkRecord>> {
        return try {
            val snap = db.collection("homework")
                .whereEqualTo("schoolId", schoolId)
                .get().await()
            val list = snap.documents.mapNotNull { doc ->
                val d = doc.data ?: return@mapNotNull null
                val hClass = d["class"]?.toString() ?: ""
                val hSchoolId = d["schoolId"]?.toString() ?: ""
                
                if (hSchoolId.isNotEmpty() && hSchoolId != schoolId) return@mapNotNull null
                if (hClass.isNotEmpty() && !hClass.equals(className, ignoreCase = true)) return@mapNotNull null

                HomeworkRecord(
                    id = doc.id,
                    subject = d["subject"] as? String ?: "",
                    title = d["title"] as? String ?: "",
                    description = d["description"] as? String ?: "",
                    attachmentUrl = d["attachmentUrl"] as? String,
                    dueDate = d["dueDate"] as? String ?: "",
                    assignedDate = d["assignedDate"] as? String ?: "",
                    teacherName = d["teacherName"] as? String ?: "",
                    schoolId = hSchoolId,
                    status = d["status"] as? String ?: "Pending"
                )
            }.sortedByDescending { it.assignedDate }
            Result.success(list)
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    suspend fun getResults(studentId: String, schoolId: String): Result<List<ResultRecord>> {
        return try {
            val snap = db.collection("results")
                .whereEqualTo("schoolId", schoolId)
                .get().await()
            val list = snap.documents.mapNotNull { doc ->
                val d = doc.data ?: return@mapNotNull null
                val recordStudentId = d["studentId"]?.toString() ?: ""
                
                if (recordStudentId != studentId && doc.id != studentId) return@mapNotNull null

                ResultRecord(
                    id = doc.id,
                    examId = d["examId"] as? String ?: "",
                    examName = d["examName"] as? String ?: "",
                    subject = d["subject"] as? String ?: "",
                    obtainedMarks = (d["obtainedMarks"] as? Long)?.toInt() ?: (d["obtainedMarks"] as? String)?.toIntOrNull() ?: 0,
                    totalMarks = (d["totalMarks"] as? Long)?.toInt() ?: (d["totalMarks"] as? String)?.toIntOrNull() ?: 100,
                    grade = d["grade"] as? String ?: "",
                    studentId = recordStudentId,
                    schoolId = d["schoolId"] as? String ?: ""
                )
            }
            Result.success(list)
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    suspend fun getTimetable(className: String, section: String, schoolId: String): Result<List<TimetableRecord>> {
        return try {
            val snap = db.collection("timetable")
                .whereEqualTo("schoolId", schoolId)
                .get().await()
            val list = snap.documents.mapNotNull { doc ->
                val d = doc.data ?: return@mapNotNull null
                val tClass = d["class"]?.toString() ?: ""
                
                if (tClass.isNotEmpty() && !tClass.equals(className, ignoreCase = true)) return@mapNotNull null

                TimetableRecord(
                    day = d["day"] as? String ?: "",
                    subject = d["subject"] as? String ?: "",
                    time = d["time"] as? String ?: "",
                    room = d["room"] as? String ?: "",
                    teacherName = d["teacherName"] as? String ?: "",
                    className = tClass
                )
            }
            Result.success(list)
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    suspend fun getAnnouncements(schoolId: String): Result<List<Announcement>> {
        return try {
            val possibleSchoolIds = mutableListOf<Any>(schoolId)
            schoolId.toLongOrNull()?.let { possibleSchoolIds.add(it) }

            var snap = db.collection("announcements")
                .whereIn("schoolId", possibleSchoolIds)
                .get().await()
            
            if (snap.isEmpty) {
                snap = db.collection("Announcements")
                    .whereIn("schoolId", possibleSchoolIds)
                    .get().await()
            }

            val list = snap.documents.map { doc ->
                val d = doc.data ?: emptyMap<String, Any>()
                Announcement(
                    id = doc.id,
                    title = (d["title"] ?: d["subject"] ?: "").toString(),
                    desc = (d["desc"] ?: d["message"] ?: d["body"] ?: d["description"] ?: "").toString(),
                    type = (d["type"] ?: "general").toString(),
                    createdAt = when (val time = d["createdAt"] ?: d["timestamp"] ?: d["date"]) {
                        is com.google.firebase.Timestamp -> time.seconds
                        is Long -> time
                        is String -> time.toLongOrNull() ?: 0
                        else -> 0
                    }
                )
            }.sortedByDescending { it.createdAt }
            Result.success(list)
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    suspend fun getNotifications(userId: String, schoolId: String): Result<List<NotificationRecord>> {
        return try {
            val snap = db.collection("notifications")
                .whereEqualTo("schoolId", schoolId)
                .get().await()
            
            val list = snap.documents.mapNotNull { doc ->
                val d = doc.data ?: return@mapNotNull null
                val targetId = d["targetId"]?.toString() ?: ""
                
                // If notification is for specific user OR for everyone in school
                if (targetId.isNotEmpty() && targetId != userId) return@mapNotNull null

                NotificationRecord(
                    id = doc.id,
                    title = (d["title"] ?: "").toString(),
                    body = (d["body"] ?: d["message"] ?: "").toString(),
                    timestamp = when (val time = d["timestamp"] ?: d["createdAt"]) {
                        is com.google.firebase.Timestamp -> time.seconds
                        is Long -> time
                        else -> System.currentTimeMillis() / 1000
                    },
                    type = (d["type"] ?: "general").toString(),
                    read = d["read"] as? Boolean ?: false
                )
            }.sortedByDescending { it.timestamp }
            
            Result.success(list)
        } catch (e: Exception) {
            Result.failure(e)
        }
    }
}
