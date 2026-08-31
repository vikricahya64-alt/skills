package com.vikri.gcpagent.ui.theme

import androidx.compose.material3.darkColorScheme
import androidx.compose.material3.lightColorScheme
import androidx.compose.ui.graphics.Color

// ===================== Palet brand Agen GCP =====================
val CyanPrimary = Color(0xFF38BDF8)
val CyanPrimaryDark = Color(0xFF0EA5E9)
val CyanContainer = Color(0xFF0C4A6E)
val CyanOnContainer = Color(0xFFE0F2FE)
val DarkBackground = Color(0xFF0B1220)
val DarkSurface = Color(0xFF111A2E)
val DarkSurfaceHigh = Color(0xFF1B2740)
val TextPrimaryLight = Color(0xFFF1F5F9)
val TextSecondary = Color(0xFF94A3B8)
val OutlineDark = Color(0xFF2A3A55)
val SuccessGreen = Color(0xFF34D399)
val WarnAmber = Color(0xFFFBBF24)
val ErrorRedDark = Color(0xFFF87171)
val ErrorRed = Color(0xFFDC2626)

// Tema terang
val LightPrimary = Color(0xFF0284C7)
val LightBackground = Color(0xFFF6F9FC)
val LightSurface = Color(0xFFFFFFFF)
val LightSurfaceVariant = Color(0xFFE8F0F8)
val OnLightPrimary = Color(0xFF0F172A)
val OnLightSecondary = Color(0xFF475569)
val LightOutline = Color(0xFFC7D5E3)

// ===================== Skema warna gelap (default brand) =====================
val DarkColorPalette = darkColorScheme(
    primary = CyanPrimary,
    onPrimary = DarkBackground,
    primaryContainer = CyanContainer,
    onPrimaryContainer = CyanOnContainer,
    secondary = CyanPrimaryDark,
    onSecondary = DarkBackground,
    secondaryContainer = Color(0xFF155E75),
    onSecondaryContainer = CyanOnContainer,
    tertiary = SuccessGreen,
    onTertiary = Color(0xFF06301F),
    tertiaryContainer = Color(0xFF064E3B),
    onTertiaryContainer = Color(0xFFA7F3D0),
    error = ErrorRedDark,
    onError = Color(0xFF2B0A0A),
    errorContainer = Color(0xFF7F1D1D),
    onErrorContainer = Color(0xFFFECACA),
    background = DarkBackground,
    onBackground = TextPrimaryLight,
    surface = DarkSurface,
    onSurface = TextPrimaryLight,
    surfaceVariant = DarkSurfaceHigh,
    onSurfaceVariant = TextSecondary,
    surfaceTint = CyanPrimary,
    inverseSurface = TextPrimaryLight,
    inverseOnSurface = DarkBackground,
    inversePrimary = LightPrimary,
    outline = OutlineDark,
    outlineVariant = Color(0xFF24344E),
    scrim = Color(0xFF000000)
)

// ===================== Skema warna terang =====================
val LightColorPalette = lightColorScheme(
    primary = LightPrimary,
    onPrimary = Color.White,
    primaryContainer = Color(0xFFBAE6FD),
    onPrimaryContainer = Color(0xFF083344),
    secondary = CyanPrimaryDark,
    onSecondary = Color.White,
    secondaryContainer = Color(0xFFBAE6FD),
    onSecondaryContainer = Color(0xFF0C4A6E),
    tertiary = Color(0xFF059669),
    onTertiary = Color.White,
    tertiaryContainer = Color(0xFFA7F3D0),
    onTertiaryContainer = Color(0xFF06331F),
    error = ErrorRed,
    onError = Color.White,
    errorContainer = Color(0xFFFEE2E2),
    onErrorContainer = Color(0xFF7F1D1D),
    background = LightBackground,
    onBackground = OnLightPrimary,
    surface = LightSurface,
    onSurface = OnLightPrimary,
    surfaceVariant = LightSurfaceVariant,
    onSurfaceVariant = OnLightSecondary,
    surfaceTint = LightPrimary,
    inverseSurface = Color(0xFF1E293B),
    inverseOnSurface = Color(0xFFF1F5F9),
    inversePrimary = Color(0xFF7DD3FC),
    outline = LightOutline,
    outlineVariant = Color(0xFFD8E3EF),
    scrim = Color(0xFF000000)
)