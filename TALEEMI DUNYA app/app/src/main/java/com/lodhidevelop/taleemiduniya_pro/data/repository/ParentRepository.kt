package com.lodhidevelop.taleemiduniya_pro.data.repository

import com.google.firebase.firestore.FirebaseFirestore
import com.lodhidevelop.taleemiduniya_pro.data.model.StudentProfile
import kotlinx.coroutines.tasks.await
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class ParentRepository @Inject constructor() {
    private val db = FirebaseFirestore.getInstance()

    suspend fun getChildren(parentCnic: String, schoolId: String): Result<List<StudentProfile>> {
        return try {
            val cleanCnic = parentCnic.replace("-", "")
            val formattedCnic = if (cleanCnic.length == 13) {
                "${cleanCnic.substring(0, 5)}-${cleanCnic.substring(5, 12)}-${cleanCnic.substring(12)}"
            } else cleanCnic

            // Optimized Query: Search only for students of this parent in this school
            val snap = db.collection("students")
                .whereEqualTo("schoolId", schoolId)
                .whereEqualTo("fatherCnic", formattedCnic)
                .get().await()

            var children = snap.documents.map { doc ->
                val data = doc.data ?: emptyMap<String, Any>()
                StudentProfile(
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
                    monthlyFee = (data["monthlyFee"] as? Long)?.toInt() ?: 0
                )
            }

            // Fallback for clean CNIC if no records found with formatted
            if (children.isEmpty()) {
                val snap2 = db.collection("students")
                    .whereEqualTo("schoolId", schoolId)
                    .whereEqualTo("fatherCnic", cleanCnic)
                    .get().await()
                children = snap2.documents.map { doc ->
                    val data = doc.data ?: emptyMap<String, Any>()
                    StudentProfile(
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
                        monthlyFee = (data["monthlyFee"] as? Long)?.toInt() ?: 0
                    )
                }
            }

            Result.success(children)
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    suspend fun getTeachers(className: String, section: String, schoolId: String): Result<List<com.lodhidevelop.taleemiduniya_pro.data.model.TeacherProfile>> {
        return try {
            val snap = db.collection("teachers")
                .whereEqualTo("schoolId", schoolId)
                .get().await()

            val teachers = snap.documents.mapNotNull { doc ->
                val data = doc.data ?: return@mapNotNull null
                val assignedClass = data["className"] as? String ?: ""
                val assignedSection = data["section"] as? String ?: ""
                
                // Only return teachers who teach this class/section (or if they are generally assigned)
                if (assignedClass.isNotEmpty() && assignedClass != className) return@mapNotNull null
                
                com.lodhidevelop.taleemiduniya_pro.data.model.TeacherProfile(
                    id = doc.id,
                    name = data["name"] as? String ?: "",
                    email = data["email"] as? String ?: "",
                    phone = data["phone"] as? String ?: "",
                    schoolId = data["schoolId"] as? String ?: "",
                    designation = data["designation"] as? String ?: "Teacher",
                    section = assignedSection,
                    className = assignedClass,
                    photoUrl = data["photoUrl"] as? String ?: ""
                )
            }
            Result.success(teachers)
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    suspend fun submitStudentLeaveRequest(request: com.lodhidevelop.taleemiduniya_pro.data.model.StudentLeaveRequest): Result<Unit> {
        return try {
            val map = hashMapOf(
                "studentId" to request.studentId,
                "studentName" to request.studentName,
                "className" to request.className,
                "section" to request.section,
                "reason" to request.reason,
                "startDate" to request.startDate,
                "endDate" to request.endDate,
                "status" to request.status,
                "schoolId" to request.schoolId,
                "timestamp" to com.google.firebase.firestore.FieldValue.serverTimestamp()
            )
            db.collection("student_leaves").add(map).await()
            Result.success(Unit)
        } catch (e: Exception) {
            Result.failure(e)
        }
    }
}
