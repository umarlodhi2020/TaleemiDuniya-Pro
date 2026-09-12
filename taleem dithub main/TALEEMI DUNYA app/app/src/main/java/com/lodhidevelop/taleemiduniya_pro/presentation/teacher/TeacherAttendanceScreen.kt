package com.lodhidevelop.taleemiduniya_pro.presentation.teacher

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
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
import androidx.compose.ui.res.stringResource
import com.lodhidevelop.taleemiduniya_pro.R
import com.lodhidevelop.taleemiduniya_pro.presentation.common.*

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun TeacherAttendanceScreen(
    className: String,
    section: String,
    schoolId: String,
    viewModel: TeacherAttendanceViewModel = hiltViewModel(),
    onBack: () -> Unit
) {
    val uiState by viewModel.uiState.collectAsState()
    val students by viewModel.students.collectAsState()

    LaunchedEffect(Unit) {
        viewModel.loadStudents(className, section)
    }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("${stringResource(R.string.mark_attendance)}: $className-$section") },
                navigationIcon = {
                    IconButton(onClick = onBack) {
                        Icon(Icons.AutoMirrored.Rounded.ArrowBack, contentDescription = "Back")
                    }
                }
            )
        }
    ) { padding ->
        when (val state = uiState) {
            is TeacherAttendanceUiState.Loading -> LoadingSkeleton(Modifier.padding(padding))
            is TeacherAttendanceUiState.Error -> ErrorState(state.message, { viewModel.loadStudents(className, section) }, Modifier.padding(padding))
            is TeacherAttendanceUiState.Submitted -> {
                Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                    Column(horizontalAlignment = Alignment.CenterHorizontally) {
                        Icon(Icons.Rounded.CheckCircle, null, tint = Color(0xFF4CAF50), modifier = Modifier.size(64.dp))
                        Spacer(Modifier.height(16.dp))
                        Text("Attendance Submitted!", style = MaterialTheme.typography.headlineSmall)
                        Spacer(Modifier.height(24.dp))
                        Button(onClick = onBack) { Text("Back to Dashboard") }
                    }
                }
            }
            else -> {
                AttendanceList(
                    students = students,
                    onStatusChange = { id, status -> viewModel.updateAttendance(id, status) },
                    onSubmit = { viewModel.submitAttendance(schoolId, className, section) },
                    isSubmitting = state is TeacherAttendanceUiState.Submitting,
                    padding = padding
                )
            }
        }
    }
}

@Composable
fun AttendanceList(
    students: List<StudentAttendanceState>,
    onStatusChange: (String, String) -> Unit,
    onSubmit: () -> Unit,
    isSubmitting: Boolean,
    padding: PaddingValues
) {
    var searchQuery by remember { mutableStateOf("") }
    val filteredStudents = students.filter { it.student.name.contains(searchQuery, ignoreCase = true) }

    Column(
        modifier = Modifier
            .fillMaxSize()
            .padding(padding)
            .background(MaterialTheme.colorScheme.background)
    ) {
        // Search and Bulk Actions
        Row(
            modifier = Modifier.padding(horizontal = 24.dp, vertical = 8.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            OutlinedTextField(
                value = searchQuery,
                onValueChange = { searchQuery = it },
                placeholder = { Text("Search Student...") },
                modifier = Modifier.weight(1f),
                shape = RoundedCornerShape(12.dp),
                leadingIcon = { Icon(Icons.Rounded.Search, null) },
                singleLine = true
            )
            Spacer(Modifier.width(8.dp))
            TextButton(onClick = { 
                students.forEach { onStatusChange(it.student.id, "Present") }
            }) {
                Text("All Present")
            }
        }

        LazyColumn(
            modifier = Modifier.weight(1f),
            contentPadding = PaddingValues(horizontal = 24.dp, vertical = 8.dp),
            verticalArrangement = Arrangement.spacedBy(16.dp)
        ) {
            items(filteredStudents) { state ->
                AttendanceItem(state, onStatusChange)
            }
        }
        
        Button(
            onClick = onSubmit,
            modifier = Modifier
                .fillMaxWidth()
                .padding(24.dp)
                .height(56.dp),
            shape = RoundedCornerShape(16.dp),
            enabled = !isSubmitting && students.isNotEmpty()
        ) {
            if (isSubmitting) {
                CircularProgressIndicator(modifier = Modifier.size(24.dp), color = Color.White)
            } else {
                Text("Submit Attendance", style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold)
            }
        }
    }
}


@Composable
fun AttendanceItem(state: StudentAttendanceState, onStatusChange: (String, String) -> Unit) {
    Card(
        modifier = Modifier.fillMaxWidth(),
        shape = RoundedCornerShape(20.dp),
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface)
    ) {
        Row(
            modifier = Modifier.padding(16.dp),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.SpaceBetween
        ) {
            Column(modifier = Modifier.weight(1f)) {
                Text(state.student.name, style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold)
                Text("Roll No: ${state.student.rollNumber}", style = MaterialTheme.typography.bodySmall)
            }
            
            Row {
                AttendanceChip(
                    text = "P",
                    isSelected = state.status == "Present",
                    color = Color(0xFF4CAF50),
                    onClick = { onStatusChange(state.student.id, "Present") }
                )
                Spacer(Modifier.width(8.dp))
                AttendanceChip(
                    text = "A",
                    isSelected = state.status == "Absent",
                    color = Color(0xFFF44336),
                    onClick = { onStatusChange(state.student.id, "Absent") }
                )
            }
        }
    }
}

@Composable
fun AttendanceChip(text: String, isSelected: Boolean, color: Color, onClick: () -> Unit) {
    Surface(
        onClick = onClick,
        color = if (isSelected) color else color.copy(alpha = 0.1f),
        shape = CircleShape,
        modifier = Modifier.size(40.dp)
    ) {
        Box(contentAlignment = Alignment.Center) {
            Text(
                text = text,
                color = if (isSelected) Color.White else color,
                fontWeight = FontWeight.Bold
            )
        }
    }
}
