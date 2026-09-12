package com.lodhidevelop.taleemiduniya_pro.presentation.teacher

import androidx.compose.foundation.*
import java.util.Calendar
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.rounded.MenuBook
import androidx.compose.material.icons.rounded.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.hilt.navigation.compose.hiltViewModel
import coil.compose.AsyncImage
import androidx.compose.ui.res.stringResource
import com.lodhidevelop.taleemiduniya_pro.R
import com.lodhidevelop.taleemiduniya_pro.data.model.*
import com.lodhidevelop.taleemiduniya_pro.presentation.common.*
import com.lodhidevelop.taleemiduniya_pro.presentation.student.ActionButton

import androidx.compose.material.ExperimentalMaterialApi
import androidx.compose.material.pullrefresh.PullRefreshIndicator
import androidx.compose.material.pullrefresh.pullRefresh
import androidx.compose.material.pullrefresh.rememberPullRefreshState

@OptIn(ExperimentalMaterial3Api::class, ExperimentalMaterialApi::class)
@Composable
fun TeacherDashboardScreen(
    viewModel: TeacherDashboardViewModel = hiltViewModel(),
    onNavigateToNotifications: () -> Unit,
    onNavigateToAttendance: () -> Unit,
    onNavigateToHomework: () -> Unit,
    onNavigateToResults: () -> Unit,
    onNavigateToProfile: () -> Unit,
    onNavigateToClasses: () -> Unit,
    onNavigateToLeave: () -> Unit,
    onNavigateToTimetable: () -> Unit,
    onNavigateToHistory: () -> Unit,
    onNavigateToStudents: () -> Unit,
    onNavigateToReport: () -> Unit = {}
) {
    val uiState by viewModel.uiState.collectAsState()
    
    val pullRefreshState = rememberPullRefreshState(
        refreshing = uiState is TeacherDashboardUiState.Loading,
        onRefresh = { viewModel.loadTeacherData() }
    )

    Scaffold(
        containerColor = MaterialTheme.colorScheme.background,
        bottomBar = {
            TeacherBottomNavigation(
                currentRoute = "home",
                onNavigate = { route ->
                    when (route) {
                        "attendance" -> onNavigateToAttendance()
                        "homework" -> onNavigateToHomework()
                        "profile" -> onNavigateToProfile()
                        "classes" -> onNavigateToClasses()
                        "timetable" -> onNavigateToTimetable()
                    }
                }
            )
        }
    ) { padding ->
        Box(modifier = Modifier.fillMaxSize().padding(padding).pullRefresh(pullRefreshState)) {
            when (val state = uiState) {
                is TeacherDashboardUiState.Loading -> DashboardShimmer()
                is TeacherDashboardUiState.Error -> ErrorState(state.message, { viewModel.loadTeacherData() })
                is TeacherDashboardUiState.Success -> {
                    TeacherDashboardContent(
                        state = state, 
                        onNotificationClick = onNavigateToNotifications,
                        onAttendanceClick = onNavigateToAttendance, 
                        onHomeworkClick = onNavigateToHomework, 
                        onResultsClick = onNavigateToResults, 
                        onClassesClick = onNavigateToClasses, 
                        onLeaveClick = onNavigateToLeave, 
                        onTimetableClick = onNavigateToTimetable, 
                        onHistoryClick = onNavigateToHistory, 
                        onStudentsClick = onNavigateToStudents,
                        onReportClick = onNavigateToReport,
                        onRefresh = { viewModel.loadTeacherData() }
                    )
                }
            }
            
            PullRefreshIndicator(
                refreshing = uiState is TeacherDashboardUiState.Loading,
                state = pullRefreshState,
                modifier = Modifier.align(Alignment.TopCenter),
                contentColor = MaterialTheme.colorScheme.primary
            )
        }
    }
}

