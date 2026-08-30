package com.vikri.gcpagent

import androidx.compose.foundation.layout.padding
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.GridView
import androidx.compose.material.icons.filled.Home
import androidx.compose.material.icons.filled.Public
import androidx.compose.material3.Icon
import androidx.compose.material3.NavigationBar
import androidx.compose.material3.NavigationBarItem
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.vector.ImageVector

private data class Dest(
    val label: String,
    val icon: ImageVector
)

@Composable
fun AgenGCPApp() {
    var selected by rememberSaveable { mutableIntStateOf(0) }

    val dests = listOf(
        Dest("Beranda", Icons.Filled.Home),
        Dest("Kemampuan", Icons.Filled.GridView),
        Dest("Buka Agen", Icons.Filled.Public)
    )

    Scaffold(
        bottomBar = {
            NavigationBar {
                dests.forEachIndexed { i, d ->
                    NavigationBarItem(
                        selected = selected == i,
                        onClick = { selected = i },
                        icon = { Icon(d.icon, contentDescription = d.label) },
                        label = { Text(d.label) }
                    )
                }
            }
        }
    ) { innerPadding ->
        val mod = Modifier.padding(innerPadding)
        when (selected) {
            0 -> HomeScreen(mod)
            1 -> CapabilitiesScreen(mod)
            else -> WebScreen(mod)
        }
    }
}
