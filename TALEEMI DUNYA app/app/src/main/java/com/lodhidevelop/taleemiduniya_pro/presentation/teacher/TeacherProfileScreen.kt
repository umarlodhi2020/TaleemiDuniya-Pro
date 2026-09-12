package com.lodhidevelop.taleemiduniya_pro.presentation.teacher

import android.net.Uri
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.*
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.rounded.ArrowBack
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
import androidx.compose.ui.res.stringResource
import com.lodhidevelop.taleemiduniya_pro.R
import com.lodhidevelop.taleemiduniya_pro.presentation.auth.AuthViewModel
import com.lodhidevelop.taleemiduniya_pro.presentation.common.*

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun TeacherProfileScreen(
    dashboardViewModel: TeacherDashboardViewModel = hiltViewModel(),
    profileViewModel: TeacherProfileViewModel = hiltViewModel(),
    authViewModel: AuthViewModel = hiltViewModel(),
    onBack: () -> Unit,
    onLogout: () -> Unit
) {
    val dashboardState by dashboardViewModel.uiState.collectAsState()
    val editState by profileViewModel.uiState.collectAsState()
    
    var isEditing by remember { mutableStateOf(false) }
    
    // Form States
    var name by remember { mutableStateOf("") }
    var email by remember { mutableStateOf("") }
    var phone by remember { mutableStateOf("") }
    var selectedImageUri by remember { mutableStateOf<Uri?>(null) }

    val photoPicker = rememberLauncherForActivityResult(
        contract = ActivityResultContracts.GetContent()
    ) { uri -> selectedImageUri = uri }

    // Initialize form when profile loads
    LaunchedEffect(dashboardState) {
        if (dashboardState is TeacherDashboardUiState.Success) {
            val profile = (dashboardState as TeacherDashboardUiState.Success).profile
            name = profile.name
            email = profile.email
            phone = profile.phone
        }
    }

    LaunchedEffect(editState) {
        if (editState is TeacherProfileUiState.Success) {
            isEditing = false
            dashboardViewModel.loadTeacherData() // Refresh dashboard data
            profileViewModel.resetState()
        }
    }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text(if (isEditing) stringResource(R.string.edit_profile) else stringResource(R.string.teacher_profile_title)) },
                navigationIcon = {
                    IconButton(onClick = if (isEditing) { { isEditing = false } } else onBack) {
                        Icon(Icons.AutoMirrored.Rounded.ArrowBack, contentDescription = "Back")
                    }
                },
                actions = {
                    if (!isEditing) {
                        IconButton(onClick = { isEditing = true }) {
                            Icon(Icons.Rounded.Edit, "Edit")
                        }
                        IconButton(onClick = {
                            authViewModel.logout()
                            onLogout()
                        }) {
                            Icon(Icons.AutoMirrored.Rounded.Logout, contentDescription = "Logout", tint = MaterialTheme.colorScheme.error)
                        }
                    }
                }
            )
        }
    ) { padding ->
        when (val state = dashboardState) {
            is TeacherDashboardUiState.Loading -> LoadingSkeleton(Modifier.padding(padding))
            is TeacherDashboardUiState.Error -> ErrorState(state.message, { dashboardViewModel.loadTeacherData() }, Modifier.padding(padding))
            is TeacherDashboardUiState.Success -> {
                Column(
                    modifier = Modifier
                        .fillMaxSize()
                        .padding(padding)
                        .verticalScroll(rememberScrollState())
                        .background(MaterialTheme.colorScheme.background),
                    horizontalAlignment = Alignment.CenterHorizontally
                ) {
                    Spacer(modifier = Modifier.height(24.dp))
                    
                    // Profile Image Section
                    Box(
                        modifier = Modifier
                            .size(140.dp)
                            .clip(CircleShape)
                            .border(4.dp, MaterialTheme.colorScheme.primary.copy(alpha = 0.5f), CircleShape)
                            .clickable(enabled = isEditing) { photoPicker.launch("image/*") },
                        contentAlignment = Alignment.Center
                    ) {
                        AsyncImage(
                            model = selectedImageUri ?: state.profile.photoUrl,
                            contentDescription = null,
                            modifier = Modifier.fillMaxSize().clip(CircleShape),
                            contentScale = ContentScale.Crop
                        )
                        if (isEditing) {
                            Box(
                                modifier = Modifier
                                    .fillMaxSize()
                                    .background(Color.Black.copy(alpha = 0.3f)),
                                contentAlignment = Alignment.Center
                            ) {
                                Icon(Icons.Rounded.CameraAlt, null, tint = Color.White, modifier = Modifier.size(32.dp))
                            }
                        }
                    }
                    
                    Spacer(modifier = Modifier.height(24.dp))
                    
                    if (isEditing) {
                        // Edit Mode Fields
                        Column(
                            modifier = Modifier.padding(horizontal = 24.dp),
                            verticalArrangement = Arrangement.spacedBy(16.dp)
                        ) {
                            OutlinedTextField(
                                value = name,
                                onValueChange = { name = it },
                                label = { Text("Full Name") },
                                modifier = Modifier.fillMaxWidth(),
                                shape = RoundedCornerShape(16.dp),
                                leadingIcon = { Icon(Icons.Rounded.Person, null) }
                            )
                            OutlinedTextField(
                                value = email,
                                onValueChange = { email = it },
                                label = { Text("Email Address") },
                                modifier = Modifier.fillMaxWidth(),
                                shape = RoundedCornerShape(16.dp),
                                leadingIcon = { Icon(Icons.Rounded.Email, null) }
                            )
                            OutlinedTextField(
                                value = phone,
                                onValueChange = { phone = it },
                                label = { Text("Phone Number") },
                                modifier = Modifier.fillMaxWidth(),
                                shape = RoundedCornerShape(16.dp),
                                leadingIcon = { Icon(Icons.Rounded.Call, null) }
                            )
                            
                            if (editState is TeacherProfileUiState.Error) {
                                Text(
                                    text = (editState as TeacherProfileUiState.Error).message,
                                    color = MaterialTheme.colorScheme.error,
                                    style = MaterialTheme.typography.bodySmall
                                )
                            }
                            
                            Button(
                                onClick = { 
                                    profileViewModel.updateProfile(name, email, phone, selectedImageUri)
                                },
                                modifier = Modifier.fillMaxWidth().height(56.dp),
                                shape = RoundedCornerShape(16.dp),
                                enabled = editState !is TeacherProfileUiState.Loading
                            ) {
                                if (editState is TeacherProfileUiState.Loading) {
                                    CircularProgressIndicator(modifier = Modifier.size(24.dp), color = Color.White)
                                } else {
                                    Text(stringResource(R.string.save_changes), fontWeight = FontWeight.Bold)
                                }
                            }
                        }
                    } else {
                        // View Mode
                        Text(state.profile.name, style = MaterialTheme.typography.headlineSmall, fontWeight = FontWeight.Bold)
                        Text(state.profile.designation, style = MaterialTheme.typography.bodyMedium, color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.6f))
                        
                        Spacer(modifier = Modifier.height(32.dp))
                        
                        Card(
                            modifier = Modifier
                                .fillMaxWidth()
                                .padding(horizontal = 24.dp),
                            shape = RoundedCornerShape(24.dp),
                            colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
                            elevation = CardDefaults.cardElevation(defaultElevation = 2.dp)
                        ) {
                            Column(modifier = Modifier.padding(24.dp)) {
                                ProfileDetailItem("Email", state.profile.email, Icons.Rounded.Email)
                                HorizontalDivider(modifier = Modifier.padding(vertical = 12.dp), color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.1f))
                                ProfileDetailItem("Phone", state.profile.phone, Icons.Rounded.Call)
                                HorizontalDivider(modifier = Modifier.padding(vertical = 12.dp), color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.1f))
                                ProfileDetailItem("Primary Class", "${state.profile.className} - ${state.profile.section}", Icons.Rounded.Class)
                            }
                        }
                    }
                    
                    Spacer(modifier = Modifier.height(32.dp))
                    
                    if (!isEditing) {
                        Spacer(modifier = Modifier.height(24.dp))
                        
                        Text("About App", style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold, modifier = Modifier.align(Alignment.Start).padding(horizontal = 24.dp))
                        Spacer(modifier = Modifier.height(12.dp))
                        
                        Card(
                            modifier = Modifier.fillMaxWidth().padding(horizontal = 24.dp),
                            shape = RoundedCornerShape(24.dp),
                            colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.3f))
                        ) {
                            Column(modifier = Modifier.padding(20.dp)) {
                                Row(verticalAlignment = Alignment.CenterVertically) {
                                    Icon(Icons.Rounded.Info, null, tint = MaterialTheme.colorScheme.primary)
                                    Spacer(modifier = Modifier.width(12.dp))
                                    Column {
                                        Text("Version", style = MaterialTheme.typography.labelSmall)
                                        Text("1.0.0 (Stable)", style = MaterialTheme.typography.bodyMedium, fontWeight = FontWeight.Bold)
                                    }
                                }
                                HorizontalDivider(modifier = Modifier.padding(vertical = 12.dp), color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.05f))
                                Row(verticalAlignment = Alignment.CenterVertically) {
                                    Icon(Icons.Rounded.Code, null, tint = MaterialTheme.colorScheme.primary)
                                    Spacer(modifier = Modifier.width(12.dp))
                                    Column {
                                        Text("Developed By", style = MaterialTheme.typography.labelSmall)
                                        Text("Lodhi Developers", style = MaterialTheme.typography.bodyMedium, fontWeight = FontWeight.Bold)
                                    }
                                }
                            }
                        }
                        
                        Spacer(modifier = Modifier.height(24.dp))

                        Button(
                            onClick = { /* Help */ },
                            modifier = Modifier.fillMaxWidth().padding(horizontal = 24.dp).height(56.dp),
                            shape = RoundedCornerShape(16.dp),
                            colors = ButtonDefaults.buttonColors(containerColor = MaterialTheme.colorScheme.primary, contentColor = Color.White)
                        ) {
                            Icon(Icons.Rounded.SupportAgent, null)
                            Spacer(modifier = Modifier.width(8.dp))
                            Text("Contact Support")
                        }
                    }
                }
            }
        }
    }
}
