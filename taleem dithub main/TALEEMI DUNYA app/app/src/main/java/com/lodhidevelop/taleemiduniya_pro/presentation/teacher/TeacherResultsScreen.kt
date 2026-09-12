package com.lodhidevelop.taleemiduniya_pro.presentation.teacher

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.rounded.ArrowBack
import androidx.compose.material.icons.rounded.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.compose.ui.res.stringResource
import com.lodhidevelop.taleemiduniya_pro.R
import com.lodhidevelop.taleemiduniya_pro.presentation.common.*

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun TeacherResultsScreen(
    className: String,
    section: String,
    viewModel: TeacherResultsViewModel = hiltViewModel(),
    onBack: () -> Unit
) {
    val uiState by viewModel.uiState.collectAsState()
    val students by viewModel.students.collectAsState()

    var examName by remember { mutableStateOf("") }
    var subject by remember { mutableStateOf("") }
    var totalMarks by remember { mutableIntStateOf(100) }

    LaunchedEffect(Unit) {
        viewModel.loadStudents(className, section)
    }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Paper Checking & Marksheets: $className-$section") },
                navigationIcon = {
                    IconButton(onClick = onBack) {
                        Icon(Icons.AutoMirrored.Rounded.ArrowBack, contentDescription = "Back")
                    }
                }
            )
        }
    ) { padding ->
        when (val state = uiState) {
            is TeacherResultsUiState.Loading -> LoadingSkeleton(Modifier.padding(padding))
            is TeacherResultsUiState.Error -> ErrorState(state.message, { viewModel.loadStudents(className, section) }, Modifier.padding(padding))
            is TeacherResultsUiState.Submitted -> {
                Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                    Column(
                        horizontalAlignment = Alignment.CenterHorizontally,
                        modifier = Modifier.padding(24.dp)
                    ) {
                        Icon(Icons.Rounded.CheckCircle, null, tint = Color(0xFF4CAF50), modifier = Modifier.size(72.dp))
                        Spacer(Modifier.height(16.dp))
                        Text("Marksheet Published & Logged!", style = MaterialTheme.typography.headlineSmall, fontWeight = FontWeight.Bold)
                        Spacer(Modifier.height(8.dp))
                        Text("Results have been published for students and activity updated on Web Portal.", style = MaterialTheme.typography.bodyMedium, color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.7f))
                        Spacer(Modifier.height(24.dp))
                        Button(onClick = onBack, shape = RoundedCornerShape(16.dp)) { Text("Back to Dashboard", fontWeight = FontWeight.Bold) }
                    }
                }
            }
            else -> {
                ResultsList(
                    students = students,
                    examName = examName,
                    onExamNameChange = { examName = it },
                    subject = subject,
                    onSubjectChange = { subject = it },
                    totalMarks = totalMarks,
                    onTotalMarksChange = { totalMarks = it },
                    onMarksChange = { id, marks -> viewModel.updateMarks(id, marks, totalMarks) },
                    onSubmit = { viewModel.submitResults(examName, subject) },
                    isSubmitting = state is TeacherResultsUiState.Submitting,
                    padding = padding
                )
            }
        }
    }
}

