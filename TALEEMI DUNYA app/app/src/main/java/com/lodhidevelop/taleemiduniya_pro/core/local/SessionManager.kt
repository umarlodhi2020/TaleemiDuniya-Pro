package com.lodhidevelop.taleemiduniya_pro.core.local

import android.content.Context
import androidx.datastore.core.DataStore
import androidx.datastore.preferences.core.Preferences
import androidx.datastore.preferences.core.edit
import androidx.datastore.preferences.core.stringPreferencesKey
import androidx.datastore.preferences.preferencesDataStore
import dagger.hilt.android.qualifiers.ApplicationContext
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.map
import javax.inject.Inject
import javax.inject.Singleton

private val Context.dataStore: DataStore<Preferences> by preferencesDataStore(name = "session_prefs")

@Singleton
class SessionManager @Inject constructor(@ApplicationContext private val context: Context) {

    private val ROLE_KEY = stringPreferencesKey("role")
    private val SCHOOL_ID_KEY = stringPreferencesKey("school_id")
    private val TOKEN_KEY = stringPreferencesKey("token")
    private val USER_ID_KEY = stringPreferencesKey("user_id")
    private val SELECTED_CHILD_ID_KEY = stringPreferencesKey("selected_child_id")
    private val LANGUAGE_KEY = stringPreferencesKey("app_language")

    val role: Flow<String?> = context.dataStore.data.map { it[ROLE_KEY] }
    val schoolId: Flow<String?> = context.dataStore.data.map { it[SCHOOL_ID_KEY] }
    val token: Flow<String?> = context.dataStore.data.map { it[TOKEN_KEY] }
    val userId: Flow<String?> = context.dataStore.data.map { it[USER_ID_KEY] }
    val selectedChildId: Flow<String?> = context.dataStore.data.map { it[SELECTED_CHILD_ID_KEY] }
    val language: Flow<String> = context.dataStore.data.map { it[LANGUAGE_KEY] ?: "en" }

    suspend fun setLanguage(lang: String) {
        context.dataStore.edit { prefs ->
            prefs[LANGUAGE_KEY] = lang
        }
    }

    suspend fun saveSession(role: String, schoolId: String, token: String, userId: String) {
        context.dataStore.edit { prefs ->
            prefs[ROLE_KEY] = role
            prefs[SCHOOL_ID_KEY] = schoolId
            prefs[TOKEN_KEY] = token
            prefs[USER_ID_KEY] = userId
        }
    }

    suspend fun saveSelectedChildId(childId: String) {
        context.dataStore.edit { prefs ->
            prefs[SELECTED_CHILD_ID_KEY] = childId
        }
    }

    suspend fun clearSession() {
        context.dataStore.edit { it.clear() }
    }
}
