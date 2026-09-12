package com.lodhidevelop.taleemiduniya_pro.presentation.student

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.rounded.Logout
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
import androidx.hilt.navigation.compose.hiltViewModel
import coil.compose.AsyncImage
import com.lodhidevelop.taleemiduniya_pro.presentation.common.*

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun StudentProfileScreen(
    viewModel: StudentDashboardViewModel = hiltViewModel(),
    onBack: () -> Unit,
    onLogout: () -> Unit
) {
    val uiState by viewModel.uiState.collectAsState()

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Student Profile") },
                navigationIcon = {
                    IconButton(onClick = onBack) {
                        Icon(Icons.Rounded.ArrowBack, contentDescription = "Back")
                    }
                },
                actions = {
                    IconButton(onClick = onLogout) {
                        Icon(Icons.AutoMirrored.Rounded.Logout, contentDescription = "Logout", tint = MaterialTheme.colorScheme.error)
                    }
                }
            )
        }
    ) { padding ->
        when (val state = uiState) {
            is StudentDashboardUiState.Loading -> LoadingSkeleton(Modifier.padding(padding))
            is StudentDashboardUiState.Error -> ErrorState(state.message, { viewModel.loadDashboardData() }, Modifier.padding(padding))
            is StudentDashboardUiState.Success -> {
                ProfileContent(state.profile, padding)
            }
        }
    }
}

@Composable
fun ProfileContent(profile: com.lodhidevelop.taleemiduniya_pro.data.model.StudentProfile, padding: PaddingValues) {
    Column(
        modifier = Modifier
            .fillMaxSize()
            .padding(padding)
            .verticalScroll(rememberScrollState())
            .background(MaterialTheme.colorScheme.background),
        horizontalAlignment = Alignment.CenterHorizontally
    ) {
        Spacer(modifier = Modifier.height(24.dp))
        
        // Profile Photo
        Box(
            modifier = Modifier
                .size(120.dp)
                .clip(CircleShape)
                .background(MaterialTheme.colorScheme.surfaceVariant),
            contentAlignment = Alignment.Center
        ) {
            AsyncImage(
                model = profile.photoUrl,
                contentDescription = "Profile Photo",
                modifier = Modifier.fillMaxSize(),
                contentScale = ContentScale.Crop
            )
            if (profile.photoUrl.isEmpty()) {
                Icon(Icons.Rounded.Person, contentDescription = null, modifier = Modifier.size(64.dp), tint = MaterialTheme.colorScheme.primary)
            }
        }
        
        Spacer(modifier = Modifier.height(16.dp))
        
        Text(
            text = profile.name,
            style = MaterialTheme.typography.headlineSmall,
            fontWeight = FontWeight.Bold
        )
        Text(
            text = "Roll No: ${profile.rollNumber}",
            style = MaterialTheme.typography.bodyLarge,
            color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.6f)
        )
        
        Spacer(modifier = Modifier.height(32.dp))
        
        // Profile Details Card
        Card(
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 24.dp),
            shape = RoundedCornerShape(24.dp),
            colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface)
        ) {
            Column(modifier = Modifier.padding(24.dp)) {
                ProfileDetailItem("Father Name", profile.fatherName, Icons.Rounded.Badge)
                HorizontalDivider(modifier = Modifier.padding(vertical = 12.dp), color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.1f))
                ProfileDetailItem("Class", profile.className, Icons.Rounded.Class)
                HorizontalDivider(modifier = Modifier.padding(vertical = 12.dp), color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.1f))
                ProfileDetailItem("Section", profile.section, Icons.Rounded.Layers)
                HorizontalDivider(modifier = Modifier.padding(vertical = 12.dp), color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.1f))
                ProfileDetailItem("Phone", profile.phone, Icons.Rounded.Phone)
                HorizontalDivider(modifier = Modifier.padding(vertical = 12.dp), color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.1f))
                ProfileDetailItem("Status", profile.status, Icons.Rounded.Info)
                HorizontalDivider(modifier = Modifier.padding(vertical = 12.dp), color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.1f))
                ProfileDetailItem("School ID", profile.schoolId, Icons.Rounded.School)
            }
        }
        
        Spacer(modifier = Modifier.height(32.dp))
    }
}