@Composable
fun ResultsList(
    students: List<StudentResultState>,
    examName: String,
    onExamNameChange: (String) -> Unit,
    subject: String,
    onSubjectChange: (String) -> Unit,
    totalMarks: Int,
    onTotalMarksChange: (Int) -> Unit,
    onMarksChange: (String, Int) -> Unit,
    onSubmit: () -> Unit,
    isSubmitting: Boolean,
    padding: PaddingValues
) {
    var searchQuery by remember { mutableStateOf("") }
    val filteredStudents = students.filter { it.student.name.contains(searchQuery, ignoreCase = true) || it.student.rollNumber.contains(searchQuery, ignoreCase = true) }

    val enteredCount = students.count { it.obtainedMarks > 0 }
    val passCount = students.count { it.obtainedMarks >= (totalMarks * 0.4) && it.obtainedMarks > 0 }
    val avgMarks = if (enteredCount > 0) students.filter { it.obtainedMarks > 0 }.map { it.obtainedMarks }.average().toInt() else 0

    Column(
        modifier = Modifier
            .fillMaxSize()
            .padding(padding)
            .background(MaterialTheme.colorScheme.background)
    ) {
        // Marksheet Class Summary Card
        Card(
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 24.dp, vertical = 12.dp),
            shape = RoundedCornerShape(20.dp),
            colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.primaryContainer.copy(alpha = 0.5f))
        ) {
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(16.dp),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Column {
                    Text("Total Students: ${students.size}", style = MaterialTheme.typography.titleSmall, fontWeight = FontWeight.Bold)
                    Text("Evaluated: $enteredCount / ${students.size}", style = MaterialTheme.typography.bodySmall)
                }
                Column(horizontalAlignment = Alignment.End) {
                    Text("Class Avg: $avgMarks / $totalMarks", style = MaterialTheme.typography.titleSmall, fontWeight = FontWeight.Bold, color = MaterialTheme.colorScheme.primary)
                    Text("Passed: $passCount", style = MaterialTheme.typography.bodySmall, color = Color(0xFF4CAF50), fontWeight = FontWeight.Bold)
                }
            }
        }

        // Input Setup Card
        Card(
            modifier = Modifier.padding(horizontal = 24.dp, vertical = 8.dp),
            shape = RoundedCornerShape(20.dp),
            colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface)
        ) {
            Column(modifier = Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
                Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                    OutlinedTextField(
                        value = examName,
                        onValueChange = onExamNameChange,
                        label = { Text("Exam / Test Name") },
                        placeholder = { Text("e.g. Midterm 2026") },
                        modifier = Modifier.weight(1f),
                        shape = RoundedCornerShape(12.dp),
                        singleLine = true
                    )
                    OutlinedTextField(
                        value = totalMarks.toString(),
                        onValueChange = { onTotalMarksChange(it.toIntOrNull() ?: 100) },
                        label = { Text("Total") },
                        modifier = Modifier.width(90.dp),
                        keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number),
                        shape = RoundedCornerShape(12.dp),
                        singleLine = true
                    )
                }

                OutlinedTextField(
                    value = subject,
                    onValueChange = onSubjectChange,
                    label = { Text("Subject") },
                    placeholder = { Text("e.g. Science / Mathematics") },
                    modifier = Modifier.fillMaxWidth(),
                    shape = RoundedCornerShape(12.dp),
                    singleLine = true
                )

                HorizontalDivider(modifier = Modifier.padding(vertical = 2.dp), color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.1f))

                OutlinedTextField(
                    value = searchQuery,
                    onValueChange = { searchQuery = it },
                    placeholder = { Text("Search by student name or roll no...") },
                    modifier = Modifier.fillMaxWidth(),
                    shape = RoundedCornerShape(12.dp),
                    leadingIcon = { Icon(Icons.Rounded.Search, null) },
                    singleLine = true
                )
            }
        }

        LazyColumn(
            modifier = Modifier.weight(1f),
            contentPadding = PaddingValues(horizontal = 24.dp, vertical = 8.dp),
            verticalArrangement = Arrangement.spacedBy(12.dp)
        ) {
            items(filteredStudents) { state ->
                StudentResultItem(state, totalMarks, onMarksChange)
            }
        }
        
        Button(
            onClick = onSubmit,
            modifier = Modifier
                .fillMaxWidth()
                .padding(24.dp)
                .height(56.dp),
            shape = RoundedCornerShape(16.dp),
            enabled = !isSubmitting && examName.isNotEmpty() && subject.isNotEmpty() && students.isNotEmpty()
        ) {
            if (isSubmitting) {
                CircularProgressIndicator(modifier = Modifier.size(24.dp), color = Color.White)
            } else {
                Icon(Icons.Rounded.CloudUpload, null)
                Spacer(modifier = Modifier.width(8.dp))
                Text("Publish Marksheet & Log Activity", style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold)
            }
        }
    }
}


@Composable
fun StudentResultItem(
    state: StudentResultState, 
    totalMarks: Int,
    onMarksChange: (String, Int) -> Unit
) {
    var marksText by remember(state.obtainedMarks) { mutableStateOf(if (state.obtainedMarks == 0) "" else state.obtainedMarks.toString()) }

    val percentage = if (totalMarks > 0) ((state.obtainedMarks * 100) / totalMarks) else 0
    val grade = when {
        percentage >= 80 -> "A+"
        percentage >= 70 -> "A"
        percentage >= 60 -> "B"
        percentage >= 50 -> "C"
        percentage >= 40 -> "D"
        else -> "F"
    }

    val gradeColor = when (grade) {
        "A+", "A" -> Color(0xFF2E7D32)
        "B", "C" -> Color(0xFF1565C0)
        "D" -> Color(0xFFE65100)
        else -> Color(0xFFC62828)
    }

    Card(
        modifier = Modifier.fillMaxWidth(),
        shape = RoundedCornerShape(20.dp),
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
        elevation = CardDefaults.cardElevation(defaultElevation = 2.dp)
    ) {
        Row(
            modifier = Modifier.padding(16.dp),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.SpaceBetween
        ) {
            Column(modifier = Modifier.weight(1f)) {
                Text(state.student.name, style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold)
                Text("Roll No: ${state.student.rollNumber}", style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.6f))
                
                if (state.obtainedMarks > 0) {
                    Spacer(modifier = Modifier.height(4.dp))
                    Surface(
                        color = gradeColor.copy(alpha = 0.15f),
                        shape = RoundedCornerShape(8.dp)
                    ) {
                        Text(
                            text = "Grade: $grade ($percentage%)",
                            color = gradeColor,
                            style = MaterialTheme.typography.labelSmall,
                            fontWeight = FontWeight.Bold,
                            modifier = Modifier.padding(horizontal = 8.dp, vertical = 2.dp)
                        )
                    }
                }
            }
            
            OutlinedTextField(
                value = marksText,
                onValueChange = { 
                    val filtered = it.filter { char -> char.isDigit() }
                    val num = filtered.toIntOrNull() ?: 0
                    if (num <= totalMarks) {
                        marksText = filtered
                        onMarksChange(state.student.id, num)
                    }
                },
                label = { Text("Obtained") },
                placeholder = { Text("0") },
                modifier = Modifier.width(110.dp),
                keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number),
                shape = RoundedCornerShape(12.dp),
                singleLine = true
            )
        }
    }
}
