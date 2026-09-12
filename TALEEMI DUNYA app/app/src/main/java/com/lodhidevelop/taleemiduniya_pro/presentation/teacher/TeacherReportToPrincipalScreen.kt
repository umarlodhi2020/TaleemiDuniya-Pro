package com.lodhidevelop.taleemiduniya_pro.presentation.teacher

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.rounded.ArrowBack
import androidx.compose.material.icons.rounded.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import com.lodhidevelop.taleemiduniya_pro.data.remote.AuthApiService
import com.lodhidevelop.taleemiduniya_pro.data.repository.TeacherRepository
import com.lodhidevelop.taleemiduniya_pro.presentation.common.*
import kotlinx.coroutines.launch

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun TeacherReportToPrincipalScreen(
    teacherId: String,
    teacherName: String,
    schoolId: String,
    viewModel: TeacherDashboardViewModel = hiltViewModel(),
    onBack: () -> Unit
) {
    var reportType by remember { mutableStateOf("Daily Class Progress") }
    var subject by remember { mutableStateOf("") }
    var className by remember { mutableStateOf("") }
    var section by remember { mutableStateOf("A") }
    var content by remember { mutableStateOf("") }
    var isSubmitting by remember { mutableStateOf(false) }
    var isSuccess by remember { mutableStateOf(false) }
    var errorMessage by remember { mutableStateOf("") }

    val scope = rememberCoroutineScope()
    val reportTypes = listOf(
        "Daily Class Progress",
        "Paper Checking & Grading Done",
        "Syllabus Coverage Update",
        "Class Discipline Notice",
        "General Update"
    )

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Report to Principal / Admin") },
                navigationIcon = {
                    IconButton(onClick = onBack) {
                        Icon(Icons.AutoMirrored.Rounded.ArrowBack, contentDescription = "Back")
                    }
                }
            )
        }
    ) { padding ->
        if (isSuccess) {
            Box(
                modifier = Modifier
                    .fillMaxSize()
                    .padding(padding),
                contentAlignment = Alignment.Center
            ) {
                Column(
                    horizontalAlignment = Alignment.CenterHorizontally,
                    modifier = Modifier.padding(24.dp)
                ) {
                    Icon(
                        Icons.Rounded.CheckCircle,
                        contentDescription = null,
                        tint = Color(0xFF4CAF50),
                        modifier = Modifier.size(72.dp)
                    )
                    Spacer(modifier = Modifier.height(16.dp))
                    Text(
                        text = "Report Sent to Principal!",
                        style = MaterialTheme.typography.headlineSmall,
                        fontWeight = FontWeight.Bold
                    )
                    Spacer(modifier = Modifier.height(8.dp))
                    Text(
                        text = "Your work update has been logged and sent to the Principal/Admin Web App.",
                        style = MaterialTheme.typography.bodyMedium,
                        color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.7f)
                    )
                    Spacer(modifier = Modifier.height(24.dp))
                    Button(
                        onClick = onBack,
                        shape = RoundedCornerShape(16.dp),
                        modifier = Modifier.height(50.dp)
                    ) {
                        Text("Back to Dashboard", fontWeight = FontWeight.Bold)
                    }
                }
            }
        } else {
            Column(
                modifier = Modifier
                    .fillMaxSize()
                    .padding(padding)
                    .verticalScroll(rememberScrollState())
                    .padding(24.dp),
                verticalArrangement = Arrangement.spacedBy(16.dp)
            ) {
                Text(
                    text = "Submit Work Update / Activity Report",
                    style = MaterialTheme.typography.titleMedium,
                    fontWeight = FontWeight.Bold,
                    color = MaterialTheme.colorScheme.primary
                )
                Text(
                    text = "This report will be synced directly to the Principal & Admin Web Portal so they can monitor teacher performance.",
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.6f)
                )

                Spacer(modifier = Modifier.height(4.dp))

                // Report Category Dropdown
                Text("Report Type", style = MaterialTheme.typography.labelMedium, fontWeight = FontWeight.Bold)
                Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                    reportTypes.forEach { type ->
                        FilterChip(
                            selected = reportType == type,
                            onClick = { reportType = type },
                            label = { Text(type) },
                            leadingIcon = if (reportType == type) {
                                { Icon(Icons.Rounded.Check, null) }
                            } else null,
                            shape = RoundedCornerShape(12.dp)
                        )
                    }
                }

                Spacer(modifier = Modifier.height(8.dp))

                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.spacedBy(12.dp)
                ) {
                    OutlinedTextField(
                        value = className,
                        onValueChange = { className = it },
                        label = { Text("Class (e.g. 10)") },
                        modifier = Modifier.weight(1f),
                        shape = RoundedCornerShape(16.dp),
                        singleLine = true
                    )
                    OutlinedTextField(
                        value = section,
                        onValueChange = { section = it },
                        label = { Text("Section (e.g. A)") },
                        modifier = Modifier.weight(1f),
                        shape = RoundedCornerShape(16.dp),
                        singleLine = true
                    )
                }

                OutlinedTextField(
                    value = subject,
                    onValueChange = { subject = it },
                    label = { Text("Subject / Topic") },
                    placeholder = { Text("e.g. Mathematics - Chapter 4 Checked") },
                    modifier = Modifier.fillMaxWidth(),
                    shape = RoundedCornerShape(16.dp),
                    singleLine = true
                )

                OutlinedTextField(
                    value = content,
                    onValueChange = { content = it },
                    label = { Text("Detailed Work / Activity Description") },
                    placeholder = { Text("Describe today's lecture, test papers checked, or class updates...") },
                    modifier = Modifier
                        .fillMaxWidth()
                        .height(160.dp),
                    shape = RoundedCornerShape(16.dp)
                )

                if (errorMessage.isNotEmpty()) {
                    Text(
                        text = errorMessage,
                        color = MaterialTheme.colorScheme.error,
                        style = MaterialTheme.typography.bodySmall,
                        fontWeight = FontWeight.Bold
                    )
                }

                Spacer(modifier = Modifier.height(16.dp))

                Button(
                    onClick = {
                        isSubmitting = true
                        errorMessage = ""
                        viewModel.sendReportToPrincipal(
                            reportType = reportType,
                            subject = subject,
                            content = content,
                            className = className,
                            section = section
                        ) { success, error ->
                            isSubmitting = false
                            if (success) {
                                isSuccess = true
                            } else {
                                errorMessage = error ?: "Failed to send report"
                            }
                        }
                    },
                    modifier = Modifier
                        .fillMaxWidth()
                        .height(56.dp),
                    shape = RoundedCornerShape(16.dp),
                    enabled = subject.isNotEmpty() && content.isNotEmpty() && !isSubmitting
                ) {
                    if (isSubmitting) {
                        CircularProgressIndicator(modifier = Modifier.size(24.dp), color = Color.White)
                    } else {
                        Icon(Icons.Rounded.Send, null)
                        Spacer(modifier = Modifier.width(8.dp))
                        Text("Send Update to Principal", style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold)
                    }
                }
            }
        }
    }
}
