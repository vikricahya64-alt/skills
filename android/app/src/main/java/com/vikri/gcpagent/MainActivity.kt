package com.vikri.gcpagent

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.core.splashscreen.SplashScreen.Companion.installSplashScreen
import com.vikri.gcpagent.ui.theme.AgenGCPTheme

class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        // Perlihatkan splash screen yang konsisten lalu lebur ke konten Compose.
        installSplashScreen()
        enableEdgeToEdge()
        super.onCreate(savedInstanceState)
        setContent {
            AgenGCPTheme {
                AgenGCPApp()
            }
        }
    }
}