@Composable
fun TeacherDashboardContent(
    state: TeacherDashboardUiState.Success,
    onNotificationClick: () -> Unit,
    onAttendanceClick: () -> Unit,
    onHomeworkClick: () -> Unit,
    onResultsClick: () -> Unit,
    onClassesClick: () -> Unit,
    onLeaveClick: () -> Unit,
    onTimetableClick: () -> Unit,
    onHistoryClick: () -> Unit,
    onStudentsClick: () -> Unit,
    onReportClick: () -> Unit = {},
    onRefresh: () -> Unit
) {
    val hour = Calendar.getInstance().get(Calendar.HOUR_OF_DAY)
    val greeting = when (hour) {
        in 5..11 -> stringResource(R.string.good_morning)
        in 12..16 -> stringResource(R.string.good_afternoon)
        else -> stringResource(R.string.good_evening)
    }

    Column(
        modifier = Modifier
            .fillMaxSize()
            .verticalScroll(rememberScrollState())
    ) {
        // Header with Gradient & Wave
        Box(modifier = Modifier.fillMaxWidth().height(260.dp)) {
            WaveHeader(
                modifier = Modifier.fillMaxSize(),
                primaryColor = MaterialTheme.colorScheme.primary,
                secondaryColor = MaterialTheme.colorScheme.primary.copy(alpha = 0.7f)
            )
            
            Column(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(horizontal = 24.dp)
                    .padding(top = 48.dp)
            ) {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Column {
                        Text(
                            text = greeting,
                            color = Color.White.copy(alpha = 0.8f),
                            style = MaterialTheme.typography.labelLarge,
                            fontWeight = FontWeight.Medium
                        )
                        Spacer(modifier = Modifier.height(2.dp))
                        Text(
                            text = state.profile.name.split(" ").first(),
                            color = Color.White,
                            style = MaterialTheme.typography.headlineLarge,
                            fontWeight = FontWeight.ExtraBold,
                            fontSize = 32.sp
                        )
                    }
                    
                    Box(
                        modifier = Modifier
                            .size(68.dp)
                            .clip(CircleShape)
                            .background(Color.White.copy(alpha = 0.2f))
                            .padding(4.dp)
                    ) {
                        AsyncImage(
                            model = state.profile.photoUrl,
                            contentDescription = null,
                            modifier = Modifier
                                .fillMaxSize()
                                .clip(CircleShape)
                                .border(2.dp, Color.White, CircleShape),
                            contentScale = ContentScale.Crop
                        )
                    }
                }
                
                if (state.debugMessage != null && state.assignedClasses.isEmpty()) {
                    Surface(
                        color = Color.Black.copy(alpha = 0.4f),
                        shape = RoundedCornerShape(12.dp),
                        modifier = Modifier.padding(top = 16.dp).clickable { onRefresh() }
                    ) {
                        Text(
                            text = "âš ï¸ " + state.debugMessage,
                            color = Color.Yellow,
                            style = MaterialTheme.typography.labelSmall,
                            modifier = Modifier.padding(horizontal = 12.dp, vertical = 6.dp)
                        )
                    }
                }
            }
        }

        // Advanced Stats & Overview
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 20.dp)
                .offset(y = (-50).dp),
            horizontalArrangement = Arrangement.spacedBy(16.dp)
        ) {
            // Class Insight Card
            DashboardStatCard(
                title = stringResource(R.string.total_classes),
                value = "${state.assignedClasses.size}",
                subtitle = "Active Sections",
                icon = Icons.Rounded.Class,
                color = Color(0xFF4CAF50),
                onClick = onClassesClick, // Now used
                modifier = Modifier.weight(1f)
            )
            // Attendance Analytics Card
            val attendanceValue = state.todayAttendance?.let { (present, total) ->
                if (total > 0) "${(present * 100) / total}%" else "N/A"
            } ?: "N/A"
            
            val attendanceSubtitle = state.todayAttendance?.let { (present, total) ->
                "Present: $present/$total"
            } ?: "Not Marked"

            DashboardStatCard(
                title = "Attendance",
                value = attendanceValue,
                subtitle = attendanceSubtitle,
                icon = Icons.Rounded.PieChart,
                color = if (attendanceValue == "N/A") Color.Gray else Color(0xFFFF9800),
                modifier = Modifier.weight(1f)
            )
        }

        // Attendance Analytics Chart
        if (state.attendanceTrends.isNotEmpty()) {
            SectionHeader(title = "Attendance Trends (Last 7 Days)", modifier = Modifier.offset(y = (-40).dp))
            Card(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(horizontal = 24.dp)
                    .height(180.dp)
                    .offset(y = (-35).dp),
                shape = RoundedCornerShape(24.dp),
                colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
                elevation = CardDefaults.cardElevation(defaultElevation = 2.dp)
            ) {
                AttendanceTrendChart(
                    data = state.attendanceTrends,
                    modifier = Modifier.padding(20.dp).fillMaxSize()
                )
            }
        }

        // Quick Actions Scroll (Advanced Interaction)
        SectionHeader(title = stringResource(R.string.quick_actions), modifier = Modifier.offset(y = (-30).dp))
        LazyRow(
            modifier = Modifier
                .fillMaxWidth()
                .offset(y = (-25).dp),
            contentPadding = PaddingValues(horizontal = 24.dp),
            horizontalArrangement = Arrangement.spacedBy(16.dp)
        ) {
            item { 
                QuickActionItem(stringResource(R.string.mark_attendance), Icons.Rounded.TaskAlt, Color(0xFFE91E63), onAttendanceClick) 
            }
            item { 
                QuickActionItem(stringResource(R.string.post_homework), Icons.AutoMirrored.Rounded.MenuBook, Color(0xFF673AB7), onHomeworkClick) 
            }
            item { 
                QuickActionItem(stringResource(R.string.manage_results), Icons.Rounded.Insights, Color(0xFF009688), onResultsClick) 
            }
            item { 
                QuickActionItem(stringResource(R.string.my_students), Icons.Rounded.Group, Color(0xFF2196F3), onStudentsClick) 
            }
        }

        // Timetable Preview
        if (state.timetable.isNotEmpty()) {
            SectionHeader(title = stringResource(R.string.your_schedule), modifier = Modifier.offset(y = (-15).dp))
            LazyRow(
                modifier = Modifier
                    .fillMaxWidth()
                    .offset(y = (-10).dp),
                contentPadding = PaddingValues(horizontal = 24.dp),
                horizontalArrangement = Arrangement.spacedBy(12.dp)
            ) {
                items(state.timetable) { record ->
                    TimetablePreviewCard(record)
                }
            }
        }

        // Announcements Section
        if (state.announcements.isNotEmpty()) {
            SectionHeader(title = stringResource(R.string.school_notices), modifier = Modifier.offset(y = 5.dp))
            Column(
                modifier = Modifier
                    .padding(horizontal = 24.dp)
                    .padding(top = 10.dp),
                verticalArrangement = Arrangement.spacedBy(12.dp)
            ) {
                state.announcements.take(3).forEach { announcement ->
                    AnnouncementItem(announcement)
                }
            }
        }

        // Teacher Actions List
        SectionHeader(title = stringResource(R.string.management_portals), modifier = Modifier.offset(y = 15.dp))
        Column(
            modifier = Modifier.padding(horizontal = 24.dp).padding(top = 20.dp),
            verticalArrangement = Arrangement.spacedBy(12.dp)
        ) {
            TeacherActionCard(
                title = "Report to Principal / Admin",
                subtitle = "Submit work progress & paper check update to Web App",
                icon = Icons.Rounded.Assessment,
                color = Color(0xFF8E24AA),
                onClick = onReportClick
            )
            TeacherActionCard(
                title = "Paper Checking & Marksheet",
                subtitle = "Grade tests, calculate marks & publish results",
                icon = Icons.Rounded.Grade,
                color = Color(0xFF00897B),
                onClick = onResultsClick
            )
            TeacherActionCard(
                title = stringResource(R.string.view_students),
                subtitle = "Contact parents and view profiles",
                icon = Icons.Rounded.Contacts,
                color = Color(0xFF455A64),
                onClick = onStudentsClick
            )
            TeacherActionCard(
                title = stringResource(R.string.daily_timetable),
                subtitle = "Check rooms and timings",
                icon = Icons.Rounded.EventNote,
                color = Color(0xFF3F51B5),
                onClick = onTimetableClick
            )
            TeacherActionCard(
                title = stringResource(R.string.attendance_history),
                subtitle = "View history and reports",
                icon = Icons.Rounded.History,
                color = Color(0xFF607D8B),
                onClick = onHistoryClick
            )
            TeacherActionCard(
                title = stringResource(R.string.leave_requests),
                subtitle = "Apply for absence or sick leave",
                icon = Icons.Rounded.ExitToApp,
                color = Color(0xFFD32F2F),
                onClick = onLeaveClick
            )
        }

        
        Spacer(modifier = Modifier.height(40.dp))
    }
}

