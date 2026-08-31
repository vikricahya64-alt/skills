package com.vikri.gcpagent.ui

import androidx.lifecycle.ViewModel
import androidx.lifecycle.ViewModelProvider
import androidx.lifecycle.viewModelScope
import androidx.lifecycle.viewmodel.initializer
import androidx.lifecycle.viewmodel.viewModelFactory
import com.vikri.gcpagent.Capability
import com.vikri.gcpagent.di.ServiceLocator
import com.vikri.gcpagent.data.CapabilityRepository
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch

class AppViewModel(private val repository: CapabilityRepository) : ViewModel() {

    private val _uiState = MutableStateFlow(AppUiState())
    val uiState: StateFlow<AppUiState> = _uiState.asStateFlow()

    /** Semua kemampuan mentah dari repositori. */
    val allCapabilities: List<Capability>
        get() = repository.all

    val totalCapabilities: Int
        get() = repository.all.size

    /** Cari kemampuan berdasarkan id (untuk layar detail). */
    fun capabilityById(id: String): Capability? =
        repository.all.firstOrNull { it.id == id }

    /** Daftar grup (urutan katalog), untuk filter chips. */
    val groups: List<String>
        get() = repository.groups

    /** Kemampuan hasil filter sesuai query + grup terpilih. */
    val filteredCapabilities: List<Capability>
        get() = repository.filter(
            query = _uiState.value.searchQuery,
            group = _uiState.value.selectedGroup
        )

    /** Grup beserta kemampuan di dalamnya (untuk daftar ber-sticky-header). */
    val groupsWithCapabilities: List<Pair<String, List<Capability>>>
        get() = repository.groupsWithCapabilities(
            query = _uiState.value.searchQuery,
            group = _uiState.value.selectedGroup
        )

    fun selectTab(index: Int) {
        _uiState.update { it.copy(selectedTab = index) }
    }

    // ---------- Web ----------
    fun setWebLoading(loading: Boolean) {
        _uiState.update { it.copy(webLoading = loading) }
    }

    fun setWebProgress(progress: Int) {
        _uiState.update { it.copy(webProgress = progress.coerceIn(0, 100)) }
    }

    fun setWebError(error: String?) {
        _uiState.update { it.copy(webError = error) }
    }

    fun refreshWeb() {
        _uiState.update { it.copy(webReloadTick = it.webReloadTick + 1, webError = null) }
    }

    // ---------- Pencarian & filter kemampuan ----------
    fun setSearchQuery(query: String) {
        _uiState.update { it.copy(searchQuery = query) }
    }

    fun selectGroup(group: String?) {
        _uiState.update { it.copy(selectedGroup = group) }
    }

    /**
     * Simulasi muat ulang data (seperti request jaringan) agar UI memperlihatkan
     * kondisi loading (skeleton) lalu konten — perilaku nyata aplikasi produksi.
     */
    fun refreshCapabilities() {
        if (_uiState.value.capabilitiesLoading) return
        _uiState.update { it.copy(capabilitiesLoading = true) }
        viewModelScope.launch {
            delay(900)
            _uiState.update { it.copy(capabilitiesLoading = false) }
        }
    }

    companion object {
        val Factory: ViewModelProvider.Factory = viewModelFactory {
            initializer {
                val repo = ServiceLocator.capabilityRepository
                AppViewModel(repo)
            }
        }
    }
}