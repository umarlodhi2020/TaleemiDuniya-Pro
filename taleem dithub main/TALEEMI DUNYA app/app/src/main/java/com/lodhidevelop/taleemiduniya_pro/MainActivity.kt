package com.lodhidevelop.taleemiduniya_pro

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import com.lodhidevelop.taleemiduniya_pro.presentation.navigation.AppNavigation
import com.lodhidevelop.taleemiduniya_pro.presentation.theme.TALEEMIDUNYATheme
import dagger.hilt.android.AndroidEntryPoint

@AndroidEntryPoint
class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        enableEdgeToEdge()
        setContent {
            TALEEMIDUNYATheme {
                AppNavigation()
            }
        }
    }
}
