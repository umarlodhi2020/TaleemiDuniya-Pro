package com.lodhidevelop.taleemiduniya_pro.presentation.teacher

import android.content.Intent
import android.net.Uri
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
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import coil.compose.AsyncImage
import com.lodhidevelop.taleemiduniya_pro.data.model.StudentProfile
import com.lodhidevelop.taleemiduniya_pro.presentation.common.*

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun TeacherStudentListScreen(
    className: String,
    section: String,
    viewModel: TeacherAttendanceViewModel = hiltViewModel(), // Reusing to get student list
    onBack: () -> Unit
) {
    val students by viewModel.students.collectAsState()
    val uiState by viewModel.uiState.collectAsState()
    var searchQuery by remember { mutableStateOf("") }

    val filteredStudents = remember(searchQuery, students) {
        students.filter { 
            it.student.name.contains(searchQuery, ignoreCase = true) || 
            it.student.rollNumber.contains(searchQuery, ignoreCase = true)
        }
    }

    LaunchedEffect(Unit) {
        viewModel.loadStudents(className, section)
    }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Class Students") },
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
            // Search Bar
            OutlinedTextField(
                value = searchQuery,
                onValueChange = { searchQuery = it },
                placeholder = { Text("Search by name or roll number...") },
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(horizontal = 24.dp, vertical = 12.dp),
                shape = RoundedCornerShape(16.dp),
                leadingIcon = { Icon(Icons.Rounded.Search, null) },
                trailingIcon = if (searchQuery.isNotEmpty()) {
                    { IconButton(onClick = { searchQuery = "" }) { Icon(Icons.Rounded.Close, null) } }
                } else null,
                singleLine = true
            )

            SectionHeader(title = "Students in $className-$section (${filteredStudents.size})")
            
            if (uiState is TeacherAttendanceUiState.Loading) {
                LoadingSkeleton()
            } else if (filteredStudents.isEmpty()) {
                Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                    Text(
                        if (searchQuery.isEmpty()) "No students found in this class." else "No matches for \"$searchQuery\"", 
                        color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.5f)
                    )
                }
            } else {
                LazyColumn(
                    modifier = Modifier.fillMaxSize(),
                    contentPadding = PaddingValues(horizontal = 24.dp, vertical = 8.dp),
                    verticalArrangement = Arrangement.spacedBy(16.dp)
                ) {
                    items(filteredStudents) { state ->
                        StudentContactItem(state.student)
                    }
                }
            }
        }
    }
}

@Composable
fun StudentContactItem(student: StudentProfile) {
    val context = LocalContext.current
    
    Card(
        modifier = Modifier.fillMaxWidth(),
        shape = RoundedCornerShape(24.dp),
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
        elevation = CardDefaults.cardElevation(defaultElevation = 2.dp)
    ) {
        Row(
            modifier = Modifier.padding(16.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            AsyncImage(
                model = student.photoUrl,
                contentDescription = null,
                modifier = Modifier.size(56.dp).clip(CircleShape),
                contentScale = ContentScale.Crop
            )
            
            Spacer(modifier = Modifier.width(16.dp))
            
            Column(modifier = Modifier.weight(1f)) {
                Text(student.name, style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold)
                Text("Roll No: ${student.rollNumber}", style = MaterialTheme.typography.bodySmall)
            }
            
            Row {
                IconButton(onClick = {
                    val intent = Intent(Intent.ACTION_DIAL, Uri.parse("tel:${student.phone}"))
                    context.startActivity(intent)
                }) {
                    Icon(Icons.Rounded.Call, "Call", tint = Color(0xFF4CAF50))
                }
                IconButton(onClick = {
                    val url = "https://api.whatsapp.com/send?phone=${student.phone}"
                    val intent = Intent(Intent.ACTION_VIEW, Uri.parse(url))
                    context.startActivity(intent)
                }) {
                    Icon(Icons.Rounded.Chat, "WhatsApp", tint = Color(0xFF25D366))
                }
            }
        }
    }
}
