package com.lodhidevelop.taleemiduniya_pro.presentation.parent

import androidx.compose.foundation.*
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.rounded.Chat
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
import java.util.Calendar
import com.lodhidevelop.taleemiduniya_pro.presentation.common.*
import com.lodhidevelop.taleemiduniya_pro.presentation.student.ActionButton

import androidx.compose.material.ExperimentalMaterialApi
import androidx.compose.material.pullrefresh.PullRefreshIndicator
import androidx.compose.material.pullrefresh.pullRefresh
import androidx.compose.material.pullrefresh.rememberPullRefreshState

@OptIn(ExperimentalMaterial3Api::class, ExperimentalMaterialApi::class)
@Composable
fun ParentDashboardScreen(
    viewModel: ParentDashboardViewModel = hiltViewModel(),
    onNavigateToNotifications: () -> Unit,
    onNavigateToAttendance: () -> Unit,
    onNavigateToFees: () -> Unit,
    onNavigateToHomework: () -> Unit,
    onNavigateToResults: () -> Unit,
    onNavigateToProfile: () -> Unit,
    onNavigateToTimetable: () -> Unit,
    onNavigateToLeave: () -> Unit,
    onNavigateToTeachers: () -> Unit,
    onNavigateToMedia: (String, String) -> Unit
) {
    val uiState by viewModel.uiState.collectAsState()
    val children by viewModel.children.collectAsState()
    val selectedChild by viewModel.selectedChild.collectAsState()
    
    var showChildSelector by remember { mutableStateOf(false) }

    val pullRefreshState = rememberPullRefreshState(
        refreshing = uiState is ParentDashboardUiState.Loading,
        onRefresh = { viewModel.loadFamilyData() }
    )

    Scaffold(
        bottomBar = {
            ParentBottomNavigation(
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
                is ParentDashboardUiState.Loading -> LoadingSkeleton(Modifier.padding(padding))
                is ParentDashboardUiState.Error -> ErrorState(state.message, { viewModel.loadFamilyData() }, Modifier.padding(padding))
                is ParentDashboardUiState.Success -> {
                    ParentDashboardContent(
                        state = state,
                        children = children,
                        padding = padding,
                        onSwitchChild = { showChildSelector = true },
                        onNotificationClick = onNavigateToNotifications,
                        onAttendanceClick = onNavigateToAttendance,
                        onFeesClick = onNavigateToFees,
                        onHomeworkClick = onNavigateToHomework,
                        onResultsClick = onNavigateToResults,
                        onTimetableClick = onNavigateToTimetable,
                        onLeaveClick = onNavigateToLeave,
                        onTeachersClick = onNavigateToTeachers,
                        onMediaClick = onNavigateToMedia
                    )
                }
            }
            // ...
            
            PullRefreshIndicator(
                refreshing = uiState is ParentDashboardUiState.Loading,
                state = pullRefreshState,
                modifier = Modifier.align(Alignment.TopCenter).padding(padding),
                contentColor = MaterialTheme.colorScheme.primary
            )
        }
    }

    if (showChildSelector) {
        ModalBottomSheet(
            onDismissRequest = { showChildSelector = false },
            sheetState = rememberModalBottomSheetState()
        ) {
            ChildSelectorContent(
                children = children,
                selectedChildId = selectedChild?.id ?: "",
                onChildSelected = {
                    viewModel.selectChild(it)
                    showChildSelector = false
                }
            )
        }
    }
}

