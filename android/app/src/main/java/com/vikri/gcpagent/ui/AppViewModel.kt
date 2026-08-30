package com.vikri.gcpagent.ui

import androidx.lifecycle.ViewModel
import androidx.lifecycle.ViewModelProvider
import androidx.lifecycle.viewmodel.initializer
import androidx.lifecycle.viewmodel.viewModelFactory
import com.vikri.gcpagent.di.ServiceLocator
import com.vikri.gcpagent.data.CapabilityRepository
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update

class AppViewModel(private val repository: CapabilityRepository) : ViewModel() {

    private val _uiState = MutableStateFlow(AppUiState())
    val uiState: StateFlow<AppUiState> = _uiState.asStateFlow()

    /** Grup & kemampuan dari repositori — dibaca langsung (data tidak berubah). */
    val groupsWithCapabilities: List<Pair<String, List<com.vikri.gcpagent.Capability>>>
        get() = repository.groupsWithCapabilities

    val totalCapabilities: Int
        get() = repository.totalCapabilities

    fun selectTab(index: Int) {
        _uiState.update { it.copy(selectedTab = index) }
    }

    fun setWebLoading(loading: Boolean) {
        _uiState.update { it.copy(webLoading = loading) }
    }

    fun setWebError(error: String?) {
        _uiState.update { it.copy(webError = error) }
    }

    fun refreshWeb() {
        _uiState.update { it.copy(webReloadTick = it.webReloadTick + 1, webError = null) }
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
