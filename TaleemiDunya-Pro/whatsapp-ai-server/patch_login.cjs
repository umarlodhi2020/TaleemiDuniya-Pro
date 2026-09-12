const fs = require('fs');
const path = 'g:/taleem dithub/TALEEMI DUNYA app/app/src/main/java/com/lodhidevelop/taleemiduniya_pro/presentation/auth/LoginScreen.kt';

if (fs.existsSync(path)) {
    let content = fs.readFileSync(path, 'utf8');

    // 1. Inject localError state
    if (!content.includes('var localError by remember')) {
        content = content.replace(
            /var email by remember \{ mutableStateOf\(""\) \}/,
            'var email by remember { mutableStateOf("") }\n    var localError by remember { mutableStateOf("") }'
        );
    }

    // 2. Inject localError display
    if (!content.includes('if (localError.isNotEmpty())')) {
        content = content.replace(
            /if \(authState is AuthState\.Error\) \{/,
            `if (localError.isNotEmpty()) {
                            Text(
                                text = localError,
                                color = MaterialTheme.colorScheme.error,
                                style = MaterialTheme.typography.bodySmall,
                                modifier = Modifier.padding(bottom = 16.dp),
                                fontWeight = FontWeight.Bold
                            )
                        } else if (authState is AuthState.Error) {`
        );
    }

    // 3. Inject Button Validation
    const oldButtonStart = `Button(
                            onClick = { 
                                val normalizedPhone = if (phone.startsWith("0")) phone else "0$phone"
                                
                                val idToSend = if (identifier.length == 13 && role.lowercase() == "parent") {
                                    "\${identifier.substring(0, 5)}-\${identifier.substring(5, 12)}-\${identifier.substring(12)}"
                                } else identifier
                                
                                viewModel.requestOtp(idToSend, normalizedPhone, email.trim()) 
                            },`;

    const newButtonStart = `Button(
                            onClick = { 
                                localError = ""
                                val normalizedPhone = if (phone.startsWith("0")) phone else "0$phone"
                                val currentRole = role.lowercase()
                                
                                if (currentRole == "parent" && identifier.length != 13) {
                                    localError = "Invalid CNIC format. Please enter 13 digits."
                                    return@Button
                                }
                                if (currentRole == "student" && identifier.isEmpty()) {
                                    localError = "Please enter a valid Roll Number."
                                    return@Button
                                }
                                if (currentRole == "teacher" && identifier.isEmpty()) {
                                    localError = "Please enter a valid Teacher ID."
                                    return@Button
                                }
                                if (normalizedPhone.length < 10) {
                                    localError = "Please enter a valid WhatsApp Number."
                                    return@Button
                                }
                                if (!email.contains("@")) {
                                    localError = "Please enter a valid Gmail ID."
                                    return@Button
                                }
                                
                                val idToSend = if (identifier.length == 13 && currentRole == "parent") {
                                    "\${identifier.substring(0, 5)}-\${identifier.substring(5, 12)}-\${identifier.substring(12)}"
                                } else identifier
                                
                                viewModel.requestOtp(idToSend, normalizedPhone, email.trim()) 
                            },`;

    content = content.replace(oldButtonStart, newButtonStart);

    fs.writeFileSync(path, content, 'utf8');
    console.log("Successfully patched LoginScreen.kt");
} else {
    console.log("File not found: " + path);
}
