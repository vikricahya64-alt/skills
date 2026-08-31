package com.vikri.gcpagent.ui.components

import androidx.compose.animation.core.LinearEasing
import androidx.compose.animation.core.RepeatMode
import androidx.compose.animation.core.animateFloat
import androidx.compose.animation.core.infiniteRepeatable
import androidx.compose.animation.core.rememberInfiniteTransition
import androidx.compose.animation.core.tween
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.unit.dp

// ===================== Shimmer (efek skeleton loading) =====================
// Dipakai saat data sedang "dimuat" agar UI tidak kosong — perilaku aplikasi
// kelas internasional: konten placeholder beranimasi halus saat menunggu.

@Composable
fun Modifier.shimmer(baseColor: Color): Modifier {
    val transition = rememberInfiniteTransition(label = "shimmer")
    val alpha by transition.animateFloat(
        initialValue = 0.2f,
        targetValue = 0.8f,
        animationSpec = infiniteRepeatable(
            animation = tween(durationMillis = 1100, easing = LinearEasing),
            repeatMode = RepeatMode.Restart
        ),
        label = "shimmerAlpha"
    )
    val brush = Brush.linearGradient(
        colors = listOf(
            baseColor.copy(alpha = alpha),
            baseColor,
            baseColor.copy(alpha = alpha)
        ),
        start = Offset.Zero,
        end = Offset(500f, 500f)
    )
    return this.background(brush)
}

@Composable
fun SkeletonBlock(
    modifier: Modifier = Modifier,
    baseColor: Color,
    radius: Int = 10
) {
    Box(
        modifier
            .clip(RoundedCornerShape(radius.dp))
    ) {
        // Warna dasar dulu, lalu shimmer di atasnya
        Box(Modifier.matchParentSize().background(baseColor))
        Box(Modifier.matchParentSize().shimmer(baseColor))
    }
}

val DefaultSkeletonHigh = Color(0xFF2A3A55)
val DefaultSkeletonBase = Color(0xFF1B2740)