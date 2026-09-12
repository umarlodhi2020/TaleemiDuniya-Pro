package com.lodhidevelop.taleemiduniya_pro.presentation.student

import androidx.compose.foundation.*
import java.util.Calendar
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.rounded.FactCheck
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
import androidx.compose.material.ExperimentalMaterialApi
import androidx.compose.material.pullrefresh.PullRefreshIndicator
import androidx.compose.material.pullrefresh.pullRefresh
import androidx.compose.material.pullrefresh.rememberPullRefreshState

@OptIn(ExperimentalMaterialApi::class)
@Composable
fun StudentDashboardScreen(
    viewModel: StudentDashboardViewModel = hiltViewModel(),
    onNavigateToNotifications: () -> Unit,
    onNavigateToAttendance: () -> Unit,
    onNavigateToFees: () -> Unit,
    onNavigateToHomework: () -> Unit,
    onNavigateToResults: () -> Unit,
    onNavigateToProfile: () -> Unit,
    onNavigateToMedia: (String, String) -> Unit
) {
    val uiState by viewModel.uiState.collectAsState()
    
    val pullRefreshState = rememberPullRefreshState(
        refreshing = uiState is StudentDashboardUiState.Loading,
        onRefresh = { viewModel.loadDashboardData() }
    )

    Scaffold(
        bottomBar = {
            StudentBottomNavigation(
                currentRoute = "home",
                onNavigate = { route ->
                    when (route) {
                        "attendance" -> onNavigateToAttendance()
                        "fees" -> onNavigateToFees()
                        "profile" -> onNavigateToProfile()
                        "academics" -> onNavigateToHomework() 
                    }
                }
            )
        }
    ) { padding ->
        Box(modifier = Modifier.pullRefresh(pullRefreshState)) {
            when (val state = uiState) {
                is StudentDashboardUiState.Loading -> LoadingSkeleton(Modifier.padding(padding))
                is StudentDashboardUiState.Error -> ErrorState(
                    message = state.message,
                    onRetry = { viewModel.loadDashboardData() },
                    modifier = Modifier.padding(padding)
                )
                is StudentDashboardUiState.Success -> {
                    DashboardContent(
                        state = state,
                        padding = padding,
                        onNotificationClick = onNavigateToNotifications,
                        onAttendanceClick = onNavigateToAttendance,
                        onFeesClick = onNavigateToFees,
                        onHomeworkClick = onNavigateToHomework,
                        onResultsClick = onNavigateToResults,
                        onProfileClick = onNavigateToProfile,
                        onMediaClick = onNavigateToMedia
                    )
                }
            }
            
            PullRefreshIndicator(
                refreshing = uiState is StudentDashboardUiState.Loading,
                state = pullRefreshState,
                modifier = Modifier.align(Alignment.TopCenter).padding(padding),
                contentColor = MaterialTheme.colorScheme.primary
            )
        }
    }
}

