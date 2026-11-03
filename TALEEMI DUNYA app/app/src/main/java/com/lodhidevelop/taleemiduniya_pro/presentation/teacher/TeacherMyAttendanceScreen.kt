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
import com.lodhidevelop.taleemiduniya_pro.data.model.AttendanceRecord
import com.lodhidevelop.taleemiduniya_pro.presentation.common.*
import com.lodhidevelop.taleemiduniya_pro.presentation.student.formatDate
import java.text.SimpleDateFormat
import java.util.*

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun TeacherMyAttendanceScreen(
    viewModel: TeacherDashboardViewModel = hiltViewModel(),
    onBack: () -> Unit
) {
    val uiState by viewModel.uiState.collectAsState()
    var selectedMonth by remember { mutableIntStateOf(Calendar.getInstance().get(Calendar.MONTH)) }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("My Attendance (IC Card)") },
                navigationIcon = {
                    IconButton(onClick = onBack) {
                        Icon(Icons.AutoMirrored.Rounded.ArrowBack, contentDescription = "Back")
                    }
                }
            )
        }
    ) { padding ->
        when (val state = uiState) {
            is TeacherDashboardUiState.Loading -> LoadingSkeleton(Modifier.padding(padding))
            is TeacherDashboardUiState.Error -> ErrorState(state.message, { viewModel.loadTeacherData() }, Modifier.padding(padding))
            is TeacherDashboardUiState.Success -> {
                TeacherMyAttendanceContent(
                    myAttendance = state.myAttendanceHistory,
                    todayRecord = state.myTodayAttendance,
                    selectedMonth = selectedMonth,
                    onMonthChange = { selectedMonth = it },
                    padding = padding
                )
            }
        }
    }
}

@Composable
fun TeacherMyAttendanceContent(
    myAttendance: List<AttendanceRecord>,
    todayRecord: AttendanceRecord?,
    selectedMonth: Int,
    onMonthChange: (Int) -> Unit,
    padding: PaddingValues
) {
    val filteredAttendance = myAttendance.filter {
        try {
            val date = SimpleDateFormat("yyyy-MM-dd", Locale.getDefault()).parse(it.date)
            val cal = Calendar.getInstance().apply { time = date!! }
            cal.get(Calendar.MONTH) == selectedMonth
        } catch (e: Exception) {
            true
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
        // Today's IC Card Status Banner
        Card(
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 24.dp, vertical = 12.dp),
            shape = RoundedCornerShape(24.dp),
            colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.primaryContainer)
        ) {
            Row(
                modifier = Modifier.padding(20.dp),
                verticalAlignment = Alignment.CenterVertically
            ) {
                Surface(
                    color = MaterialTheme.colorScheme.primary.copy(alpha = 0.2f),
                    shape = CircleShape,
                    modifier = Modifier.size(52.dp)
                ) {
                    Box(contentAlignment = Alignment.Center) {
                        Icon(Icons.Rounded.CreditCard, null, tint = MaterialTheme.colorScheme.primary, modifier = Modifier.size(28.dp))
                    }
                }
                Spacer(Modifier.width(16.dp))
                Column(modifier = Modifier.weight(1f)) {
                    Text("Today's IC Card Attendance", style = MaterialTheme.typography.labelMedium, color = MaterialTheme.colorScheme.primary)
                    if (todayRecord != null) {
                        Text("Status: ${todayRecord.status}", style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold)
                        todayRecord.checkInTime?.let {
                            Text("Check-in: $it (Web App IC Scan)", style = MaterialTheme.typography.bodySmall)
                        }
                    } else {
                        Text("Not Scanned Yet Today", style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold, color = Color(0xFFFF9800))
                        Text("Scan your IC card on Web App", style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                    }
                }
            }
        }

        // Month Selector
        TeacherMonthSelector(selectedMonth, onMonthChange)

        // Summary Cards
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 24.dp, vertical = 8.dp),
            horizontalArrangement = Arrangement.SpaceBetween
        ) {
            TeacherSummaryCard("Present", present.toString(), Color(0xFF4CAF50), Modifier.weight(1f))
            TeacherSummaryCard("Absent", absent.toString(), Color(0xFFF44336), Modifier.weight(1f))
            TeacherSummaryCard("Late", late.toString(), Color(0xFFFF9800), Modifier.weight(1f))
            TeacherSummaryCard("Leave", leave.toString(), Color(0xFF2196F3), Modifier.weight(1f))
        }

        SectionHeader(title = "IC Card Scan Records")

        if (filteredAttendance.isEmpty()) {
            Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                Text("No IC card attendance records for this month.", color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.5f))
            }
        } else {
            LazyColumn(
                modifier = Modifier.fillMaxSize(),
                contentPadding = PaddingValues(horizontal = 24.dp, vertical = 8.dp),
                verticalArrangement = Arrangement.spacedBy(12.dp)
            ) {
                items(filteredAttendance) { record ->
                    TeacherAttendanceItem(record)
                }
            }
        }
    }
}

@Composable
fun TeacherMonthSelector(selectedMonth: Int, onMonthChange: (Int) -> Unit) {
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
fun TeacherSummaryCard(label: String, value: String, color: Color, modifier: Modifier = Modifier) {
    Column(
        modifier = modifier.padding(4.dp),
        horizontalAlignment = Alignment.CenterHorizontally
    ) {
        Text(value, style = MaterialTheme.typography.headlineSmall, fontWeight = FontWeight.Bold, color = color)
        Text(label, style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.6f))
    }
}

@Composable
fun TeacherAttendanceItem(record: AttendanceRecord) {
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
            Column(modifier = Modifier.weight(1f)) {
                Text(
                    text = formatDate(record.date),
                    style = MaterialTheme.typography.titleMedium,
                    fontWeight = FontWeight.Bold
                )
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Icon(Icons.Rounded.CreditCard, null, modifier = Modifier.size(14.dp), tint = MaterialTheme.colorScheme.primary)
                    Spacer(Modifier.width(4.dp))
                    Text(
                        text = record.scanMethod.ifEmpty { "IC Card Scan" },
                        style = MaterialTheme.typography.labelSmall,
                        color = MaterialTheme.colorScheme.primary
                    )
                }
                if (!record.checkInTime.isNullOrEmpty()) {
                    Text(
                        text = "Check-in: ${record.checkInTime}${if (!record.checkOutTime.isNullOrEmpty()) " | Out: ${record.checkOutTime}" else ""}",
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
