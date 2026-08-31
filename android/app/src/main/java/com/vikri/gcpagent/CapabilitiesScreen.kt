package com.vikri.gcpagent

import androidx.compose.foundation.background
import androidx.compose.foundation.ExperimentalFoundationApi
import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.itemsIndexed
import androidx.compose.foundation.lazy.stickyHeader
import androidx.compose.foundation.rememberScrollState
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.SearchOff
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.material3.pulltorefresh.PullToRefreshBox
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import com.vikri.gcpagent.R
import com.vikri.gcpagent.ui.AppViewModel
import com.vikri.gcpagent.ui.components.CapabilityRow
import com.vikri.gcpagent.ui.components.FilterPill
import com.vikri.gcpagent.ui.components.SearchField
import com.vikri.gcpagent.ui.components.SkeletonBlock

@OptIn(ExperimentalMaterial3Api::class, ExperimentalFoundationApi::class)
@Composable
fun CapabilitiesScreen(
    modifier: Modifier = Modifier,
    viewModel: AppViewModel
) {
    val uiState by viewModel.uiState.collectAsState()
    val highlightedGroups = viewModel.groups
    val selectedGroup = uiState.selectedGroup
    val groupsWithCaps = viewModel.groupsWithCapabilities
    val total = viewModel.totalCapabilities
    val isLoading = uiState.capabilitiesLoading

    PullToRefreshBox(
        isRefreshing = isLoading,
        onRefresh = { viewModel.refreshCapabilities() },
        modifier = modifier.fillMaxSize()
    ) {
        LazyColumn(
            modifier = Modifier.fillMaxSize(),
            contentPadding = PaddingValues(20.dp),
            verticalArrangement = Arrangement.spacedBy(12.dp)
        ) {
            // Judul & ikhtisar
            item(key = "header") {
                Column {
                    Text(
                        text = stringResource(R.string.cap_title),
                        style = MaterialTheme.typography.headlineMedium
                    )
                    Spacer(Modifier.height(2.dp))
                    Text(
                        text = stringResource(R.string.cap_subtitle, total),
                        style = MaterialTheme.typography.bodyMedium,
                        color = MaterialTheme.colorScheme.onSurfaceVariant
                    )
                    Spacer(Modifier.height(16.dp))
                    SearchField(
                        query = uiState.searchQuery,
                        placeholder = stringResource(R.string.cap_search_placeholder),
                        onQueryChange = viewModel::setSearchQuery,
                        onClear = { viewModel.setSearchQuery("") }
                    )
                    Spacer(Modifier.height(12.dp))
                    FilterRow(
                        groups = highlightedGroups,
                        selected = selectedGroup,
                        onSelect = viewModel::selectGroup
                    )
                }
            }

            if (isLoading) {
                item(key = "skeleton") { SkeletonList() }
            } else if (groupsWithCaps.isEmpty()) {
                item(key = "empty") { EmptyState() }
            } else {
                for ((groupName, items) in groupsWithCaps) {
                    stickyHeader(key = "group-$groupName") {
                        GroupHeader(groupName)
                    }
                    itemsIndexed(items, key = { _, cap -> cap.id }) { _, cap ->
                        CapabilityRow(cap = cap, showGroup = false)
                    }
                }
            }
        }
    }
}

@Composable
private fun FilterRow(
    groups: List<String>,
    selected: String?,
    onSelect: (String?) -> Unit
) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .horizontalScroll(rememberScrollState()),
        horizontalArrangement = Arrangement.spacedBy(8.dp)
    ) {
        FilterPill(
            label = stringResource(R.string.cap_filter_all),
            selected = selected == null,
            onClick = { onSelect(null) }
        )
        groups.forEach { group ->
            FilterPill(
                label = group,
                selected = selected == group,
                onClick = { onSelect(group) }
            )
        }
    }
}

@Composable
private fun GroupHeader(name: String) {
    Box(
        modifier = Modifier
            .fillMaxWidth()
            .background(MaterialTheme.colorScheme.background)
            .padding(top = 8.dp, bottom = 4.dp)
    ) {
        Text(
            text = name,
            style = MaterialTheme.typography.titleSmall,
            color = MaterialTheme.colorScheme.primary,
            fontWeight = FontWeight.SemiBold
        )
    }
}

@Composable
private fun SkeletonList() {
    Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
        repeat(4) {
            Column(
                modifier = Modifier.fillMaxWidth(),
                verticalArrangement = Arrangement.spacedBy(10.dp)
            ) {
                SkeletonBlock(
                    modifier = Modifier
                        .fillMaxWidth()
                        .height(18.dp),
                    baseColor = MaterialTheme.colorScheme.surfaceVariant
                )
                repeat(2) {
                    SkeletonBlock(
                        modifier = Modifier
                            .fillMaxWidth()
                            .height(72.dp),
                        baseColor = MaterialTheme.colorScheme.surfaceVariant,
                        radius = 18
                    )
                }
            }
        }
    }
}

@Composable
private fun EmptyState() {
    Column(
        modifier = Modifier
            .fillMaxWidth()
            .padding(vertical = 48.dp),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.spacedBy(12.dp)
    ) {
        Icon(
            imageVector = Icons.Filled.SearchOff,
            contentDescription = null,
            tint = MaterialTheme.colorScheme.onSurfaceVariant,
            modifier = Modifier.size(56.dp)
        )
        Text(
            text = stringResource(R.string.cap_empty_title),
            style = MaterialTheme.typography.titleMedium
        )
        Text(
            text = stringResource(R.string.cap_empty_desc),
            style = MaterialTheme.typography.bodyMedium,
            color = MaterialTheme.colorScheme.onSurfaceVariant,
            modifier = Modifier.padding(horizontal = 16.dp)
        )
    }
}