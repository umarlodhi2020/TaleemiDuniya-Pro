package com.lodhidevelop.taleemiduniya_pro.core.notifications

import com.google.firebase.messaging.FirebaseMessaging
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class NotificationHelper @Inject constructor() {

    fun subscribeToTopic(topic: String) {
        val cleanTopic = topic.replace(" ", "_").replace(".", "_")
        FirebaseMessaging.getInstance().subscribeToTopic(cleanTopic)
            .addOnCompleteListener { task ->
                if (task.isSuccessful) {
                    // Success
                }
            }
    }

    fun unsubscribeFromTopic(topic: String) {
        val cleanTopic = topic.replace(" ", "_").replace(".", "_")
        FirebaseMessaging.getInstance().unsubscribeFromTopic(cleanTopic)
    }
}
