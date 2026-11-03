package com.lodhidevelop.taleemiduniya_pro.core.notifications

import android.util.Log
import com.google.firebase.Timestamp
import com.google.firebase.firestore.FirebaseFirestore
import com.google.firebase.firestore.SetOptions
import com.google.firebase.messaging.FirebaseMessaging
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class NotificationHelper @Inject constructor() {

    fun registerFcmToken(userId: String, schoolId: String, role: String) {
        if (userId.isEmpty()) return
        FirebaseMessaging.getInstance().token.addOnCompleteListener { task ->
            if (task.isSuccessful) {
                val token = task.result
                val data = mapOf(
                    "userId" to userId,
                    "schoolId" to schoolId,
                    "role" to role,
                    "token" to token,
                    "updatedAt" to Timestamp.now()
                )
                FirebaseFirestore.getInstance()
                    .collection("fcm_tokens")
                    .document(userId)
                    .set(data, SetOptions.merge())

                // Subscribe to school-wide and role-specific topics
                if (schoolId.isNotEmpty()) {
                    subscribeToTopic("school_$schoolId")
                    subscribeToTopic("${schoolId}_$role")
                }
            } else {
                Log.e("NotificationHelper", "Failed to get FCM token", task.exception)
            }
        }
    }

    fun subscribeToTopic(topic: String) {
        val cleanTopic = topic.replace(" ", "_").replace(".", "_").lowercase()
        FirebaseMessaging.getInstance().subscribeToTopic(cleanTopic)
            .addOnCompleteListener { task ->
                if (task.isSuccessful) {
                    Log.d("NotificationHelper", "Subscribed to topic: $cleanTopic")
                }
            }
    }

    fun unsubscribeFromTopic(topic: String) {
        val cleanTopic = topic.replace(" ", "_").replace(".", "_").lowercase()
        FirebaseMessaging.getInstance().unsubscribeFromTopic(cleanTopic)
    }
}
