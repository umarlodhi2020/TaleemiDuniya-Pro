package com.lodhidevelop.taleemiduniya_pro.presentation.auth

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.rounded.Call
import androidx.compose.material.icons.rounded.CreditCard
import androidx.compose.material.icons.rounded.School
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.AnnotatedString
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.input.OffsetMapping
import androidx.compose.ui.text.input.TransformedText
import androidx.compose.ui.text.input.VisualTransformation
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.material.icons.rounded.Email
import androidx.compose.material.icons.rounded.Person
import androidx.compose.ui.res.stringResource
import com.lodhidevelop.taleemiduniya_pro.R
import com.lodhidevelop.taleemiduniya_pro.presentation.theme.TALEEMIDUNYATheme
import com.lodhidevelop.taleemiduniya_pro.presentation.common.WaveHeader

import androidx.compose.material.icons.rounded.AccountCircle
import androidx.compose.material.icons.rounded.Email
import androidx.compose.ui.graphics.Brush

@Composable
fun LoginScreen(
    viewModel: AuthViewModel,
    role: String,
    onOtpRequested: (String, String, String) -> Unit
) {
    var identifier by remember { mutableStateOf("") }
    var phone by remember { mutableStateOf("") }
    var email by remember { mutableStateOf("") }
    var localError by remember { mutableStateOf("") }
    val authState by viewModel.authState.collectAsState()

    val roleTitle = role.replaceFirstChar { if (it.isLowerCase()) it.titlecase() else it.toString() }
    val roleColor = when (role.lowercase()) {
        "student" -> Color(0xFF1455D9)
        "parent" -> Color(0xFFD81B60)
        "teacher" -> Color(0xFF2E7D32)
        else -> MaterialTheme.colorScheme.primary
    }

    LaunchedEffect(authState) {
        if (authState is AuthState.OtpRequested) {
            val state = authState as AuthState.OtpRequested
            onOtpRequested(state.phone, state.cnic, state.email)
        }
    }

    Scaffold(
        containerColor = MaterialTheme.colorScheme.background,
        modifier = Modifier.imePadding() // Ensures keyboard doesn't hide fields
    ) { padding ->
        Box(modifier = Modifier.fillMaxSize().padding(padding)) {
            // ... (rest same, but I'll update the inner Column)
            
            // Hero Section (Top Gradient Header)
            Column(
                modifier = Modifier
                    .fillMaxWidth()
                    .background(
                        brush = Brush.verticalGradient(
                            colors = listOf(roleColor, roleColor.copy(alpha = 0.8f))
                        )
                    )
                    .height(240.dp), // Reduced height slightly to give more room for fields
                horizontalAlignment = Alignment.CenterHorizontally,
                verticalArrangement = Arrangement.Center
            ) {
                Icon(
                    imageVector = Icons.Rounded.School,
                    contentDescription = null,
                    tint = Color.White,
                    modifier = Modifier.size(60.dp)
                )
                Text(
                    text = "Taleemi Dunya",
                    color = Color.White,
                    style = MaterialTheme.typography.headlineMedium,
                    fontWeight = FontWeight.ExtraBold,
                    letterSpacing = 1.sp
                )
            }

            // Scrollable Content
            val scrollState = rememberScrollState()
            Column(
                modifier = Modifier
                    .fillMaxSize()
                    .verticalScroll(scrollState),
                horizontalAlignment = Alignment.CenterHorizontally
            ) {
                Spacer(modifier = Modifier.height(180.dp))

                Card(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(horizontal = 20.dp)
                        .padding(bottom = 20.dp),
                    shape = RoundedCornerShape(32.dp),
                    colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
                    elevation = CardDefaults.cardElevation(defaultElevation = 12.dp)
                ) {
                    Column(
                        modifier = Modifier.padding(24.dp),
                        horizontalAlignment = Alignment.CenterHorizontally
                    ) {
                        Text(
                            text = stringResource(R.string.welcome_back),
                            style = MaterialTheme.typography.headlineSmall,
                            fontWeight = FontWeight.ExtraBold,
                            color = MaterialTheme.colorScheme.onSurface
                        )
                        Text(
                            text = "${stringResource(R.string.login_as)} $roleTitle",
                            style = MaterialTheme.typography.bodyMedium,
                            color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.6f),
                            fontWeight = FontWeight.Medium
                        )

                        Spacer(modifier = Modifier.height(24.dp))

                        // Field 1: Roll No / Teacher ID / CNIC
                        val idLabel = when (role.lowercase()) {
                            "student" -> "Roll Number"
                            "teacher" -> stringResource(R.string.teacher_id)
                            "parent" -> "CNIC Number"
                            else -> "Identifier"
                        }
                        val idPlaceholder = when (role.lowercase()) {
                            "student" -> "e.g. 101"
                            "teacher" -> "e.g. T001"
                            "parent" -> "XXXXX-XXXXXXX-X"
                            else -> "Enter your ID"
                        }
                        val idIcon = if (role.lowercase() == "parent") Icons.Rounded.CreditCard else Icons.Rounded.AccountCircle
                        
                        OutlinedTextField(
                            value = identifier,
                            onValueChange = { 
                                if (role.lowercase() == "parent") {
                                   val digits = it.filter { char -> char.isDigit() }
                                   if (digits.length <= 13) identifier = digits
                                } else {
                                   identifier = it 
                                }
                            },
                            label = { Text(idLabel) },
                            placeholder = { Text(idPlaceholder) },
                            modifier = Modifier.fillMaxWidth(),
                            leadingIcon = { Icon(idIcon, null, tint = roleColor) },
                            keyboardOptions = KeyboardOptions(
                                keyboardType = if (role.lowercase() == "parent") KeyboardType.Number else KeyboardType.Text
                            ),
                            visualTransformation = if (role.lowercase() == "parent") CnicVisualTransformation() else VisualTransformation.None,
                            shape = RoundedCornerShape(16.dp),
                            singleLine = true,
                            colors = OutlinedTextFieldDefaults.colors(
                                focusedBorderColor = roleColor,
                                focusedLabelColor = roleColor,
                                cursorColor = roleColor,
                                focusedTextColor = MaterialTheme.colorScheme.onSurface,
                                unfocusedTextColor = MaterialTheme.colorScheme.onSurface
                            )
                        )

                        Spacer(modifier = Modifier.height(16.dp))

                        // Field 2: Phone
                        OutlinedTextField(
                            value = phone,
                            onValueChange = { 
                                val filtered = it.filter { char -> char.isDigit() }
                                if (filtered.length <= 12) phone = filtered 
                            },
                            label = { Text(stringResource(R.string.whatsapp_number)) },
                            placeholder = { Text("03XXXXXXXXX") },
                            modifier = Modifier.fillMaxWidth(),
                            leadingIcon = { Icon(Icons.Rounded.Call, null, tint = roleColor) },
                            keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Phone),
                            shape = RoundedCornerShape(16.dp),
                            singleLine = true,
                            colors = OutlinedTextFieldDefaults.colors(
                                focusedBorderColor = roleColor,
                                focusedLabelColor = roleColor,
                                cursorColor = roleColor,
                                focusedTextColor = MaterialTheme.colorScheme.onSurface,
                                unfocusedTextColor = MaterialTheme.colorScheme.onSurface
                            )
                        )

                        Spacer(modifier = Modifier.height(16.dp))

                        // Field 3: Gmail
                        OutlinedTextField(
                            value = email,
                            onValueChange = { email = it },
                            label = { Text(stringResource(R.string.gmail_id)) },
                            placeholder = { Text("example@gmail.com") },
                            modifier = Modifier.fillMaxWidth(),
                            leadingIcon = { Icon(Icons.Rounded.Email, null, tint = roleColor) },
                            keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Email),
                            shape = RoundedCornerShape(16.dp),
                            singleLine = false, // Allow multi-line to prevent truncation of long emails
                            maxLines = 2,
                            colors = OutlinedTextFieldDefaults.colors(
                                focusedBorderColor = roleColor,
                                focusedLabelColor = roleColor,
                                cursorColor = roleColor,
                                focusedTextColor = MaterialTheme.colorScheme.onSurface,
                                unfocusedTextColor = MaterialTheme.colorScheme.onSurface
                            )
                        )

                        Spacer(modifier = Modifier.height(24.dp))

                        if (localError.isNotEmpty()) {
                            Text(
                                text = localError,
                                color = MaterialTheme.colorScheme.error,
                                style = MaterialTheme.typography.bodySmall,
                                modifier = Modifier.padding(bottom = 12.dp),
                                fontWeight = FontWeight.Bold
                            )
                        } else if (authState is AuthState.Error) {
                            val error = (authState as AuthState.Error).message
                            val displayError = try {
                                if (error.startsWith("{")) {
                                    val regex = """ "error"\s*:\s*"(.*?)"""".toRegex()
                                    regex.find(error)?.groupValues?.get(1) ?: error
                                } else error
                            } catch (e: Exception) { error }

                            Text(
                                text = displayError,
                                color = MaterialTheme.colorScheme.error,
                                style = MaterialTheme.typography.bodySmall,
                                modifier = Modifier.padding(bottom = 12.dp),
                                fontWeight = FontWeight.Bold
                            )
                        }

                        Button(
                            onClick = { 
                                localError = ""
                                val trimmedId = identifier.trim()
                                val trimmedEmail = email.trim()
                                // Normalize phone: handle 03..., 923..., +923...
                                val digitsOnly = phone.trim().filter { it.isDigit() }
                                var tempPhone = digitsOnly
                                if (tempPhone.startsWith("92") && tempPhone.length == 12) {
                                    tempPhone = tempPhone.substring(2)
                                }
                                if (tempPhone.startsWith("0")) {
                                    tempPhone = tempPhone.removePrefix("0")
                                }
                                val normalizedPhoneForBackend = "0$tempPhone" // Send in 03XXXXXXXXX format
                                
                                val currentRole = role.lowercase()
                                
                                if (currentRole == "parent" && trimmedId.replace("-", "").length != 13) {
                                    localError = "Invalid CNIC format. Please enter 13 digits."
                                    return@Button
                                }
                                
                                if (trimmedId.isBlank()) {
                                    localError = "Please enter your valid ID/Roll Number."
                                    return@Button
                                }
                                if (normalizedPhoneForBackend.length < 11) {
                                    localError = "Please enter a valid 11-digit WhatsApp Number."
                                    return@Button
                                }
                                if (!trimmedEmail.contains("@")) {
                                    localError = "Please enter a valid Gmail ID."
                                    return@Button
                                }
                                
                                val idToSend = if (trimmedId.length == 13 && currentRole == "parent") {
                                    val digits = trimmedId.replace("-", "")
                                    "${digits.substring(0, 5)}-${digits.substring(5, 12)}-${digits.substring(12)}"
                                } else trimmedId
                                
                                viewModel.requestOtp(idToSend, normalizedPhoneForBackend, trimmedEmail, currentRole) 
                            },
                            modifier = Modifier
                                .fillMaxWidth()
                                .height(56.dp),
                            colors = ButtonDefaults.buttonColors(containerColor = roleColor),
                            shape = RoundedCornerShape(16.dp),
                            enabled = identifier.isNotEmpty() && phone.length >= 10 && email.contains("@") && authState !is AuthState.Loading,
                            elevation = ButtonDefaults.buttonElevation(defaultElevation = 4.dp)
                        ) {
                            if (authState is AuthState.Loading) {
                                CircularProgressIndicator(modifier = Modifier.size(24.dp), color = Color.White, strokeWidth = 3.dp)
                            } else {
                                Text(stringResource(R.string.continue_with_otp), style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.ExtraBold)
                            }
                        }

                        Spacer(modifier = Modifier.height(20.dp))

                        TextButton(onClick = { /* Help */ }) {
                            Text(
                                text = "Need Help? Contact School",
                                color = roleColor,
                                style = MaterialTheme.typography.bodyMedium,
                                fontWeight = FontWeight.Bold
                            )
                        }
                    }
                }
            }
        }
    }
}

@Preview(showBackground = true)
@Composable
fun LoginScreenPreview() {
    TALEEMIDUNYATheme {
        // Mocking ViewModel is hard for preview, usually we pass state
        // For now just showing a placeholder if needed, or I'll refactor to pass state
    }
}

class CnicVisualTransformation : VisualTransformation {
    override fun filter(text: AnnotatedString): TransformedText {
        val trimmed = if (text.text.length >= 13) text.text.substring(0..12) else text.text
        var out = ""
        for (i in trimmed.indices) {
            out += trimmed[i]
            if (i == 4 || i == 11) out += "-"
        }

        val cnicOffsetTranslator = object : OffsetMapping {
            override fun originalToTransformed(offset: Int): Int {
                if (offset <= 4) return offset
                if (offset <= 11) return offset + 1
                return offset + 2
            }

            override fun transformedToOriginal(offset: Int): Int {
                if (offset <= 5) return offset
                if (offset <= 13) return offset - 1
                return offset - 2
            }
        }

        return TransformedText(AnnotatedString(out), cnicOffsetTranslator)
    }
}
