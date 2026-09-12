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
import androidx.compose.ui.unit.sp
import androidx.hilt.navigation.compose.hiltViewModel
import com.lodhidevelop.taleemiduniya_pro.data.model.TimetableRecord
import com.lodhidevelop.taleemiduniya_pro.presentation.common.*

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun StudentTimetableScreen(
    viewModel: StudentDashboardViewModel = hiltViewModel(),
    onBack: () -> Unit
) {
    val uiState by viewModel.uiState.collectAsState()

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Class Timetable") },
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
                TimetableContent(state.timetable, padding)
            }
        }
    }
}

@Composable
fun TimetableContent(timetable: List<TimetableRecord>, padding: PaddingValues) {
    val days = listOf("Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday")
    var selectedDay by remember { mutableStateOf(days.first()) }

    Column(
        modifier = Modifier
            .fillMaxSize()
            .padding(padding)
            .background(MaterialTheme.colorScheme.background)
    ) {
        ScrollableTabRow(
            selectedTabIndex = days.indexOf(selectedDay),
            edgePadding = 24.dp,
            containerColor = MaterialTheme.colorScheme.surface,
            contentColor = MaterialTheme.colorScheme.primary,
            divider = {}
        ) {
            days.forEach { day ->
                Tab(
                    selected = selectedDay == day,
                    onClick = { selectedDay = day },
                    text = { Text(day) }
                )
            }
        }

        val dayTimetable = timetable.filter { it.day.equals(selectedDay, ignoreCase = true) }

        if (dayTimetable.isEmpty()) {
            Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                Text("No classes scheduled for $selectedDay.", color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.5f))
            }
        } else {
            LazyColumn(
                modifier = Modifier.fillMaxSize(),
                contentPadding = PaddingValues(24.dp),
                verticalArrangement = Arrangement.spacedBy(16.dp)
            ) {
                items(dayTimetable) { period ->
                    TimetableItem(period)
                }
            }
        }
    }
}

@Composable
fun TimetableItem(period: TimetableRecord) {
    Card(
        modifier = Modifier.fillMaxWidth(),
        shape = RoundedCornerShape(20.dp),
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
        elevation = CardDefaults.cardElevation(defaultElevation = 2.dp)
    ) {
        Row(
            modifier = Modifier.padding(16.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            Surface(
                color = MaterialTheme.colorScheme.primaryContainer,
                shape = RoundedCornerShape(12.dp),
                modifier = Modifier.size(60.dp)
            ) {
                Box(contentAlignment = Alignment.Center) {
                    Text(
                        period.time.split(" ").first(),
                        style = MaterialTheme.typography.titleSmall,
                        fontWeight = FontWeight.Bold,
                        color = MaterialTheme.colorScheme.primary
                    )
                }
            }
            
            Spacer(modifier = Modifier.width(16.dp))
            
            Column {
                Text(period.subject, style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold)
                Text("${period.teacherName} • Room: ${period.room}", style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.6f))
                Text(period.time, style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.primary)
            }
        }
    }
}
