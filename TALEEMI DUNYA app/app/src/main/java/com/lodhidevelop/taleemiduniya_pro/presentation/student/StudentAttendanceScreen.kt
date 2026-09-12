package com.lodhidevelop.taleemiduniya_pro.presentation.student

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
import com.lodhidevelop.taleemiduniya_pro.data.model.AttendanceRecord
import com.lodhidevelop.taleemiduniya_pro.presentation.common.*
import java.text.SimpleDateFormat
import java.util.*

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun StudentAttendanceScreen(
    viewModel: StudentDashboardViewModel = hiltViewModel(),
    onBack: () -> Unit
) {
    val uiState by viewModel.uiState.collectAsState()
    var selectedMonth by remember { mutableIntStateOf(Calendar.getInstance().get(Calendar.MONTH)) }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Attendance History") },
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
                AttendanceContent(
                    attendance = state.attendance,
                    selectedMonth = selectedMonth,
                    onMonthChange = { selectedMonth = it },
                    padding = padding
                )
            }
        }
    }
}

@Composable
fun AttendanceContent(
    attendance: List<AttendanceRecord>,
    selectedMonth: Int,
    onMonthChange: (Int) -> Unit,
    padding: PaddingValues
) {
    val filteredAttendance = attendance.filter {
        try {
            val date = SimpleDateFormat("yyyy-MM-dd", Locale.getDefault()).parse(it.date)
            val cal = Calendar.getInstance().apply { time = date!! }
            cal.get(Calendar.MONTH) == selectedMonth
        } catch (e: Exception) {
            false
        }
    }

    val present = filteredAttendance.count { it.status.lowercase() == "present" }
    val absent = filteredAttendance.count { it.status.lowercase() == "absent" }
    val late = filteredAttendance.count { it.status.lowercase() == "late" }
    val leave = filteredAttendance.count { it.status.lowercase() == "leave" }

    Column(
        modifier = Modifier
            .fillMaxSize()
            .padding(padding)
            .background(MaterialTheme.colorScheme.background)
    ) {
        MonthSelector(selectedMonth, onMonthChange)
        
        AttendanceSummary(present, absent, late, leave)
        
        SectionHeader(title = "Daily Records")
        
        if (filteredAttendance.isEmpty()) {
            Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                Text("No attendance records for this month.", color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.5f))
            }
        } else {
            LazyColumn(
                modifier = Modifier.fillMaxSize(),
                contentPadding = PaddingValues(horizontal = 24.dp, vertical = 8.dp),
                verticalArrangement = Arrangement.spacedBy(12.dp)
            ) {
                items(filteredAttendance) { record ->
                    AttendanceItem(record)
                }
            }
        }
    }
}

@Composable
fun MonthSelector(selectedMonth: Int, onMonthChange: (Int) -> Unit) {
    val months = arrayOf("Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec")
    
    ScrollableTabRow(
        selectedTabIndex = selectedMonth,
        edgePadding = 16.dp,
        containerColor = Color.Transparent,
        divider = {}
    ) {
        months.forEachIndexed { index, month ->
            Tab(
                selected = selectedMonth == index,
                onClick = { onMonthChange(index) },
                text = { Text(month) }
            )
        }
    }
}

@Composable
fun AttendanceSummary(present: Int, absent: Int, late: Int, leave: Int) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .padding(24.dp),
        horizontalArrangement = Arrangement.SpaceBetween
    ) {
        SummaryCard("Present", present.toString(), Color(0xFF4CAF50), Modifier.weight(1f))
        SummaryCard("Absent", absent.toString(), Color(0xFFF44336), Modifier.weight(1f))
        SummaryCard("Late", late.toString(), Color(0xFFFF9800), Modifier.weight(1f))
        SummaryCard("Leave", leave.toString(), Color(0xFF2196F3), Modifier.weight(1f))
    }
}

@Composable
fun SummaryCard(label: String, value: String, color: Color, modifier: Modifier = Modifier) {
    Column(
        modifier = modifier.padding(4.dp),
        horizontalAlignment = Alignment.CenterHorizontally
    ) {
        Text(value, style = MaterialTheme.typography.headlineSmall, fontWeight = FontWeight.Bold, color = color)
        Text(label, style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.6f))
    }
}

@Composable
fun AttendanceItem(record: AttendanceRecord) {
    Card(
        modifier = Modifier.fillMaxWidth(),
        shape = RoundedCornerShape(16.dp),
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface)
    ) {
        Row(
            modifier = Modifier.padding(16.dp),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.SpaceBetween
        ) {
            Column {
                Text(
                    text = formatDate(record.date),
                    style = MaterialTheme.typography.titleMedium,
                    fontWeight = FontWeight.Bold
                )
                if (!record.checkInTime.isNullOrEmpty()) {
                    Text(
                        text = "Check-in: ${record.checkInTime}",
                        style = MaterialTheme.typography.bodySmall,
                        color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.6f)
                    )
                }
            }
            
            val statusColor = when (record.status.lowercase()) {
                "present" -> Color(0xFF4CAF50)
                "absent" -> Color(0xFFF44336)
                "late" -> Color(0xFFFF9800)
                "leave" -> Color(0xFF2196F3)
                else -> MaterialTheme.colorScheme.onSurface
            }
            
            Surface(
                color = statusColor.copy(alpha = 0.1f),
                shape = RoundedCornerShape(8.dp)
            ) {
                Text(
                    text = record.status,
                    modifier = Modifier.padding(horizontal = 12.dp, vertical = 4.dp),
                    color = statusColor,
                    style = MaterialTheme.typography.labelMedium,
                    fontWeight = FontWeight.Bold
                )
            }
        }
    }
}

fun formatDate(dateStr: String): String {
    return try {
        val parser = SimpleDateFormat("yyyy-MM-dd", Locale.getDefault())
        val formatter = SimpleDateFormat("EEE, dd MMM yyyy", Locale.getDefault())
        formatter.format(parser.parse(dateStr)!!)
    } catch (e: Exception) {
        dateStr
    }
}
