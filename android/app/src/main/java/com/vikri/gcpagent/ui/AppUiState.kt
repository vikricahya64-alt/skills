package com.vikri.gcpagent.ui

/** Alamat antarmuka web Agen GCP. */
const val AGEN_URL = "https://gcp-agent-beta.vercel.app"

/**
 * Snapshot UI state (immutable) yang dipancarkan ViewModel.
 * Layar hanya membaca, perubahan hanya via ViewModel — single source of truth.
 */
data class AppUiState(
    val selectedTab: Int = 0,
    val webLoading: Boolean = false,
    val webError: String? = null,
    /** Naik tiap kali pengguna ingin refresh web (memicu reload WebView). */
    val webReloadTick: Int = 0
)
