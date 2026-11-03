package com.lodhidevelop.taleemiduniya_pro.data.repository

import com.google.firebase.firestore.FirebaseFirestore
import com.google.firebase.storage.FirebaseStorage
import com.lodhidevelop.taleemiduniya_pro.data.model.*
import com.lodhidevelop.taleemiduniya_pro.data.remote.AuthApiService
import kotlinx.coroutines.tasks.await
import android.net.Uri
import android.util.Log
import com.google.firebase.Timestamp
import java.text.SimpleDateFormat
import java.util.*
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class TeacherRepository @Inject constructor(
    private val authApiService: AuthApiService
) {
    private val db = FirebaseFirestore.getInstance()
    private val storage = FirebaseStorage.getInstance()

    suspend fun uploadImage(uri: Uri, path: String): Result<String> {
        return try {
            val ref = storage.reference.child(path)
            ref.putFile(uri).await()
            val url = ref.downloadUrl.await().toString()
            Result.success(url)
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    suspend fun getTeacherProfile(teacherId: String, schoolId: String): Result<TeacherProfile> {
        return try {
            val doc = db.collection("staff").document(teacherId).get().await()
            if (doc.exists()) {
                val data = doc.data ?: return Result.failure(Exception("No data"))
                val profile = mapToTeacherProfile(doc.id, data)
                // If profile is missing class/section, try to find from assigned classes
                if (profile.className.isEmpty()) {
                    val assigned = getAssignedClasses(schoolId, teacherId, profile.name).getOrNull()
                    if (!assigned.isNullOrEmpty()) {
                        return Result.success(profile.copy(
                            className = assigned.first().name,
                            section = assigned.first().section
                        ))
                    }
                }
                Result.success(profile)
            } else {
                Result.failure(Exception("Teacher profile not found"))
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    private fun mapToTeacherProfile(id: String, data: Map<String, Any>): TeacherProfile {
        return TeacherProfile(
            id = id,
            name = (data["name"] ?: data["displayName"] ?: "").toString(),
            email = (data["email"] ?: "").toString(),
            phone = (data["phone"] ?: data["whatsapp"] ?: "").toString(),
            schoolId = (data["schoolId"] ?: data["school_id"] ?: "").toString(),
            designation = (data["designation"] ?: data["role"] ?: "Teacher").toString(),
            section = (data["section"] ?: data["classSection"] ?: "A").toString(),
            className = (data["class"] ?: data["className"] ?: data["assignedClass"] ?: "").toString(),
            photoUrl = (data["photoUrl"] ?: data["image"] ?: "").toString()
        )
    }

    suspend fun getAssignedClasses(schoolId: String, teacherId: String = "", teacherName: String = ""): Result<List<ClassInfo>> {
        val results = mutableListOf<ClassInfo>()
        val possibleSchoolIds = mutableListOf<Any>(schoolId)
        schoolId.toLongOrNull()?.let { possibleSchoolIds.add(it) }

        try {
            // 1. Try to find assignment in Staff Profile FIRST (Most likely)
            val teacherDoc = db.collection("staff").document(teacherId).get().await()
            if (teacherDoc.exists()) {
                val d = teacherDoc.data ?: emptyMap()
                android.util.Log.d("TeacherRepo", "Staff Doc Keys: ${d.keys}")
                
                // Common fields for class assignment in staff profile
                val classFields = listOf("class", "className", "assignedClass", "grade", "myClass", "class_name")
                val sectionFields = listOf("section", "sec", "classSection")
                
                for (cf in classFields) {
                    val cName = d[cf]?.toString() ?: ""
                    if (cName.isNotEmpty()) {
                        val sName = sectionFields.firstNotNullOfOrNull { d[it]?.toString() } ?: "A"
                        results.add(ClassInfo(id = "profile_$cName", name = cName, section = sName, schoolId = schoolId))
                    }
                }
                
                // Check for arrays
                (d["classes"] as? List<*>)?.forEach { results.add(ClassInfo(id = it.toString(), name = it.toString(), section = "A", schoolId = schoolId)) }
                (d["assignedClasses"] as? List<*>)?.forEach { results.add(ClassInfo(id = it.toString(), name = it.toString(), section = "A", schoolId = schoolId)) }
            }

            // 2. Scan ALL classes of this school and look for ANY mention of this teacher
            val allSchoolClasses = db.collection("classes").whereIn("schoolId", possibleSchoolIds).get().await()
            allSchoolClasses.documents.forEach { doc ->
                val d = doc.data ?: return@forEach
                val dStr = d.toString().lowercase()
                
                val firstName = teacherName.split(" ").first().lowercase()
                val matches = dStr.contains(teacherId.lowercase()) || 
                             (teacherName.isNotEmpty() && dStr.contains(teacherName.lowercase())) ||
                             (firstName.length > 2 && dStr.contains(firstName))
                
                if (matches) {
                    results.add(mapDocToClass(doc.id, d, schoolId))
                }
            }

            // 3. Fallback to Timetable if still empty
            if (results.isEmpty()) {
                val ttSnap = db.collection("timetable").whereIn("schoolId", possibleSchoolIds).get().await()
                ttSnap.documents.forEach { doc ->
                    val d = doc.data ?: return@forEach
                    val dStr = d.toString().lowercase()
                    if (dStr.contains(teacherId.lowercase()) || dStr.contains(teacherName.lowercase())) {
                        val cName = (d["class"] ?: d["className"] ?: "").toString()
                        if (cName.isNotEmpty()) {
                            results.add(ClassInfo(id = cName, name = cName, section = (d["section"] ?: "A").toString(), schoolId = schoolId))
                        }
                    }
                }
            }

            val finalResults = results.distinctBy { "${it.name.lowercase()}_${it.section.lowercase()}" }
            if (finalResults.isEmpty() && !allSchoolClasses.isEmpty) {
                // If school has classes but none match, it's an assignment field issue.
                val firstClass = allSchoolClasses.documents.firstOrNull()?.data ?: emptyMap<String, Any>()
                return Result.failure(Exception("No assignment found. Class Fields: ${firstClass.keys}"))
            }

            return Result.success(finalResults)
        } catch (e: Exception) {
            return Result.failure(e)
        }
    }

    private fun mapDocToClass(id: String, d: Map<String, Any>, schoolId: String): ClassInfo {
        return ClassInfo(
            id = id,
            name = (d["name"] ?: d["className"] ?: d["class"] ?: d["title"] ?: id).toString(),
            section = (d["section"] ?: d["sec"] ?: "A").toString(),
            schoolId = (d["schoolId"] ?: d["school_id"] ?: schoolId).toString()
        )
    }

    suspend fun getStudentsInClass(className: String, section: String, schoolId: String): Result<List<StudentProfile>> {
        return try {
            if (className.isEmpty()) {
                return Result.failure(Exception("Invalid Class Name"))
            }

            val possibleSchoolIds = mutableListOf<Any>()
            if (schoolId.isNotEmpty()) {
                possibleSchoolIds.add(schoolId)
                schoolId.toLongOrNull()?.let { possibleSchoolIds.add(it) }
                schoolId.toIntOrNull()?.let { possibleSchoolIds.add(it) }
            }

            // Clean class name (e.g. "1-A" -> "1", "Class 1" -> "1")
            val cleanClass = className.lowercase()
                .replace("class", "")
                .replace("grade", "")
                .replace("-$section".lowercase(), "")
                .replace(section.lowercase(), "")
                .trim()

            // Step 1: Try querying by schoolId
            var snap = try {
                if (possibleSchoolIds.isNotEmpty()) {
                    db.collection("students")
                        .whereIn("schoolId", possibleSchoolIds)
                        .get().await()
                } else {
                    db.collection("students").get().await()
                }
            } catch (e: Exception) {
                db.collection("students").get().await()
            }

            // Step 2: Fallback to all students if filtered query returned empty
            if (snap.isEmpty) {
                snap = db.collection("students").get().await()
            }

            if (snap.isEmpty) {
                return Result.success(emptyList())
            }

            // Step 3: Flexible in-memory matching
            val list = snap.documents.mapNotNull { doc ->
                val d = doc.data ?: return@mapNotNull null
                val docClass = (d["class"] ?: d["className"] ?: d["grade"] ?: d["assignedClass"] ?: "").toString().trim()
                val docSection = (d["section"] ?: d["sec"] ?: "A").toString().trim()
                val docSchoolId = (d["schoolId"] ?: d["school_id"] ?: "").toString().trim()

                // Check schoolId match (if both specified)
                val isSchoolMatch = schoolId.isEmpty() || 
                        docSchoolId.isEmpty() || 
                        docSchoolId.equals(schoolId, ignoreCase = true) ||
                        possibleSchoolIds.any { it.toString() == docSchoolId }

                if (!isSchoolMatch) return@mapNotNull null

                // Check class match
                val isClassMatch = docClass.equals(className, ignoreCase = true) ||
                        docClass.equals(cleanClass, ignoreCase = true) ||
                        (cleanClass.isNotEmpty() && docClass.lowercase().contains(cleanClass)) ||
                        docClass.lowercase().replace("class", "").trim() == cleanClass ||
                        className.lowercase().contains(docClass.lowercase())

                if (isClassMatch) {
                    StudentProfile(
                        id = doc.id,
                        name = (d["name"] ?: d["studentName"] ?: d["fullName"] ?: "").toString(),
                        fatherName = (d["fatherName"] ?: d["father_name"] ?: "").toString(),
                        rollNumber = (d["rollNumber"] ?: d["rollNo"] ?: d["roll_number"] ?: d["admNo"] ?: doc.id).toString(),
                        className = if (docClass.isNotEmpty()) docClass else className,
                        section = if (docSection.isNotEmpty()) docSection else section,
                        photoUrl = (d["photoUrl"] ?: d["image"] ?: d["avatar"] ?: "").toString(),
                        phone = (d["phone"] ?: d["whatsapp"] ?: d["parentPhone"] ?: d["mobile"] ?: "").toString(),
                        schoolId = docSchoolId.ifEmpty { schoolId }
                    )
                } else null
            }.distinctBy { it.id }.sortedBy { it.rollNumber.toIntOrNull() ?: Int.MAX_VALUE }

            Result.success(list)
        } catch (e: com.google.firebase.firestore.FirebaseFirestoreException) {
            android.util.Log.e("TeacherRepo", "Firestore Error in getStudentsInClass: ${e.code}", e)
            Result.failure(Exception("Database Error: ${e.message}"))
        } catch (e: Exception) {
            Log.e("TeacherRepo", "Error in getStudentsInClass", e)
            Result.failure(e)
        }
    }

    suspend fun markAttendance(
        records: List<AttendanceRecord>, 
        schoolId: String, 
        teacherId: String = "", 
        teacherName: String = "", 
        className: String = "", 
        section: String = ""
    ): Result<Unit> {
        return try {
            val requestMap = mapOf(
                "records" to records,
                "schoolId" to schoolId
            )
            val response = authApiService.postAttendance(requestMap)
            if (response.isSuccessful) {
                if (teacherId.isNotEmpty()) {
                    logTeacherActivity(
                        teacherId = teacherId,
                        teacherName = teacherName,
                        schoolId = schoolId,
                        activityType = "ATTENDANCE_MARKED",
                        title = "Marked Attendance ($className-$section)",
                        description = "Attendance marked for ${records.size} students.",
                        className = className,
                        section = section
                    )
                }
                Result.success(Unit)
            } else {
                Result.failure(Exception("Server failed to save attendance"))
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    suspend fun postHomework(homework: HomeworkRecord, teacherId: String = ""): Result<Unit> {
        return try {
            val requestMap = mapOf(
                "subject" to homework.subject,
                "title" to homework.title,
                "description" to homework.description,
                "className" to homework.className,
                "section" to homework.section,
                "schoolId" to homework.schoolId,
                "teacherName" to homework.teacherName,
                "imageUrl" to (homework.attachmentUrl ?: "")
            )
            val response = authApiService.postHomework(requestMap)
            if (response.isSuccessful) {
                if (teacherId.isNotEmpty()) {
                    logTeacherActivity(
                        teacherId = teacherId,
                        teacherName = homework.teacherName,
                        schoolId = homework.schoolId,
                        activityType = "HOMEWORK_POSTED",
                        title = "Posted Homework/Diary (${homework.subject})",
                        description = homework.title,
                        className = homework.className,
                        section = homework.section
                    )
                }
                Result.success(Unit)
            } else {
                Result.failure(Exception("Server failed to post homework: ${response.message()}"))
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    suspend fun getClassAttendanceHistory(className: String, section: String, schoolId: String): Result<List<AttendanceRecord>> {
        return try {
            val snap = db.collection("attendance")
                .whereEqualTo("schoolId", schoolId)
                .get().await()
            
            val list = snap.documents.map { doc ->
                val d = doc.data ?: emptyMap<String, Any>()
                AttendanceRecord(
                    date = d["date"] as? String ?: "",
                    status = d["status"] as? String ?: "",
                    studentId = d["studentId"] as? String ?: "",
                    schoolId = schoolId
                )
            }.sortedByDescending { it.date }
            Result.success(list)
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    suspend fun submitResults(
        results: List<ResultRecord>, 
        schoolId: String, 
        teacherId: String = "", 
        teacherName: String = "", 
        examName: String = "", 
        subject: String = ""
    ): Result<Unit> {
        return try {
            val requestMap = mapOf(
                "results" to results,
                "schoolId" to schoolId
            )
            val response = authApiService.postResults(requestMap)
            if (response.isSuccessful) {
                if (teacherId.isNotEmpty()) {
                    logTeacherActivity(
                        teacherId = teacherId,
                        teacherName = teacherName,
                        schoolId = schoolId,
                        activityType = "RESULTS_PUBLISHED",
                        title = "Published Marksheet ($examName - $subject)",
                        description = "Submitted marks for ${results.size} students.",
                        className = "",
                        section = ""
                    )
                }
                Result.success(Unit)
            } else {
                Result.failure(Exception("Server failed to publish results"))
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    suspend fun getTeacherTimetable(teacherId: String, schoolId: String): Result<List<TimetableRecord>> {
        return try {
            val possibleSchoolIds = mutableListOf<Any>(schoolId)
            schoolId.toLongOrNull()?.let { possibleSchoolIds.add(it) }

            var snap = db.collection("timetable")
                .whereIn("schoolId", possibleSchoolIds)
                .get().await()
            
            if (snap.isEmpty) {
                snap = db.collection("Timetable")
                    .whereIn("schoolId", possibleSchoolIds)
                    .get().await()
            }
            
            val list = snap.documents.map { doc ->
                val d = doc.data ?: emptyMap<String, Any>()
                TimetableRecord(
                    day = (d["day"] ?: "").toString(),
                    subject = (d["subject"] ?: "").toString(),
                    time = (d["time"] ?: d["period"] ?: "").toString(),
                    room = (d["room"] ?: d["roomNo"] ?: "").toString(),
                    teacherName = (d["teacherName"] ?: d["name"] ?: "").toString(),
                    className = (d["class"] ?: d["className"] ?: "").toString(),
                    section = (d["section"] ?: "A").toString(),
                    teacherId = (d["teacherId"] ?: d["staffId"] ?: d["id"] ?: "").toString(),
                    schoolId = (d["schoolId"] ?: d["school_id"] ?: schoolId).toString()
                )
            }.filter { 
                it.teacherId == teacherId || 
                it.teacherName.contains(teacherId, ignoreCase = true) ||
                it.teacherId.contains(teacherId, ignoreCase = true)
            }
            
            Result.success(list)
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    suspend fun submitLeaveRequest(request: LeaveRequest): Result<Unit> {
        return try {
            db.collection("leave_requests").add(request).await()
            Result.success(Unit)
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    suspend fun updateTeacherProfile(teacherId: String, updates: Map<String, Any>): Result<Unit> {
        return try {
            db.collection("staff").document(teacherId).update(updates).await()
            Result.success(Unit)
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    suspend fun getTodayAttendanceSummary(schoolId: String, classNames: List<String>): Result<Pair<Int, Int>> {
        return try {
            val sdf = SimpleDateFormat("yyyy-MM-dd", Locale.getDefault())
            val today = sdf.format(Date())
            
            val snap = db.collection("attendance")
                .whereEqualTo("schoolId", schoolId)
                .whereEqualTo("date", today)
                .get().await()
            
            val docs = snap.documents
            var present = 0
            var total = 0
            
            docs.forEach { doc ->
                val d = doc.data ?: return@forEach
                val status = d["status"]?.toString() ?: ""
                present += if (status.lowercase() == "present") 1 else 0
                total++
            }
            
            Result.success(Pair(present, total))
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    suspend fun getWeeklyAttendanceTrends(schoolId: String): Result<List<Pair<String, Float>>> {
        return try {
            val sdf = SimpleDateFormat("yyyy-MM-dd", Locale.getDefault())
            val dayFormat = SimpleDateFormat("EEE", Locale.getDefault())
            val calendar = Calendar.getInstance()
            
            val trends = mutableListOf<Pair<String, Float>>()
            
            // Loop for last 7 days
            for (i in 0 until 7) {
                val dateStr = sdf.format(calendar.time)
                val dayLabel = dayFormat.format(calendar.time)
                
                val snap = db.collection("attendance")
                    .whereEqualTo("schoolId", schoolId)
                    .whereEqualTo("date", dateStr)
                    .get().await()
                
                var present = 0
                var total = snap.size()
                
                snap.documents.forEach { doc ->
                    if (doc.getString("status")?.lowercase() == "present") present++
                }
                
                val percentage = if (total > 0) (present.toFloat() / total.toFloat()) * 100f else 0f
                trends.add(dayLabel to percentage)
                
                calendar.add(Calendar.DAY_OF_YEAR, -1)
            }
            
            Result.success(trends.reversed())
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    suspend fun logTeacherActivity(
        teacherId: String,
        teacherName: String,
        schoolId: String,
        activityType: String,
        title: String,
        description: String,
        className: String = "",
        section: String = ""
    ): Result<Unit> {
        return try {
            val logData = hashMapOf(
                "teacherId" to teacherId,
                "teacherName" to teacherName,
                "schoolId" to schoolId,
                "activityType" to activityType,
                "title" to title,
                "description" to description,
                "className" to className,
                "section" to section,
                "timestamp" to Timestamp.now(),
                "date" to SimpleDateFormat("yyyy-MM-dd", Locale.getDefault()).format(Date())
            )
            db.collection("teacher_activity_logs").add(logData).await()
            Result.success(Unit)
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    suspend fun sendReportToPrincipal(
        teacherId: String,
        teacherName: String,
        schoolId: String,
        reportType: String,
        subject: String,
        content: String,
        className: String = "",
        section: String = ""
    ): Result<Unit> {
        return try {
            val report = hashMapOf(
                "teacherId" to teacherId,
                "teacherName" to teacherName,
                "schoolId" to schoolId,
                "reportType" to reportType,
                "subject" to subject,
                "content" to content,
                "className" to className,
                "section" to section,
                "status" to "Submitted",
                "timestamp" to Timestamp.now(),
                "date" to SimpleDateFormat("yyyy-MM-dd", Locale.getDefault()).format(Date())
            )
            db.collection("principal_reports").add(report).await()
            logTeacherActivity(
                teacherId = teacherId,
                teacherName = teacherName,
                schoolId = schoolId,
                activityType = "PRINCIPAL_REPORT",
                title = "Report Sent to Principal: $subject",
                description = "[$reportType] $content",
                className = className,
                section = section
            )
            Result.success(Unit)
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    suspend fun getTeacherActivityLogs(teacherId: String, schoolId: String): Result<List<Map<String, Any>>> {
        return try {
            val snap = db.collection("teacher_activity_logs")
                .whereEqualTo("schoolId", schoolId)
                .get().await()
            
            val logs = snap.documents.map { doc ->
                val d = doc.data ?: emptyMap<String, Any>()
                val map = d.toMutableMap()
                map["id"] = doc.id
                map
            }.filter { 
                it["teacherId"]?.toString() == teacherId || teacherId.isEmpty()
            }.sortedByDescending { 
                when (val ts = it["timestamp"]) {
                    is Timestamp -> ts.seconds
                    else -> 0L
                }
            }
            Result.success(logs)
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    suspend fun getMyAttendance(teacherId: String, schoolId: String): Result<List<AttendanceRecord>> {
        return try {
            val possibleTeacherIds = listOf(teacherId, "staff_$teacherId", teacherId.removePrefix("staff_")).distinct()
            
            // Try staff_attendance first, fallback to teacher_attendance, then attendance
            val collections = listOf("staff_attendance", "teacher_attendance", "staffAttendance", "attendance")
            val records = mutableListOf<AttendanceRecord>()

            for (coll in collections) {
                val snap = try {
                    if (schoolId.isNotEmpty()) {
                        db.collection(coll).whereEqualTo("schoolId", schoolId).get().await()
                    } else {
                        db.collection(coll).get().await()
                    }
                } catch (e: Exception) {
                    try { db.collection(coll).get().await() } catch (ex: Exception) { null }
                }

                snap?.documents?.forEach { doc ->
                    val d = doc.data ?: return@forEach
                    val docStaffId = (d["staffId"] ?: d["teacherId"] ?: d["studentId"] ?: d["userId"] ?: doc.id).toString()
                    val match = possibleTeacherIds.any { docStaffId.equals(it, ignoreCase = true) }
                    
                    if (match) {
                        val dateStr = when (val dateVal = d["date"]) {
                            is String -> dateVal
                            is Timestamp -> SimpleDateFormat("yyyy-MM-dd", Locale.getDefault()).format(dateVal.toDate())
                            else -> SimpleDateFormat("yyyy-MM-dd", Locale.getDefault()).format(Date())
                        }
                        val status = (d["status"] ?: "Present").toString()
                        val checkIn = (d["checkInTime"] ?: d["inTime"] ?: d["time"] ?: d["check_in"] ?: "").toString().ifEmpty { null }
                        val checkOut = (d["checkOutTime"] ?: d["outTime"] ?: d["check_out"] ?: "").toString().ifEmpty { null }
                        val scanMethod = (d["scanMethod"] ?: d["method"] ?: d["source"] ?: d["scanType"] ?: "IC Card Scan").toString()

                        records.add(
                            AttendanceRecord(
                                date = dateStr,
                                status = status,
                                checkInTime = checkIn,
                                checkOutTime = checkOut,
                                scanMethod = scanMethod,
                                studentId = teacherId,
                                schoolId = schoolId
                            )
                        )
                    }
                }

                if (records.isNotEmpty()) break
            }

            val sortedRecords = records.distinctBy { "${it.date}_${it.checkInTime}" }
                .sortedByDescending { it.date }

            Result.success(sortedRecords)
        } catch (e: Exception) {
            Log.e("TeacherRepo", "Error in getMyAttendance", e)
            Result.failure(e)
        }
    }
}