@Composable
fun ParentDashboardContent(
    state: ParentDashboardUiState.Success,
    children: List<StudentProfile>,
    padding: PaddingValues,
    onSwitchChild: () -> Unit,
    onNotificationClick: () -> Unit,
    onAttendanceClick: () -> Unit,
    onFeesClick: () -> Unit,
    onHomeworkClick: () -> Unit,
    onResultsClick: () -> Unit,
    onTimetableClick: () -> Unit,
    onLeaveClick: () -> Unit,
    onTeachersClick: () -> Unit,
    onMediaClick: (String, String) -> Unit
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
                        text = "Parent Dashboard",
                        color = Color.White.copy(alpha = 0.7f),
                        style = MaterialTheme.typography.labelMedium,
                        fontWeight = FontWeight.Bold,
                        modifier = Modifier.background(Color.White.copy(alpha = 0.1f), RoundedCornerShape(8.dp)).padding(horizontal = 8.dp, vertical = 4.dp)
                    )
                    Spacer(modifier = Modifier.height(4.dp))
                    Text(
                        text = greeting,
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
                        onClick = onSwitchChild,
                        modifier = Modifier
                            .size(48.dp)
                            .clip(CircleShape)
                            .background(Color.White.copy(alpha = 0.2f))
                    ) {
                        Icon(Icons.Rounded.SwitchAccount, contentDescription = "Switch Child", tint = Color.White)
                    }
                }
            }

            // Current Child Selector Card
            Card(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(horizontal = 24.dp)
                    .align(Alignment.BottomCenter)
                    .offset(y = 30.dp)
                    .clickable { onSwitchChild() },
                shape = RoundedCornerShape(24.dp),
                colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
                elevation = CardDefaults.cardElevation(defaultElevation = 4.dp)
            ) {
                Row(
                    modifier = Modifier.padding(16.dp),
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.SpaceBetween
                ) {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Box(
                            modifier = Modifier
                                .size(48.dp)
                                .clip(CircleShape)
                                .background(MaterialTheme.colorScheme.primary.copy(alpha = 0.1f)),
                            contentAlignment = Alignment.Center
                        ) {
                            AsyncImage(
                                model = state.selectedChild.photoUrl,
                                contentDescription = null,
                                modifier = Modifier.fillMaxSize().clip(CircleShape),
                                contentScale = ContentScale.Crop
                            )
                            if (state.selectedChild.photoUrl.isEmpty()) {
                                Icon(Icons.Rounded.Person, null, tint = MaterialTheme.colorScheme.primary)
                            }
                        }
                        Spacer(modifier = Modifier.width(16.dp))
                        Column {
                            Text(
                                text = state.selectedChild.name,
                                style = MaterialTheme.typography.titleMedium,
                                fontWeight = FontWeight.Bold
                            )
                            Text(
                                text = "Class ${state.selectedChild.className} • Section ${state.selectedChild.section}",
                                style = MaterialTheme.typography.bodySmall,
                                color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.6f)
                            )
                        }
                    }
                    Icon(Icons.Rounded.SwapHoriz, null, tint = MaterialTheme.colorScheme.primary)
                }
            }
        }

        Spacer(modifier = Modifier.height(50.dp))

        // Parent Control Actions
        SectionHeader(title = "Parental Controls")
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 16.dp),
            horizontalArrangement = Arrangement.SpaceBetween
        ) {
            StatCard(
                title = "Contact Teachers",
                value = "Staff Directory",
                icon = { Icon(Icons.Rounded.ContactPhone, null, tint = Color(0xFFE91E63)) },
                color = Color(0xFFE91E63),
                modifier = Modifier.weight(1f).clickable { onTeachersClick() }
            )
            StatCard(
                title = "Apply Leave",
                value = "Submit Request",
                icon = { Icon(Icons.Rounded.NoteAdd, null, tint = Color(0xFF673AB7)) },
                color = Color(0xFF673AB7),
                modifier = Modifier.weight(1f).clickable { onLeaveClick() }
            )
        }

        // Quick Statistics
        SectionHeader(title = "Child's Overview")
        // ... (previous stats)
        
        // Yearly Fee Summary Card (Digital Fee Card)
        SectionHeader(title = "Fee Ledger 2024")
        Card(
            modifier = Modifier.padding(horizontal = 24.dp).fillMaxWidth(),
            shape = RoundedCornerShape(24.dp),
            colors = CardDefaults.cardColors(containerColor = Color.Black),
            elevation = CardDefaults.cardElevation(defaultElevation = 8.dp)
        ) {
            Column(modifier = Modifier.padding(20.dp)) {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Text("DIGITAL FEE CARD", color = Color.White.copy(alpha = 0.6f), style = MaterialTheme.typography.labelSmall)
                    Icon(Icons.Rounded.CreditCard, null, tint = Color.White.copy(alpha = 0.3f))
                }
                
                Spacer(modifier = Modifier.height(16.dp))
                
                val months = listOf("Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec")
                Row(
                    modifier = Modifier.fillMaxWidth().horizontalScroll(rememberScrollState()),
                    horizontalArrangement = Arrangement.spacedBy(16.dp)
                ) {
                    months.forEach { month ->
                        val isPaid = state.fees.any { it.month.contains(month, ignoreCase = true) && it.status.lowercase() == "paid" }
                        val isUnpaid = state.fees.any { it.month.contains(month, ignoreCase = true) && it.status.lowercase() == "unpaid" }
                        
                        Column(horizontalAlignment = Alignment.CenterHorizontally) {
                            Surface(
                                modifier = Modifier.size(36.dp),
                                shape = CircleShape,
                                color = if (isPaid) Color(0xFF4CAF50).copy(alpha = 0.2f) 
                                        else if (isUnpaid) Color(0xFFF44336).copy(alpha = 0.2f)
                                        else Color.White.copy(alpha = 0.1f)
                            ) {
                                Box(contentAlignment = Alignment.Center) {
                                    Icon(
                                        if (isPaid) Icons.Rounded.CheckCircle else if (isUnpaid) Icons.Rounded.ErrorOutline else Icons.Rounded.Circle,
                                        null,
                                        tint = if (isPaid) Color(0xFF4CAF50) else if (isUnpaid) Color(0xFFF44336) else Color.White.copy(alpha = 0.2f),
                                        modifier = Modifier.size(18.dp)
                                    )
                                }
                            }
                            Text(month, style = MaterialTheme.typography.labelSmall, color = Color.White, modifier = Modifier.padding(top = 4.dp))
                        }
                    }
                }
                
                Spacer(modifier = Modifier.height(20.dp))
                val totalUnpaid = state.fees.filter { it.status.lowercase() == "unpaid" }.sumOf { it.totalAmount }
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Column {
                        Text("TOTAL BALANCE", color = Color.White.copy(alpha = 0.6f), style = MaterialTheme.typography.labelSmall)
                        Text("Rs. $totalUnpaid", color = Color.White, style = MaterialTheme.typography.headlineSmall, fontWeight = FontWeight.Bold)
                    }
                    Button(
                        onClick = onFeesClick,
                        colors = ButtonDefaults.buttonColors(containerColor = Color.White, contentColor = Color.Black),
                        shape = RoundedCornerShape(12.dp),
                        contentPadding = PaddingValues(horizontal = 16.dp, vertical = 8.dp)
                    ) {
                        Text("Pay Now", style = MaterialTheme.typography.labelLarge, fontWeight = FontWeight.Bold)
                    }
                }
            }
        }
        
        SectionHeader(title = "Child's Overview")
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
        
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 16.dp),
            horizontalArrangement = Arrangement.SpaceBetween
        ) {
            val pendingHomework = state.homework.count { it.status.lowercase() == "pending" }
            StatCard(
                title = "Homework",
                value = "$pendingHomework Pending",
                icon = { Icon(Icons.Rounded.Book, null, tint = Color(0xFF2196F3)) },
                color = Color(0xFF2196F3),
                modifier = Modifier.weight(1f)
            )
            
            val latestResult = state.results.firstOrNull()
            val resultText = if (latestResult != null) {
                val percent = (latestResult.obtainedMarks * 100) / latestResult.totalMarks
                "$percent%"
            } else "N/A"
            
            StatCard(
                title = "Latest Result",
                value = resultText,
                icon = { Icon(Icons.Rounded.AssignmentTurnedIn, null, tint = Color(0xFF9C27B0)) },
                color = Color(0xFF9C27B0),
                modifier = Modifier.weight(1f)
            )
        }

        // Recent Homework Card with Media Click
        val recentHomework = state.homework.filter { it.status.lowercase() == "pending" }.firstOrNull()
        if (recentHomework != null) {
            SectionHeader(title = "Recent Homework", onSeeAllClick = onHomeworkClick)
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
                            Icon(Icons.AutoMirrored.Rounded.MenuBook, null, tint = MaterialTheme.colorScheme.primary, modifier = Modifier.padding(8.dp))
                        }
                        Spacer(modifier = Modifier.width(12.dp))
                        Column {
                            Text(recentHomework.subject, style = MaterialTheme.typography.titleSmall, fontWeight = FontWeight.Bold)
                            Text(recentHomework.title, style = MaterialTheme.typography.bodyMedium)
                        }
                    }
                }
            }
        }

        // Quick Actions
        SectionHeader(title = "Academic Actions")
        LazyRow(
            modifier = Modifier.fillMaxWidth(),
            contentPadding = PaddingValues(horizontal = 24.dp),
            horizontalArrangement = Arrangement.spacedBy(16.dp)
        ) {
            item { ActionButton("Attendance", Icons.Rounded.DateRange, onAttendanceClick) }
            item { ActionButton("Fees", Icons.Rounded.Payments, onFeesClick) }
            item { ActionButton("Homework", Icons.AutoMirrored.Rounded.MenuBook, onHomeworkClick) }
            item { ActionButton("Results", Icons.AutoMirrored.Rounded.FactCheck, onResultsClick) }
            item { ActionButton("Timetable", Icons.Rounded.CalendarToday, onTimetableClick) }
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
        
        Spacer(modifier = Modifier.height(32.dp))
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
fun ChildSelectorContent(
    children: List<StudentProfile>,
    selectedChildId: String,
    onChildSelected: (StudentProfile) -> Unit
) {
    Column(
        modifier = Modifier
            .fillMaxWidth()
            .padding(24.dp)
    ) {
        Text(
            text = "Switch Child",
            style = MaterialTheme.typography.headlineSmall,
            fontWeight = FontWeight.Bold,
            modifier = Modifier.padding(bottom = 16.dp)
        )
        
        children.forEach { child ->
            val isSelected = child.id == selectedChildId
            Surface(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(vertical = 8.dp)
                    .clickable { onChildSelected(child) },
                shape = RoundedCornerShape(16.dp),
                color = if (isSelected) MaterialTheme.colorScheme.primaryContainer else MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.5f),
                border = if (isSelected) BorderStroke(2.dp, MaterialTheme.colorScheme.primary) else null
            ) {
                Row(
                    modifier = Modifier.padding(16.dp),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Box(
                        modifier = Modifier
                            .size(40.dp)
                            .clip(CircleShape)
                            .background(Color.White),
                        contentAlignment = Alignment.Center
                    ) {
                        AsyncImage(
                            model = child.photoUrl,
                            contentDescription = null,
                            modifier = Modifier.fillMaxSize().clip(CircleShape),
                            contentScale = ContentScale.Crop
                        )
                        if (child.photoUrl.isEmpty()) {
                            Icon(Icons.Rounded.Person, null, tint = MaterialTheme.colorScheme.primary)
                        }
                    }
                    Spacer(modifier = Modifier.width(16.dp))
                    Column(modifier = Modifier.weight(1f)) {
                        Text(child.name, style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold)
                        Text("Class ${child.className} • Roll No: ${child.rollNumber}", style = MaterialTheme.typography.bodySmall)
                    }
                    if (isSelected) {
                        Icon(Icons.Rounded.CheckCircle, null, tint = MaterialTheme.colorScheme.primary)
                    }
                }
            }
        }
        Spacer(modifier = Modifier.height(32.dp))
    }
}

@Composable
fun ParentBottomNavigation(
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