@Composable
fun DashboardStatCard(
    title: String,
    value: String,
    subtitle: String,
    icon: androidx.compose.ui.graphics.vector.ImageVector,
    color: Color,
    modifier: Modifier = Modifier,
    onClick: () -> Unit = {}
) {
    Card(
        modifier = modifier.height(140.dp).clickable { onClick() }, // Enabled click
        shape = RoundedCornerShape(28.dp),
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
        elevation = CardDefaults.cardElevation(defaultElevation = 8.dp)
    ) {
        Column(
            modifier = Modifier.padding(16.dp).fillMaxSize(),
            verticalArrangement = Arrangement.SpaceBetween
        ) {
            Surface(
                color = color.copy(alpha = 0.1f),
                shape = CircleShape,
                modifier = Modifier.size(36.dp)
            ) {
                Box(contentAlignment = Alignment.Center) {
                    Icon(icon, null, tint = color, modifier = Modifier.size(20.dp))
                }
            }
            Column {
                Text(value, style = MaterialTheme.typography.headlineSmall, fontWeight = FontWeight.ExtraBold)
                Text(title, style = MaterialTheme.typography.labelMedium, color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.6f))
                Text(subtitle, style = MaterialTheme.typography.labelSmall, color = color, fontWeight = FontWeight.Bold)
            }
        }
    }
}

