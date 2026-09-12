package com.lodhidevelop.taleemiduniya_pro.presentation.admin

import androidx.compose.foundation.*
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.rounded.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.platform.LocalContext
import com.lodhidevelop.taleemiduniya_pro.R
import com.lodhidevelop.taleemiduniya_pro.core.utils.ReportGenerator
import com.lodhidevelop.taleemiduniya_pro.presentation.common.*

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun AdminDashboardScreen(
    viewModel: AdminDashboardViewModel = hiltViewModel(),
    onNavigateToNotifications: () -> Unit,
    onNavigateToFeeApprovals: () -> Unit,
    onNavigateToStaffTracking: () -> Unit,
    onPostAnnouncementClick: () -> Unit,
    onLogout: () -> Unit
) {
    val uiState by viewModel.uiState.collectAsState()

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text(stringResource(R.string.school_admin)) },
                actions = {
                    IconButton(onClick = onNavigateToNotifications) {
                        Icon(Icons.Rounded.Notifications, "Notifications")
                    }
                    IconButton(onClick = onLogout) {
                        Icon(Icons.Rounded.Logout, "Logout", tint = MaterialTheme.colorScheme.error)
                    }
                }
            )
        }
    ) { padding ->
        // ... (rest same)
        when (val state = uiState) {
            is AdminDashboardUiState.Loading -> LoadingSkeleton(Modifier.padding(padding))
            is AdminDashboardUiState.Error -> ErrorState(state.message, { viewModel.loadSchoolData() }, Modifier.padding(padding))
            is AdminDashboardUiState.Success -> {
                AdminContent(state, padding, onNavigateToFeeApprovals, onStaffTrackingClick = onNavigateToStaffTracking, onPostAnnouncementClick = onPostAnnouncementClick)
            }
        }
    }
}

@Composable
fun AdminContent(
    state: AdminDashboardUiState.Success, 
    padding: PaddingValues,
    onFeeApprovalsClick: () -> Unit,
    onStaffTrackingClick: () -> Unit,
    onPostAnnouncementClick: () -> Unit
) {
    Column(
        modifier = Modifier
            .fillMaxSize()
            .verticalScroll(rememberScrollState())
            .background(MaterialTheme.colorScheme.background)
    ) {
        // Advanced Header
        Box(modifier = Modifier.fillMaxWidth().height(240.dp)) {
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
                Text(
                    text = "School Administration",
                    color = Color.White.copy(alpha = 0.8f),
                    style = MaterialTheme.typography.labelLarge,
                    fontWeight = FontWeight.Medium
                )
                Spacer(modifier = Modifier.height(4.dp))
                Text(
                    text = "Admin Control",
                    color = Color.White,
                    style = MaterialTheme.typography.displaySmall,
                    fontWeight = FontWeight.ExtraBold
                )
                
                Spacer(modifier = Modifier.height(16.dp))
                val context = LocalContext.current
                Button(
                    onClick = { ReportGenerator.generateSchoolReport(context, state.stats) },
                    colors = ButtonDefaults.buttonColors(containerColor = Color.White.copy(alpha = 0.2f), contentColor = Color.White),
                    shape = RoundedCornerShape(12.dp),
                    border = BorderStroke(1.dp, Color.White.copy(alpha = 0.3f))
                ) {
                    Icon(Icons.Rounded.FileDownload, null, modifier = Modifier.size(18.dp))
                    Spacer(modifier = Modifier.width(8.dp))
                    Text("Export School Report", style = MaterialTheme.typography.labelLarge)
                }
            }
        }

        // stats overview
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 16.dp)
                .offset(y = (-50).dp),
            horizontalArrangement = Arrangement.spacedBy(12.dp)
        ) {
            StatCard(
                title = stringResource(R.string.total_students),
                value = "${state.stats.totalStudents}",
                icon = { Icon(Icons.Rounded.Group, null, tint = Color(0xFF4CAF50)) },
                color = Color(0xFF4CAF50),
                modifier = Modifier.weight(1f)
            )
            StatCard(
                title = stringResource(R.string.est_revenue),
                value = "Rs. ${state.stats.totalRevenue}",
                icon = { Icon(Icons.Rounded.Payments, null, tint = Color(0xFFFF9800)) },
                color = Color(0xFFFF9800),
                modifier = Modifier.weight(1f)
            )
        }
        
        // Admin Management Portals
        SectionHeader(title = stringResource(R.string.management_portals), modifier = Modifier.offset(y = (-30).dp))
        Column(
            modifier = Modifier.padding(horizontal = 24.dp).offset(y = (-20).dp),
            verticalArrangement = Arrangement.spacedBy(16.dp)
        ) {
            AdminActionCard(
                stringResource(R.string.fee_approvals), 
                "Monitor dues & collections", 
                Icons.Rounded.AccountBalanceWallet, 
                Color(0xFFFF9800),
                onClick = onFeeApprovalsClick
            )
            AdminActionCard(
                stringResource(R.string.staff_attendance), 
                "Check daily teacher presence", 
                Icons.Rounded.AssignmentInd, 
                Color(0xFF2196F3),
                onClick = onStaffTrackingClick
            )
            AdminActionCard(
                stringResource(R.string.school_announcements), 
                "Post notices & updates", 
                Icons.Rounded.Campaign, 
                Color(0xFF9C27B0),
                onClick = onPostAnnouncementClick
            )
        }
        
        Spacer(Modifier.height(32.dp))
    }
}

@Composable
fun AdminActionCard(
    title: String, 
    subtitle: String, 
    icon: androidx.compose.ui.graphics.vector.ImageVector, 
    color: Color,
    onClick: () -> Unit
) {
    Card(
        modifier = Modifier.fillMaxWidth().clickable { onClick() },
        shape = RoundedCornerShape(24.dp),
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
        elevation = CardDefaults.cardElevation(defaultElevation = 2.dp)
    ) {
        Row(modifier = Modifier.padding(20.dp), verticalAlignment = Alignment.CenterVertically) {
            Surface(color = color.copy(alpha = 0.1f), shape = RoundedCornerShape(16.dp), modifier = Modifier.size(56.dp)) {
                Box(contentAlignment = Alignment.Center) {
                    Icon(icon, null, tint = color, modifier = Modifier.size(28.dp))
                }
            }
            Spacer(modifier = Modifier.width(16.dp))
            Column {
                Text(title, style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold)
                Text(subtitle, style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.6f))
            }
        }
    }
}
