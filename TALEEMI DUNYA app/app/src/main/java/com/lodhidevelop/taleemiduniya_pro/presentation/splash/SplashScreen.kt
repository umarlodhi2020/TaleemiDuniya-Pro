package com.lodhidevelop.taleemiduniya_pro.presentation.splash

import androidx.compose.animation.core.*
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.alpha
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.scale
import androidx.compose.ui.draw.shadow
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.hilt.navigation.compose.hiltViewModel
import com.lodhidevelop.taleemiduniya_pro.presentation.auth.AuthViewModel
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch
import coil.compose.AsyncImage
import com.lodhidevelop.taleemiduniya_pro.R

@Composable
fun SplashScreen(
    viewModel: AuthViewModel = hiltViewModel(),
    onNavigate: (String?) -> Unit
) {
    val scale = remember { Animatable(0f) }
    val splashAlpha = remember { Animatable(0f) }
    val offsetY = remember { Animatable(50f) }

    LaunchedEffect(Unit) {
        launch {
            scale.animateTo(
                targetValue = 1f,
                animationSpec = spring(
                    dampingRatio = Spring.DampingRatioMediumBouncy,
                    stiffness = Spring.StiffnessLow
                )
            )
        }
        launch {
            splashAlpha.animateTo(1f, animationSpec = tween(1000))
        }
        launch {
            offsetY.animateTo(0f, animationSpec = tween(800, easing = FastOutSlowInEasing))
        }
        
        delay(2500L)
        viewModel.checkLoginState { role ->
            onNavigate(role)
        }
    }

    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(
                brush = Brush.verticalGradient(
                    colors = listOf(
                        MaterialTheme.colorScheme.primary,
                        MaterialTheme.colorScheme.primary.copy(alpha = 0.8f),
                        MaterialTheme.colorScheme.secondary
                    )
                )
            ),
        contentAlignment = Alignment.Center
    ) {
        Column(
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.Center,
            modifier = Modifier.offset(y = offsetY.value.dp).alpha(splashAlpha.value)
        ) {
            Surface(
                modifier = Modifier
                    .size(160.dp)
                    .scale(scale.value)
                    .shadow(24.dp, CircleShape),
                shape = CircleShape,
                color = Color.White
            ) {
                AsyncImage(
                    model = R.drawable.app_logo,
                    contentDescription = "TaleemiDunya Logo",
                    modifier = Modifier.fillMaxSize().padding(24.dp)
                )
            }

            Spacer(modifier = Modifier.height(40.dp))

            Text(
                text = "Taleemi Dunya",
                color = Color.White,
                style = MaterialTheme.typography.displaySmall,
                fontWeight = FontWeight.ExtraBold,
                letterSpacing = 1.sp
            )

            Surface(
                color = Color.White.copy(alpha = 0.2f),
                shape = RoundedCornerShape(8.dp),
                modifier = Modifier.padding(top = 8.dp)
            ) {
                Text(
                    text = "SMART SCHOOL SYSTEM",
                    color = Color.White,
                    style = MaterialTheme.typography.labelLarge,
                    modifier = Modifier.padding(horizontal = 12.dp, vertical = 4.dp),
                    letterSpacing = 3.sp
                )
            }
        }

        Column(
            modifier = Modifier
                .align(Alignment.BottomCenter)
                .padding(bottom = 60.dp),
            horizontalAlignment = Alignment.CenterHorizontally
        ) {
            CircularProgressIndicator(
                color = Color.White,
                strokeWidth = 3.dp,
                modifier = Modifier.size(28.dp)
            )
            Spacer(modifier = Modifier.height(16.dp))
            Text(
                text = "Loading Excellence...",
                color = Color.White.copy(alpha = 0.6f),
                style = MaterialTheme.typography.labelMedium
            )
        }
    }
}
