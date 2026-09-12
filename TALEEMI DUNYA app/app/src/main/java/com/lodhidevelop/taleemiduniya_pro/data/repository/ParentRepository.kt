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
}