@Composable
fun DashboardContent(
    state: StudentDashboardUiState.Success,
    padding: PaddingValues,
    onNotificationClick: () -> Unit,
    onAttendanceClick: () -> Unit,
    onFeesClick: () -> Unit,
    onHomeworkClick: () -> Unit,
    onResultsClick: () -> Unit,
    onProfileClick: () -> Unit,
    onMediaClick: (String, String) -> Unit
) {
    if (state.profile.id.isEmpty()) {
        Box(Modifier.fillMaxSize().padding(padding), contentAlignment = Alignment.Center) {
            Text("Unable to load profile. Please try logging in again.")
        }
        return
    }
    
    val hour = Calendar.getInstance().get(Calendar.HOUR_OF_DAY)
    val greeting = when (hour) {
        in 5..11 -> stringResource(R.string.good_morning)
        in 12..16 -> stringResource(R.string.good_afternoon)
        else -> stringResource(R.string.good_evening)
    }

    Column(
        modifier = Modifier
            .fillMaxSize()
            .padding(padding)
            .verticalScroll(rememberScrollState())
            .background(MaterialTheme.colorScheme.background)
    ) {
        // Header
        Box(modifier = Modifier.fillMaxWidth().height(220.dp)) {
            WaveHeader(
                primaryColor = MaterialTheme.colorScheme.primary,
                secondaryColor = MaterialTheme.colorScheme.secondary
            )
            
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(24.dp)
                    .align(Alignment.TopCenter),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Column {
                    Text(
                        text = greeting,
                        color = Color.White.copy(alpha = 0.7f),
                        style = MaterialTheme.typography.labelMedium,
                        fontWeight = FontWeight.Bold,
                        modifier = Modifier.background(Color.White.copy(alpha = 0.1f), RoundedCornerShape(8.dp)).padding(horizontal = 8.dp, vertical = 4.dp)
                    )
                    Spacer(modifier = Modifier.height(4.dp))
                    Text(
                        text = "${state.profile.name} 👋",
                        color = Color.White,
                        style = MaterialTheme.typography.headlineMedium,
                        fontWeight = FontWeight.Bold
                    )
                }
                
                Row(verticalAlignment = Alignment.CenterVertically) {
                    IconButton(
                        onClick = onNotificationClick,
                        modifier = Modifier
                            .size(48.dp)
                            .clip(CircleShape)
                            .background(Color.White.copy(alpha = 0.2f))
                    ) {
                        Icon(Icons.Rounded.Notifications, "Notifications", tint = Color.White)
                    }
                    Spacer(modifier = Modifier.width(12.dp))
                    IconButton(
                        onClick = onProfileClick,
                        modifier = Modifier
                            .size(56.dp)
                            .clip(CircleShape)
                            .background(Color.White.copy(alpha = 0.2f))
                    ) {
                        AsyncImage(
                            model = state.profile.photoUrl,
                            contentDescription = "Profile",
                            modifier = Modifier.fillMaxSize().clip(CircleShape),
                            contentScale = ContentScale.Crop,
                            fallback = null
                        )
                        if (state.profile.photoUrl.isEmpty()) {
                            Icon(Icons.Rounded.Person, contentDescription = null, tint = Color.White)
                        }
                    }
                }
            }

            Card(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(horizontal = 24.dp)
                    .align(Alignment.BottomCenter)
                    .offset(y = 30.dp),
                shape = RoundedCornerShape(24.dp),
                colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
                elevation = CardDefaults.cardElevation(defaultElevation = 4.dp)
            ) {
                Row(
                    modifier = Modifier.padding(20.dp),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Icon(
                        Icons.Rounded.School,
                        contentDescription = null,
                        tint = MaterialTheme.colorScheme.primary,
                        modifier = Modifier.size(32.dp)
                    )
                    Spacer(modifier = Modifier.width(16.dp))
                    Column {
                        Text(
                            text = "Class ${state.profile.className} • Section ${state.profile.section}",
                            style = MaterialTheme.typography.titleMedium,
                            fontWeight = FontWeight.Bold
                        )
                        Text(
                            text = "Roll No: ${state.profile.rollNumber}",
                            style = MaterialTheme.typography.bodyMedium,
                            color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.6f)
                        )
                    }
                }
            }
        }

        Spacer(modifier = Modifier.height(50.dp))

        // Student Specific Stats
        SectionHeader(title = "Study Progress")
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 16.dp),
            horizontalArrangement = Arrangement.SpaceBetween
        ) {
            StatCard(
                title = "Next Period",
                value = "10:30 AM",
                icon = { Icon(Icons.Rounded.Schedule, null, tint = Color(0xFF673AB7)) },
                color = Color(0xFF673AB7),
                modifier = Modifier.weight(1f)
            )
            StatCard(
                title = "Today's Task",
                value = "${state.homework.count { it.status.lowercase() == "pending" }} Pending",
                icon = { Icon(Icons.Rounded.Task, null, tint = Color(0xFFE91E63)) },
                color = Color(0xFFE91E63),
                modifier = Modifier.weight(1f)
            )
        }

        // Quick Statistics
        SectionHeader(title = "Attendance & Fees")
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 16.dp),
            horizontalArrangement = Arrangement.SpaceBetween
        ) {
            val attendancePercent = if (state.attendance.isEmpty()) "0%" else {
                val present = state.attendance.count { it.status.lowercase() == "present" }
                "${(present * 100) / state.attendance.size}%"
            }
            
            StatCard(
                title = "Attendance",
                value = attendancePercent,
                icon = { Icon(Icons.Rounded.BarChart, null, tint = Color(0xFF4CAF50)) },
                color = Color(0xFF4CAF50),
                modifier = Modifier.weight(1f)
            )
            
            val unpaidFees = state.fees.filter { it.status.lowercase() == "unpaid" }.sumOf { it.totalAmount }
            StatCard(
                title = "Fee Balance",
                value = "Rs. $unpaidFees",
                icon = { Icon(Icons.Rounded.AccountBalanceWallet, null, tint = Color(0xFFFF9800)) },
                color = Color(0xFFFF9800),
                modifier = Modifier.weight(1f)
            )
        }

        // Quick Actions
        SectionHeader(title = "Quick Actions")
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .horizontalScroll(rememberScrollState())
                .padding(horizontal = 24.dp),
            horizontalArrangement = Arrangement.spacedBy(16.dp)
        ) {
            ActionButton("Attendance", Icons.Rounded.DateRange, onAttendanceClick)
            ActionButton("Fees", Icons.Rounded.Payments, onFeesClick)
            ActionButton("Homework", Icons.AutoMirrored.Rounded.MenuBook, onHomeworkClick)
            ActionButton("Results", Icons.AutoMirrored.Rounded.FactCheck, onResultsClick)
        }

        // Today's Timetable
        if (state.timetable.isNotEmpty()) {
            SectionHeader(title = stringResource(R.string.your_schedule))
            LazyRow(
                modifier = Modifier.fillMaxWidth(),
                contentPadding = PaddingValues(horizontal = 24.dp),
                horizontalArrangement = Arrangement.spacedBy(12.dp)
            ) {
                items(state.timetable) { period ->
                    TimetablePreviewCard(period)
                }
            }
        }

        // Recent Homework
        if (state.homework.any { it.status.lowercase() == "pending" }) {
            SectionHeader(title = "Recent Homework", onSeeAllClick = onHomeworkClick)
            val recentHomework = state.homework.filter { it.status.lowercase() == "pending" }.firstOrNull()
            if (recentHomework != null) {
            Card(
                modifier = Modifier.padding(horizontal = 24.dp).clickable {
                    recentHomework.attachmentUrl?.let { onMediaClick(it, recentHomework.subject) }
                },
                shape = RoundedCornerShape(20.dp),
                colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
                elevation = CardDefaults.cardElevation(defaultElevation = 2.dp)
            ) {
                    Column(modifier = Modifier.padding(16.dp)) {
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            Surface(
                                modifier = Modifier.size(40.dp),
                                shape = CircleShape,
                                color = MaterialTheme.colorScheme.primary.copy(alpha = 0.1f)
                            ) {
                                Icon(Icons.Rounded.MenuBook, null, tint = MaterialTheme.colorScheme.primary, modifier = Modifier.padding(8.dp))
                            }
                            Spacer(modifier = Modifier.width(12.dp))
                            Column {
                                Text(recentHomework.subject, style = MaterialTheme.typography.titleSmall, fontWeight = FontWeight.Bold)
                                Text(recentHomework.title, style = MaterialTheme.typography.bodyMedium)
                            }
                        }
                        Spacer(modifier = Modifier.height(12.dp))
                        Text(
                            text = "Due: ${recentHomework.dueDate}",
                            style = MaterialTheme.typography.labelMedium,
                            color = MaterialTheme.colorScheme.error
                        )
                    }
                }
            }
        }

        // Latest Notice
        if (state.announcements.isNotEmpty()) {
            SectionHeader(title = stringResource(R.string.school_notices))
            val latestNotice = state.announcements.firstOrNull()
            if (latestNotice != null) {
                Card(
                    modifier = Modifier.padding(horizontal = 24.dp).padding(bottom = 32.dp),
                    shape = RoundedCornerShape(20.dp),
                    colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.primaryContainer.copy(alpha = 0.5f))
                ) {
                    Column(modifier = Modifier.padding(20.dp)) {
                        Text(latestNotice.title, style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold)
                        Spacer(modifier = Modifier.height(4.dp))
                        Text(latestNotice.desc, style = MaterialTheme.typography.bodyMedium)
                    }
                }
            }
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
            Text(record.teacherName, style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant, maxLines = 1)
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
fun ActionButton(label: String, icon: androidx.compose.ui.graphics.vector.ImageVector, onClick: () -> Unit) {
    Column(
        horizontalAlignment = Alignment.CenterHorizontally,
        modifier = Modifier.clickable(onClick = onClick)
    ) {
        Surface(
            modifier = Modifier.size(64.dp),
            shape = RoundedCornerShape(20.dp),
            color = MaterialTheme.colorScheme.primary.copy(alpha = 0.1f)
        ) {
            Icon(
                icon,
                contentDescription = label,
                tint = MaterialTheme.colorScheme.primary,
                modifier = Modifier.padding(16.dp)
            )
        }
        Spacer(modifier = Modifier.height(8.dp))
        Text(label, style = MaterialTheme.typography.labelMedium)
    }
}

@Composable
fun StudentBottomNavigation(
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
            icon = { Icon(Icons.Rounded.Home, null) },
            label = { Text("Home") }
        )
        NavigationBarItem(
            selected = currentRoute == "academics",
            onClick = { onNavigate("academics") },
            icon = { Icon(Icons.Rounded.School, null) },
            label = { Text("Academics") }
        )
        NavigationBarItem(
            selected = currentRoute == "attendance",
            onClick = { onNavigate("attendance") },
            icon = { Icon(Icons.Rounded.CalendarMonth, null) },
            label = { Text("Attendance") }
        )
        NavigationBarItem(
            selected = currentRoute == "fees",
            onClick = { onNavigate("fees") },
            icon = { Icon(Icons.Rounded.Payments, null) },
            label = { Text("Fees") }
        )
        NavigationBarItem(
            selected = currentRoute == "profile",
            onClick = { onNavigate("profile") },
            icon = { Icon(Icons.Rounded.Person, null) },
            label = { Text("Profile") }
        )
    }
}
