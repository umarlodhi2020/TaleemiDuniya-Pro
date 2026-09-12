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
import com.lodhidevelop.taleemiduniya_pro.data.model.FeeRecord
import com.lodhidevelop.taleemiduniya_pro.presentation.common.*

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun StudentFeesScreen(
    viewModel: StudentDashboardViewModel = hiltViewModel(),
    onBack: () -> Unit
) {
    val uiState by viewModel.uiState.collectAsState()

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Fee Ledger") },
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
                FeesContent(state.profile, state.fees, padding)
            }
        }
    }
}

@Composable
fun FeesContent(profile: com.lodhidevelop.taleemiduniya_pro.data.model.StudentProfile, fees: List<FeeRecord>, padding: PaddingValues) {
    val totalDue = fees.filter { it.status.lowercase() != "paid" }.sumOf { it.totalAmount - it.paidAmount }
    val context = androidx.compose.ui.platform.LocalContext.current

    Column(
        modifier = Modifier
            .fillMaxSize()
            .padding(padding)
            .background(MaterialTheme.colorScheme.background)
    ) {
        // Balance Card
        Card(
            modifier = Modifier
                .fillMaxWidth()
                .padding(24.dp),
            shape = RoundedCornerShape(24.dp),
            colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.primary)
        ) {
            Column(modifier = Modifier.padding(24.dp)) {
                Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                    Column {
                        Text("Total Outstanding", color = Color.White.copy(alpha = 0.8f), style = MaterialTheme.typography.labelLarge)
                        Text("Rs. $totalDue", color = Color.White, style = MaterialTheme.typography.headlineLarge, fontWeight = FontWeight.Bold)
                    }
                    Column(horizontalAlignment = Alignment.End) {
                        Text("Monthly Fee", color = Color.White.copy(alpha = 0.8f), style = MaterialTheme.typography.labelLarge)
                        Text("Rs. ${profile.monthlyFee}", color = Color.White, style = MaterialTheme.typography.titleLarge, fontWeight = FontWeight.Bold)
                    }
                }
                
                Spacer(modifier = Modifier.height(16.dp))
                
                if (totalDue > 0) {
                    Surface(
                        color = Color.White.copy(alpha = 0.2f),
                        shape = RoundedCornerShape(12.dp)
                    ) {
                        Row(
                            modifier = Modifier.padding(horizontal = 12.dp, vertical = 8.dp),
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Icon(Icons.Rounded.NotificationsActive, contentDescription = null, tint = Color.White, modifier = Modifier.size(16.dp))
                            Spacer(modifier = Modifier.width(8.dp))
                            Text("Fee Reminder: Please clear your dues by the 10th.", color = Color.White, style = MaterialTheme.typography.bodySmall)
                        }
                    }
                }
                
                Spacer(modifier = Modifier.height(16.dp))
                
                Button(
                    onClick = {
                        val url = "https://umarhayat.alwaysdata.net/api/mobile/fees/voucher-pdf?studentId=${profile.id}&schoolId=${profile.schoolId}"
                        val intent = android.content.Intent(android.content.Intent.ACTION_VIEW, android.net.Uri.parse(url))
                        context.startActivity(intent)
                    },
                    colors = ButtonDefaults.buttonColors(containerColor = Color.White, contentColor = MaterialTheme.colorScheme.primary),
                    modifier = Modifier.fillMaxWidth(),
                    shape = RoundedCornerShape(12.dp)
                ) {
                    Icon(Icons.Rounded.PictureAsPdf, contentDescription = null)
                    Spacer(modifier = Modifier.width(8.dp))
                    Text("Download Voucher (Parent Copy)")
                }
            }
        }

        SectionHeader(title = "Payment History")

        if (fees.isEmpty()) {
            Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                Text("No fee records found.", color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.5f))
            }
        } else {
            LazyColumn(
                modifier = Modifier.fillMaxSize(),
                contentPadding = PaddingValues(horizontal = 24.dp, vertical = 8.dp),
                verticalArrangement = Arrangement.spacedBy(16.dp)
            ) {
                items(fees) { fee ->
                    FeeHistoryItem(fee, profile)
                }
            }
        }
    }
}

@Composable
fun FeeHistoryItem(fee: FeeRecord, profile: com.lodhidevelop.taleemiduniya_pro.data.model.StudentProfile) {
    val context = androidx.compose.ui.platform.LocalContext.current
    Card(
        modifier = Modifier.fillMaxWidth(),
        shape = RoundedCornerShape(20.dp),
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface)
    ) {
        Column(modifier = Modifier.padding(20.dp)) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Column {
                    Text(fee.month, style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold)
                    Text("Voucher: ${fee.voucherNo}", style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.6f))
                }
                
                val statusColor = when (fee.status.lowercase()) {
                    "paid" -> Color(0xFF4CAF50)
                    "unpaid" -> Color(0xFFF44336)
                    "partial" -> Color(0xFFFF9800)
                    else -> MaterialTheme.colorScheme.onSurface
                }
                
                Surface(
                    color = statusColor.copy(alpha = 0.1f),
                    shape = RoundedCornerShape(8.dp)
                ) {
                    Text(
                        text = fee.status,
                        modifier = Modifier.padding(horizontal = 12.dp, vertical = 4.dp),
                        color = statusColor,
                        style = MaterialTheme.typography.labelMedium,
                        fontWeight = FontWeight.Bold
                    )
                }
            }
            
            Spacer(modifier = Modifier.height(16.dp))
            
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.Bottom
            ) {
                Column {
                    Text("Amount", style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.6f))
                    Text("Rs. ${fee.totalAmount}", style = MaterialTheme.typography.titleLarge, fontWeight = FontWeight.Bold)
                }
                
                Row {
                    IconButton(onClick = { 
                        val url = "https://umarhayat.alwaysdata.net/api/mobile/fees/voucher-pdf?studentId=${profile.id}&schoolId=${profile.schoolId}"
                        val intent = android.content.Intent(android.content.Intent.ACTION_VIEW, android.net.Uri.parse(url))
                        context.startActivity(intent)
                    }) {
                        Icon(Icons.Rounded.Visibility, contentDescription = "View", tint = MaterialTheme.colorScheme.primary)
                    }
                    IconButton(onClick = { 
                        val url = "https://umarhayat.alwaysdata.net/api/mobile/fees/voucher-pdf?studentId=${profile.id}&schoolId=${profile.schoolId}"
                        val intent = android.content.Intent(android.content.Intent.ACTION_VIEW, android.net.Uri.parse(url))
                        context.startActivity(intent)
                    }) {
                        Icon(Icons.Rounded.Download, contentDescription = "Download", tint = MaterialTheme.colorScheme.primary)
                    }
                    IconButton(onClick = { /* Share */ }) {
                        Icon(Icons.Rounded.Share, contentDescription = "Share", tint = MaterialTheme.colorScheme.primary)
                    }
                }
            }
        }
    }
}
