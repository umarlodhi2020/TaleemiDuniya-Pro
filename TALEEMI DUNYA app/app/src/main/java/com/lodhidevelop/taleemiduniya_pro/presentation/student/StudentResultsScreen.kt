package com.lodhidevelop.taleemiduniya_pro.presentation.student

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
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
import com.lodhidevelop.taleemiduniya_pro.data.model.ResultRecord
import com.lodhidevelop.taleemiduniya_pro.data.model.StudentProfile
import com.lodhidevelop.taleemiduniya_pro.presentation.common.*
import com.lodhidevelop.taleemiduniya_pro.core.utils.ReportGenerator

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun StudentResultsScreen(
    viewModel: StudentDashboardViewModel = hiltViewModel(),
    onBack: () -> Unit
) {
    val uiState by viewModel.uiState.collectAsState()

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Exam Results") },
                navigationIcon = {
                    IconButton(onClick = onBack) {
                        Icon(Icons.AutoMirrored.Rounded.ArrowBack, contentDescription = "Back")
                    }
                }
            )
        }
    ) { padding ->
        when (val state = uiState) {
            is StudentDashboardUiState.Loading -> LoadingSkeleton(Modifier.padding(padding))
            is StudentDashboardUiState.Error -> ErrorState(state.message, { viewModel.loadDashboardData() }, Modifier.padding(padding))
            is StudentDashboardUiState.Success -> {
                ResultsContent(state.profile, state.results, padding)
            }
        }
    }
}

@Composable
fun ResultsContent(
    profile: StudentProfile,
    results: List<ResultRecord>,
    padding: PaddingValues
) {
    Column(
        modifier = Modifier
            .fillMaxSize()
            .padding(padding)
            .background(MaterialTheme.colorScheme.background)
    ) {
        if (results.isEmpty()) {
            Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                Text("No exam results published yet.", color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.5f))
            }
        } else {
            val exams = results.groupBy { it.examName }
            LazyColumn(
                modifier = Modifier.fillMaxSize(),
                contentPadding = PaddingValues(horizontal = 24.dp, vertical = 24.dp),
                verticalArrangement = Arrangement.spacedBy(24.dp)
            ) {
                exams.forEach { (examName, examResults) ->
                    item {
                        ExamResultCard(profile, examName, examResults)
                    }
                }
            }
        }
    }
}

@Composable
fun ExamResultCard(
    profile: StudentProfile,
    examName: String,
    results: List<ResultRecord>
) {
    val context = androidx.compose.ui.platform.LocalContext.current
    val totalObtained = results.sumOf { it.obtainedMarks }
    val totalPossible = results.sumOf { it.totalMarks }
    val percentage = if (totalPossible > 0) (totalObtained * 100) / totalPossible else 0

    Card(
        modifier = Modifier.fillMaxWidth(),
        shape = RoundedCornerShape(24.dp),
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
        elevation = CardDefaults.cardElevation(defaultElevation = 2.dp)
    ) {
        Column(modifier = Modifier.padding(20.dp)) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Column {
                    Text(examName, style = MaterialTheme.typography.titleLarge, fontWeight = FontWeight.Bold)
                    Text("Class: ${profile.className}-${profile.section}", style = MaterialTheme.typography.bodySmall)
                }
                Surface(
                    color = MaterialTheme.colorScheme.primaryContainer,
                    shape = RoundedCornerShape(12.dp)
                ) {
                    Text(
                        "$percentage%",
                        modifier = Modifier.padding(horizontal = 12.dp, vertical = 6.dp),
                        color = MaterialTheme.colorScheme.primary,
                        fontWeight = FontWeight.Bold
                    )
                }
            }

            Spacer(modifier = Modifier.height(16.dp))

            results.forEach { result ->
                ResultRow(result)
                HorizontalDivider(
                    modifier = Modifier.padding(vertical = 8.dp),
                    color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.05f)
                )
            }

            Spacer(modifier = Modifier.height(8.dp))

            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Column {
                    Text("Total Marks", fontWeight = FontWeight.SemiBold)
                    Text("$totalObtained / $totalPossible", fontWeight = FontWeight.Bold, color = MaterialTheme.colorScheme.primary)
                }

                OutlinedButton(
                    onClick = {
                        ReportGenerator.generateResultCardPdf(
                            context = context,
                            studentName = profile.name.ifEmpty { "Student" },
                            className = "${profile.className}-${profile.section}",
                            rollNo = profile.rollNumber,
                            examName = examName,
                            results = results
                        )
                    },
                    shape = RoundedCornerShape(12.dp)
                ) {
                    Icon(Icons.Rounded.PictureAsPdf, contentDescription = null, modifier = Modifier.size(18.dp))
                    Spacer(Modifier.width(6.dp))
                    Text("Download PDF Marksheet")
                }
            }
        }
    }
}

@Composable
fun ResultRow(result: ResultRecord) {
    Row(
        modifier = Modifier.fillMaxWidth(),
        horizontalArrangement = Arrangement.SpaceBetween,
        verticalAlignment = Alignment.CenterVertically
    ) {
        Column {
            Text(result.subject, style = MaterialTheme.typography.bodyLarge, fontWeight = FontWeight.Medium)
            Text("Grade: ${result.grade}", style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.6f))
        }
        Text("${result.obtainedMarks}/${result.totalMarks}", fontWeight = FontWeight.SemiBold)
    }
}
