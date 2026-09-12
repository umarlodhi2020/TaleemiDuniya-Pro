package com.lodhidevelop.taleemiduniya_pro.presentation.admin

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
import com.lodhidevelop.taleemiduniya_pro.data.model.FeeRecord
import com.lodhidevelop.taleemiduniya_pro.presentation.common.*

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun AdminFeeApprovalsScreen(
    viewModel: AdminDashboardViewModel = hiltViewModel(),
    onBack: () -> Unit
) {
    val pendingVouchers by viewModel.pendingVouchers.collectAsState()
    
    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Fee Approvals") },
                navigationIcon = {
                    IconButton(onClick = onBack) {
                        Icon(Icons.AutoMirrored.Rounded.ArrowBack, contentDescription = "Back")
                    }
                }
            )
        }
    ) { padding ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(padding)
                .background(MaterialTheme.colorScheme.background)
        ) {
            SectionHeader(title = "Pending Vouchers (${pendingVouchers.size})")
            
            if (pendingVouchers.isEmpty()) {
                Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                    Column(horizontalAlignment = Alignment.CenterHorizontally) {
                        Icon(Icons.Rounded.Payments, null, modifier = Modifier.size(64.dp), tint = MaterialTheme.colorScheme.primary.copy(alpha = 0.3f))
                        Spacer(Modifier.height(16.dp))
                        Text("No pending approvals found.", color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.5f))
                    }
                }
            } else {
                LazyColumn(
                    modifier = Modifier.fillMaxSize(),
                    contentPadding = PaddingValues(24.dp),
                    verticalArrangement = Arrangement.spacedBy(16.dp)
                ) {
                    items(pendingVouchers) { voucher ->
                        AdminVoucherItem(voucher) {
                            viewModel.approveFee(voucher.id)
                        }
                    }
                }
            }
        }
    }
}

@Composable
fun AdminVoucherItem(voucher: FeeRecord, onApprove: () -> Unit) {
    Card(
        modifier = Modifier.fillMaxWidth(),
        shape = RoundedCornerShape(20.dp),
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
        elevation = CardDefaults.cardElevation(defaultElevation = 2.dp)
    ) {
        Row(
            modifier = Modifier.padding(20.dp),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.SpaceBetween
        ) {
            Column(modifier = Modifier.weight(1f)) {
                Text(voucher.month, style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold)
                Text("Voucher: ${voucher.voucherNo}", style = MaterialTheme.typography.bodySmall)
                Text("Rs. ${voucher.totalAmount}", style = MaterialTheme.typography.titleLarge, color = MaterialTheme.colorScheme.primary, fontWeight = FontWeight.Bold)
            }
            
            Button(
                onClick = onApprove,
                colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF4CAF50)),
                shape = RoundedCornerShape(12.dp)
            ) {
                Text("Approve")
            }
        }
    }
}
