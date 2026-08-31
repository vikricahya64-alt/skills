package com.vikri.gcpagent.ui

/** Alamat antarmuka web Agen GCP. */
const val AGEN_URL = "https://gcp-agent-beta.vercel.app"

/** Skema deep link yang dipakai navigasi internal (contoh: vikriagent://capabilities). */
const val DEEP_LINK_SCHEME = "vikriagent"

/**
 * Snapshot UI state (immutable) yang dipancarkan ViewModel.
 * Layar hanya membaca, perubahan hanya via ViewModel — single source of truth.
 */
data class AppUiState(
    val selectedTab: Int = 0,
    val webLoading: Boolean = false,
    val webError: String? = null,
    /** Naik tiap kali pengguna ingin refresh web (memicu reload WebView). */
    val webReloadTick: Int = 0,
    /** Progress halaman web 0..100 untuk progress bar (100 = selesai). */
    val webProgress: Int = 100,
    /** Kata kunci pencarian pada layar kemampuan. */
    val searchQuery: String = "",
    /** Grup yang sedang difilter; null = semua grup. */
    val selectedGroup: String? = null,
    /** Menandakan daftar kemampuan sedang dimuat/disegarkan (skeleton/shimmer). */
    val capabilitiesLoading: Boolean = false
)