@Composable
fun QuickActionItem(
    label: String,
    icon: androidx.compose.ui.graphics.vector.ImageVector,
    color: Color,
    onClick: () -> Unit
) {
    Column(
        horizontalAlignment = Alignment.CenterHorizontally,
        modifier = Modifier.clickable { onClick() }
    ) {
        Surface(
            color = color.copy(alpha = 0.15f),
            shape = RoundedCornerShape(20.dp),
            modifier = Modifier.size(72.dp)
        ) {
            Box(contentAlignment = Alignment.Center) {
                Icon(icon, null, tint = color, modifier = Modifier.size(32.dp))
            }
        }
        Spacer(modifier = Modifier.height(8.dp))
        Text(label, style = MaterialTheme.typography.labelMedium, fontWeight = FontWeight.Bold)
    }
}


@Composable
fun TeacherActionCard(
    title: String,
    subtitle: String,
    icon: androidx.compose.ui.graphics.vector.ImageVector,
    color: Color,
    onClick: () -> Unit
) {
    Card(
        modifier = Modifier
            .fillMaxWidth()
            .clickable { onClick() },
        shape = RoundedCornerShape(24.dp),
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
        elevation = CardDefaults.cardElevation(defaultElevation = 2.dp)
    ) {
        Row(
            modifier = Modifier.padding(20.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            Surface(
                color = color.copy(alpha = 0.1f),
                shape = RoundedCornerShape(16.dp),
                modifier = Modifier.size(56.dp)
            ) {
                Box(contentAlignment = Alignment.Center) {
                    Icon(icon, null, tint = color, modifier = Modifier.size(28.dp))
                }
            }
            Spacer(modifier = Modifier.width(16.dp))
            Column {
                Text(title, style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold)
                Text(subtitle, style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.6f))
            }
            Spacer(modifier = Modifier.weight(1f))
            Icon(Icons.Rounded.ChevronRight, null, tint = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.3f))
        }
    }
}

