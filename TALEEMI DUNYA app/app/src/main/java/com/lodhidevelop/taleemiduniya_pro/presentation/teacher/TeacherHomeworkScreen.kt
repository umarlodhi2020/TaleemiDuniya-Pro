package com.lodhidevelop.taleemiduniya_pro.presentation.teacher

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.rounded.ArrowBack
import androidx.compose.material.icons.rounded.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.ImeAction
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import coil.compose.AsyncImage
import androidx.compose.ui.res.stringResource
import com.lodhidevelop.taleemiduniya_pro.R
import com.lodhidevelop.taleemiduniya_pro.data.model.HomeworkRecord
import com.lodhidevelop.taleemiduniya_pro.presentation.common.*
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import android.net.Uri

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun TeacherHomeworkScreen(
    className: String,
    section: String,
    schoolId: String,
    teacherName: String,
    viewModel: TeacherHomeworkViewModel = hiltViewModel(), 
        onBack: () -> Unit
    ) {
        var subject by remember { mutableStateOf("") }
        var title by remember { mutableStateOf("") }
        var description by remember { mutableStateOf("") }
        var dueDate by remember { mutableStateOf("") }
        var isDiary by remember { mutableStateOf(false) } // Switch between Homework and Class Diary
        var selectedImageUri by remember { mutableStateOf<Uri?>(null) }
        
        val uiState by viewModel.uiState.collectAsState()
    
    val photoPickerLauncher = rememberLauncherForActivityResult(
        contract = ActivityResultContracts.GetContent()
    ) { uri: Uri? ->
        selectedImageUri = uri
    }

    LaunchedEffect(uiState) {
        if (uiState is TeacherHomeworkUiState.Success) {
            onBack()
            viewModel.resetState()
        }
    }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text(stringResource(R.string.post_homework)) },
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
                .verticalScroll(rememberScrollState())
                .padding(24.dp),
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.spacedBy(16.dp)
        ) {
            // Role Selector for Entry Type
            TabRow(
                selectedTabIndex = if (isDiary) 1 else 0,
                modifier = Modifier.clip(RoundedCornerShape(12.dp)),
                containerColor = MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.5f),
                indicator = {},
                divider = {}
            ) {
                Tab(
                    selected = !isDiary,
                    onClick = { isDiary = false },
                    text = { Text("Homework") }
                )
                Tab(
                    selected = isDiary,
                    onClick = { isDiary = true },
                    text = { Text("Class Diary") }
                )
            }

            OutlinedTextField(
                value = subject,
                onValueChange = { subject = it },
                label = { Text("Subject") },
                modifier = Modifier.fillMaxWidth(),
                shape = RoundedCornerShape(16.dp)
            )
            
            OutlinedTextField(
                value = title,
                onValueChange = { title = it },
                label = { Text("Topic/Title") },
                modifier = Modifier.fillMaxWidth(),
                shape = RoundedCornerShape(16.dp)
            )
            
            OutlinedTextField(
                value = description,
                onValueChange = { description = it },
                label = { Text("Description") },
                modifier = Modifier.fillMaxWidth().height(150.dp),
                shape = RoundedCornerShape(16.dp)
            )
            
            if (!isDiary) {
                OutlinedTextField(
                    value = dueDate,
                    onValueChange = { dueDate = it },
                    label = { Text("Due Date (e.g. 2026-08-20)") },
                    modifier = Modifier.fillMaxWidth(),
                    shape = RoundedCornerShape(16.dp)
                )
            }

            Spacer(modifier = Modifier.height(8.dp))

            // Image Picker Section
            Text("Attachment (Optional)", style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold, modifier = Modifier.align(Alignment.Start))
            
            Card(
                modifier = Modifier
                    .fillMaxWidth()
                    .height(200.dp)
                    .clickable { photoPickerLauncher.launch("image/*") },
                shape = RoundedCornerShape(16.dp),
                colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.5f))
            ) {
                Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                    if (selectedImageUri != null) {
                        AsyncImage(
                            model = selectedImageUri,
                            contentDescription = null,
                            modifier = Modifier.fillMaxSize().clip(RoundedCornerShape(16.dp)),
                            contentScale = ContentScale.Crop
                        )
                        IconButton(
                            onClick = { selectedImageUri = null },
                            modifier = Modifier.align(Alignment.TopEnd).padding(8.dp).background(Color.Black.copy(alpha = 0.5f), CircleShape)
                        ) {
                            Icon(Icons.Rounded.Close, null, tint = Color.White)
                        }
                    } else {
                        Column(horizontalAlignment = Alignment.CenterHorizontally) {
                            Icon(Icons.Rounded.AddPhotoAlternate, null, modifier = Modifier.size(48.dp), tint = MaterialTheme.colorScheme.primary)
                            Text("Select Homework Image", color = MaterialTheme.colorScheme.primary)
                        }
                    }
                }
            }
            
            if (uiState is TeacherHomeworkUiState.Error) {
                Text(
                    text = (uiState as TeacherHomeworkUiState.Error).message,
                    color = MaterialTheme.colorScheme.error,
                    style = MaterialTheme.typography.bodySmall
                )
            }

            Spacer(modifier = Modifier.height(24.dp))
            
            Button(
                onClick = {
                    viewModel.publishHomework(
                        subject = subject,
                        title = title,
                        description = description,
                        dueDate = dueDate,
                        imageUri = selectedImageUri,
                        className = className,
                        section = section,
                        schoolId = schoolId,
                        teacherName = teacherName
                    )
                },
                modifier = Modifier.fillMaxWidth().height(56.dp),
                shape = RoundedCornerShape(16.dp),
                enabled = subject.isNotEmpty() && title.isNotEmpty() && uiState !is TeacherHomeworkUiState.Loading
            ) {
                if (uiState is TeacherHomeworkUiState.Loading) {
                    CircularProgressIndicator(modifier = Modifier.size(24.dp), color = Color.White)
                } else {
                    Text(
                        if (isDiary) "Publish to Class Diary" else "Publish Homework",
                        style = MaterialTheme.typography.titleMedium,
                        fontWeight = FontWeight.Bold
                    )
                }
            }
        }
    }
}

