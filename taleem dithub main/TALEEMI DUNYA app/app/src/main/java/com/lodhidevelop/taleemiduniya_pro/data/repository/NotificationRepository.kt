package com.lodhidevelop.taleemiduniya_pro.data.repository

import com.google.firebase.firestore.FirebaseFirestore
import com.lodhidevelop.taleemiduniya_pro.data.model.NotificationRecord
import kotlinx.coroutines.tasks.await
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class NotificationRepository @Inject constructor() {
    private val db = FirebaseFirestore.getInstance()

    suspend fun getNotifications(userId: String, schoolId: String): Result<List<NotificationRecord>> {
        return try {
            val snap = db.collection("notifications")
                .whereEqualTo("userId", userId)
                .whereEqualTo("schoolId", schoolId)
                .get().await()
            
            val list = snap.documents.map { doc ->
                val d = doc.data ?: emptyMap<String, Any>()
                NotificationRecord(
                    id = doc.id,
                    title = d["title"] as? String ?: "",
                    body = d["body"] as? String ?: "",
                    timestamp = (d["timestamp"] as? com.google.firebase.Timestamp)?.seconds ?: 0,
                    type = d["type"] as? String ?: "general",
                    read = d["read"] as? Boolean ?: false
                )
            }.sortedByDescending { it.timestamp }
            Result.success(list)
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    suspend fun markAsRead(notificationId: String): Result<Unit> {
        return try {
            db.collection("notifications").document(notificationId).update("read", true).await()
            Result.success(Unit)
        } catch (e: Exception) {
            Result.failure(e)
        }
    }
}