@Composable
fun AttendanceTrendChart(data: List<Pair<String, Float>>, modifier: Modifier = Modifier) {
    val primaryColor = MaterialTheme.colorScheme.primary
    val labelColor = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.6f)
    
    androidx.compose.foundation.Canvas(modifier = modifier) {
        val width = size.width
        val height = size.height
        val spacePerPoint = width / (data.size - 1).coerceAtLeast(1)
        
        // Draw Grid Lines (Horizontal)
        for (i in 0..4) {
            val y = height - (height / 4 * i)
            drawLine(
                color = labelColor.copy(alpha = 0.1f),
                start = androidx.compose.ui.geometry.Offset(0f, y),
                end = androidx.compose.ui.geometry.Offset(width, y),
                strokeWidth = 1.dp.toPx()
            )
        }
        
        // Draw Line Path
        val path = androidx.compose.ui.graphics.Path()
        data.forEachIndexed { index, point ->
            val x = index * spacePerPoint
            val y = height - (point.second / 100f * height)
            
            if (index == 0) path.moveTo(x, y)
            else path.lineTo(x, y)
            
            // Draw Points
            drawCircle(
                color = primaryColor,
                radius = 4.dp.toPx(),
                center = androidx.compose.ui.geometry.Offset(x, y)
            )
        }
        
        drawPath(
            path = path,
            color = primaryColor,
            style = androidx.compose.ui.graphics.drawscope.Stroke(width = 3.dp.toPx(), cap = androidx.compose.ui.graphics.StrokeCap.Round)
        )
        
        // Draw Labels
        data.forEachIndexed { index, point ->
            val x = index * spacePerPoint
            // We can't easily draw text in Canvas without native canvas access or standard drawing
            // Simplified: Just points and lines for now, or use drawIntoCanvas for text
        }
    }
}

@Composable
fun TimetablePreviewCard(record: TimetableRecord) {
    Card(
        modifier = Modifier.width(160.dp),
        shape = RoundedCornerShape(20.dp),
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.primaryContainer.copy(alpha = 0.3f))
    ) {
        Column(modifier = Modifier.padding(16.dp)) {
            Text(record.time, style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.primary)
            Spacer(modifier = Modifier.height(4.dp))
            Text(record.subject, style = MaterialTheme.typography.titleSmall, fontWeight = FontWeight.Bold, maxLines = 1)
            Text("${record.className}-${record.section}", style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
            Spacer(modifier = Modifier.height(8.dp))
            Row(verticalAlignment = Alignment.CenterVertically) {
                Icon(Icons.Rounded.LocationOn, null, modifier = Modifier.size(12.dp), tint = MaterialTheme.colorScheme.primary)
                Spacer(modifier = Modifier.width(4.dp))
                Text(record.room, style = MaterialTheme.typography.labelSmall)
            }
        }
    }
}

@Composable
fun AnnouncementItem(announcement: Announcement) {
    Card(
        modifier = Modifier.fillMaxWidth(),
        shape = RoundedCornerShape(16.dp),
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.4f)),
        border = BorderStroke(1.dp, MaterialTheme.colorScheme.outlineVariant)
    ) {
        Row(
            modifier = Modifier.padding(16.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            Surface(
                color = MaterialTheme.colorScheme.secondary.copy(alpha = 0.1f),
                shape = CircleShape,
                modifier = Modifier.size(40.dp)
            ) {
                Box(contentAlignment = Alignment.Center) {
                    Icon(Icons.Rounded.Campaign, null, tint = MaterialTheme.colorScheme.secondary, modifier = Modifier.size(24.dp))
                }
            }
            Spacer(modifier = Modifier.width(16.dp))
            Column(modifier = Modifier.weight(1f)) {
                Text(announcement.title, style = MaterialTheme.typography.titleSmall, fontWeight = FontWeight.Bold)
                Text(announcement.desc, style = MaterialTheme.typography.bodySmall, maxLines = 2)
            }
        }
    }
}

@Composable
fun TeacherBottomNavigation(
    currentRoute: String,
    onNavigate: (String) -> Unit
) {
    NavigationBar(
        containerColor = MaterialTheme.colorScheme.surface,
        tonalElevation = 8.dp
    ) {
        NavigationBarItem(
            selected = currentRoute == "home",
            onClick = { onNavigate("home") },
            icon = { Icon(Icons.Rounded.Dashboard, null) },
            label = { Text("Dashboard") }
        )
        NavigationBarItem(
            selected = currentRoute == "classes",
            onClick = { onNavigate("classes") },
            icon = { Icon(Icons.Rounded.Class, null) },
            label = { Text("Classes") }
        )
        NavigationBarItem(
            selected = currentRoute == "profile",
            onClick = { onNavigate("profile") },
            icon = { Icon(Icons.Rounded.Person, null) },
            label = { Text("Profile") }
        )
    }
}
